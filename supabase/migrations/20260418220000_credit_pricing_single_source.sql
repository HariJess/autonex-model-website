-- Priority 7: single source of truth for credit pricing.
--
-- Before this migration, the six revenue-critical prices (publication +
-- four boost types + agency spotlight) were duplicated in three places:
--   1. src/config/monetization.ts (front)
--   2. supabase/migrations/20260418113000_publish_listing_with_credits.sql
--   3. supabase/migrations/20260414143000_purchase_listing_boosts.sql
-- A price change without synchronizing all three made the UI lie or the DB
-- debit the wrong amount. This migration moves the numbers into a single
-- audited table and rewrites the two revenue RPCs to read from it.
--
-- Scope intentionally narrow:
--  * Only the six prices above. Boost *durations* stay hardcoded (three
--    sites still) — that's a separate follow-up.
--  * credit_packs untouched — they already have their own table.
--  * `newsletter` boost (only referenced by admin_approve_listing_moderation)
--    is not seeded: it is neither sold through the UI nor quoted in the two
--    revenue RPCs.

-- ---------------------------------------------------------------------------
-- 1. Table
CREATE TABLE IF NOT EXISTS public.credit_pricing (
  key         TEXT PRIMARY KEY,
  amount      INTEGER NOT NULL CHECK (amount >= 0),
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.credit_pricing IS
  'Single source of truth for credit costs debited by publish/boost RPCs. Readable by anon for UI price display; writable by admins only.';

ALTER TABLE public.credit_pricing ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. RLS policies
-- SELECT is public: front renders prices on pre-login pages.
DROP POLICY IF EXISTS "credit_pricing_select_all" ON public.credit_pricing;
CREATE POLICY "credit_pricing_select_all"
  ON public.credit_pricing FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE restricted to admins via the legacy helper kept
-- project-wide (renaming immonex_is_admin would require a coordinated
-- migration across many policies).
DROP POLICY IF EXISTS "credit_pricing_admin_insert" ON public.credit_pricing;
CREATE POLICY "credit_pricing_admin_insert"
  ON public.credit_pricing FOR INSERT
  WITH CHECK (public.immonex_is_admin());

DROP POLICY IF EXISTS "credit_pricing_admin_update" ON public.credit_pricing;
CREATE POLICY "credit_pricing_admin_update"
  ON public.credit_pricing FOR UPDATE
  USING (public.immonex_is_admin())
  WITH CHECK (public.immonex_is_admin());

DROP POLICY IF EXISTS "credit_pricing_admin_delete" ON public.credit_pricing;
CREATE POLICY "credit_pricing_admin_delete"
  ON public.credit_pricing FOR DELETE
  USING (public.immonex_is_admin());

-- ---------------------------------------------------------------------------
-- 3. Audit trigger: every UPDATE refreshes updated_at / updated_by.
CREATE OR REPLACE FUNCTION public.credit_pricing_touch_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS credit_pricing_audit_update ON public.credit_pricing;
CREATE TRIGGER credit_pricing_audit_update
  BEFORE UPDATE ON public.credit_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_pricing_touch_audit();

-- ---------------------------------------------------------------------------
-- 4. Seed current prices. ON CONFLICT DO NOTHING keeps the migration
-- idempotent and guarantees existing admin overrides survive re-runs.
INSERT INTO public.credit_pricing (key, amount, description) VALUES
  ('publish_listing',   100, 'Frais de soumission standard (modération incluse)'),
  ('boost_urgent',       20, 'Badge Urgent (14 jours)'),
  ('boost_daily_bump',   30, 'Actualisation quotidienne (7 jours)'),
  ('boost_featured',     40, 'Mise en avant visuelle (14 jours)'),
  ('boost_top',          60, 'Priorité maximale dans les résultats (7 jours)'),
  ('agency_spotlight',  120, 'Visibilité agence (30 jours, publish initial uniquement)')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Public read RPC. Front caches the result for 15 minutes.
CREATE OR REPLACE FUNCTION public.get_pricing()
RETURNS TABLE(key TEXT, amount INTEGER, description TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT key, amount, description
  FROM public.credit_pricing
  ORDER BY key;
$$;

REVOKE ALL ON FUNCTION public.get_pricing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pricing() TO anon, authenticated;

COMMENT ON FUNCTION public.get_pricing()
  IS 'Public read of all credit prices. Safe for anon (prices are already displayed pre-login).';

-- ---------------------------------------------------------------------------
-- 6. Internal helper used by the revenue RPCs below. Raises a clear error
-- if a seeded key was deleted (should never happen) so we fail loud rather
-- than silently debit 0.
CREATE OR REPLACE FUNCTION public.pricing_for(p_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount INTEGER;
BEGIN
  SELECT amount INTO v_amount
  FROM public.credit_pricing
  WHERE key = p_key;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'missing pricing for key %', COALESCE(p_key, '<null>')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.pricing_for(TEXT) FROM PUBLIC;
-- Not granted to authenticated: only the SECURITY DEFINER revenue RPCs
-- call this internally (they run as the function owner, which retains
-- EXECUTE regardless of PUBLIC revocation).

COMMENT ON FUNCTION public.pricing_for(TEXT)
  IS 'Internal pricing lookup for SECURITY DEFINER RPCs. Raises ''missing pricing for key X'' if not seeded.';

-- ---------------------------------------------------------------------------
-- 7. Rewrite publish_listing_with_credits.
-- Identical signature and return shape as the 20260418113000 version; the
-- only behavioral change is where the numbers come from. Invalid boost
-- types still raise 'invalid_boost_type' BEFORE pricing_for is called, so
-- the error taxonomy seen by the front is unchanged.
CREATE OR REPLACE FUNCTION public.publish_listing_with_credits(
  p_listing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lst public.listings%ROWTYPE;
  owner_agency uuid;
  pending jsonb;
  bt text;
  pricing_key text;
  total_cost int;
  boost_cost int;
  ends_at timestamptz;
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

  -- Base publication cost from the pricing table.
  total_cost := public.pricing_for('publish_listing');

  pending := COALESCE(lst.pending_boost_types, '[]'::jsonb);

  FOR bt IN
    SELECT DISTINCT lower(trim(value))
    FROM jsonb_array_elements_text(pending) AS value
  LOOP
    -- Validate the boost type FIRST so the error surface matches the
    -- previous version; only then fetch the price.
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

  SELECT agency_id INTO owner_agency
  FROM public.profiles
  WHERE id = lst.owner_id;

  UPDATE public.listings
  SET
    status = 'active'::public.listing_status,
    publication_credits_charged = total_cost,
    pending_boost_types = '[]'::jsonb,
    rejection_reason = NULL,
    expires_at = now() + interval '90 days'
  WHERE id = p_listing_id;

  -- Durations stay hardcoded here: priority 7 only centralizes prices.
  FOR bt IN
    SELECT DISTINCT lower(trim(value))
    FROM jsonb_array_elements_text(pending) AS value
  LOOP
    IF bt = 'agency_spotlight' THEN
      IF owner_agency IS NOT NULL THEN
        UPDATE public.agencies
        SET spotlight_until = GREATEST(COALESCE(spotlight_until, to_timestamp(0)), now()) + interval '30 days'
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

  RETURN jsonb_build_object(
    'ok', true,
    'listing_id', p_listing_id,
    'status', 'active',
    'spent_credits', total_cost,
    'message', 'published'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_listing_with_credits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_listing_with_credits(uuid) TO authenticated;

COMMENT ON FUNCTION public.publish_listing_with_credits(uuid)
  IS 'Owner publish RPC: atomically charges credits (loaded from credit_pricing), activates draft listing, and materializes pending boosts.';

-- ---------------------------------------------------------------------------
-- 8. Rewrite purchase_listing_boosts.
-- Same approach: identical signature, identical error taxonomy, prices now
-- sourced from credit_pricing.
CREATE OR REPLACE FUNCTION public.purchase_listing_boosts(
  p_listing_id uuid,
  p_boost_types text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lst public.listings%ROWTYPE;
  bt text;
  pricing_key text;
  total_cost int := 0;
  t_cost int;
  ends_at timestamptz;
  distinct_count int;
  total_len int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_boost_types IS NULL OR array_length(p_boost_types, 1) IS NULL OR array_length(p_boost_types, 1) = 0 THEN
    RAISE EXCEPTION 'no_boost_types' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(DISTINCT lower(trim(t)))
  INTO distinct_count
  FROM unnest(p_boost_types) AS u(t);

  SELECT array_length(p_boost_types, 1) INTO total_len;

  IF distinct_count IS DISTINCT FROM total_len THEN
    RAISE EXCEPTION 'duplicate_boost_types' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO lst FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF lst.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF lst.status NOT IN ('active'::public.listing_status, 'paused'::public.listing_status) THEN
    RAISE EXCEPTION 'listing_not_boostable' USING ERRCODE = 'P0001';
  END IF;

  FOREACH bt IN ARRAY p_boost_types LOOP
    bt := lower(trim(bt));

    pricing_key := CASE bt
      WHEN 'urgent'     THEN 'boost_urgent'
      WHEN 'daily_bump' THEN 'boost_daily_bump'
      WHEN 'featured'   THEN 'boost_featured'
      WHEN 'top'        THEN 'boost_top'
      ELSE NULL
    END;

    IF pricing_key IS NULL THEN
      RAISE EXCEPTION 'invalid_boost_type' USING ERRCODE = 'P0001';
    END IF;

    t_cost := public.pricing_for(pricing_key);

    IF EXISTS (
      SELECT 1
      FROM public.boosts b
      WHERE b.listing_id = p_listing_id
        AND b.type = bt::public.boost_type
        AND b.ends_at > now()
    ) THEN
      RAISE EXCEPTION 'boost_already_active' USING ERRCODE = 'P0001';
    END IF;

    total_cost := total_cost + t_cost;
  END LOOP;

  IF NOT public.consume_credits(
    auth.uid(),
    total_cost,
    'listing_boost_purchase',
    'listing',
    p_listing_id
  ) THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  -- Durations hardcoded (out of scope for priority 7).
  FOREACH bt IN ARRAY p_boost_types LOOP
    bt := lower(trim(bt));
    ends_at := CASE bt
      WHEN 'urgent'     THEN now() + interval '14 days'
      WHEN 'daily_bump' THEN now() + interval '7 days'
      WHEN 'featured'   THEN now() + interval '14 days'
      WHEN 'top'        THEN now() + interval '7 days'
    END;
    INSERT INTO public.boosts (listing_id, type, starts_at, ends_at)
    VALUES (p_listing_id, bt::public.boost_type, now(), ends_at);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'spent', total_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_listing_boosts(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_listing_boosts(uuid, text[]) TO authenticated;

COMMENT ON FUNCTION public.purchase_listing_boosts(uuid, text[])
  IS 'Owner: purchase boosts for active/paused listing; prices loaded from credit_pricing (single source of truth). Same durations as moderation path.';
