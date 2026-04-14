-- V1 private back-office for external partner advertising campaigns.
-- Conservative scope: manual admin management + public read via controlled RPC.

CREATE TABLE IF NOT EXISTS public.partner_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_name TEXT NOT NULL CHECK (char_length(trim(advertiser_name)) > 0),
  internal_title TEXT NOT NULL CHECK (char_length(trim(internal_title)) > 0),
  internal_description TEXT NULL,
  placement_key TEXT NOT NULL CHECK (
    placement_key IN ('homeBillboard', 'homeSponsorStrip', 'searchTopBanner', 'listingSponsor')
  ),
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image')),
  image_url TEXT NOT NULL CHECK (char_length(trim(image_url)) > 0),
  destination_url TEXT NULL,
  cta_label TEXT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 0,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT partner_ad_campaigns_dates_ok CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

ALTER TABLE public.partner_ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_ad_campaigns_admin_select" ON public.partner_ad_campaigns;
CREATE POLICY "partner_ad_campaigns_admin_select"
  ON public.partner_ad_campaigns FOR SELECT TO authenticated
  USING (public.immonex_is_admin());

DROP POLICY IF EXISTS "partner_ad_campaigns_admin_insert" ON public.partner_ad_campaigns;
CREATE POLICY "partner_ad_campaigns_admin_insert"
  ON public.partner_ad_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.immonex_is_admin());

DROP POLICY IF EXISTS "partner_ad_campaigns_admin_update" ON public.partner_ad_campaigns;
CREATE POLICY "partner_ad_campaigns_admin_update"
  ON public.partner_ad_campaigns FOR UPDATE TO authenticated
  USING (public.immonex_is_admin())
  WITH CHECK (public.immonex_is_admin());

DROP POLICY IF EXISTS "partner_ad_campaigns_admin_delete" ON public.partner_ad_campaigns;
CREATE POLICY "partner_ad_campaigns_admin_delete"
  ON public.partner_ad_campaigns FOR DELETE TO authenticated
  USING (public.immonex_is_admin());

CREATE OR REPLACE FUNCTION public.set_partner_ad_campaigns_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_partner_ad_campaigns_updated_at ON public.partner_ad_campaigns;
CREATE TRIGGER tr_partner_ad_campaigns_updated_at
  BEFORE UPDATE ON public.partner_ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_partner_ad_campaigns_updated_at();

CREATE OR REPLACE FUNCTION public.get_active_partner_campaign(p_placement_key TEXT)
RETURNS TABLE (
  id UUID,
  advertiser_name TEXT,
  placement_key TEXT,
  media_type TEXT,
  image_url TEXT,
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

-- Storage bucket for partner ad images (admin-only write).
INSERT INTO storage.buckets (id, name, public)
SELECT 'partner-ads', 'partner-ads', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'partner-ads');

DROP POLICY IF EXISTS "partner_ads_admin_insert" ON storage.objects;
CREATE POLICY "partner_ads_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-ads'
    AND public.immonex_is_admin()
  );

DROP POLICY IF EXISTS "partner_ads_admin_update" ON storage.objects;
CREATE POLICY "partner_ads_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'partner-ads'
    AND public.immonex_is_admin()
  )
  WITH CHECK (
    bucket_id = 'partner-ads'
    AND public.immonex_is_admin()
  );

DROP POLICY IF EXISTS "partner_ads_admin_delete" ON storage.objects;
CREATE POLICY "partner_ads_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-ads'
    AND public.immonex_is_admin()
  );

DROP POLICY IF EXISTS "partner_ads_public_read" ON storage.objects;
CREATE POLICY "partner_ads_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-ads');
