-- Launch-readiness hardening pass (targeted, non-breaking)

-- -----------------------------------------------------------------------------
-- 1) Prevent profile privilege escalation by non-admin users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service/admin flows can bypass user-level checks.
  IF auth.uid() IS NULL OR public.immonex_is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'forbidden_profile_role_change' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- -----------------------------------------------------------------------------
-- 2) Tighten profile and phone reveal RPCs
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profile_for_listing_display(p_owner_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  role public.user_role,
  agency_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.role, p.agency_id
  FROM public.profiles p
  WHERE p.id = p_owner_id
    AND (
      (auth.uid() IS NOT NULL AND auth.uid() = p.id)
      OR EXISTS (
        SELECT 1
        FROM public.listings l
        WHERE l.owner_id = p.id
          AND l.status = 'active'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_listing_owner_phone(p_listing_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.phone
  FROM public.listings l
  JOIN public.profiles p ON p.id = l.owner_id
  WHERE l.id = p_listing_id
    AND l.status = 'active'
    AND (
      (auth.uid() IS NOT NULL AND auth.uid() = l.owner_id)
      OR public.immonex_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.leads ld
        WHERE ld.listing_id = l.id
          AND ld.type = 'phone_reveal'::public.lead_type
          AND ld.created_at >= now() - interval '15 minutes'
      )
    )
  LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- 3) Leads anti-spam / abuse hardening
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create leads with info" ON public.leads;
CREATE POLICY "Anyone can create leads with info and active listing"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      NULLIF(trim(COALESCE(visitor_name, '')), '') IS NOT NULL
      OR NULLIF(trim(COALESCE(visitor_email, '')), '') IS NOT NULL
      OR NULLIF(trim(COALESCE(visitor_phone, '')), '') IS NOT NULL
    )
    AND EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND l.status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_lead_submission_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.visitor_name := NULLIF(trim(COALESCE(NEW.visitor_name, '')), '');
  NEW.visitor_email := NULLIF(lower(trim(COALESCE(NEW.visitor_email, ''))), '');
  NEW.visitor_phone := NULLIF(trim(COALESCE(NEW.visitor_phone, '')), '');
  NEW.message := NULLIF(trim(COALESCE(NEW.message, '')), '');
  NEW.type := COALESCE(NEW.type, 'contact_form'::public.lead_type);

  IF NEW.type = 'contact_form'::public.lead_type
     AND NEW.visitor_name IS NULL
     AND NEW.visitor_email IS NULL
     AND NEW.visitor_phone IS NULL THEN
    RAISE EXCEPTION 'lead_contact_required' USING ERRCODE = '23514';
  END IF;

  IF NEW.message IS NOT NULL AND length(NEW.message) > 1000 THEN
    RAISE EXCEPTION 'lead_message_too_long' USING ERRCODE = '23514';
  END IF;

  IF NEW.type = 'phone_reveal'::public.lead_type THEN
    NEW.message := NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.listing_id = NEW.listing_id
      AND COALESCE(l.type, 'contact_form'::public.lead_type) = NEW.type
      AND COALESCE(lower(l.visitor_email), '') = COALESCE(NEW.visitor_email, '')
      AND COALESCE(l.visitor_phone, '') = COALESCE(NEW.visitor_phone, '')
      AND COALESCE(l.visitor_name, '') = COALESCE(NEW.visitor_name, '')
      AND l.created_at >= now() - interval '30 seconds'
  ) THEN
    RAISE EXCEPTION 'lead_rate_limited' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lead_submission_rules ON public.leads;
CREATE TRIGGER trg_enforce_lead_submission_rules
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.enforce_lead_submission_rules();

-- -----------------------------------------------------------------------------
-- 4) Search analytics anti-spam and sanity limits
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "search_analytics_insert_anon_auth" ON public.search_analytics_events;
CREATE POLICY "search_analytics_insert_anon_auth_limited"
  ON public.search_analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(COALESCE(session_id, '')) <= 128
    AND length(COALESCE(ville, '')) <= 120
    AND length(COALESCE(path, '')) <= 300
  );

CREATE OR REPLACE FUNCTION public.enforce_search_analytics_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.session_id := NULLIF(left(COALESCE(NEW.session_id, ''), 128), '');
  NEW.ville := NULLIF(left(COALESCE(NEW.ville, ''), 120), '');
  NEW.path := NULLIF(left(COALESCE(NEW.path, ''), 300), '');
  NEW.quartier_libre := NULLIF(left(COALESCE(NEW.quartier_libre, ''), 120), '');

  IF NEW.quartiers IS NOT NULL THEN
    NEW.quartiers := NEW.quartiers[1:20];
  END IF;
  IF NEW.property_types IS NOT NULL THEN
    NEW.property_types := NEW.property_types[1:10];
  END IF;
  IF NEW.rooms IS NOT NULL THEN
    NEW.rooms := NEW.rooms[1:8];
  END IF;
  IF NEW.bathrooms IS NOT NULL THEN
    NEW.bathrooms := NEW.bathrooms[1:8];
  END IF;
  IF NEW.equipments IS NOT NULL THEN
    NEW.equipments := NEW.equipments[1:20];
  END IF;

  IF NEW.session_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.search_analytics_events e
    WHERE e.session_id = NEW.session_id
      AND COALESCE(e.path, '') = COALESCE(NEW.path, '')
      AND COALESCE(e.ville, '') = COALESCE(NEW.ville, '')
      AND e.created_at >= now() - interval '15 seconds'
  ) THEN
    RAISE EXCEPTION 'search_analytics_rate_limited' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_search_analytics_limits ON public.search_analytics_events;
CREATE TRIGGER trg_enforce_search_analytics_limits
BEFORE INSERT ON public.search_analytics_events
FOR EACH ROW
EXECUTE FUNCTION public.enforce_search_analytics_limits();

-- -----------------------------------------------------------------------------
-- 5) listing_photos metadata visibility aligned with listing visibility
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Photos are public" ON public.listing_photos;
CREATE POLICY "listing_photos_select_active_or_owner_or_admin"
  ON public.listing_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_photos.listing_id
        AND (
          l.status = 'active'
          OR l.owner_id = auth.uid()
          OR public.immonex_is_admin()
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 6) Transaction integrity guard for user inserts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanitize_transaction_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.immonex_is_admin() THEN
    NEW.status := 'pending'::public.payment_status;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.rejection_reason := NULL;
    NEW.credits_granted_at := NULL;
    NEW.admin_note := NULL;
  END IF;

  NEW.reference := NULLIF(trim(COALESCE(NEW.reference, '')), '');
  NEW.payment_proof_url := NULLIF(trim(COALESCE(NEW.payment_proof_url, '')), '');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_transaction_insert ON public.transactions;
CREATE TRIGGER trg_sanitize_transaction_insert
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.sanitize_transaction_insert();

-- -----------------------------------------------------------------------------
-- 7) View inflation reduction: restrict increment RPC execution scope
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.increment_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_views(uuid) TO authenticated;

