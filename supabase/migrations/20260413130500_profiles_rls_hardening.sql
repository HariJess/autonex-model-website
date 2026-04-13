-- =============================================================================
-- Hardening public.profiles: remove world-readable SELECT on the full row.
-- Sensitive fields (phone, credits_balance) must not be enumerable by anonymous clients.
-- Safe display paths use SECURITY DEFINER RPCs with narrow projections.
-- =============================================================================

DROP POLICY IF EXISTS "Public profiles readable" ON public.profiles;

-- Authenticated: own row (full row for dashboard / publish / settings)
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admins: operational moderation
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.immonex_is_admin());

-- -----------------------------------------------------------------------------
-- RPC: owner display for an active listing (no phone — use get_listing_owner_phone)
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
      SELECT 1 FROM public.listings l
      WHERE l.owner_id = p.id
      AND l.status IN (
        'active',
        'pending_review',
        'pending_payment',
        'pending_payment_verification',
        'paused'
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_profile_for_listing_display(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_for_listing_display(uuid) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: phone for an active listing (narrower than reading all profiles)
-- -----------------------------------------------------------------------------
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
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_listing_owner_phone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_owner_phone(uuid) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: agent user ids for an agency (UUIDs only — used for listing filters on /agence/:slug)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_agency_agent_ids(p_agency_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.agency_id IS NOT DISTINCT FROM p_agency_id;
$$;

REVOKE ALL ON FUNCTION public.list_agency_agent_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_agency_agent_ids(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_profile_for_listing_display(uuid) IS 'Safe owner row slice for listing UI; excludes phone and credits.';
COMMENT ON FUNCTION public.get_listing_owner_phone(uuid) IS 'Contact phone for active listing owner; use after user intent (e.g. reveal).';
COMMENT ON FUNCTION public.list_agency_agent_ids(uuid) IS 'Lists profile ids belonging to an agency for public agency pages.';
