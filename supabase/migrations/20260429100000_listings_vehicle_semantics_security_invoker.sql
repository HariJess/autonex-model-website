-- Fix: enforce RLS on listings_vehicle_semantics by switching to security_invoker.
-- Without this, the view runs with creator privileges and bypasses RLS on listings.
-- Same class of bug as the partner_ad_campaign_stats fix on 28 April.
-- Idempotent per DB Migration Policy v2.

ALTER VIEW public.listings_vehicle_semantics SET (security_invoker = true);

COMMENT ON VIEW public.listings_vehicle_semantics IS
  'Semantic view over listings with computed effective columns. security_invoker=true so RLS of listings applies.';
