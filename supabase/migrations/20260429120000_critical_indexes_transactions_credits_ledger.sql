-- Critical performance indexes for monetization dashboard queries.
-- transactions: indexed for status filter + date range scans (RPCs in get_monetization_*)
-- credits_ledger: indexed for user balance computation + recent activity lookup
-- partner_ad_events: composite index for the per-campaign timeseries RPC
-- Idempotent per DB Migration Policy v2.

-- Partial index on transactions: only credit-pack purchases matter for revenue queries.
-- The dashboard RPCs filter on status='approved' AND credit_pack_id IS NOT NULL AND
-- created_at >= ... — a partial composite is the sweet spot.
CREATE INDEX IF NOT EXISTS idx_transactions_status_created_at
  ON public.transactions(status, created_at DESC)
  WHERE credit_pack_id IS NOT NULL;

COMMENT ON INDEX public.idx_transactions_status_created_at IS
  'Speeds up monetization dashboard RPCs that filter by status and scan recent transactions. Partial: only credit-pack tx.';

-- Index on credits_ledger for per-user balance / history lookups.
-- The hottest query is "SELECT delta FROM credits_ledger WHERE user_id = X ORDER BY created_at DESC".
CREATE INDEX IF NOT EXISTS idx_credits_ledger_user_id_created_at
  ON public.credits_ledger(user_id, created_at DESC);

COMMENT ON INDEX public.idx_credits_ledger_user_id_created_at IS
  'Speeds up balance computation and recent activity lookup per user.';

-- Composite index on partner_ad_events for campaign timeseries RPC.
-- get_partner_ad_stats_timeseries filters by campaign_id and scans occurred_at desc.
-- The existing single-column indexes (partner_ad_events_campaign_id_idx,
-- partner_ad_events_occurred_at_idx) already help, but a composite is faster
-- for this exact query shape.
CREATE INDEX IF NOT EXISTS idx_partner_ad_events_campaign_occurred
  ON public.partner_ad_events(campaign_id, occurred_at DESC);

COMMENT ON INDEX public.idx_partner_ad_events_campaign_occurred IS
  'Composite index for campaign timeseries queries: filters campaign_id + scans occurred_at desc.';
