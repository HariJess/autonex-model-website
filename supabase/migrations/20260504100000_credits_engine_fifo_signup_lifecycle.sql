-- =============================================================================
-- PROMPT 2 — Credits Engine : FIFO + signup bonus + lifecycle + crons
--
-- Suite du PROMPT 1 (commit 994e7f1). Cette migration apporte la LOGIQUE
-- MÉTIER autour du nouveau modèle granted/paid mis en place par PROMPT 1
-- (colonnes is_granted + granted_expires_at sur credits_ledger).
--
-- Architecture (décisions actées avec Ali, 2026-05-04) :
--   1. consume_credits modifiée : consomme FIFO les granted non-expirés
--      d'abord, puis les crédits payants. Insère 1 ou 2 deltas négatifs
--      selon le split.
--   2. add_credits étendue avec p_is_granted (DEFAULT false) +
--      p_granted_expires_at (DEFAULT NULL). Backward-compatible : tous
--      les call sites existants continuent à grant des crédits payants.
--   3. handle_new_user appelle grant_signup_bonus_for_user(NEW.id) après
--      la création du profile → grant 100k crédits J+90 + notif welcome.
--   4. service_approve_provider_transaction et admin_approve_credit_transaction
--      modifiées pour grant pack.credits_amount + pack.bonus_credits
--      + tx.promo_bonus_credits (les 3 sont additifs et distincts).
--   5. expire_granted_credits_for_user(uuid) : helper SECURITY DEFINER
--      qui calcule le delta négatif compensatoire pour neutraliser les
--      grants expirés non encore consommés, puis envoie une notif.
--   6. enqueue_lifecycle_notifications() : helper qui enqueue les notifs
--      listing_expiring_7d/3d/1d, listing_expired, boost_ending_1d,
--      boost_ended, credits_expiring_30d.
--   7. 3 jobs pg_cron :
--      - autonex-expire-listings-daily (02:00 UTC)
--      - autonex-expire-granted-credits-daily (02:30 UTC)
--      - autonex-enqueue-lifecycle-notifications-daily (03:00 UTC)
--      (PAS de cron expire-boosts : la table boosts n'a pas de colonne
--       status, "boost actif" = ends_at > now() à la lecture, et les
--       notifs boost_ended sont gérées par le cron lifecycle.)
--   8. RPC grant_signup_bonus_for_user(uuid) exposée pour backfill
--      manuel des 2 comptes préservés (alipirbay@, pirbayali@).
--
-- Trigger existant notify_credits_purchased non touché : son filtre
-- (ref_type IN ('transaction','admin_adjustment')) exclut naturellement
-- 'signup_grant' et 'granted_expired' → pas de notif spurious.
--
-- ⚠️ NON destructive (juste CREATE OR REPLACE FUNCTION + cron.unschedule
--    idempotent + cron.schedule). Aucun DELETE, aucun ALTER TABLE.
--
-- Référence : PROMPT_2_CREDITS_ENGINE.md, Diagnostic Phase 1 du 2026-05-04.
-- =============================================================================

-- =============================================================================
-- SECTION A — consume_credits (FIFO granted-first)
--
-- Signature et return type INCHANGÉS (BOOLEAN). Owner check + bypass trigger
-- préservés. Seule la LOGIQUE de débit change.
--
-- Tests d'intégration vérifiés mentalement :
--   1. User avec 100k granted (J+90) + 50k paid → consume 30k
--      → granted_available=100k, use_granted=30k, use_paid=0
--      → INSERT 1 row (-30k, is_granted=true), balance: 150k → 120k
--   2. User avec 100k granted + 50k paid → consume 120k
--      → granted_available=100k, use_granted=100k, use_paid=20k
--      → INSERT 2 rows (-100k granted, -20k paid), balance: 150k → 30k
--   3. User avec 0 granted + 50k paid → consume 30k
--      → granted_available=0, use_granted=0, use_paid=30k
--      → INSERT 1 row (-30k, is_granted=false), balance: 50k → 20k
--   4. User avec granted expiré → granted_available=0 (le grant n'est
--      plus actif). use_paid prend tout. (Le cron neutralisera le solde
--      brut résiduel plus tard.)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.consume_credits(
  p_user_id  UUID,
  p_amount   INT,
  p_reason   TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id   UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_balance        INT;
  v_active_grants_pos    INT;
  v_consumed_from_grants INT;
  v_granted_available    INT;
  v_use_granted          INT;
  v_use_paid             INT;
BEGIN
  -- Owner check (inchangé : un user ne peut débiter QUE son propre solde)
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN FALSE;
  END IF;

  -- Bypass tr_profiles_lock_credits + lock le row profile pour la durée
  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  -- Total balance (autorité ledger, inchangé)
  SELECT COALESCE(SUM(delta), 0)::INT INTO v_total_balance
  FROM public.credits_ledger
  WHERE user_id = p_user_id;

  IF v_total_balance < p_amount THEN
    PERFORM set_config('immonex.allow_credits_mutation', '', true);
    RETURN FALSE;
  END IF;

  -- Calcul granted_available :
  --   = SUM(delta) des grants positifs encore actifs (non expirés)
  --   - SUM(|delta|) des consommations déjà rattachées à des grants
  -- GREATEST(0, …) pour gérer le cas où on a consommé plus que ce qui
  -- reste actif (ex. après expiration sans cron de neutralisation).
  SELECT COALESCE(SUM(delta), 0)::INT INTO v_active_grants_pos
  FROM public.credits_ledger
  WHERE user_id = p_user_id
    AND is_granted = true
    AND delta > 0
    AND (granted_expires_at IS NULL OR granted_expires_at > now());

  SELECT COALESCE(SUM(-delta), 0)::INT INTO v_consumed_from_grants
  FROM public.credits_ledger
  WHERE user_id = p_user_id
    AND is_granted = true
    AND delta < 0;

  v_granted_available := GREATEST(0, v_active_grants_pos - v_consumed_from_grants);

  -- Split FIFO implicite : granted d'abord, puis paid
  v_use_granted := LEAST(p_amount, v_granted_available);
  v_use_paid    := p_amount - v_use_granted;

  -- INSERT delta négatif granted (si applicable)
  IF v_use_granted > 0 THEN
    INSERT INTO public.credits_ledger (
      user_id, delta, reason, ref_type, ref_id, is_granted, meta
    ) VALUES (
      p_user_id,
      -v_use_granted,
      COALESCE(p_reason, 'consume'),
      p_ref_type,
      p_ref_id,
      true,
      jsonb_build_object('consumes_grant', true)
    );
  END IF;

  -- INSERT delta négatif paid (si applicable)
  IF v_use_paid > 0 THEN
    INSERT INTO public.credits_ledger (
      user_id, delta, reason, ref_type, ref_id, is_granted, meta
    ) VALUES (
      p_user_id,
      -v_use_paid,
      COALESCE(p_reason, 'consume'),
      p_ref_type,
      p_ref_id,
      false,
      jsonb_build_object('consumes_paid', true)
    );
  END IF;

  -- Update profiles.credits_balance (cache, autorité reste le ledger)
  UPDATE public.profiles
  SET credits_balance = (v_total_balance - p_amount)::INT
  WHERE id = p_user_id;

  PERFORM set_config('immonex.allow_credits_mutation', '', true);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credits(UUID, INT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credits(UUID, INT, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.consume_credits(UUID, INT, TEXT, TEXT, UUID) IS
  'Débite p_amount crédits du user en consommant FIFO les granted non-expirés '
  'd''abord, puis les crédits payants. Insère 1 ou 2 deltas négatifs selon le '
  'split. Retourne FALSE sans débit si solde insuffisant. PROMPT 2 (2026-05-04).';

-- =============================================================================
-- SECTION B — add_credits (extension signature avec is_granted + expires_at)
--
-- Ajoute 2 paramètres optionnels avec DEFAULT pour backward-compat :
--   - p_is_granted boolean DEFAULT false (les achats restent paid par défaut)
--   - p_granted_expires_at timestamptz DEFAULT NULL
--
-- Tous les call sites existants (service_approve_provider_transaction,
-- admin_approve_credit_transaction, admin_reject_listing_moderation refund)
-- continueront à passer DEFAULT false → comportement inchangé pour eux.
--
-- Le nouveau call site grant_signup_bonus_for_user passera true + expiration.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id            UUID,
  p_amount             INT,
  p_reason             TEXT,
  p_ref_type           TEXT        DEFAULT NULL,
  p_ref_id             UUID        DEFAULT NULL,
  p_is_granted         BOOLEAN     DEFAULT false,
  p_granted_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  -- Garde-fou : si is_granted=true, granted_expires_at devrait être set
  -- (sinon le grant n'expire jamais — possible mais inhabituel). On ne
  -- bloque pas, juste on laisse NULL passer (= grant éternel, ex. promo
  -- exceptionnelle). Le cron expire ne touchera pas ces lignes.

  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount
  WHERE id = p_user_id;

  INSERT INTO public.credits_ledger (
    user_id, delta, reason, ref_type, ref_id, is_granted, granted_expires_at
  ) VALUES (
    p_user_id,
    p_amount,
    COALESCE(p_reason, 'credit'),
    p_ref_type,
    p_ref_id,
    p_is_granted,
    p_granted_expires_at
  );

  PERFORM set_config('immonex.allow_credits_mutation', '', true);
END;
$$;

REVOKE ALL ON FUNCTION public.add_credits(UUID, INT, TEXT, TEXT, UUID, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC;
-- Pas de GRANT à authenticated : appelée uniquement par d'autres SECURITY DEFINER

COMMENT ON FUNCTION public.add_credits(UUID, INT, TEXT, TEXT, UUID, BOOLEAN, TIMESTAMPTZ) IS
  'Crédite p_amount au solde du user. p_is_granted=true marque la ligne comme '
  'crédits offerts (avec expiration optionnelle via p_granted_expires_at). '
  'Service-only (pas exposée à authenticated). PROMPT 2 (2026-05-04).';

-- =============================================================================
-- SECTION C — grant_signup_bonus_for_user (RPC + helper interne)
--
-- Réutilisable :
--   - Appelée par handle_new_user pour les nouveaux signups (Section D)
--   - Appelée manuellement pour backfill les 2 comptes préservés
--     (alipirbay@, pirbayali@) — voir Section B du rapport Phase 4.
--
-- Idempotente : check IF EXISTS sur ref_type='signup_grant'.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.grant_signup_bonus_for_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount     INT;
  v_existing   UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Idempotence : si l'user a déjà reçu un signup grant, no-op success
  SELECT id INTO v_existing
  FROM public.credits_ledger
  WHERE user_id = p_user_id AND ref_type = 'signup_grant'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'noop', true,
      'reason', 'already_granted',
      'existing_ledger_id', v_existing
    );
  END IF;

  -- Lookup montant depuis credit_pricing (single source of truth)
  SELECT amount INTO v_amount
  FROM public.credit_pricing
  WHERE key = 'signup_bonus';

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'signup_bonus_not_configured'
    );
  END IF;

  v_expires_at := now() + interval '90 days';

  -- Grant via add_credits étendu (insert ledger + update balance, atomique)
  PERFORM public.add_credits(
    p_user_id            => p_user_id,
    p_amount             => v_amount,
    p_reason             => 'signup_bonus',
    p_ref_type           => 'signup_grant',
    p_ref_id             => NULL,
    p_is_granted         => true,
    p_granted_expires_at => v_expires_at
  );

  -- Notification welcome (silencieuse en cas d'échec : grant déjà persisté)
  BEGIN
    PERFORM public.create_notification(
      p_user_id    => p_user_id,
      p_type       => 'credits_grant'::notification_type,
      p_category   => 'payments'::notification_category,
      p_priority   => 'normal'::notification_priority,
      p_title      => 'Bienvenue sur AutoNex !',
      p_body       => format(
        '%s crédits offerts (de quoi publier 4 annonces). Expirent dans 90 jours.',
        v_amount
      ),
      p_metadata   => jsonb_build_object(
        'amount', v_amount,
        'expires_at', v_expires_at,
        'source', 'signup_grant'
      ),
      p_action_url => '/dashboard',
      p_icon       => 'Gift'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'grant_signup_bonus notification failed for user %: %',
      p_user_id, SQLERRM;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'amount', v_amount,
    'expires_at', v_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_signup_bonus_for_user(UUID) FROM PUBLIC;
-- Pas de GRANT authenticated : helper interne. Le backfill manuel se fait
-- via SQL Editor (qui est postgres role) ou via une RPC admin séparée si besoin.

COMMENT ON FUNCTION public.grant_signup_bonus_for_user(UUID) IS
  'Grant idempotent du signup bonus (100k crédits J+90) pour un user. '
  'Appelée par handle_new_user automatiquement, ou manuellement pour '
  'backfill. Retourne {ok, amount, expires_at} ou {ok:true, noop:true} '
  'si déjà grant. PROMPT 2 (2026-05-04).';

-- =============================================================================
-- SECTION D — Extension de handle_new_user (signup grant auto)
--
-- Préserve toute la logique existante (création profile + agency).
-- Ajoute juste un appel à grant_signup_bonus_for_user à la fin, dans un
-- BEGIN/EXCEPTION pour garantir que l'échec du grant ne casse pas le signup.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta                JSONB;
  r                   TEXT;
  agency_uuid         UUID;
  v_slug              TEXT;
  profile_full_name   TEXT;
  v_grant_result      JSONB;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  r := COALESCE(meta->>'role', 'particulier');

  IF r = 'agence' THEN
    profile_full_name := COALESCE(
      NULLIF(trim(meta->>'commercial_contact_name'), ''),
      NULLIF(trim(meta->>'full_name'), ''),
      ''
    );
  ELSE
    profile_full_name := COALESCE(
      NULLIF(trim(meta->>'full_name'), ''),
      NULLIF(trim(meta->>'name'), ''),
      ''
    );
  END IF;

  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    profile_full_name,
    CASE
      WHEN r IN ('particulier', 'agence', 'promoteur', 'admin') THEN r::public.user_role
      ELSE 'particulier'::public.user_role
    END,
    NULLIF(trim(meta->>'phone'), '')
  );

  -- Agency creation (preserved from agencies_v2_module)
  IF r = 'agence' AND NULLIF(trim(meta->>'agency_name'), '') IS NOT NULL THEN
    v_slug := public.generate_agency_slug(trim(meta->>'agency_name'));

    INSERT INTO public.agencies (
      name, slug, phone, email, logo_url,
      address, commercial_contact_name, nif, stat, reg_commerce
    ) VALUES (
      trim(meta->>'agency_name'),
      v_slug,
      NULLIF(trim(meta->>'phone'), ''),
      NULLIF(trim(NEW.email), ''),
      NULLIF(trim(meta->>'agency_logo_url'), ''),
      NULLIF(trim(meta->>'agency_address'), ''),
      NULLIF(trim(meta->>'commercial_contact_name'), ''),
      NULLIF(trim(meta->>'nif'), ''),
      NULLIF(trim(meta->>'stat'), ''),
      NULLIF(trim(meta->>'reg_commerce'), '')
    )
    RETURNING id INTO agency_uuid;

    UPDATE public.profiles SET agency_id = agency_uuid WHERE id = NEW.id;
  END IF;

  -- NEW : grant signup bonus (PROMPT 2). Idempotent. Notif envoyée par la RPC.
  -- Encapsulé pour ne PAS faire échouer le signup si le grant échoue.
  BEGIN
    SELECT public.grant_signup_bonus_for_user(NEW.id) INTO v_grant_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'signup_bonus grant failed for new user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger AFTER INSERT auth.users. Crée profile + agency (si role=agence) '
  '+ grant signup bonus 100k crédits J+90 via grant_signup_bonus_for_user. '
  'Étendu par PROMPT 2 (2026-05-04). Échec grant n''invalide pas le signup.';

-- =============================================================================
-- SECTION E — service_approve_provider_transaction
--   + admin_approve_credit_transaction : grant pack.bonus_credits
--
-- Modification chirurgicale : ajouter COALESCE(v_pack.bonus_credits, 0) au
-- calcul de v_total_credits. Tous les autres comportements (idempotence,
-- ledger, sentinel credits_granted_at) inchangés.
--
-- Les 2 RPCs gardent leurs signatures et return shapes. Backward compatible.
-- =============================================================================

-- A. service_approve_provider_transaction (chemin VPI webhook)
CREATE OR REPLACE FUNCTION public.service_approve_provider_transaction(
  p_transaction_id      UUID,
  p_provider_response   JSONB,
  p_provider_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tx            public.transactions%ROWTYPE;
  v_pack          public.credit_packs%ROWTYPE;
  v_pack_credits  INT;
  v_pack_bonus    INT;
  v_promo_bonus   INT;
  v_total_credits INT;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'transaction_not_found',
                              'transaction_id', p_transaction_id);
  END IF;

  IF v_tx.credits_granted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'reason', 'already_granted',
                              'granted_at', v_tx.credits_granted_at);
  END IF;

  IF v_tx.status IN ('rejected'::public.payment_status,
                     'cancelled'::public.payment_status,
                     'failed'::public.payment_status) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'transaction_terminal_state',
                              'current_status', v_tx.status);
  END IF;

  IF v_tx.credit_pack_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_a_credit_pack_transaction');
  END IF;

  SELECT * INTO v_pack FROM public.credit_packs WHERE id = v_tx.credit_pack_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'credit_pack_not_found',
                              'pack_id', v_tx.credit_pack_id);
  END IF;

  IF v_pack.credits_amount IS NULL OR v_pack.credits_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credit_pack',
                              'pack_id', v_tx.credit_pack_id);
  END IF;

  -- Total = pack base + pack bonus catalog (PROMPT 1) + promo bonus tx (legacy promo)
  -- Les 3 sont additifs et distincts sémantiquement.
  v_pack_credits := v_pack.credits_amount;
  v_pack_bonus   := COALESCE(v_pack.bonus_credits, 0);
  v_promo_bonus  := COALESCE(v_tx.promo_bonus_credits, 0);
  v_total_credits := v_pack_credits + v_pack_bonus + v_promo_bonus;

  PERFORM public.add_credits(
    p_user_id  => v_tx.user_id,
    p_amount   => v_total_credits,
    p_reason   => CASE
      WHEN v_pack_bonus > 0 AND v_promo_bonus > 0
        THEN 'credit_pack_purchase:' || v_tx.credit_pack_id
             || ' (+' || v_pack_bonus || ' pack bonus, +' || v_promo_bonus || ' promo)'
      WHEN v_pack_bonus > 0
        THEN 'credit_pack_purchase:' || v_tx.credit_pack_id
             || ' (+' || v_pack_bonus || ' pack bonus)'
      WHEN v_promo_bonus > 0
        THEN 'credit_pack_purchase:' || v_tx.credit_pack_id
             || ' (+' || v_promo_bonus || ' promo)'
      ELSE 'credit_pack_purchase:' || v_tx.credit_pack_id
    END,
    p_ref_type   => 'transaction',
    p_ref_id     => v_tx.id,
    p_is_granted => false
    -- Pas d'expires_at : crédits payants n'expirent pas
  );

  UPDATE public.transactions
  SET status              = 'approved'::public.payment_status,
      credits_granted_at  = now(),
      reviewed_at         = now(),
      rejection_reason    = NULL,
      provider_response   = COALESCE(p_provider_response, provider_response),
      provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id)
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'ok', true,
    'transaction_id', p_transaction_id,
    'user_id', v_tx.user_id,
    'credits_granted', v_total_credits,
    'pack_credits', v_pack_credits,
    'pack_bonus', v_pack_bonus,
    'promo_bonus', v_promo_bonus,
    'provider', v_tx.provider
  );
END;
$$;

REVOKE ALL ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) TO service_role;

COMMENT ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) IS
  'VPI webhook approve. service_role only. Idempotent. Grants pack.credits_amount '
  '+ pack.bonus_credits + tx.promo_bonus_credits (les 3 additifs). PROMPT 2 update.';

-- B. admin_approve_credit_transaction (chemin admin manual fallback)
CREATE OR REPLACE FUNCTION public.admin_approve_credit_transaction(p_transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx              public.transactions%ROWTYPE;
  v_pack          public.credit_packs%ROWTYPE;
  v_pack_credits  INT;
  v_pack_bonus    INT;
  v_promo_bonus   INT;
  v_total_credits INT;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF tx.credits_granted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_processed', true, 'status', tx.status);
  END IF;

  IF tx.status IN ('rejected'::public.payment_status,
                   'cancelled'::public.payment_status,
                   'failed'::public.payment_status) THEN
    RAISE EXCEPTION 'transaction_not_approvable' USING ERRCODE = 'P0001';
  END IF;

  IF tx.credit_pack_id IS NULL THEN
    RAISE EXCEPTION 'not_a_credit_pack_transaction' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_pack FROM public.credit_packs WHERE id = tx.credit_pack_id;

  IF NOT FOUND OR v_pack.credits_amount IS NULL OR v_pack.credits_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_credit_pack' USING ERRCODE = 'P0001';
  END IF;

  v_pack_credits := v_pack.credits_amount;
  v_pack_bonus   := COALESCE(v_pack.bonus_credits, 0);
  v_promo_bonus  := COALESCE(tx.promo_bonus_credits, 0);
  v_total_credits := v_pack_credits + v_pack_bonus + v_promo_bonus;

  PERFORM public.add_credits(
    p_user_id  => tx.user_id,
    p_amount   => v_total_credits,
    p_reason   => 'credit_pack_purchase:' || tx.credit_pack_id
                  || CASE WHEN v_pack_bonus > 0 THEN ' (+' || v_pack_bonus || ' pack bonus)' ELSE '' END
                  || CASE WHEN v_promo_bonus > 0 THEN ' (+' || v_promo_bonus || ' promo)' ELSE '' END,
    p_ref_type => 'transaction',
    p_ref_id   => tx.id,
    p_is_granted => false
  );

  UPDATE public.transactions
  SET status              = 'approved'::public.payment_status,
      reviewed_at         = now(),
      reviewed_by         = auth.uid(),
      credits_granted_at  = now(),
      rejection_reason    = NULL
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'ok', true,
    'credits', v_total_credits,
    'pack_credits', v_pack_credits,
    'pack_bonus', v_pack_bonus,
    'promo_bonus', v_promo_bonus
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_credit_transaction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_credit_transaction(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_approve_credit_transaction(UUID) IS
  'Admin manual approve fallback (offline payment proof). Grants pack.credits_amount '
  '+ pack.bonus_credits + tx.promo_bonus_credits. PROMPT 2 update (2026-05-04).';

-- =============================================================================
-- SECTION F — expire_granted_credits_for_user (helper compensatoire)
--
-- Pour un user :
--   raw_granted_balance     = SUM(delta WHERE is_granted=true)   -- positifs + tous négatifs
--   active_grants_pos       = SUM(delta WHERE is_granted=true AND delta>0 AND not_expired)
--   consumed_from_grants    = SUM(-delta WHERE is_granted=true AND delta<0)
--   granted_available_now   = GREATEST(0, active_grants_pos - consumed_from_grants)
--   to_neutralize           = raw_granted_balance - granted_available_now
--
-- Si to_neutralize > 0, INSERT (-to_neutralize, is_granted=true,
-- ref_type='granted_expired') et UPDATE balance.
-- Notification 'credits_expired' envoyée.
-- Idempotent : si appelée 2× sur le même user, le 2e calcul retournera 0.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.expire_granted_credits_for_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_granted          INT;
  v_active_grants_pos    INT;
  v_consumed_from_grants INT;
  v_available_now        INT;
  v_to_neutralize        INT;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  SELECT COALESCE(SUM(delta), 0)::INT INTO v_raw_granted
  FROM public.credits_ledger
  WHERE user_id = p_user_id AND is_granted = true;

  SELECT COALESCE(SUM(delta), 0)::INT INTO v_active_grants_pos
  FROM public.credits_ledger
  WHERE user_id = p_user_id
    AND is_granted = true
    AND delta > 0
    AND (granted_expires_at IS NULL OR granted_expires_at > now());

  SELECT COALESCE(SUM(-delta), 0)::INT INTO v_consumed_from_grants
  FROM public.credits_ledger
  WHERE user_id = p_user_id
    AND is_granted = true
    AND delta < 0;

  v_available_now := GREATEST(0, v_active_grants_pos - v_consumed_from_grants);
  v_to_neutralize := v_raw_granted - v_available_now;

  IF v_to_neutralize <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'reason', 'nothing_to_expire',
                              'raw_granted', v_raw_granted,
                              'available_now', v_available_now);
  END IF;

  -- INSERT compensatoire négatif (is_granted=true pour cohérence des SUM granted)
  INSERT INTO public.credits_ledger (
    user_id, delta, reason, ref_type, is_granted, meta
  ) VALUES (
    p_user_id,
    -v_to_neutralize,
    'granted_expired',
    'granted_expired',
    true,
    jsonb_build_object('neutralized_amount', v_to_neutralize,
                       'raw_granted_before', v_raw_granted,
                       'available_at_expiry', v_available_now)
  );

  -- Update profiles.credits_balance (cache)
  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  UPDATE public.profiles
  SET credits_balance = credits_balance - v_to_neutralize
  WHERE id = p_user_id;
  PERFORM set_config('immonex.allow_credits_mutation', '', true);

  -- Notification (silencieuse si échec)
  BEGIN
    PERFORM public.create_notification(
      p_user_id    => p_user_id,
      p_type       => 'credits_expired'::notification_type,
      p_category   => 'payments'::notification_category,
      p_priority   => 'normal'::notification_priority,
      p_title      => 'Crédits offerts expirés',
      p_body       => format('%s crédits offerts non utilisés ont expiré.', v_to_neutralize),
      p_metadata   => jsonb_build_object('amount_expired', v_to_neutralize),
      p_action_url => '/dashboard',
      p_icon       => 'Clock'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'credits_expired notification failed for user %: %', p_user_id, SQLERRM;
  END;

  RETURN jsonb_build_object('ok', true, 'neutralized', v_to_neutralize,
                            'raw_granted_before', v_raw_granted);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_granted_credits_for_user(UUID) FROM PUBLIC;

COMMENT ON FUNCTION public.expire_granted_credits_for_user(UUID) IS
  'Neutralise les grants expirés non-consommés pour un user via INSERT compensatoire. '
  'Idempotent. Appelée par le cron autonex-expire-granted-credits-daily. PROMPT 2.';

-- =============================================================================
-- SECTION G — enqueue_lifecycle_notifications (helper batch)
--
-- Enqueue les notifs cycle de vie qui ne sont pas déjà envoyées :
--   - listing_expiring_7d : listings active dont expires_at ∈ [J+6.5, J+7.5]
--   - listing_expiring_3d : … ∈ [J+2.5, J+3.5]
--   - listing_expiring_1d : … ∈ [J+0.5, J+1.5]
--   - listing_expired    : listings dont status devient 'expired' < 24h
--   - boost_ending_1d    : boosts dont ends_at ∈ [J+0.9, J+1.1] et listing actif
--   - boost_ended        : boosts dont ends_at ∈ [now-24h, now] et listing actif
--   - credits_expiring_30d : grants dont granted_expires_at ∈ [J+29.5, J+30.5]
--
-- Dedupe via NOT EXISTS sur metadata->>'lifecycle_event' + entity_id.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_lifecycle_notifications()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec       RECORD;
  v_n_7d        INT := 0;
  v_n_3d        INT := 0;
  v_n_1d        INT := 0;
  v_n_expired   INT := 0;
  v_n_boost_1d  INT := 0;
  v_n_boost_end INT := 0;
  v_n_grant_30d INT := 0;
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

  -- boost_ending_1d (entre 22h et 26h avant la fin, dedupe par boost_id)
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

  -- boost_ended (terminé dans les dernières 24h)
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

  -- credits_expiring_30d : un user qui a des grants positifs encore actifs
  -- dont le PLUS PROCHE granted_expires_at tombe dans [J+29.5, J+30.5]
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
    -- Dedupe par user_id + date d'expiration approximative (1 notif par cohorte)
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

  RETURN jsonb_build_object(
    'ok', true,
    'enqueued', jsonb_build_object(
      'listing_expiring_7d', v_n_7d,
      'listing_expiring_3d', v_n_3d,
      'listing_expiring_1d', v_n_1d,
      'listing_expired', v_n_expired,
      'boost_ending_1d', v_n_boost_1d,
      'boost_ended', v_n_boost_end,
      'credits_expiring_30d', v_n_grant_30d
    ),
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_lifecycle_notifications() FROM PUBLIC;

COMMENT ON FUNCTION public.enqueue_lifecycle_notifications() IS
  'Batch enqueue des notifs cycle de vie (7 types). Dedupe via metadata. '
  'Appelée par autonex-enqueue-lifecycle-notifications-daily. PROMPT 2.';

-- =============================================================================
-- SECTION H — Helper expire_listings_lifecycle (transitions status)
--
-- Appelé par le cron autonex-expire-listings-daily. Deux passes :
--   1. active → expired si expires_at <= now()
--   2. active → expiring_soon si expires_at - now() <= 7j (et > now())
--
-- Garde-fous :
--   - skip si owner_id IS NULL (legacy data)
--   - status hidden_pending_review et autres états manuels intouchés
--   - sold_at déjà set → on n'écrase pas (status reste 'sold')
--
-- Note : les triggers notify_listing_published / notify_listing_rejected
-- sont déclenchés uniquement sur transition vers 'active'/'rejected', donc
-- nos UPDATE vers 'expired'/'expiring_soon' ne déclenchent rien d'inattendu.
-- Les notifs 'listing_expired' viendront du cron lifecycle (Section G).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.expire_listings_lifecycle()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n_expired      INT;
  v_n_expiring_soon INT;
BEGIN
  -- 1. Active/expiring_soon → expired si déjà passé
  UPDATE public.listings
  SET status = 'expired'::public.listing_status
  WHERE status IN ('active'::public.listing_status, 'expiring_soon'::public.listing_status)
    AND expires_at IS NOT NULL
    AND expires_at <= now();
  GET DIAGNOSTICS v_n_expired = ROW_COUNT;

  -- 2. Active → expiring_soon si dans la fenêtre J-7
  UPDATE public.listings
  SET status = 'expiring_soon'::public.listing_status
  WHERE status = 'active'::public.listing_status
    AND expires_at IS NOT NULL
    AND expires_at > now()
    AND expires_at - now() <= interval '7 days';
  GET DIAGNOSTICS v_n_expiring_soon = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'expired', v_n_expired,
    'expiring_soon', v_n_expiring_soon,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_listings_lifecycle() FROM PUBLIC;

COMMENT ON FUNCTION public.expire_listings_lifecycle() IS
  'Cron helper : transitions automatiques active → expiring_soon (J-7) → expired. '
  'Appelée par autonex-expire-listings-daily. PROMPT 2.';

-- =============================================================================
-- SECTION I — Helper expire_all_granted_credits (boucle users + cron)
--
-- Boucle sur les users qui ont au moins un grant actif (pour économiser),
-- et appelle expire_granted_credits_for_user pour chacun. Le helper interne
-- est idempotent : si rien à neutraliser, no-op.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.expire_all_granted_credits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      RECORD;
  v_result    JSONB;
  v_n_processed INT := 0;
  v_n_expired   INT := 0;
  v_total_neutralized BIGINT := 0;
BEGIN
  -- Sélectionne uniquement les users qui ont au moins 1 grant positif
  -- expiré récemment (= raw_granted > available_now possible).
  FOR v_user IN
    SELECT DISTINCT user_id
    FROM public.credits_ledger
    WHERE is_granted = true
      AND delta > 0
      AND granted_expires_at IS NOT NULL
      AND granted_expires_at <= now()
  LOOP
    v_result := public.expire_granted_credits_for_user(v_user.user_id);
    v_n_processed := v_n_processed + 1;
    IF (v_result->>'noop') IS NULL OR (v_result->>'noop') <> 'true' THEN
      v_n_expired := v_n_expired + 1;
      v_total_neutralized := v_total_neutralized + COALESCE((v_result->>'neutralized')::BIGINT, 0);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'users_processed', v_n_processed,
    'users_with_expirations', v_n_expired,
    'total_credits_neutralized', v_total_neutralized,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_all_granted_credits() FROM PUBLIC;

COMMENT ON FUNCTION public.expire_all_granted_credits() IS
  'Cron helper : boucle expire_granted_credits_for_user pour tous les users avec '
  'des grants expirés. Appelée par autonex-expire-granted-credits-daily. PROMPT 2.';

-- =============================================================================
-- SECTION J — pg_cron jobs (3 jobs)
--
-- pg_cron déjà installé en prod (utilisé par RGPD deletion + email digest).
-- Pattern idempotent : unschedule par jobname puis schedule.
-- Pas besoin de Vault ici : tous les jobs appellent des fonctions PL/pgSQL
-- locales (pas d'HTTP outbound vers les Edge Functions).
-- =============================================================================

-- Job 1: expire-listings-daily (02:00 UTC = 05:00 Antananarivo)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'autonex-expire-listings-daily';

SELECT cron.schedule(
  'autonex-expire-listings-daily',
  '0 2 * * *',
  $$ SELECT public.expire_listings_lifecycle(); $$
);

-- Job 2: expire-granted-credits-daily (02:30 UTC)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'autonex-expire-granted-credits-daily';

SELECT cron.schedule(
  'autonex-expire-granted-credits-daily',
  '30 2 * * *',
  $$ SELECT public.expire_all_granted_credits(); $$
);

-- Job 3: enqueue-lifecycle-notifications-daily (03:00 UTC)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'autonex-enqueue-lifecycle-notifications-daily';

SELECT cron.schedule(
  'autonex-enqueue-lifecycle-notifications-daily',
  '0 3 * * *',
  $$ SELECT public.enqueue_lifecycle_notifications(); $$
);

-- Pas de cron expire-boosts : la table boosts n'a pas de colonne status,
-- "boost actif" se calcule à la lecture via ends_at > now(). Les notifs
-- boost_ended sont gérées par enqueue_lifecycle_notifications.
