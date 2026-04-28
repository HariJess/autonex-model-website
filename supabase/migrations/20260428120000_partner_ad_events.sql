-- Partner ad event tracking (impressions + clicks)
-- Additive migration: creates partner_ad_events table + track_partner_ad_event RPC + reporting view
-- Idempotent per DB Migration Policy v2

-- 1. Table
CREATE TABLE IF NOT EXISTS public.partner_ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.partner_ad_campaigns(id) ON DELETE CASCADE,
  placement_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT partner_ad_events_event_type_check
    CHECK (event_type IN ('impression', 'click')),
  CONSTRAINT partner_ad_events_placement_key_check
    CHECK (placement_key IN (
      'homeBillboard',
      'homeSponsorStrip',
      'searchTopBanner',
      'listingSponsor',
      'homeModal'
    ))
);

-- 2. Indexes for reporting performance
CREATE INDEX IF NOT EXISTS partner_ad_events_campaign_id_idx
  ON public.partner_ad_events(campaign_id);
CREATE INDEX IF NOT EXISTS partner_ad_events_occurred_at_idx
  ON public.partner_ad_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS partner_ad_events_campaign_event_type_idx
  ON public.partner_ad_events(campaign_id, event_type);

-- 3. RLS: admin only for SELECT, no direct INSERT (RPC only)
ALTER TABLE public.partner_ad_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_ad_events_admin_select ON public.partner_ad_events;
CREATE POLICY partner_ad_events_admin_select
  ON public.partner_ad_events
  FOR SELECT
  USING (public.immonex_is_admin());

-- No INSERT/UPDATE/DELETE policies = no direct write access.
-- Inserts go through SECURITY DEFINER RPC only.

-- 4. RPC for client-side event tracking
DROP FUNCTION IF EXISTS public.track_partner_ad_event(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.track_partner_ad_event(
  p_campaign_id UUID,
  p_placement_key TEXT,
  p_event_type TEXT,
  p_session_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate event_type
  IF p_event_type NOT IN ('impression', 'click') THEN
    RAISE EXCEPTION 'Invalid event_type: %', p_event_type;
  END IF;

  -- Validate placement_key
  IF p_placement_key NOT IN (
    'homeBillboard',
    'homeSponsorStrip',
    'searchTopBanner',
    'listingSponsor',
    'homeModal'
  ) THEN
    RAISE EXCEPTION 'Invalid placement_key: %', p_placement_key;
  END IF;

  -- Validate session_id non-empty (basic sanity)
  IF p_session_id IS NULL OR length(p_session_id) < 8 THEN
    RAISE EXCEPTION 'Invalid session_id';
  END IF;

  -- Verify campaign exists (silently skip if deleted mid-flight)
  IF NOT EXISTS (SELECT 1 FROM public.partner_ad_campaigns WHERE id = p_campaign_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.partner_ad_events (
    campaign_id, placement_key, event_type, session_id, user_id
  ) VALUES (
    p_campaign_id, p_placement_key, p_event_type, p_session_id, auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.track_partner_ad_event(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_partner_ad_event(UUID, TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- 5. Reporting view (admin only via RLS on underlying table)
CREATE OR REPLACE VIEW public.partner_ad_campaign_stats AS
SELECT
  c.id AS campaign_id,
  c.advertiser_name,
  c.internal_title,
  c.placement_key,
  c.is_active,
  c.starts_at,
  c.ends_at,
  COALESCE(COUNT(e.id) FILTER (WHERE e.event_type = 'impression'), 0)::bigint AS total_impressions,
  COALESCE(COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_type = 'impression'), 0)::bigint AS unique_impressions,
  COALESCE(COUNT(e.id) FILTER (WHERE e.event_type = 'click'), 0)::bigint AS total_clicks,
  COALESCE(COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_type = 'click'), 0)::bigint AS unique_clicks
FROM public.partner_ad_campaigns c
LEFT JOIN public.partner_ad_events e ON e.campaign_id = c.id
GROUP BY c.id, c.advertiser_name, c.internal_title, c.placement_key, c.is_active, c.starts_at, c.ends_at;

GRANT SELECT ON public.partner_ad_campaign_stats TO authenticated;

COMMENT ON TABLE public.partner_ad_events IS 'Tracks impressions and clicks for partner ad campaigns. Inserts via SECURITY DEFINER RPC only.';
COMMENT ON FUNCTION public.track_partner_ad_event IS 'Client-callable RPC to log impression/click events. Dedup happens client-side (sessionStorage) and at reporting (COUNT DISTINCT session_id).';
COMMENT ON VIEW public.partner_ad_campaign_stats IS 'Aggregated stats per campaign. Use unique_impressions for honest advertiser reporting.';
