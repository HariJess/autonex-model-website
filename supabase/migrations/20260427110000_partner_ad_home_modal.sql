-- Add 'homeModal' placement_key value and audience targeting.
-- Additive + idempotent: existing campaigns get audience='all' (current behavior preserved).

-- Step 1: Replace placement_key CHECK constraint to include 'homeModal'.
ALTER TABLE public.partner_ad_campaigns
  DROP CONSTRAINT IF EXISTS partner_ad_campaigns_placement_key_check;

ALTER TABLE public.partner_ad_campaigns
  ADD CONSTRAINT partner_ad_campaigns_placement_key_check
  CHECK (placement_key IN (
    'homeBillboard',
    'homeSponsorStrip',
    'searchTopBanner',
    'listingSponsor',
    'homeModal'
  ));

-- Step 2: Add audience column with CHECK and default 'all'.
ALTER TABLE public.partner_ad_campaigns
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all';

ALTER TABLE public.partner_ad_campaigns
  DROP CONSTRAINT IF EXISTS partner_ad_campaigns_audience_check;

ALTER TABLE public.partner_ad_campaigns
  ADD CONSTRAINT partner_ad_campaigns_audience_check
  CHECK (audience IN ('all', 'guests', 'authenticated'));

COMMENT ON COLUMN public.partner_ad_campaigns.audience IS
  'Target audience: all (everyone), guests (anonymous only), authenticated (logged-in only).';

-- Step 3: Replace the read RPC to expose audience and filter by auth.uid().
-- DROP FUNCTION required: CREATE OR REPLACE cannot change RETURNS TABLE columns.
DROP FUNCTION IF EXISTS public.get_active_partner_campaign(TEXT);

CREATE OR REPLACE FUNCTION public.get_active_partner_campaign(p_placement_key TEXT)
RETURNS TABLE (
  id UUID,
  advertiser_name TEXT,
  placement_key TEXT,
  media_type TEXT,
  image_url TEXT,
  image_url_mobile TEXT,
  destination_url TEXT,
  cta_label TEXT,
  audience TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.advertiser_name,
    c.placement_key,
    c.media_type,
    c.image_url,
    c.image_url_mobile,
    c.destination_url,
    c.cta_label,
    c.audience
  FROM public.partner_ad_campaigns c
  WHERE c.placement_key = p_placement_key
    AND c.is_active = true
    AND c.starts_at <= now()
    AND (c.ends_at IS NULL OR c.ends_at >= now())
    AND (
      c.audience = 'all'
      OR (c.audience = 'authenticated' AND auth.uid() IS NOT NULL)
      OR (c.audience = 'guests' AND auth.uid() IS NULL)
    )
  ORDER BY c.priority DESC, c.starts_at DESC, c.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_partner_campaign(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_partner_campaign(TEXT) TO anon, authenticated;
