-- =============================================================================
-- Mission 2.B — Auto-hide trigger on listing_reports
--
-- Fires AFTER INSERT on listing_reports only (NOT on UPDATE/DELETE). When the
-- number of pending reports on a listing reaches >= 3 and the listing is
-- currently 'active', the listing is pushed to 'hidden_pending_review' and a
-- system entry is appended to admin_audit_log.
--
-- Why INSERT-only:
--   Unidirectional accumulation. Admin processes reports via explicit
--   admin_dismiss_listing_reports / admin_validate_listing_reports RPCs that
--   set status to reviewed_invalid / reviewed_valid. If the trigger fired on
--   UPDATE/DELETE too, dismissing reports would reduce the pending count and
--   repeatedly flip the listing back to hidden whenever a new report lands,
--   fighting the admin's explicit unhide.
--
-- Audit logging:
--   admin_audit_log.actor_user_id = NULL to signal a system action.
--   Calling log_admin_action() would set actor = the reporter's auth.uid(),
--   which misattributes the hide to the 3rd reporter. We INSERT directly.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_listing_auto_hide_on_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_count  INTEGER;
  v_listing_status public.listing_status;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
    FROM public.listing_reports lr
   WHERE lr.listing_id = NEW.listing_id
     AND lr.status = 'pending';

  SELECT l.status INTO v_listing_status
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  IF v_pending_count >= 3 AND v_listing_status = 'active'::public.listing_status THEN
    UPDATE public.listings
       SET status     = 'hidden_pending_review'::public.listing_status,
           updated_at = now()
     WHERE id = NEW.listing_id
       AND status = 'active'::public.listing_status;

    -- System-attributed audit entry. actor_user_id = NULL by design.
    INSERT INTO public.admin_audit_log (
      actor_user_id,
      action,
      target_entity_type,
      target_entity_id,
      metadata
    ) VALUES (
      NULL,
      'system_auto_hide_listing_reports_threshold',
      'listing',
      NEW.listing_id,
      jsonb_build_object(
        'pending_reports_count', v_pending_count,
        'trigger_report_id',     NEW.id,
        'reporter_id',           NEW.reporter_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_listing_auto_hide_on_reports IS
  'Auto-hides a listing to hidden_pending_review once 3+ pending reports accumulate. Fires AFTER INSERT only (unidirectional accumulation). Mission 2.B.';

DROP TRIGGER IF EXISTS tr_enforce_listing_auto_hide_on_reports ON public.listing_reports;
CREATE TRIGGER tr_enforce_listing_auto_hide_on_reports
  AFTER INSERT ON public.listing_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_listing_auto_hide_on_reports();
