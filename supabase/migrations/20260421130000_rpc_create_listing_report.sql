-- =============================================================================
-- Mission 2.B — create_listing_report RPC
--
-- Canonical user-side write path for reports. Validates auth, ownership,
-- listing active status, and dedup before inserting. Errors are raised with
-- stable string codes that the frontend maps to localised messages.
--
-- Error codes (RAISE EXCEPTION message):
--   unauthenticated              — auth.uid() IS NULL
--   invalid_reason               — reason not in the 5 allowed values
--   details_required             — reason = 'other' but details blank
--   listing_not_found            — listing row missing
--   cannot_report_own_listing    — reporter is the listing owner
--   listing_not_active           — listing status <> 'active'
--   already_reported             — dedup hit on (listing, reporter)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_listing_report(
  p_listing_id UUID,
  p_reason     TEXT,
  p_details    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id     UUID := auth.uid();
  v_listing_owner   UUID;
  v_listing_status  public.listing_status;
  v_existing_report UUID;
  v_new_report_id   UUID;
BEGIN
  IF v_reporter_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated'
      USING HINT = 'User must be authenticated to report a listing';
  END IF;

  IF p_reason NOT IN ('scam', 'inappropriate', 'duplicate', 'wrong_price', 'other') THEN
    RAISE EXCEPTION 'invalid_reason'
      USING HINT = 'Reason must be one of: scam, inappropriate, duplicate, wrong_price, other';
  END IF;

  IF p_reason = 'other' AND (p_details IS NULL OR LENGTH(TRIM(p_details)) = 0) THEN
    RAISE EXCEPTION 'details_required'
      USING HINT = 'Details field is required when reason = other';
  END IF;

  SELECT l.owner_id, l.status
    INTO v_listing_owner, v_listing_status
    FROM public.listings l
   WHERE l.id = p_listing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;

  IF v_listing_owner = v_reporter_id THEN
    RAISE EXCEPTION 'cannot_report_own_listing';
  END IF;

  IF v_listing_status <> 'active'::public.listing_status THEN
    RAISE EXCEPTION 'listing_not_active'
      USING HINT = 'Only active listings can be reported';
  END IF;

  SELECT lr.id INTO v_existing_report
    FROM public.listing_reports lr
   WHERE lr.listing_id = p_listing_id
     AND lr.reporter_id = v_reporter_id;

  IF v_existing_report IS NOT NULL THEN
    RAISE EXCEPTION 'already_reported'
      USING HINT = 'You have already reported this listing';
  END IF;

  INSERT INTO public.listing_reports (listing_id, reporter_id, reason, details)
  VALUES (p_listing_id, v_reporter_id, p_reason, NULLIF(TRIM(p_details), ''))
  RETURNING id INTO v_new_report_id;

  RETURN jsonb_build_object(
    'success',   true,
    'report_id', v_new_report_id
  );
END;
$$;

COMMENT ON FUNCTION public.create_listing_report(UUID, TEXT, TEXT) IS
  'User submits a report on a listing. Validates auth, ownership, active status, dedup. Mission 2.B.';

REVOKE ALL ON FUNCTION public.create_listing_report(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_listing_report(UUID, TEXT, TEXT) TO authenticated;
