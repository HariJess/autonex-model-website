-- Aggregate active-listing counts per city in a single round-trip.
-- Replaces the front-end's N head-count fallback in useListings.ts:480.
-- Public-safe: the listings.status='active' filter mirrors the public RLS surface.

CREATE OR REPLACE FUNCTION public.get_active_listing_counts_by_ville(p_villes text[])
RETURNS TABLE (ville text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.ville, COUNT(*)::bigint
  FROM public.listings l
  WHERE l.status = 'active'
    AND l.ville = ANY(p_villes)
  GROUP BY l.ville
$$;

REVOKE ALL ON FUNCTION public.get_active_listing_counts_by_ville(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_listing_counts_by_ville(text[]) TO anon, authenticated;

COMMENT ON FUNCTION public.get_active_listing_counts_by_ville(text[])
  IS 'Returns active listing count per city for the given list. Public-safe (status=active mirrors public RLS).';
