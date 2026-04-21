-- =============================================================================
-- Mission 2.B — Admin moderation queue RPCs
--
-- Three RPCs for the admin moderation back-office:
--   - admin_moderation_queue(p_filter TEXT) — paginated (capped at 200) list
--     with per-listing report aggregates, filtered by tab.
--   - admin_dismiss_listing_reports(p_listing_id UUID) — mark pending reports
--     as reviewed_invalid and restore the listing to active when hidden
--     purely because of the reports threshold.
--   - admin_validate_listing_reports(p_listing_id UUID, p_rejection_reason TEXT)
--     — mark pending reports as reviewed_valid and reject the listing.
--
-- Convention (all 3):
--   * Guard immonex_is_admin() at entry -> raises 'forbidden' (42501).
--   * SECURITY DEFINER with restricted search_path.
--   * Explicit aliases on every column (bug ambiguity discipline).
--   * log_admin_action for audit trail of admin writes.
--   * SELECT FOR UPDATE on listings where mutations happen (write safety).
--
-- Filter vocabulary:
--   'new'     — status=pending_review AND no pending reports         (FIFO asc)
--   'reports' — status=hidden_pending_review OR (active + pending>0) (FIFO asc)
--   'history' — status=rejected OR any reviewed report exists        (newest desc)
--   'all'     — no filter                                             (newest desc)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. admin_moderation_queue
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_moderation_queue(p_filter TEXT DEFAULT 'new')
RETURNS TABLE (
  listing_id       UUID,
  title            TEXT,
  owner_id         UUID,
  owner_email      TEXT,
  status           public.listing_status,
  reports_count    INTEGER,
  reports_reasons  TEXT[],
  last_report_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  price_mga        BIGINT,
  ville            TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_filter IS NULL OR p_filter NOT IN ('new', 'reports', 'history', 'all') THEN
    RAISE EXCEPTION 'invalid_filter' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH report_agg AS (
    SELECT
      lr.listing_id                                                                       AS agg_listing_id,
      COUNT(*) FILTER (WHERE lr.status = 'pending')::INTEGER                              AS agg_pending_count,
      COUNT(*) FILTER (WHERE lr.status IN ('reviewed_valid', 'reviewed_invalid'))::INTEGER AS agg_reviewed_count,
      ARRAY_AGG(DISTINCT lr.reason) FILTER (WHERE lr.status = 'pending')                  AS agg_pending_reasons,
      MAX(lr.created_at) FILTER (WHERE lr.status = 'pending')                             AS agg_last_pending_at
    FROM public.listing_reports lr
    GROUP BY lr.listing_id
  )
  SELECT
    l.id                                              AS listing_id,
    l.title                                           AS title,
    l.owner_id                                        AS owner_id,
    u.email::TEXT                                     AS owner_email,
    l.status                                          AS status,
    COALESCE(agg.agg_pending_count, 0)                AS reports_count,
    COALESCE(agg.agg_pending_reasons, ARRAY[]::TEXT[]) AS reports_reasons,
    agg.agg_last_pending_at                           AS last_report_at,
    l.created_at                                      AS created_at,
    l.updated_at                                      AS updated_at,
    l.price_mga                                       AS price_mga,
    l.ville                                           AS ville
  FROM public.listings l
  LEFT JOIN auth.users u ON u.id = l.owner_id
  LEFT JOIN report_agg agg ON agg.agg_listing_id = l.id
  WHERE
    CASE p_filter
      WHEN 'new'     THEN l.status = 'pending_review'::public.listing_status
                         AND COALESCE(agg.agg_pending_count, 0) = 0
      WHEN 'reports' THEN l.status = 'hidden_pending_review'::public.listing_status
                         OR (l.status = 'active'::public.listing_status
                             AND COALESCE(agg.agg_pending_count, 0) > 0)
      WHEN 'history' THEN l.status = 'rejected'::public.listing_status
                         OR COALESCE(agg.agg_reviewed_count, 0) > 0
      WHEN 'all'     THEN TRUE
      ELSE FALSE
    END
  ORDER BY
    -- history/all: newest first; new/reports: oldest first (FIFO handling).
    CASE WHEN p_filter IN ('history', 'all') THEN l.created_at END DESC,
    CASE WHEN p_filter IN ('new', 'reports') THEN l.created_at END ASC
  LIMIT 200;
END;
$$;

COMMENT ON FUNCTION public.admin_moderation_queue(TEXT) IS
  'Admin moderation queue. Filters: new | reports | history | all. Returns listings with aggregated pending-report stats. Mission 2.B.';

REVOKE ALL ON FUNCTION public.admin_moderation_queue(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_moderation_queue(TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- B. admin_dismiss_listing_reports
--    Dismisses all pending reports on a listing as 'reviewed_invalid' and
--    restores the listing to 'active' if it is currently 'hidden_pending_review'.
--    We restrict the UNHIDE to the hidden_pending_review case only: if the
--    listing was rejected for another reason, dismissing reports should not
--    re-activate it.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dismiss_listing_reports(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing          public.listings%ROWTYPE;
  v_dismissed_count  INTEGER := 0;
  v_restored         BOOLEAN := false;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT l.* INTO v_listing
    FROM public.listings l
   WHERE l.id = p_listing_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Move pending reports to reviewed_invalid.
  WITH updated AS (
    UPDATE public.listing_reports lr
       SET status      = 'reviewed_invalid',
           reviewed_at = now(),
           reviewed_by = auth.uid()
     WHERE lr.listing_id = p_listing_id
       AND lr.status = 'pending'
    RETURNING lr.id
  )
  SELECT COUNT(*)::INTEGER INTO v_dismissed_count FROM updated;

  -- Restore to active iff currently hidden_pending_review.
  IF v_listing.status = 'hidden_pending_review'::public.listing_status THEN
    UPDATE public.listings l
       SET status     = 'active'::public.listing_status,
           updated_at = now()
     WHERE l.id = p_listing_id
       AND l.status = 'hidden_pending_review'::public.listing_status;

    IF FOUND THEN
      v_restored := true;
    END IF;
  END IF;

  -- Audit trail (even if no-op, caller intent is recorded).
  PERFORM public.log_admin_action(
    'dismiss_listing_reports',
    v_listing.owner_id,
    'listing',
    p_listing_id,
    jsonb_build_object(
      'dismissed_count', v_dismissed_count,
      'restored',        v_restored,
      'prior_status',    v_listing.status
    )
  );

  RETURN jsonb_build_object(
    'success',          true,
    'dismissed_count',  v_dismissed_count,
    'restored',         v_restored
  );
END;
$$;

COMMENT ON FUNCTION public.admin_dismiss_listing_reports(UUID) IS
  'Admin dismisses all pending reports on a listing as reviewed_invalid; unhides the listing iff currently hidden_pending_review. Mission 2.B.';

REVOKE ALL ON FUNCTION public.admin_dismiss_listing_reports(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dismiss_listing_reports(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- C. admin_validate_listing_reports
--    Validates pending reports as 'reviewed_valid' and rejects the listing
--    with the provided rejection_reason. Does not refund credits (rejecting
--    due to reports is not the same flow as rejecting a pending_review draft
--    — the listing was published, so the credit spend is honoured).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_validate_listing_reports(
  p_listing_id       UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing          public.listings%ROWTYPE;
  v_validated_count  INTEGER := 0;
  v_trimmed_reason   TEXT;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_trimmed_reason := NULLIF(TRIM(COALESCE(p_rejection_reason, '')), '');
  IF v_trimmed_reason IS NULL OR length(v_trimmed_reason) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '23514';
  END IF;

  SELECT l.* INTO v_listing
    FROM public.listings l
   WHERE l.id = p_listing_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  WITH updated AS (
    UPDATE public.listing_reports lr
       SET status      = 'reviewed_valid',
           reviewed_at = now(),
           reviewed_by = auth.uid()
     WHERE lr.listing_id = p_listing_id
       AND lr.status = 'pending'
    RETURNING lr.id
  )
  SELECT COUNT(*)::INTEGER INTO v_validated_count FROM updated;

  UPDATE public.listings l
     SET status              = 'rejected'::public.listing_status,
         rejection_reason    = v_trimmed_reason,
         pending_boost_types = '[]'::jsonb,
         updated_at          = now()
   WHERE l.id = p_listing_id;

  PERFORM public.log_admin_action(
    'validate_listing_reports',
    v_listing.owner_id,
    'listing',
    p_listing_id,
    jsonb_build_object(
      'validated_count',  v_validated_count,
      'rejection_reason', v_trimmed_reason,
      'prior_status',     v_listing.status
    )
  );

  RETURN jsonb_build_object(
    'success',          true,
    'validated_count',  v_validated_count
  );
END;
$$;

COMMENT ON FUNCTION public.admin_validate_listing_reports(UUID, TEXT) IS
  'Admin validates pending reports (reviewed_valid) and rejects the listing with the provided reason. Mission 2.B.';

REVOKE ALL ON FUNCTION public.admin_validate_listing_reports(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_validate_listing_reports(UUID, TEXT) TO authenticated;
