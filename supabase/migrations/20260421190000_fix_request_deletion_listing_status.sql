-- ============================================================================
-- MISSION 5.1b — Fix listing_status enum in request_account_deletion()
-- ============================================================================
-- Hot-patch pour un bug introduit en 5.1 : la RPC référençait des valeurs
-- 'published' / 'unpublished' qui n'existent PAS dans l'enum listing_status.
--
-- Valeurs réelles de l'enum (vérifiées en prod) :
--   active, archived, draft, expired, hidden_pending_review, paused,
--   pending_payment, pending_payment_verification, pending_review, rejected
--
-- Fix : on archive ('archived'::listing_status) les listings actuellement
-- visibles ('active'::listing_status). Cohérent avec la décision produit Q2
-- (no auto-republish si cancel_account_deletion()).
--
-- Le reste du corps de la fonction est identique à la 5.1 — on CREATE OR
-- REPLACE l'intégralité pour que le fichier soit auto-suffisant si rejoué
-- sur un environnement vierge.
--
-- Applied to prod : YES (21/04/2026) via CREATE OR REPLACE en SQL Editor.
-- Tests end-to-end post-fix : all green (Test 2 + Test 3 validés par Ali).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS TABLE (
  success BOOLEAN,
  deletion_scheduled_for TIMESTAMPTZ,
  listings_unpublished_count INT,
  already_requested BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_existing_scheduled TIMESTAMPTZ;
  v_existing_requested TIMESTAMPTZ;
  v_is_anonymized BOOLEAN;
  v_new_scheduled TIMESTAMPTZ;
  v_unpublished_count INT := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT p.deletion_requested_at,
         p.deletion_scheduled_for,
         p.is_anonymized
    INTO v_existing_requested, v_existing_scheduled, v_is_anonymized
  FROM public.profiles p
  WHERE p.id = v_user_id
  FOR UPDATE;

  IF v_is_anonymized = TRUE THEN
    RAISE EXCEPTION 'already_anonymized' USING ERRCODE = 'P0001';
  END IF;

  IF v_existing_requested IS NOT NULL THEN
    RETURN QUERY SELECT
      TRUE AS success,
      v_existing_scheduled AS deletion_scheduled_for,
      0 AS listings_unpublished_count,
      TRUE AS already_requested;
    RETURN;
  END IF;

  v_new_scheduled := NOW() + INTERVAL '30 days';

  UPDATE public.profiles
  SET deletion_requested_at = NOW(),
      deletion_scheduled_for = v_new_scheduled
  WHERE id = v_user_id;

  UPDATE auth.users
  SET banned_until = '2099-12-31 00:00:00+00'::timestamptz
  WHERE id = v_user_id;

  -- FIX 5.1b : enum listing_status n'a pas 'published'/'unpublished'.
  -- Les listings visibles sont 'active', on les archive lors de la demande
  -- de suppression. Pas de re-publication auto si cancel_account_deletion().
  UPDATE public.listings
  SET status = 'archived'::listing_status
  WHERE owner_id = v_user_id
    AND status = 'active'::listing_status;
  GET DIAGNOSTICS v_unpublished_count = ROW_COUNT;

  INSERT INTO public.admin_audit_log (
    actor_user_id,
    action,
    target_user_id,
    target_entity_type,
    target_entity_id,
    metadata
  )
  VALUES (
    v_user_id,
    'rgpd_deletion_requested',
    v_user_id,
    'profile',
    v_user_id,
    jsonb_build_object(
      'requested_at', NOW(),
      'scheduled_for', v_new_scheduled,
      'listings_archived', v_unpublished_count
    )
  );

  RETURN QUERY SELECT
    TRUE AS success,
    v_new_scheduled AS deletion_scheduled_for,
    v_unpublished_count AS listings_unpublished_count,
    FALSE AS already_requested;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

COMMIT;
