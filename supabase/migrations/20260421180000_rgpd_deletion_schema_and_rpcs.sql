-- ============================================================================
-- MISSION 5.1 — RGPD deletion schema + RPCs + pg_cron
-- ============================================================================
-- Ajoute le flow complet de self-delete RGPD conforme à :
--   - Art. 17 RGPD (droit à l'effacement)
--   - Art. 20 RGPD (droit à la portabilité)
--   - Loi malgache 2014-038 sur la protection des données
--
-- Stratégie : soft-delete + anonymisation à J+30
--   1. User clique "Supprimer" → request_account_deletion()
--      - Set deletion_scheduled_for = NOW + 30 days
--      - Set auth.users.banned_until = '2099-12-31' (bloque login)
--      - Unpublish tous ses listings
--   2. Pendant 30j, user peut annuler via cancel_account_deletion()
--   3. À J+30, pg_cron exécute execute_scheduled_deletions() qui anonymise.
--
-- Export portabilité : export_user_data() renvoie JSONB complet.
-- Helper interne : anonymize_user_profile(uuid) SECURITY DEFINER.
--
-- Applied to prod : YES (21/04/2026)
-- ============================================================================

BEGIN;

-- ===========================================================================
-- SECTION 1 — Colonnes deletion_* sur profiles + index partiel
-- ===========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN NOT NULL DEFAULT FALSE;

-- Index partiel : accélère execute_scheduled_deletions() qui scan
-- uniquement les profiles en attente d'anonymisation
CREATE INDEX IF NOT EXISTS idx_profiles_pending_deletion
  ON public.profiles (deletion_scheduled_for)
  WHERE anonymized_at IS NULL
    AND deletion_scheduled_for IS NOT NULL;

-- ===========================================================================
-- SECTION 2 — Helper interne : anonymize_user_profile(uuid)
-- ===========================================================================
-- SECURITY DEFINER, non user-callable (pas de GRANT TO authenticated).
-- Appelée par execute_scheduled_deletions() et potentiellement admin debug.
-- Idempotente : si déjà anonymisé, no-op silencieux.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.anonymize_user_profile(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_already_anonymized BOOLEAN;
BEGIN
  -- Lock + check idempotence
  SELECT is_anonymized INTO v_already_anonymized
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_already_anonymized IS NULL THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_already_anonymized = TRUE THEN
    -- Déjà anonymisé, no-op
    RETURN;
  END IF;

  -- Anonymiser profiles (données PII nulles, flags set)
  UPDATE public.profiles
  SET full_name = NULL,
      phone = NULL,
      whatsapp_phone = NULL,
      agency_id = NULL,
      is_anonymized = TRUE,
      anonymized_at = NOW()
  WHERE id = p_user_id;

  -- Anonymiser auth.users (email unique déterministe, phone NULL, meta vide)
  UPDATE auth.users
  SET email = 'deleted-' || p_user_id::text || '@deleted.autonex.mg',
      phone = NULL,
      raw_user_meta_data = '{}'::jsonb,
      banned_until = '2099-12-31 00:00:00+00'::timestamptz
  WHERE id = p_user_id;

  -- Audit log
  INSERT INTO public.admin_audit_log (
    actor_user_id,
    action,
    target_user_id,
    target_entity_type,
    target_entity_id,
    metadata
  )
  VALUES (
    NULL,  -- system action, pas d'admin spécifique
    'rgpd_anonymization_executed',
    p_user_id,
    'profile',
    p_user_id,
    jsonb_build_object(
      'executed_at', NOW(),
      'source', 'anonymize_user_profile'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_user_profile(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anonymize_user_profile(UUID) FROM authenticated;

-- ===========================================================================
-- SECTION 3 — RPC user : request_account_deletion()
-- ===========================================================================
-- User-callable. Initie la suppression programmée à J+30.
-- Idempotent : si déjà demandé, renvoie infos existantes sans double-programmer.
-- ===========================================================================

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

  -- Lock + check état actuel
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

  -- Idempotence : déjà demandé, on renvoie les infos existantes
  IF v_existing_requested IS NOT NULL THEN
    RETURN QUERY SELECT
      TRUE AS success,
      v_existing_scheduled AS deletion_scheduled_for,
      0 AS listings_unpublished_count,
      TRUE AS already_requested;
    RETURN;
  END IF;

  -- Nouvelle demande
  v_new_scheduled := NOW() + INTERVAL '30 days';

  UPDATE public.profiles
  SET deletion_requested_at = NOW(),
      deletion_scheduled_for = v_new_scheduled
  WHERE id = v_user_id;

  -- Banner user côté Supabase Auth (bloque login immédiatement)
  UPDATE auth.users
  SET banned_until = '2099-12-31 00:00:00+00'::timestamptz
  WHERE id = v_user_id;

  -- Unpublish tous les listings published du user (décision Q2)
  UPDATE public.listings
  SET status = 'unpublished'
  WHERE owner_id = v_user_id
    AND status = 'published';
  GET DIAGNOSTICS v_unpublished_count = ROW_COUNT;

  -- Audit log
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
      'listings_unpublished', v_unpublished_count
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

-- ===========================================================================
-- SECTION 4 — RPC user : cancel_account_deletion()
-- ===========================================================================
-- User-callable pendant les 30j uniquement.
-- Reverse la demande, déban, mais ne re-publie PAS les listings auto.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS TABLE (
  success BOOLEAN,
  was_scheduled_for TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_existing_scheduled TIMESTAMPTZ;
  v_is_anonymized BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT p.deletion_scheduled_for,
         p.is_anonymized
    INTO v_existing_scheduled, v_is_anonymized
  FROM public.profiles p
  WHERE p.id = v_user_id
  FOR UPDATE;

  IF v_is_anonymized = TRUE THEN
    RAISE EXCEPTION 'already_anonymized' USING ERRCODE = 'P0001';
  END IF;

  IF v_existing_scheduled IS NULL THEN
    RAISE EXCEPTION 'no_deletion_pending' USING ERRCODE = 'P0002';
  END IF;

  -- Reverse
  UPDATE public.profiles
  SET deletion_requested_at = NULL,
      deletion_scheduled_for = NULL
  WHERE id = v_user_id;

  -- Déban
  UPDATE auth.users
  SET banned_until = NULL
  WHERE id = v_user_id;

  -- Audit log
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
    'rgpd_deletion_cancelled',
    v_user_id,
    'profile',
    v_user_id,
    jsonb_build_object(
      'cancelled_at', NOW(),
      'was_scheduled_for', v_existing_scheduled
    )
  );

  RETURN QUERY SELECT
    TRUE AS success,
    v_existing_scheduled AS was_scheduled_for;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

-- ===========================================================================
-- SECTION 5 — RPC système : execute_scheduled_deletions()
-- ===========================================================================
-- SECURITY DEFINER, appelée par pg_cron nightly.
-- Pas de GRANT TO authenticated. Appelable aussi par admin en debug.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.execute_scheduled_deletions()
RETURNS TABLE (
  anonymized_count INT,
  processed_user_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_record RECORD;
  v_anonymized_count INT := 0;
  v_processed_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  FOR v_user_record IN
    SELECT id
    FROM public.profiles
    WHERE deletion_scheduled_for IS NOT NULL
      AND deletion_scheduled_for <= NOW()
      AND anonymized_at IS NULL
    ORDER BY deletion_scheduled_for ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.anonymize_user_profile(v_user_record.id);
    v_anonymized_count := v_anonymized_count + 1;
    v_processed_ids := array_append(v_processed_ids, v_user_record.id);
  END LOOP;

  RETURN QUERY SELECT
    v_anonymized_count AS anonymized_count,
    v_processed_ids AS processed_user_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_scheduled_deletions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_scheduled_deletions() FROM authenticated;

-- ===========================================================================
-- SECTION 6 — RPC user : export_user_data()
-- ===========================================================================
-- Art. 20 RGPD droit à la portabilité.
-- Retourne JSONB complet incluant auth.users (R2 validée).
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.export_user_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
  v_auth JSONB;
  v_profile JSONB;
  v_listings JSONB;
  v_listing_photos JSONB;
  v_favorites JSONB;
  v_contact_messages JSONB;
  v_transactions JSONB;
  v_credits_ledger JSONB;
  v_phone_reveal_events JSONB;
  v_promo_code_redemptions JSONB;
  v_vehicle_estimation_requests JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- auth.users (R2 : export complet)
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email::TEXT,
    'phone', u.phone,
    'created_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'raw_app_meta_data', u.raw_app_meta_data,
    'raw_user_meta_data', u.raw_user_meta_data
  ) INTO v_auth
  FROM auth.users u
  WHERE u.id = v_user_id;

  -- profiles
  SELECT to_jsonb(p) INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  -- listings
  SELECT COALESCE(jsonb_agg(to_jsonb(l)), '[]'::jsonb) INTO v_listings
  FROM public.listings l
  WHERE l.owner_id = v_user_id;

  -- listing_photos (via join sur listings owned)
  SELECT COALESCE(jsonb_agg(to_jsonb(lp)), '[]'::jsonb) INTO v_listing_photos
  FROM public.listing_photos lp
  JOIN public.listings l ON l.id = lp.listing_id
  WHERE l.owner_id = v_user_id;

  -- favorites
  SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb) INTO v_favorites
  FROM public.favorites f
  WHERE f.user_id = v_user_id;

  -- contact_messages (messages envoyés depuis l'email auth du user)
  SELECT COALESCE(jsonb_agg(to_jsonb(cm)), '[]'::jsonb) INTO v_contact_messages
  FROM public.contact_messages cm
  WHERE cm.email = (SELECT email::TEXT FROM auth.users WHERE id = v_user_id);

  -- transactions
  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_transactions
  FROM public.transactions t
  WHERE t.user_id = v_user_id;

  -- credits_ledger
  SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) INTO v_credits_ledger
  FROM public.credits_ledger c
  WHERE c.user_id = v_user_id;

  -- phone_reveal_events
  SELECT COALESCE(jsonb_agg(to_jsonb(e)), '[]'::jsonb) INTO v_phone_reveal_events
  FROM public.phone_reveal_events e
  WHERE e.user_id = v_user_id;

  -- promo_code_redemptions
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_promo_code_redemptions
  FROM public.promo_code_redemptions r
  WHERE r.user_id = v_user_id;

  -- vehicle_estimation_requests
  SELECT COALESCE(jsonb_agg(to_jsonb(ver)), '[]'::jsonb) INTO v_vehicle_estimation_requests
  FROM public.vehicle_estimation_requests ver
  WHERE ver.user_id = v_user_id;

  v_result := jsonb_build_object(
    'export_metadata', jsonb_build_object(
      'export_date', NOW(),
      'export_version', '1.0',
      'user_id', v_user_id,
      'company', 'APLi SARLU',
      'brand', 'AutoNex Madagascar',
      'legal_basis', 'RGPD Art. 20 - droit à la portabilité'
    ),
    'auth', v_auth,
    'profile', v_profile,
    'listings', v_listings,
    'listing_photos', v_listing_photos,
    'favorites', v_favorites,
    'contact_messages', v_contact_messages,
    'transactions', v_transactions,
    'credits_ledger', v_credits_ledger,
    'phone_reveal_events', v_phone_reveal_events,
    'promo_code_redemptions', v_promo_code_redemptions,
    'vehicle_estimation_requests', v_vehicle_estimation_requests
  );

  -- Audit log (traçabilité des exports)
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
    'rgpd_data_exported',
    v_user_id,
    'profile',
    v_user_id,
    jsonb_build_object('exported_at', NOW())
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_user_data() TO authenticated;

-- ===========================================================================
-- SECTION 7 — RLS policy fallback sur profiles (D4 : bretelles + ceinture)
-- ===========================================================================
-- Bloque le SELECT de son propre profile si anonymisé, en complément de
-- banned_until. Les admins peuvent toujours lire via leurs propres policies.
-- ===========================================================================

DROP POLICY IF EXISTS rgpd_anonymized_blocked_self ON public.profiles;

CREATE POLICY rgpd_anonymized_blocked_self ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    NOT (is_anonymized = TRUE AND auth.uid() = id)
  );

-- ===========================================================================
-- SECTION 8 — pg_cron : schedule nightly job
-- ===========================================================================
-- 03h00 UTC quotidien = 06h00 heure Madagascar. Heure basse trafic.
-- Si le job existe déjà (re-run migration), on unschedule avant reschedule.
-- ===========================================================================

DO $cron$
BEGIN
  -- Unschedule if exists (idempotence)
  PERFORM cron.unschedule('execute-scheduled-deletions')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'execute-scheduled-deletions'
  );

  -- Schedule fresh
  PERFORM cron.schedule(
    'execute-scheduled-deletions',
    '0 3 * * *',
    $cronjob$SELECT public.execute_scheduled_deletions();$cronjob$
  );
END
$cron$;

COMMIT;
