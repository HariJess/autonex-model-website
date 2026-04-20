-- =============================================================================
-- Mission 2.A — Moderation triggers + publish RPC update
--
-- Enforces the moderation policy server-side:
--   - Listings inserted / published directly go through validate_listing_content
--     and can_publish_listing (rate limit).
--   - Status is assigned based on is_verified_dealer: dealers skip pending_review,
--     particuliers go to pending_review.
--   - On edits of already-active listings, a change to a sensitive field
--     (title, description, price_mga) by a particulier sends the listing back
--     to pending_review. Non-sensitive edits (mileage, colors, location, etc.)
--     do not re-trigger moderation.
--   - Photo changes are tracked by a separate trigger on listing_photos because
--     photos live in a dedicated table.
--
-- Sensitive field list (listings BEFORE UPDATE):
--   title, description, price_mga
-- Non-sensitive (edits don't re-moderate):
--   mileage_km, negotiable, availability_status, ville, quartier, region,
--   lat, lng, exterior_color, interior_color, fuel, transmission_gearbox,
--   drivetrain, doors, seats, engine_displacement_l, is_electric, is_hybrid,
--   year, vehicle_condition, body_style, whatsapp_phone, make, model.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Raise a single exception whose MESSAGE encodes a validation error JSONB.
--    Clients parse the SQLSTATE + MESSAGE to extract the first failing field.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.raise_listing_validation_error(p_errors JSONB)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_first JSONB;
BEGIN
  v_first := p_errors -> 0;
  RAISE EXCEPTION '%', COALESCE(v_first->>'code', 'listing_validation_failed')
    USING ERRCODE = '23514',
          DETAIL  = p_errors::text;
END;
$$;

-- -----------------------------------------------------------------------------
-- B. enforce_listing_moderation_insert — BEFORE INSERT on listings.
--    Draft rows bypass validation and rate limit. Public-status rows
--    (non-draft) get validated, rate-limited, and their status is normalised
--    based on dealer verification.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_listing_moderation_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid    BOOLEAN;
  v_errors   JSONB;
  v_allowed  BOOLEAN;
  v_reason   TEXT;
BEGIN
  -- Drafts are allowed to be empty and unlimited.
  IF NEW.status = 'draft'::public.listing_status THEN
    RETURN NEW;
  END IF;

  -- Rate limit: only the owner's own quota matters.
  SELECT c.allowed, c.reason
    INTO v_allowed, v_reason
    FROM public.can_publish_listing(NEW.owner_id) c;
  IF NOT v_allowed THEN
    RAISE EXCEPTION '%', COALESCE(v_reason, 'rate_limit_exceeded')
      USING ERRCODE = 'P0001';
  END IF;

  -- Content rules.
  SELECT v.valid, v.errors
    INTO v_valid, v_errors
    FROM public.validate_listing_content(
      NEW.title, NEW.description, NEW.price_mga, NEW.whatsapp_phone
    ) v;
  IF NOT v_valid THEN
    PERFORM public.raise_listing_validation_error(v_errors);
  END IF;

  -- Status assignment (dealers fast-track).
  IF public.is_verified_dealer(NEW.owner_id) THEN
    NEW.status := 'active'::public.listing_status;
  ELSE
    NEW.status := 'pending_review'::public.listing_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_listing_moderation_insert ON public.listings;
CREATE TRIGGER tr_enforce_listing_moderation_insert
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_listing_moderation_insert();

-- -----------------------------------------------------------------------------
-- C. enforce_listing_moderation_update — BEFORE UPDATE on listings.
--    Four cases:
--      1. Draft → draft: bypass (user editing draft freely).
--      2. Draft → non-draft (publish): rate-limit + validate. Final status
--         handled by publish_listing_with_credits RPC (already branches on
--         is_verified_dealer post-migration). If some other code path triggers
--         this transition we still protect via rate limit + validate.
--      3. Active → active with sensitive field changed by non-dealer:
--         NEW.status := pending_review.
--      4. Any other non-draft update: validate content (no status rewrite).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_listing_moderation_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid          BOOLEAN;
  v_errors         JSONB;
  v_allowed        BOOLEAN;
  v_reason         TEXT;
  v_sensitive_changed BOOLEAN;
BEGIN
  -- Case 1: draft remains draft. No enforcement.
  IF OLD.status = 'draft'::public.listing_status
     AND NEW.status = 'draft'::public.listing_status THEN
    RETURN NEW;
  END IF;

  -- Case 2: draft → non-draft (publishing a draft, via RPC or direct update).
  --         Rate-limit + validate. RPC already sets status based on dealer,
  --         but we protect against direct-update paths too.
  IF OLD.status = 'draft'::public.listing_status
     AND NEW.status <> 'draft'::public.listing_status THEN
    SELECT c.allowed, c.reason
      INTO v_allowed, v_reason
      FROM public.can_publish_listing(NEW.owner_id) c;
    IF NOT v_allowed THEN
      RAISE EXCEPTION '%', COALESCE(v_reason, 'rate_limit_exceeded')
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Validate content for any non-draft target status.
  IF NEW.status <> 'draft'::public.listing_status
     AND NEW.status <> 'archived'::public.listing_status THEN
    SELECT v.valid, v.errors
      INTO v_valid, v_errors
      FROM public.validate_listing_content(
        NEW.title, NEW.description, NEW.price_mga, NEW.whatsapp_phone
      ) v;
    IF NOT v_valid THEN
      PERFORM public.raise_listing_validation_error(v_errors);
    END IF;
  END IF;

  -- Case 3: active → active sensitive-field change by non-dealer.
  --         JS code must NOT have explicitly set a new status (we respect
  --         explicit transitions like rejected resubmission via
  --         shouldSendPublishedListingToReview legacy path).
  IF OLD.status = 'active'::public.listing_status
     AND NEW.status = 'active'::public.listing_status THEN
    v_sensitive_changed := (
      OLD.title       IS DISTINCT FROM NEW.title
      OR OLD.description IS DISTINCT FROM NEW.description
      OR OLD.price_mga   IS DISTINCT FROM NEW.price_mga
    );
    IF v_sensitive_changed AND NOT public.is_verified_dealer(OLD.owner_id) THEN
      NEW.status := 'pending_review'::public.listing_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_listing_moderation_update ON public.listings;
CREATE TRIGGER tr_enforce_listing_moderation_update
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_listing_moderation_update();

-- -----------------------------------------------------------------------------
-- D. enforce_listing_photos_sensitive — AFTER INSERT/UPDATE/DELETE on
--    listing_photos. Photos live in a sibling table so the listings trigger
--    never sees photo changes. This trigger sends the listing back to
--    pending_review when a particulier touches the photos of an active listing.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_listing_photos_sensitive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
  v_owner_id   UUID;
  v_status     public.listing_status;
BEGIN
  v_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);
  IF v_listing_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT l.owner_id, l.status
    INTO v_owner_id, v_status
    FROM public.listings l
   WHERE l.id = v_listing_id;

  IF v_status = 'active'::public.listing_status
     AND NOT public.is_verified_dealer(v_owner_id) THEN
    UPDATE public.listings
       SET status = 'pending_review'::public.listing_status
     WHERE id = v_listing_id
       AND status = 'active'::public.listing_status;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_listing_photos_sensitive ON public.listing_photos;
CREATE TRIGGER tr_enforce_listing_photos_sensitive
  AFTER INSERT OR UPDATE OR DELETE ON public.listing_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_listing_photos_sensitive();

-- -----------------------------------------------------------------------------
-- E. publish_listing_with_credits — updated to honour is_verified_dealer.
--
-- Diff vs previous version:
--   - target_status := is_verified_dealer ? active : pending_review
--   - Boosts are inserted only when target_status = active (dealers).
--     pending_review listings keep their pending_boost_types untouched so
--     admin_approve_listing_moderation can materialise them later.
--   - pending_boost_types cleared only on direct activation.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_listing_with_credits(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lst           public.listings%ROWTYPE;
  owner_agency  UUID;
  pending       JSONB;
  bt            TEXT;
  pricing_key   TEXT;
  total_cost    INT;
  boost_cost    INT;
  ends_at       TIMESTAMPTZ;
  target_status public.listing_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO lst
    FROM public.listings
   WHERE id = p_listing_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF lst.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF lst.status = 'active'::public.listing_status THEN
    RAISE EXCEPTION 'already_published' USING ERRCODE = 'P0001';
  END IF;

  IF lst.status IS DISTINCT FROM 'draft'::public.listing_status THEN
    RAISE EXCEPTION 'invalid_listing_status' USING ERRCODE = 'P0001';
  END IF;

  -- Base publication cost.
  total_cost := public.pricing_for('publish_listing');

  pending := COALESCE(lst.pending_boost_types, '[]'::jsonb);

  FOR bt IN
    SELECT DISTINCT lower(trim(value))
    FROM jsonb_array_elements_text(pending) AS value
  LOOP
    pricing_key := CASE bt
      WHEN 'urgent'           THEN 'boost_urgent'
      WHEN 'daily_bump'       THEN 'boost_daily_bump'
      WHEN 'featured'         THEN 'boost_featured'
      WHEN 'top'              THEN 'boost_top'
      WHEN 'agency_spotlight' THEN 'agency_spotlight'
      ELSE NULL
    END;

    IF pricing_key IS NULL THEN
      RAISE EXCEPTION 'invalid_boost_type' USING ERRCODE = 'P0001';
    END IF;

    boost_cost := public.pricing_for(pricing_key);
    total_cost := total_cost + boost_cost;
  END LOOP;

  IF NOT public.consume_credits(
    auth.uid(),
    total_cost,
    'listing_publish',
    'listing_publish',
    p_listing_id
  ) THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  -- Dealer → active (fast-track). Particulier → pending_review.
  IF public.is_verified_dealer(auth.uid()) THEN
    target_status := 'active'::public.listing_status;
  ELSE
    target_status := 'pending_review'::public.listing_status;
  END IF;

  SELECT agency_id INTO owner_agency
    FROM public.profiles
   WHERE id = lst.owner_id;

  IF target_status = 'active'::public.listing_status THEN
    -- Dealer path: activate + materialise boosts now.
    UPDATE public.listings
       SET status                      = 'active'::public.listing_status,
           publication_credits_charged = total_cost,
           pending_boost_types         = '[]'::jsonb,
           rejection_reason            = NULL,
           expires_at                  = now() + interval '90 days'
     WHERE id = p_listing_id;

    FOR bt IN
      SELECT DISTINCT lower(trim(value))
      FROM jsonb_array_elements_text(pending) AS value
    LOOP
      IF bt = 'agency_spotlight' THEN
        IF owner_agency IS NOT NULL THEN
          UPDATE public.agencies
             SET spotlight_until = GREATEST(
                   COALESCE(spotlight_until, to_timestamp(0)),
                   now()
                 ) + interval '30 days'
           WHERE id = owner_agency;
        END IF;
      ELSE
        ends_at := CASE bt
          WHEN 'urgent'     THEN now() + interval '14 days'
          WHEN 'daily_bump' THEN now() + interval '7 days'
          WHEN 'featured'   THEN now() + interval '14 days'
          WHEN 'top'        THEN now() + interval '7 days'
        END;
        INSERT INTO public.boosts (listing_id, type, starts_at, ends_at)
        VALUES (p_listing_id, bt::public.boost_type, now(), ends_at);
      END IF;
    END LOOP;
  ELSE
    -- Particulier path: pending_review. Keep pending_boost_types so the
    -- admin_approve_listing_moderation RPC can materialise them after review.
    UPDATE public.listings
       SET status                      = 'pending_review'::public.listing_status,
           publication_credits_charged = total_cost,
           rejection_reason            = NULL,
           expires_at                  = now() + interval '90 days'
     WHERE id = p_listing_id;
  END IF;

  RETURN jsonb_build_object(
    'ok',             true,
    'listing_id',     p_listing_id,
    'status',         target_status::text,
    'spent_credits',  total_cost,
    'message',        CASE
      WHEN target_status = 'active'::public.listing_status THEN 'published'
      ELSE 'pending_review'
    END
  );
END;
$$;

-- GRANTs preserved (CREATE OR REPLACE keeps existing).
