-- =============================================================================
-- Mission 2.B — listing_reports table + RLS
--
-- User-submitted reports on listings. Scope:
--   - Authenticated users only (no anonymous reports, anti-abuse).
--   - One report per (listing_id, reporter_id) via UNIQUE constraint.
--   - Users cannot report their own listings (enforced both in RLS INSERT
--     policy and in the create_listing_report RPC as a defense-in-depth layer).
--   - Reasons standardised to 5 values via CHECK constraint.
--   - When reason = 'other', details TEXT is required (non-empty).
--   - Admin visibility via immonex_is_admin() in SELECT / UPDATE policies.
--
-- Status transitions:
--   pending -> reviewed_valid   (admin_validate_listing_reports)
--   pending -> reviewed_invalid (admin_dismiss_listing_reports)
-- Admins never write pending (only the create_listing_report RPC writes).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.listing_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL CHECK (reason IN ('scam', 'inappropriate', 'duplicate', 'wrong_price', 'other')),
  details      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed_valid', 'reviewed_invalid')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT details_required_for_other CHECK (
    (reason <> 'other') OR (details IS NOT NULL AND LENGTH(TRIM(details)) > 0)
  ),
  CONSTRAINT unique_report_per_user_per_listing UNIQUE (listing_id, reporter_id)
);

COMMENT ON TABLE public.listing_reports IS
  'User-submitted reports on listings. Mission 2.B. One report per (listing, reporter). Admin-only UPDATE.';
COMMENT ON COLUMN public.listing_reports.status IS
  'pending = awaiting admin review. reviewed_valid = admin confirmed the report was founded (listing rejected). reviewed_invalid = admin dismissed the report (listing restored).';

-- Hot-path indexes
CREATE INDEX IF NOT EXISTS idx_listing_reports_listing_status
  ON public.listing_reports (listing_id, status);
CREATE INDEX IF NOT EXISTS idx_listing_reports_status_created
  ON public.listing_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_reports_reporter
  ON public.listing_reports (reporter_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

-- INSERT: authenticated user reports an active listing owned by someone else.
-- Note: the create_listing_report RPC is the canonical write path and adds
-- richer error codes (already_reported, listing_not_active, etc.). This RLS
-- policy is the safety net for direct table inserts if ever attempted.
DROP POLICY IF EXISTS "users_can_insert_reports" ON public.listing_reports;
CREATE POLICY "users_can_insert_reports"
  ON public.listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND listing_id IN (
      SELECT l.id FROM public.listings l
      WHERE l.owner_id <> auth.uid()
        AND l.status = 'active'::public.listing_status
    )
  );

-- SELECT: reporter sees own reports; admin sees all.
DROP POLICY IF EXISTS "users_see_own_reports_admin_sees_all" ON public.listing_reports;
CREATE POLICY "users_see_own_reports_admin_sees_all"
  ON public.listing_reports
  FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid() OR public.immonex_is_admin()
  );

-- UPDATE: admin only. Targets status transitions pending -> reviewed_*.
DROP POLICY IF EXISTS "admin_can_update_reports" ON public.listing_reports;
CREATE POLICY "admin_can_update_reports"
  ON public.listing_reports
  FOR UPDATE
  TO authenticated
  USING (public.immonex_is_admin())
  WITH CHECK (public.immonex_is_admin());

-- No DELETE policy: reports are append-only history. Admin cascade via
-- listing/auth.users deletion handles physical removal when needed.
