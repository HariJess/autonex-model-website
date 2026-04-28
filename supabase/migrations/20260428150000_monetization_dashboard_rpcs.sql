-- Admin RPCs for the revenue analytics dashboard.
-- Idempotent per DB Migration Policy v2. SECURITY DEFINER + immonex_is_admin() check at the top.
-- Revenue = status='approved' transactions only. Net revenue = amount_mga - promo_discount_mga.
-- Status enum buckets used here:
--   approved -> revenue
--   rejected | failed | cancelled -> rejected bucket
--   pending  | under_review       -> pending bucket
--   success                       -> intentionally NOT counted as revenue (admin must approve to grant credits)

-- ============================================================================
-- 1. Daily timeseries for the chart + per-day totals
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_monetization_overview(INT);

CREATE OR REPLACE FUNCTION public.get_monetization_overview(p_days INT DEFAULT 30)
RETURNS TABLE (
  day DATE,
  net_revenue_mga BIGINT,
  gross_revenue_mga BIGINT,
  promo_discount_mga BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  pending_count BIGINT
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
  daily_data AS (
    SELECT
      created_at::date AS event_day,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_mga - promo_discount_mga ELSE 0 END), 0) AS net_revenue_mga,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_mga ELSE 0 END), 0) AS gross_revenue_mga,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN promo_discount_mga ELSE 0 END), 0) AS promo_discount_mga,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE status IN ('rejected', 'failed', 'cancelled')) AS rejected_count,
      COUNT(*) FILTER (WHERE status IN ('pending', 'under_review')) AS pending_count
    FROM public.transactions
    WHERE created_at >= v_start_date::timestamptz
      AND created_at < (v_end_date + 1)::timestamptz
      AND credit_pack_id IS NOT NULL
    GROUP BY created_at::date
  )
  SELECT
    ds.day,
    COALESCE(dd.net_revenue_mga, 0)::bigint,
    COALESCE(dd.gross_revenue_mga, 0)::bigint,
    COALESCE(dd.promo_discount_mga, 0)::bigint,
    COALESCE(dd.approved_count, 0)::bigint,
    COALESCE(dd.rejected_count, 0)::bigint,
    COALESCE(dd.pending_count, 0)::bigint
  FROM date_series ds
  LEFT JOIN daily_data dd ON dd.event_day = ds.day
  ORDER BY ds.day ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_monetization_overview(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monetization_overview(INT) TO authenticated;

COMMENT ON FUNCTION public.get_monetization_overview IS
  'Daily monetization stats over last N days. Admin-only. Net revenue = amount_mga - promo_discount_mga on approved credit-pack transactions.';

-- ============================================================================
-- 2. KPIs all-time + month-over-month
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_monetization_summary();

CREATE OR REPLACE FUNCTION public.get_monetization_summary()
RETURNS TABLE (
  net_revenue_alltime BIGINT,
  net_revenue_this_month BIGINT,
  net_revenue_last_month BIGINT,
  approved_count_alltime BIGINT,
  approved_count_this_month BIGINT,
  approved_count_last_month BIGINT,
  rejected_count_alltime BIGINT,
  pending_count_alltime BIGINT,
  approval_rate_pct NUMERIC,
  avg_basket_mga NUMERIC,
  total_promo_discount_mga BIGINT,
  total_promo_bonus_credits BIGINT,
  credits_purchased_alltime BIGINT,
  credits_spent_alltime BIGINT,
  credits_in_circulation BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now DATE := CURRENT_DATE;
  v_this_month_start DATE := date_trunc('month', v_now)::date;
  v_last_month_start DATE := (date_trunc('month', v_now) - INTERVAL '1 month')::date;
  v_last_month_end DATE := (v_this_month_start - INTERVAL '1 day')::date;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  WITH tx_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_mga - promo_discount_mga ELSE 0 END), 0)::bigint AS net_revenue_alltime,
      COALESCE(SUM(CASE WHEN status = 'approved' AND created_at::date >= v_this_month_start THEN amount_mga - promo_discount_mga ELSE 0 END), 0)::bigint AS net_revenue_this_month,
      COALESCE(SUM(CASE WHEN status = 'approved' AND created_at::date >= v_last_month_start AND created_at::date <= v_last_month_end THEN amount_mga - promo_discount_mga ELSE 0 END), 0)::bigint AS net_revenue_last_month,
      COUNT(*) FILTER (WHERE status = 'approved')::bigint AS approved_count_alltime,
      COUNT(*) FILTER (WHERE status = 'approved' AND created_at::date >= v_this_month_start)::bigint AS approved_count_this_month,
      COUNT(*) FILTER (WHERE status = 'approved' AND created_at::date >= v_last_month_start AND created_at::date <= v_last_month_end)::bigint AS approved_count_last_month,
      COUNT(*) FILTER (WHERE status IN ('rejected', 'failed', 'cancelled'))::bigint AS rejected_count_alltime,
      COUNT(*) FILTER (WHERE status IN ('pending', 'under_review'))::bigint AS pending_count_alltime,
      COUNT(*) FILTER (WHERE status IN ('approved', 'rejected', 'failed', 'cancelled'))::bigint AS final_count,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN promo_discount_mga ELSE 0 END), 0)::bigint AS total_promo_discount_mga,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN promo_bonus_credits ELSE 0 END), 0)::bigint AS total_promo_bonus_credits
    FROM public.transactions
    WHERE credit_pack_id IS NOT NULL
  ),
  ledger_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::bigint AS credits_purchased_alltime,
      COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0)::bigint AS credits_spent_alltime,
      COALESCE(SUM(delta), 0)::bigint AS credits_in_circulation
    FROM public.credits_ledger
  )
  SELECT
    t.net_revenue_alltime,
    t.net_revenue_this_month,
    t.net_revenue_last_month,
    t.approved_count_alltime,
    t.approved_count_this_month,
    t.approved_count_last_month,
    t.rejected_count_alltime,
    t.pending_count_alltime,
    CASE
      WHEN t.final_count > 0
        THEN ROUND((t.approved_count_alltime::numeric / t.final_count::numeric) * 100, 2)
      ELSE 0
    END AS approval_rate_pct,
    CASE
      WHEN t.approved_count_alltime > 0
        THEN ROUND(t.net_revenue_alltime::numeric / t.approved_count_alltime::numeric, 0)
      ELSE 0
    END AS avg_basket_mga,
    t.total_promo_discount_mga,
    t.total_promo_bonus_credits,
    l.credits_purchased_alltime,
    l.credits_spent_alltime,
    l.credits_in_circulation
  FROM tx_stats t, ledger_stats l;
END;
$$;

REVOKE ALL ON FUNCTION public.get_monetization_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monetization_summary() TO authenticated;

COMMENT ON FUNCTION public.get_monetization_summary IS
  'All-time monetization KPIs + month-over-month comparison + credits ledger snapshot. Admin-only.';

-- ============================================================================
-- 3. Top users by net revenue (joins auth.users for email — profiles has no email column)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_monetization_top_users(INT, INT);

CREATE OR REPLACE FUNCTION public.get_monetization_top_users(
  p_limit INT DEFAULT 10,
  p_days INT DEFAULT 3650
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  approved_count BIGINT,
  total_net_revenue_mga BIGINT,
  last_purchase_at TIMESTAMPTZ
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

  IF p_limit IS NULL OR p_limit < 1 THEN p_limit := 10; END IF;
  IF p_limit > 100 THEN p_limit := 100; END IF;
  IF p_days IS NULL OR p_days < 1 THEN p_days := 3650; END IF;
  IF p_days > 3650 THEN p_days := 3650; END IF;

  v_start_date := CURRENT_DATE - (p_days - 1);

  RETURN QUERY
  SELECT
    t.user_id,
    u.email::text,
    p.full_name::text,
    COUNT(*)::bigint AS approved_count,
    COALESCE(SUM(t.amount_mga - t.promo_discount_mga), 0)::bigint AS total_net_revenue_mga,
    MAX(t.created_at) AS last_purchase_at
  FROM public.transactions t
  LEFT JOIN public.profiles p ON p.id = t.user_id
  LEFT JOIN auth.users u ON u.id = t.user_id
  WHERE t.status = 'approved'
    AND t.credit_pack_id IS NOT NULL
    AND t.created_at >= v_start_date::timestamptz
  GROUP BY t.user_id, u.email, p.full_name
  ORDER BY total_net_revenue_mga DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_monetization_top_users(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monetization_top_users(INT, INT) TO authenticated;

COMMENT ON FUNCTION public.get_monetization_top_users IS
  'Top buyers by net revenue. Admin-only. Joins auth.users for email and profiles for full_name.';

-- ============================================================================
-- 4. Pack performance + payment method breakdown
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_monetization_breakdowns(INT);

CREATE OR REPLACE FUNCTION public.get_monetization_breakdowns(p_days INT DEFAULT 3650)
RETURNS TABLE (
  dimension TEXT,
  label TEXT,
  approved_count BIGINT,
  total_net_revenue_mga BIGINT
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

  IF p_days IS NULL OR p_days < 1 THEN p_days := 3650; END IF;
  IF p_days > 3650 THEN p_days := 3650; END IF;

  v_start_date := CURRENT_DATE - (p_days - 1);

  RETURN QUERY
  SELECT
    'pack'::text AS dimension,
    COALESCE(cp.name, t.credit_pack_id, 'Inconnu')::text AS label,
    COUNT(*)::bigint AS approved_count,
    COALESCE(SUM(t.amount_mga - t.promo_discount_mga), 0)::bigint AS total_net_revenue_mga
  FROM public.transactions t
  LEFT JOIN public.credit_packs cp ON cp.id = t.credit_pack_id
  WHERE t.status = 'approved'
    AND t.credit_pack_id IS NOT NULL
    AND t.created_at >= v_start_date::timestamptz
  GROUP BY cp.name, t.credit_pack_id
  UNION ALL
  SELECT
    'method'::text AS dimension,
    COALESCE(t.method::text, 'Inconnu')::text AS label,
    COUNT(*)::bigint AS approved_count,
    COALESCE(SUM(t.amount_mga - t.promo_discount_mga), 0)::bigint AS total_net_revenue_mga
  FROM public.transactions t
  WHERE t.status = 'approved'
    AND t.credit_pack_id IS NOT NULL
    AND t.created_at >= v_start_date::timestamptz
  GROUP BY t.method
  ORDER BY dimension ASC, total_net_revenue_mga DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_monetization_breakdowns(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monetization_breakdowns(INT) TO authenticated;

COMMENT ON FUNCTION public.get_monetization_breakdowns IS
  'Breakdowns by credit pack and by payment method on approved credit-pack transactions over last N days. Admin-only.';
