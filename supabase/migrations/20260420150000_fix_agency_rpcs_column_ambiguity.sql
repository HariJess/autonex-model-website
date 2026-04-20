-- =============================================================================
-- Fix: column reference 'id' is ambiguous in admin_list_agencies_with_stats
--
-- Same pattern as 20260420130000 (promo_code_id ambiguity): the RPC declares
-- OUT parameters in RETURNS TABLE (id uuid, name text, status agency_status,
-- ...) which then collide with unqualified column references inside nested
-- scalar subqueries.
--
--   Before (ambiguous):
--     (SELECT COUNT(*)::INT FROM public.listings l
--        WHERE l.owner_id IN (SELECT id FROM public.profiles WHERE agency_id = a.id)
--     ) AS listings_count,
--
--   After:
--     (SELECT COUNT(*)::INT FROM public.listings l
--        WHERE l.owner_id IN (
--          SELECT p2.id FROM public.profiles p2 WHERE p2.agency_id = a.id
--        )
--     ) AS listings_count,
--
-- Distinct aliases p2/p3 per nested subquery for clarity (each has its own
-- scope but different aliases make the intent obvious).
--
-- admin_agency_detail is NOT impacted: RETURNS jsonb (scalar), no OUT
-- parameters, all references already qualified. Left untouched.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_list_agencies_with_stats()
RETURNS TABLE (
  id                     UUID,
  name                   TEXT,
  slug                   TEXT,
  status                 public.agency_status,
  verified               BOOLEAN,
  created_at             TIMESTAMPTZ,
  city                   TEXT,
  members_count          INT,
  listings_count         INT,
  active_listings_count  INT,
  rejection_reason       TEXT,
  logo_url               TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.slug,
    a.status,
    a.verified,
    a.created_at,
    a.city,
    (SELECT COUNT(*)::INT FROM public.profiles p WHERE p.agency_id = a.id) AS members_count,
    (SELECT COUNT(*)::INT FROM public.listings l
       WHERE l.owner_id IN (
         SELECT p2.id FROM public.profiles p2 WHERE p2.agency_id = a.id
       )
    ) AS listings_count,
    (SELECT COUNT(*)::INT FROM public.listings l
       WHERE l.owner_id IN (
         SELECT p3.id FROM public.profiles p3 WHERE p3.agency_id = a.id
       )
         AND l.status = 'active'::public.listing_status
    ) AS active_listings_count,
    a.rejection_reason,
    a.logo_url
  FROM public.agencies a
  ORDER BY a.created_at DESC NULLS LAST;
END;
$$;

-- GRANTs preserved by CREATE OR REPLACE (signature unchanged).
