-- =============================================================================
-- PROMPT 7 — Verified Seller Badge V1
--
-- Scope V1 figé :
--   - 3 documents : CIN recto + CIN verso + selfie (carte_grise hors V1)
--   - Coût 75 000 crédits débité à la SOUMISSION (pas après approval)
--   - Pas de refund auto si reject (admin manuel via add_credits si besoin)
--   - Durée badge 1 an glissant depuis approval (VERIFIED_SELLER_BADGE_DURATION_DAYS=365)
--   - 1 verification active simultanée par user (DB partial unique index)
--   - Re-soumission après reject autorisée sans cooldown (75k = barrière éco)
--   - Privacy : bucket privé verifications + signed URLs admin-only (PROMPT 1)
--
-- Migration NON-DESTRUCTIVE :
--   - ALTER TYPE ADD VALUE IF NOT EXISTS × 2
--   - ADD COLUMN IF NOT EXISTS rejection_category + CHECK conditionnel
--   - CREATE UNIQUE INDEX IF NOT EXISTS (partial)
--   - 3 nouvelles RPCs SECURITY DEFINER (submit/approve/reject)
--   - CREATE OR REPLACE enqueue_lifecycle_notifications (étendu)
--
-- Référence : PROMPT_7_phase2_implementation.md (validé par Ali post-Phase 1).
-- =============================================================================

-- =============================================================================
-- SECTION A — notification_type enum (2 nouvelles valeurs)
-- =============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'verif_submitted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'verif_expiring_30d';

-- =============================================================================
-- SECTION B — verifications.rejection_category (5 catégories CHECK)
-- =============================================================================

ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS rejection_category text NULL;

COMMENT ON COLUMN public.verifications.rejection_category IS
  'Catégorie du rejet (admin) — stats agrégées. NULL si pas rejeté.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'verifications_rejection_category_check'
  ) THEN
    ALTER TABLE public.verifications
      ADD CONSTRAINT verifications_rejection_category_check
      CHECK (rejection_category IS NULL OR rejection_category IN
        ('blurry', 'wrong_doc', 'fraud_suspect', 'expired_doc', 'other'));
  END IF;
END $$;

-- =============================================================================
-- SECTION C — UNIQUE PARTIAL INDEX anti-fraude
--
-- 1 verification active (pending OR approved) max simultanée par user.
-- Le predicate WHERE status IN (...) est immutable (enum values), donc safe.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_verification_per_user
  ON public.verifications (user_id)
  WHERE status IN ('pending', 'approved');

COMMENT ON INDEX public.uniq_active_verification_per_user IS
  'Anti-fraude V1 : empêche INSERT/UPDATE qui créerait 2+ verifications actives '
  '(pending ou approved) pour le même user. PROMPT 7.';

-- =============================================================================
-- SECTION D — RPC submit_verification (user)
--
-- Owner soumet sa demande :
--   1. Auth + validation inputs
--   2. Validation paths {user_id}/% (defensive RLS reinforce)
--   3. Anti-fraude check proactif (en plus de l'index)
--   4. Lookup pricing 75 000 cr.
--   5. Consume credits FIFO (PROMPT 2 engine)
--   6. INSERT verifications row + UPDATE ledger.ref_id avec verification_id
--   7. Notif verif_submitted ('priority normal')
--
-- Retour JSONB : { ok, verification_id, credits_charged, submitted_at, notification_id }
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_verification(
  p_cin_front_path text,
  p_cin_back_path  text,
  p_selfie_path    text,
  p_full_name      text,
  p_cin_number     text,
  p_date_of_birth  date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id              uuid := auth.uid();
  v_cost                 integer;
  v_now                  timestamptz := now();
  v_consumed             boolean;
  v_ledger_entry_id      uuid;
  v_verification_id      uuid;
  v_existing_active      integer;
  v_notif_id             uuid;
  v_notif_body           text;
BEGIN
  -- 1. Auth
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  -- 2. Validate document paths (presence)
  IF p_cin_front_path IS NULL OR p_cin_front_path = ''
     OR p_cin_back_path IS NULL OR p_cin_back_path = ''
     OR p_selfie_path IS NULL  OR p_selfie_path = '' THEN
    RAISE EXCEPTION 'missing_documents' USING ERRCODE = 'P0001';
  END IF;

  -- Validate metadata
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 3 THEN
    RAISE EXCEPTION 'invalid_full_name' USING ERRCODE = 'P0001';
  END IF;
  IF p_cin_number IS NULL OR length(trim(p_cin_number)) < 6 THEN
    RAISE EXCEPTION 'invalid_cin_number' USING ERRCODE = 'P0001';
  END IF;

  -- 3. Defensive RLS reinforce : paths must belong to caller
  IF p_cin_front_path NOT LIKE v_user_id::text || '/%'
     OR p_cin_back_path NOT LIKE v_user_id::text || '/%'
     OR p_selfie_path NOT LIKE v_user_id::text || '/%' THEN
    RAISE EXCEPTION 'invalid_document_path' USING ERRCODE = '42501';
  END IF;

  -- 4. Anti-fraude proactive check (UI clear error vs unique-violation cryptique)
  SELECT count(*) INTO v_existing_active
  FROM public.verifications
  WHERE user_id = v_user_id
    AND status IN ('pending', 'approved');

  IF v_existing_active > 0 THEN
    RAISE EXCEPTION 'verification_already_active' USING ERRCODE = 'P0001';
  END IF;

  -- 5. Pricing lookup
  SELECT amount INTO v_cost
  FROM public.credit_pricing
  WHERE key = 'verified_seller_year';

  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'pricing_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- 6. Consume credits FIFO (PROMPT 2 engine)
  -- Note : ref_id = NULL au moment du débit (verification_id pas encore créé).
  -- On UPDATE le ledger.ref_id juste après l'INSERT.
  SELECT public.consume_credits(
    v_user_id,
    v_cost,
    'verification_submission',
    'verification',
    NULL
  ) INTO v_consumed;

  IF NOT v_consumed THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  -- Recover the ledger entry id we just inserted (most recent for this user/ref_type)
  -- Tolerance 5s pour sécurité clock skew. Le COALESCE prend le delta négatif paid
  -- ou le granted (FIFO peut splitter en 2 inserts) — on prend le plus récent.
  SELECT id INTO v_ledger_entry_id
  FROM public.credits_ledger
  WHERE user_id = v_user_id
    AND ref_type = 'verification'
    AND created_at >= v_now - interval '5 seconds'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 7. INSERT verification row
  INSERT INTO public.verifications (
    user_id, type, status,
    cin_front_path, cin_back_path, selfie_path,
    full_name, cin_number, date_of_birth,
    submitted_at, credits_spent, ledger_entry_id, metadata
  ) VALUES (
    v_user_id, 'verified_seller', 'pending',
    p_cin_front_path, p_cin_back_path, p_selfie_path,
    trim(p_full_name), trim(p_cin_number), p_date_of_birth,
    v_now, v_cost, v_ledger_entry_id, '{}'::jsonb
  )
  RETURNING id INTO v_verification_id;

  -- 8. Update ledger.ref_id with the new verification_id (traceability)
  IF v_ledger_entry_id IS NOT NULL THEN
    UPDATE public.credits_ledger
    SET ref_id = v_verification_id
    WHERE id = v_ledger_entry_id;
  END IF;

  -- 9. Notif verif_submitted
  v_notif_body := 'Notre équipe examine votre dossier. Vous recevrez une réponse sous 48h.';

  BEGIN
    v_notif_id := public.create_notification(
      p_user_id    := v_user_id,
      p_type       := 'verif_submitted'::public.notification_type,
      p_category   := 'system'::public.notification_category,
      p_priority   := 'normal'::public.notification_priority,
      p_title      := 'Demande de vérification reçue',
      p_body       := v_notif_body,
      p_metadata   := jsonb_build_object('verification_id', v_verification_id),
      p_action_url := '/verification',
      p_icon       := 'BadgeCheck'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'submit_verification notif failed for verif %: %', v_verification_id, SQLERRM;
    v_notif_id := NULL;
  END;

  RETURN jsonb_build_object(
    'ok',              true,
    'verification_id', v_verification_id,
    'credits_charged', v_cost,
    'submitted_at',    v_now,
    'notification_id', v_notif_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_verification(text, text, text, text, text, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_verification(text, text, text, text, text, date) TO authenticated;

COMMENT ON FUNCTION public.submit_verification(text, text, text, text, text, date) IS
  'Owner soumet une demande Verified Seller. FIFO consume 75k cr. + INSERT verifications + notif. '
  'Anti-fraude : 1 active simultanée max (DB partial unique index). PROMPT 7.';

-- =============================================================================
-- SECTION E — RPC approve_verification (admin)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_verification(p_verification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id   uuid := auth.uid();
  v_now        timestamptz := now();
  v_verif      record;
  v_badge_id   uuid;
  v_notif_id   uuid;
  v_expires_at timestamptz;
BEGIN
  -- 1. Admin check
  IF v_admin_id IS NULL OR NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  -- 2. Lock verification + status check
  SELECT id, user_id, status, full_name, cin_number
  INTO v_verif
  FROM public.verifications
  WHERE id = p_verification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verification_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_verif.status NOT IN ('pending', 'reviewing') THEN
    RAISE EXCEPTION 'verification_not_reviewable: status=%', v_verif.status
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. 1 year duration
  v_expires_at := v_now + interval '365 days';

  -- 4. Defensive : expire any active badge for this user (UNIQUE INDEX should
  -- already prevent it but if a previous re-approval scenario slipped through)
  UPDATE public.seller_badges
  SET expires_at = v_now
  WHERE user_id = v_verif.user_id
    AND expires_at > v_now;

  -- 5. UPDATE verification → approved
  UPDATE public.verifications
  SET status      = 'approved',
      reviewed_at = v_now,
      reviewed_by = v_admin_id,
      expires_at  = v_expires_at,
      updated_at  = v_now
  WHERE id = p_verification_id;

  -- 6. INSERT seller_badges
  INSERT INTO public.seller_badges (
    user_id, badge_type, granted_at, expires_at, verification_id
  ) VALUES (
    v_verif.user_id, 'verified_seller', v_now, v_expires_at, p_verification_id
  )
  RETURNING id INTO v_badge_id;

  -- 7. Notif verif_approved
  BEGIN
    v_notif_id := public.create_notification(
      p_user_id    := v_verif.user_id,
      p_type       := 'verif_approved'::public.notification_type,
      p_category   := 'system'::public.notification_category,
      p_priority   := 'high'::public.notification_priority,
      p_title      := 'Vous êtes vendeur vérifié 🎉',
      p_body       := format('Votre badge Vendeur vérifié est actif jusqu''au %s.',
                             to_char(v_expires_at, 'DD/MM/YYYY')),
      p_metadata   := jsonb_build_object(
        'verification_id', p_verification_id,
        'badge_id',        v_badge_id,
        'expires_at',      v_expires_at
      ),
      p_action_url := '/verification',
      p_icon       := 'BadgeCheck'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'approve_verification notif failed for verif %: %',
                  p_verification_id, SQLERRM;
    v_notif_id := NULL;
  END;

  RETURN jsonb_build_object(
    'ok',              true,
    'verification_id', p_verification_id,
    'badge_id',        v_badge_id,
    'expires_at',      v_expires_at,
    'notification_id', v_notif_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_verification(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.approve_verification(uuid) TO authenticated;

COMMENT ON FUNCTION public.approve_verification(uuid) IS
  'Admin approuve une verification : INSERT seller_badge 365j + UPDATE verifications + notif verif_approved. '
  'Idempotent (FOR UPDATE + status check). PROMPT 7.';

-- =============================================================================
-- SECTION F — RPC reject_verification (admin)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reject_verification(
  p_verification_id uuid,
  p_reason          text,
  p_category        text DEFAULT NULL  -- 'blurry'|'wrong_doc'|'fraud_suspect'|'expired_doc'|'other'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_now      timestamptz := now();
  v_verif    record;
  v_notif_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'rejection_reason_too_short' USING ERRCODE = 'P0001';
  END IF;

  IF p_category IS NOT NULL
     AND p_category NOT IN ('blurry', 'wrong_doc', 'fraud_suspect', 'expired_doc', 'other') THEN
    RAISE EXCEPTION 'invalid_rejection_category' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, user_id, status
  INTO v_verif
  FROM public.verifications
  WHERE id = p_verification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verification_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_verif.status NOT IN ('pending', 'reviewing') THEN
    RAISE EXCEPTION 'verification_not_reviewable: status=%', v_verif.status
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.verifications
  SET status              = 'rejected',
      rejection_reason    = trim(p_reason),
      rejection_category  = p_category,
      reviewed_at         = v_now,
      reviewed_by         = v_admin_id,
      updated_at          = v_now
  WHERE id = p_verification_id;

  BEGIN
    v_notif_id := public.create_notification(
      p_user_id    := v_verif.user_id,
      p_type       := 'verif_rejected'::public.notification_type,
      p_category   := 'system'::public.notification_category,
      p_priority   := 'high'::public.notification_priority,
      p_title      := 'Demande de vérification refusée',
      p_body       := format('Raison : %s', trim(p_reason)),
      p_metadata   := jsonb_build_object(
        'verification_id', p_verification_id,
        'category',        p_category,
        'reason',          trim(p_reason)
      ),
      p_action_url := '/verification',
      p_icon       := 'XCircle'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'reject_verification notif failed for verif %: %',
                  p_verification_id, SQLERRM;
    v_notif_id := NULL;
  END;

  RETURN jsonb_build_object(
    'ok',              true,
    'verification_id', p_verification_id,
    'rejected_at',     v_now,
    'category',        p_category,
    'notification_id', v_notif_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reject_verification(uuid, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reject_verification(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.reject_verification(uuid, text, text) IS
  'Admin rejette une verification (raison min 10 chars, categorie optionnelle). Pas de refund auto. '
  'PROMPT 7.';

-- =============================================================================
-- SECTION G — Extension enqueue_lifecycle_notifications (verif_expiring_30d)
--
-- Ajoute une 8e section au batch existant. Le reste de la fonction est
-- préservé verbatim (CREATE OR REPLACE remplace tout — il faut donc tout
-- ré-écrire en incluant les 7 sections existantes + la nouvelle).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_lifecycle_notifications()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec               RECORD;
  v_n_7d            INT := 0;
  v_n_3d            INT := 0;
  v_n_1d            INT := 0;
  v_n_expired       INT := 0;
  v_n_boost_1d      INT := 0;
  v_n_boost_end     INT := 0;
  v_n_grant_30d     INT := 0;
  v_n_verif_30d     INT := 0;  -- PROMPT 7
BEGIN
  -- listing_expiring_7d
  FOR rec IN
    SELECT l.id, l.owner_id, l.title, l.expires_at
    FROM public.listings l
    WHERE l.status IN ('active'::public.listing_status, 'expiring_soon'::public.listing_status)
      AND l.expires_at BETWEEN now() + interval '6 days 12 hours' AND now() + interval '7 days 12 hours'
      AND l.owner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = l.owner_id
          AND n.type = 'listing_expiring_7d'::notification_type
          AND n.metadata->>'listing_id' = l.id::text
      )
  LOOP
    PERFORM public.create_notification(
      rec.owner_id, 'listing_expiring_7d'::notification_type,
      'listings'::notification_category, 'normal'::notification_priority,
      'Votre annonce expire dans 7 jours',
      format('« %s » expire le %s. Renouvelez-la pour rester visible.',
             rec.title, to_char(rec.expires_at, 'DD/MM/YYYY')),
      jsonb_build_object('lifecycle_event', 'listing_expiring_7d',
                         'listing_id', rec.id, 'expires_at', rec.expires_at),
      '/dashboard?listing=' || rec.id, 'Clock'
    );
    v_n_7d := v_n_7d + 1;
  END LOOP;

  -- listing_expiring_3d
  FOR rec IN
    SELECT l.id, l.owner_id, l.title, l.expires_at
    FROM public.listings l
    WHERE l.status IN ('active'::public.listing_status, 'expiring_soon'::public.listing_status)
      AND l.expires_at BETWEEN now() + interval '2 days 12 hours' AND now() + interval '3 days 12 hours'
      AND l.owner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = l.owner_id
          AND n.type = 'listing_expiring_3d'::notification_type
          AND n.metadata->>'listing_id' = l.id::text
      )
  LOOP
    PERFORM public.create_notification(
      rec.owner_id, 'listing_expiring_3d'::notification_type,
      'listings'::notification_category, 'high'::notification_priority,
      'Votre annonce expire dans 3 jours',
      format('« %s » expire le %s.', rec.title, to_char(rec.expires_at, 'DD/MM/YYYY')),
      jsonb_build_object('lifecycle_event', 'listing_expiring_3d',
                         'listing_id', rec.id, 'expires_at', rec.expires_at),
      '/dashboard?listing=' || rec.id, 'Clock'
    );
    v_n_3d := v_n_3d + 1;
  END LOOP;

  -- listing_expiring_1d
  FOR rec IN
    SELECT l.id, l.owner_id, l.title, l.expires_at
    FROM public.listings l
    WHERE l.status IN ('active'::public.listing_status, 'expiring_soon'::public.listing_status)
      AND l.expires_at BETWEEN now() + interval '12 hours' AND now() + interval '36 hours'
      AND l.owner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = l.owner_id
          AND n.type = 'listing_expiring_1d'::notification_type
          AND n.metadata->>'listing_id' = l.id::text
      )
  LOOP
    PERFORM public.create_notification(
      rec.owner_id, 'listing_expiring_1d'::notification_type,
      'listings'::notification_category, 'high'::notification_priority,
      'Votre annonce expire demain',
      format('« %s » expire dans moins de 24h.', rec.title),
      jsonb_build_object('lifecycle_event', 'listing_expiring_1d',
                         'listing_id', rec.id, 'expires_at', rec.expires_at),
      '/dashboard?listing=' || rec.id, 'AlertTriangle'
    );
    v_n_1d := v_n_1d + 1;
  END LOOP;

  -- listing_expired
  FOR rec IN
    SELECT l.id, l.owner_id, l.title
    FROM public.listings l
    WHERE l.status = 'expired'::public.listing_status
      AND l.expires_at BETWEEN now() - interval '24 hours' AND now()
      AND l.owner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = l.owner_id
          AND n.type = 'listing_expired'::notification_type
          AND n.metadata->>'listing_id' = l.id::text
      )
  LOOP
    PERFORM public.create_notification(
      rec.owner_id, 'listing_expired'::notification_type,
      'listings'::notification_category, 'high'::notification_priority,
      'Votre annonce a expiré',
      format('« %s » n''est plus visible. Renouvelez pour la republier.', rec.title),
      jsonb_build_object('lifecycle_event', 'listing_expired', 'listing_id', rec.id),
      '/dashboard?listing=' || rec.id, 'XCircle'
    );
    v_n_expired := v_n_expired + 1;
  END LOOP;

  -- boost_ending_1d
  FOR rec IN
    SELECT b.id AS boost_id, b.type, b.ends_at, l.id AS listing_id, l.owner_id, l.title
    FROM public.boosts b
    JOIN public.listings l ON l.id = b.listing_id
    WHERE b.ends_at BETWEEN now() + interval '22 hours' AND now() + interval '26 hours'
      AND l.owner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = l.owner_id
          AND n.type = 'boost_ending_1d'::notification_type
          AND n.metadata->>'boost_id' = b.id::text
      )
  LOOP
    PERFORM public.create_notification(
      rec.owner_id, 'boost_ending_1d'::notification_type,
      'listings'::notification_category, 'normal'::notification_priority,
      'Votre boost se termine demain',
      format('Le boost « %s » sur « %s » se termine dans moins de 24h.', rec.type, rec.title),
      jsonb_build_object('lifecycle_event', 'boost_ending_1d',
                         'boost_id', rec.boost_id, 'listing_id', rec.listing_id,
                         'boost_type', rec.type),
      '/dashboard?listing=' || rec.listing_id, 'Zap'
    );
    v_n_boost_1d := v_n_boost_1d + 1;
  END LOOP;

  -- boost_ended
  FOR rec IN
    SELECT b.id AS boost_id, b.type, b.ends_at, l.id AS listing_id, l.owner_id, l.title
    FROM public.boosts b
    JOIN public.listings l ON l.id = b.listing_id
    WHERE b.ends_at BETWEEN now() - interval '24 hours' AND now()
      AND l.owner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = l.owner_id
          AND n.type = 'boost_ended'::notification_type
          AND n.metadata->>'boost_id' = b.id::text
      )
  LOOP
    PERFORM public.create_notification(
      rec.owner_id, 'boost_ended'::notification_type,
      'listings'::notification_category, 'normal'::notification_priority,
      'Votre boost est terminé',
      format('Le boost « %s » sur « %s » est terminé. Relancez-le pour rester en avant.',
             rec.type, rec.title),
      jsonb_build_object('lifecycle_event', 'boost_ended',
                         'boost_id', rec.boost_id, 'listing_id', rec.listing_id,
                         'boost_type', rec.type),
      '/dashboard?listing=' || rec.listing_id, 'BellOff'
    );
    v_n_boost_end := v_n_boost_end + 1;
  END LOOP;

  -- credits_expiring_30d
  FOR rec IN
    SELECT user_id, MIN(granted_expires_at) AS earliest_expiry,
           SUM(delta) AS total_active_grants
    FROM public.credits_ledger
    WHERE is_granted = true AND delta > 0
      AND granted_expires_at IS NOT NULL
      AND granted_expires_at BETWEEN now() + interval '29 days 12 hours'
                                 AND now() + interval '30 days 12 hours'
    GROUP BY user_id
    HAVING SUM(delta) > 0
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = rec.user_id
        AND n.type = 'credits_expiring_30d'::notification_type
        AND n.metadata->>'expiry_window' = to_char(rec.earliest_expiry, 'YYYY-MM-DD')
    ) THEN
      PERFORM public.create_notification(
        rec.user_id, 'credits_expiring_30d'::notification_type,
        'payments'::notification_category, 'normal'::notification_priority,
        'Vos crédits offerts expirent dans 30 jours',
        format('Utilisez-les avant le %s.', to_char(rec.earliest_expiry, 'DD/MM/YYYY')),
        jsonb_build_object('lifecycle_event', 'credits_expiring_30d',
                           'expires_at', rec.earliest_expiry,
                           'expiry_window', to_char(rec.earliest_expiry, 'YYYY-MM-DD')),
        '/credits', 'Clock'
      );
      v_n_grant_30d := v_n_grant_30d + 1;
    END IF;
  END LOOP;

  -- ===========================================================================
  -- PROMPT 7 — verif_expiring_30d (badge expire dans [J+29, J+30])
  -- Dedupe par badge_id pour autoriser re-vérification successive sans confusion.
  -- ===========================================================================
  FOR rec IN
    SELECT sb.id AS badge_id, sb.user_id, sb.expires_at, sb.verification_id
    FROM public.seller_badges sb
    WHERE sb.expires_at BETWEEN now() + interval '29 days 12 hours'
                            AND now() + interval '30 days 12 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = sb.user_id
          AND n.type = 'verif_expiring_30d'::notification_type
          AND n.metadata->>'badge_id' = sb.id::text
      )
  LOOP
    PERFORM public.create_notification(
      rec.user_id, 'verif_expiring_30d'::notification_type,
      'system'::notification_category, 'normal'::notification_priority,
      'Votre badge Vendeur vérifié expire bientôt',
      format('Votre badge expire le %s. Renouvelez maintenant pour conserver votre statut.',
             to_char(rec.expires_at, 'DD/MM/YYYY')),
      jsonb_build_object('lifecycle_event', 'verif_expiring_30d',
                         'badge_id', rec.badge_id,
                         'verification_id', rec.verification_id,
                         'expires_at', rec.expires_at),
      '/verification', 'BadgeCheck'
    );
    v_n_verif_30d := v_n_verif_30d + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'enqueued', jsonb_build_object(
      'listing_expiring_7d',  v_n_7d,
      'listing_expiring_3d',  v_n_3d,
      'listing_expiring_1d',  v_n_1d,
      'listing_expired',      v_n_expired,
      'boost_ending_1d',      v_n_boost_1d,
      'boost_ended',          v_n_boost_end,
      'credits_expiring_30d', v_n_grant_30d,
      'verif_expiring_30d',   v_n_verif_30d
    ),
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_lifecycle_notifications() FROM PUBLIC;

COMMENT ON FUNCTION public.enqueue_lifecycle_notifications() IS
  'Batch enqueue des notifs cycle de vie (8 types). Dedupe via metadata. '
  'Étendu PROMPT 7 (verif_expiring_30d). Appelée par cron daily.';
