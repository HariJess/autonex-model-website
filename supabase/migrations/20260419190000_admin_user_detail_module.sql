-- =============================================================================
-- Admin user detail module
--
-- Backstage module that lets admins drill into a user from /admin/utilisateurs:
--   - View identity, listings, credits ledger, transactions, boosts (read).
--   - Take privileged actions (write): grant/withdraw credits, change role,
--     suspend / unsuspend user, hard-delete user.
-- Every privileged action is:
--   * SECURITY DEFINER (bypasses RLS for the controlled mutation)
--   * Guarded by public.immonex_is_admin() at function entry
--   * Self-action protected (admin cannot demote, suspend or delete themselves)
--   * Audited by inserting a row into the new admin_audit_log table via the
--     log_admin_action() helper, capturing target email at action time so the
--     trace survives later target deletion.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Suspended state on profiles (idempotent)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_by UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.suspended
  IS 'When true, the user is suspended (admin_suspend_user). Login still works (Supabase auth) but listings have been pushed to status=rejected with rejection_reason="owner_suspended:<reason>".';
COMMENT ON COLUMN public.profiles.suspended_by
  IS 'Admin who triggered the suspension. SET NULL on admin deletion to preserve trace integrity.';

-- -----------------------------------------------------------------------------
-- B. admin_audit_log table — one row per privileged admin action
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- actor / target with SET NULL on auth.users deletion: keep historical trace
  -- even if the actor or target is later removed. metadata is the reliable
  -- backup (email captured at action time).
  actor_user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action              TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 64),
  target_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_entity_type  TEXT,
  target_entity_id    UUID,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_created
  ON public.admin_audit_log (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_created
  ON public.admin_audit_log (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_created
  ON public.admin_audit_log (action, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: admin only (read the trace from /admin/* pages later).
DROP POLICY IF EXISTS "admin_audit_log_select_admin_only" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_select_admin_only"
  ON public.admin_audit_log
  FOR SELECT
  USING (public.immonex_is_admin());

-- No INSERT / UPDATE / DELETE policies on purpose: writes go through SECURITY
-- DEFINER RPCs (log_admin_action), which run with elevated privileges and
-- bypass RLS as the function owner.

COMMENT ON TABLE public.admin_audit_log
  IS 'Append-only audit trail of admin actions. Inserts only via log_admin_action() helper (called from SECURITY DEFINER RPCs). SELECT restricted to admins.';

-- -----------------------------------------------------------------------------
-- C. log_admin_action — internal helper
--    Owned by postgres (default for migrations). Not granted to authenticated:
--    only other SECURITY DEFINER RPCs (which execute as the function owner) can
--    call it. Authenticated users cannot inject fake audit rows.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action            TEXT,
  p_target_user_id    UUID DEFAULT NULL,
  p_target_entity_type TEXT DEFAULT NULL,
  p_target_entity_id  UUID DEFAULT NULL,
  p_metadata          JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.admin_audit_log (
    actor_user_id, action, target_user_id, target_entity_type, target_entity_id, metadata
  ) VALUES (
    auth.uid(), p_action, p_target_user_id, p_target_entity_type, p_target_entity_id, p_metadata
  )
  RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_action(TEXT, UUID, TEXT, UUID, JSONB) FROM PUBLIC;
-- No GRANT to authenticated: only postgres-owned SECURITY DEFINER callers.

-- -----------------------------------------------------------------------------
-- D. admin_grant_credits — adjust a user's credit balance (positive or negative)
--
-- ⚠ Implementation note: spec asked to wrap the existing add_credits() helper.
-- However add_credits() RETURNS VOID and rejects p_amount <= 0, while this
-- RPC must (a) return the inserted credits_ledger.id and (b) accept negative
-- amounts (admin can refund/correct). We therefore replicate the lock-bypass
-- + INSERT pattern locally instead of wrapping. Trade-off: ~5 lines of
-- duplicated logic, in exchange for a clean RETURNING UUID and full
-- positive/negative range.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_grant_credits(
  p_user_id UUID,
  p_amount  INTEGER,
  p_reason  TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_ledger_id     UUID;
  v_target_email  TEXT;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'amount_required_non_zero' USING ERRCODE = '23514';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '23514';
  END IF;

  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = '23503';
  END IF;

  -- Same lock-bypass pattern as add_credits / consume_credits, so
  -- profiles_lock_credits_balance trigger doesn't reject the direct UPDATE.
  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  UPDATE public.profiles
    SET credits_balance = COALESCE(credits_balance, 0) + p_amount
    WHERE id = p_user_id;
  INSERT INTO public.credits_ledger (user_id, delta, reason, ref_type, ref_id)
    VALUES (p_user_id, p_amount, p_reason, 'admin_adjustment', NULL)
    RETURNING id INTO v_ledger_id;
  PERFORM set_config('immonex.allow_credits_mutation', 'off', true);

  PERFORM public.log_admin_action(
    'grant_credits',
    p_user_id,
    'credits_ledger',
    v_ledger_id,
    jsonb_build_object(
      'amount', p_amount,
      'reason', p_reason,
      'target_email', v_target_email
    )
  );

  RETURN v_ledger_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_credits(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits(UUID, INTEGER, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- E. admin_change_user_role
--    The existing prevent_profile_privilege_escalation trigger already lets
--    admin updates pass (it short-circuits when immonex_is_admin()), so the
--    UPDATE works inside this SECURITY DEFINER RPC.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  p_user_id  UUID,
  p_new_role public.user_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_old_role     public.user_role;
  v_target_email TEXT;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() = p_user_id AND p_new_role <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'cannot_self_demote' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = '23503';
  END IF;

  SELECT role INTO v_old_role FROM public.profiles WHERE id = p_user_id;

  IF v_old_role = p_new_role THEN
    -- No-op: avoid spamming the audit log with identity transitions.
    RETURN;
  END IF;

  UPDATE public.profiles SET role = p_new_role WHERE id = p_user_id;

  PERFORM public.log_admin_action(
    'change_role',
    p_user_id,
    'user',
    p_user_id,
    jsonb_build_object(
      'old_role', v_old_role::text,
      'new_role', p_new_role::text,
      'target_email', v_target_email
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_user_role(UUID, public.user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role(UUID, public.user_role) TO authenticated;

-- -----------------------------------------------------------------------------
-- F. admin_suspend_user
--    Sets the suspended flag on profiles AND pushes the user's listings to
--    status='rejected' with rejection_reason='owner_suspended:<reason>' so
--    they disappear from public surfaces. Drafts and already-rejected
--    listings are left alone (no effect on user-WIP or already-blocked content).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id UUID,
  p_reason  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_email   TEXT;
  v_affected_count INTEGER;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'cannot_self_suspend' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '23514';
  END IF;

  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = '23503';
  END IF;

  UPDATE public.profiles
    SET suspended = true,
        suspended_at = now(),
        suspended_reason = p_reason,
        suspended_by = auth.uid()
    WHERE id = p_user_id;

  WITH suspended_listings AS (
    UPDATE public.listings
      SET status = 'rejected'::public.listing_status,
          rejection_reason = 'owner_suspended:' || p_reason
      WHERE owner_id = p_user_id
        AND status NOT IN (
          'rejected'::public.listing_status,
          'draft'::public.listing_status
        )
      RETURNING id
  )
  SELECT COUNT(*) INTO v_affected_count FROM suspended_listings;

  PERFORM public.log_admin_action(
    'suspend_user',
    p_user_id,
    'user',
    p_user_id,
    jsonb_build_object(
      'reason', p_reason,
      'target_email', v_target_email,
      'affected_listings_count', v_affected_count
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_suspend_user(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- G. admin_unsuspend_user
--    Clears the suspended flag. Listings stay rejected; the admin reactivates
--    them individually via /admin/moderation if appropriate.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_email TEXT;
  v_was_suspended BOOLEAN;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = '23503';
  END IF;

  SELECT suspended INTO v_was_suspended FROM public.profiles WHERE id = p_user_id;
  IF NOT COALESCE(v_was_suspended, false) THEN
    -- No-op + no audit row: avoid noise from duplicate UI clicks.
    RETURN;
  END IF;

  UPDATE public.profiles
    SET suspended = false,
        suspended_at = NULL,
        suspended_reason = NULL,
        suspended_by = NULL
    WHERE id = p_user_id;

  PERFORM public.log_admin_action(
    'unsuspend_user',
    p_user_id,
    'user',
    p_user_id,
    jsonb_build_object('target_email', v_target_email)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unsuspend_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_user(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- H. admin_delete_user
--    Hard-delete a user across the platform.
--    Cascade plan (verified via FK audit, see migration commit message):
--    - Anonymise blog_posts.author_id (FK is NO ACTION; would block DELETE)
--    - DELETE FROM auth.users → cascades to:
--        * profiles (CASCADE)         → cascades to credits_ledger,
--                                        favorites, listings (then boosts +
--                                        listing_view_events), transactions
--        * phone_reveal_events (CASCADE)
--    - SET NULL traces preserved on:
--        credit_pricing.updated_by, partner_ad_campaigns.created_by,
--        transactions.reviewed_by, vehicle_estimation_requests.user_id,
--        admin_audit_log.actor_user_id, admin_audit_log.target_user_id,
--        profiles.suspended_by
--    Audit row is logged BEFORE the DELETE so the trace survives the cascade.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id            UUID,
  p_confirmation_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actual_email TEXT;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'cannot_self_delete' USING ERRCODE = '42501';
  END IF;
  IF p_confirmation_email IS NULL OR length(trim(p_confirmation_email)) = 0 THEN
    RAISE EXCEPTION 'confirmation_email_required' USING ERRCODE = '23514';
  END IF;

  SELECT email INTO v_actual_email FROM auth.users WHERE id = p_user_id;
  IF v_actual_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = '23503';
  END IF;
  IF lower(v_actual_email) <> lower(trim(p_confirmation_email)) THEN
    RAISE EXCEPTION 'email_mismatch' USING ERRCODE = '23514';
  END IF;

  -- Log first; cascade will null out target_user_id but the email is captured
  -- in metadata so the trace remains identifiable.
  PERFORM public.log_admin_action(
    'delete_user',
    p_user_id,
    'user',
    p_user_id,
    jsonb_build_object('target_email', v_actual_email)
  );

  -- Anonymise blog posts (FK NO ACTION blocks DELETE otherwise).
  UPDATE public.blog_posts SET author_id = NULL WHERE author_id = p_user_id;

  -- Cascade everything else via auth.users.
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- I. RLS additions
--    profiles SELECT for admins: 20260413130500_profiles_rls_hardening already
--    grants admins full SELECT via immonex_is_admin(); nothing to add.
--    listings SELECT admin override: existing policies (immonex_is_admin())
--    already cover admin visibility. No change needed.
--    credits_ledger SELECT admin: covered in 20260412140100_monetization_engine_hardening.
--    Only this module's new table (admin_audit_log) needs its policy, declared
--    in section B above.
-- -----------------------------------------------------------------------------
