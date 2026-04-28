-- Fix: enforce RLS on partner_ad_campaign_stats by switching to security_invoker.
-- Without this, the view runs with creator privileges and bypasses RLS on partner_ad_events,
-- exposing aggregated impression/click counts to any authenticated user.
-- Idempotent per DB Migration Policy v2.

ALTER VIEW public.partner_ad_campaign_stats SET (security_invoker = true);

COMMENT ON VIEW public.partner_ad_campaign_stats IS
  'Aggregated stats per campaign. security_invoker=true so RLS of partner_ad_events applies: admins see real counts, others see zeros.';
