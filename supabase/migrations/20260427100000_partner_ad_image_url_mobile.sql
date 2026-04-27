-- Add image_url_mobile column to partner_ad_campaigns
-- Optional field; if NULL, the existing image_url is used as fallback for all viewports.

ALTER TABLE public.partner_ad_campaigns
  ADD COLUMN IF NOT EXISTS image_url_mobile TEXT NULL;

COMMENT ON COLUMN public.partner_ad_campaigns.image_url_mobile IS
  'Optional mobile-specific creative. If NULL, image_url is used for all viewports.';

-- Drop the existing function before recreating with new return type.
-- Required because CREATE OR REPLACE cannot change return type (RETURNS TABLE columns).
DROP FUNCTION IF EXISTS public.get_active_partner_campaign(TEXT);

-- Update the read RPC to return the new column.
CREATE OR REPLACE FUNCTION public.get_active_partner_campaign(p_placement_key TEXT)
RETURNS TABLE (
  id UUID,
  advertiser_name TEXT,
  placement_key TEXT,
  media_type TEXT,
  image_url TEXT,
  image_url_mobile TEXT,
  destination_url TEXT,
  cta_label TEXT
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
    c.cta_label
  FROM public.partner_ad_campaigns c
  WHERE c.placement_key = p_placement_key
    AND c.is_active = true
    AND c.starts_at <= now()
    AND (c.ends_at IS NULL OR c.ends_at >= now())
  ORDER BY c.priority DESC, c.starts_at DESC, c.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_partner_campaign(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_partner_campaign(TEXT) TO anon, authenticated;
