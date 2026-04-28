-- Admin RPCs for partner ad campaign stats dashboard.
-- Idempotent per DB Migration Policy v2. Both RPCs are SECURITY DEFINER but explicitly
-- check immonex_is_admin() at the top so non-admin callers get a clear error.

-- 1. Daily timeseries (zero-filled) for the chart.
DROP FUNCTION IF EXISTS public.get_partner_ad_stats_timeseries(UUID, INT);

CREATE OR REPLACE FUNCTION public.get_partner_ad_stats_timeseries(
  p_campaign_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  day DATE,
  total_impressions BIGINT,
  unique_impressions BIGINT,
  total_clicks BIGINT,
  unique_clicks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE := CURRENT_DATE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_days IS NULL OR p_days < 1 THEN
    p_days := 30;
  END IF;
  IF p_days > 3650 THEN
    p_days := 3650;
  END IF;

  v_start_date := v_end_date - (p_days - 1);

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date AS day
  ),
  daily_events AS (
    SELECT
      occurred_at::date AS event_day,
      COUNT(*) FILTER (WHERE event_type = 'impression') AS total_impressions,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'impression') AS unique_impressions,
      COUNT(*) FILTER (WHERE event_type = 'click') AS total_clicks,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'click') AS unique_clicks
    FROM public.partner_ad_events
    WHERE campaign_id = p_campaign_id
      AND occurred_at >= v_start_date::timestamptz
      AND occurred_at < (v_end_date + 1)::timestamptz
    GROUP BY occurred_at::date
  )
  SELECT
    ds.day,
    COALESCE(de.total_impressions, 0)::bigint,
    COALESCE(de.unique_impressions, 0)::bigint,
    COALESCE(de.total_clicks, 0)::bigint,
    COALESCE(de.unique_clicks, 0)::bigint
  FROM date_series ds
  LEFT JOIN daily_events de ON de.event_day = ds.day
  ORDER BY ds.day ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_partner_ad_stats_timeseries(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_ad_stats_timeseries(UUID, INT) TO authenticated;

COMMENT ON FUNCTION public.get_partner_ad_stats_timeseries IS
  'Returns daily impression/click counts for a campaign over the last N days. Admin-only. Zero-fills missing days.';

-- 2. Raw events export for CSV download.
DROP FUNCTION IF EXISTS public.get_partner_ad_events_export(UUID, INT);

CREATE OR REPLACE FUNCTION public.get_partner_ad_events_export(
  p_campaign_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  occurred_at TIMESTAMPTZ,
  event_type TEXT,
  placement_key TEXT,
  session_id TEXT,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_days IS NULL OR p_days < 1 THEN
    p_days := 30;
  END IF;
  IF p_days > 3650 THEN
    p_days := 3650;
  END IF;

  v_start_date := CURRENT_DATE - (p_days - 1);

  RETURN QUERY
  SELECT
    e.occurred_at,
    e.event_type,
    e.placement_key,
    e.session_id,
    e.user_id
  FROM public.partner_ad_events e
  WHERE e.campaign_id = p_campaign_id
    AND e.occurred_at >= v_start_date::timestamptz
  ORDER BY e.occurred_at DESC
  LIMIT 50000;
END;
$$;

REVOKE ALL ON FUNCTION public.get_partner_ad_events_export(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_ad_events_export(UUID, INT) TO authenticated;

COMMENT ON FUNCTION public.get_partner_ad_events_export IS
  'Returns raw events for CSV export. Admin-only. Capped at 50000 rows.';
