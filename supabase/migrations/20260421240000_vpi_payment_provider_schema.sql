-- =============================================================================
-- Mission P.1 — DB migration additive pour intégration Vanilla Pay (VPI)
-- =============================================================================
-- 100 % non destructif : ALTER TYPE ADD VALUE idempotent, ADD COLUMN IF NOT
-- EXISTS, CREATE INDEX IF NOT EXISTS, CREATE OR REPLACE FUNCTION. Aucune
-- modification des RPCs existantes (add_credits, admin_approve_credit_transaction,
-- create_transaction_with_promo, consume_credits) ni des colonnes existantes.
--
-- Architecture validée (cf. rapport investigation P.0) :
--   - Gateway unique VPI pour beta (colonne `provider` prévoit multi-gateway)
--   - MGA uniquement
--   - Hosted redirect (checkout_url côté VPI)
--   - Webhook HMAC-SHA256 (Mission P.2, service_role uniquement)
--   - Flow manuel conservé en fallback (admin approve/reject inchangés)
--   - Promo codes calculés server-side AVANT appel VPI
--
-- Trigger `trg_sanitize_transaction_insert` analysé : ne touche aucune des
-- nouvelles colonnes provider_*. Compatible VPI sans modification.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enum payment_method : ajout valeur 'vanilla_pay' en dernière position
-- -----------------------------------------------------------------------------
-- IF NOT EXISTS est supporté sur ADD VALUE depuis Postgres 12. Idempotent.
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'vanilla_pay';


-- -----------------------------------------------------------------------------
-- 2. Colonnes provider_* sur transactions (toutes nullable, backward compat)
-- -----------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS provider              TEXT        NULL,
  ADD COLUMN IF NOT EXISTS provider_payment_id   TEXT        NULL,
  ADD COLUMN IF NOT EXISTS provider_checkout_url TEXT        NULL,
  ADD COLUMN IF NOT EXISTS provider_response     JSONB       NULL,
  ADD COLUMN IF NOT EXISTS provider_initiated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS provider_expires_at   TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.transactions.provider IS
  'Gateway name : vanilla_pay | manual | stripe (futur). NULL pour les tx legacy pré-VPI.';
COMMENT ON COLUMN public.transactions.provider_payment_id IS
  'ID unique fourni par la gateway (reference_VPI du callback). Index UNIQUE partiel pour idempotence webhook.';
COMMENT ON COLUMN public.transactions.provider_checkout_url IS
  'URL hosted checkout retournée par la gateway lors de l''initiate.';
COMMENT ON COLUMN public.transactions.provider_response IS
  'Payload brut du webhook pour audit/debug.';
COMMENT ON COLUMN public.transactions.provider_initiated_at IS
  'Timestamp de création de la session checkout côté gateway.';
COMMENT ON COLUMN public.transactions.provider_expires_at IS
  'Expiration de la session checkout si applicable (timeout VPI).';


-- -----------------------------------------------------------------------------
-- 3. Index UNIQUE partiel — idempotence webhook VPI
-- -----------------------------------------------------------------------------
-- Empêche 2 rows avec le même provider_payment_id. WHERE clause évite une
-- contrainte sur les tx legacy (provider_payment_id NULL).
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_provider_payment_id_unique
  ON public.transactions (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 4. Index recherche par provider (filtre admin / reporting)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_provider
  ON public.transactions (provider)
  WHERE provider IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 5. RPC service_approve_provider_transaction
-- -----------------------------------------------------------------------------
-- Appelée UNIQUEMENT par l'Edge Function webhook (service_role key). Fait le
-- même job que admin_approve_credit_transaction mais sans check admin.
--
-- Pattern retour JSONB { ok, ... } au lieu de RAISE EXCEPTION : le webhook
-- doit répondre 200 OK à VPI même en cas d'erreur logique (sinon retry loop).
-- Divergence stylistique acceptée et documentée.
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.service_approve_provider_transaction(UUID, JSONB, TEXT);

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
  v_total_credits INT;
BEGIN
  -- Lock row (protège contre race condition webhook + admin manual simultanés)
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'transaction_not_found',
      'transaction_id', p_transaction_id
    );
  END IF;

  -- Idempotence : si déjà créditée, no-op success (webhook retry safe)
  IF v_tx.credits_granted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'noop', true,
      'reason', 'already_granted',
      'granted_at', v_tx.credits_granted_at
    );
  END IF;

  -- État terminal (rejected/cancelled/failed) : ne pas approuver
  IF v_tx.status IN (
    'rejected'::public.payment_status,
    'cancelled'::public.payment_status,
    'failed'::public.payment_status
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'transaction_terminal_state',
      'current_status', v_tx.status
    );
  END IF;

  -- Le credit pack doit exister (sinon on ne saurait pas combien créditer)
  IF v_tx.credit_pack_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_a_credit_pack_transaction'
    );
  END IF;

  SELECT * INTO v_pack
  FROM public.credit_packs
  WHERE id = v_tx.credit_pack_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'credit_pack_not_found',
      'pack_id', v_tx.credit_pack_id
    );
  END IF;

  IF v_pack.credits_amount IS NULL OR v_pack.credits_amount <= 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invalid_credit_pack',
      'pack_id', v_tx.credit_pack_id
    );
  END IF;

  -- Total = crédits du pack + bonus promo (identique admin_approve_credit_transaction)
  v_total_credits := v_pack.credits_amount + COALESCE(v_tx.promo_bonus_credits, 0);

  -- Grant via add_credits (SECURITY DEFINER, écrit ledger + profiles.credits_balance)
  PERFORM public.add_credits(
    v_tx.user_id,
    v_total_credits,
    CASE
      WHEN COALESCE(v_tx.promo_bonus_credits, 0) > 0
        THEN 'credit_pack_purchase:' || v_tx.credit_pack_id || ' (+' || v_tx.promo_bonus_credits || ' promo)'
      ELSE 'credit_pack_purchase:' || v_tx.credit_pack_id
    END,
    'transaction',
    v_tx.id
  );

  -- Update transaction : status approved + sentinel idempotence + provider metadata
  -- reviewed_by reste NULL (sémantique : validation auto-gateway, pas admin humain).
  -- rejection_reason = NULL : défense en profondeur (cleanup si row avait eu un state résiduel).
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
    'pack_credits', v_pack.credits_amount,
    'bonus_credits', COALESCE(v_tx.promo_bonus_credits, 0),
    'provider', v_tx.provider
  );
END;
$$;

REVOKE ALL ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) TO service_role;

COMMENT ON FUNCTION public.service_approve_provider_transaction(UUID, JSONB, TEXT) IS
  'Mission P.1 — Approve transaction gateway-auto (VPI webhook). service_role only. Idempotent. Retour JSONB {ok, ...} (pas de RAISE EXCEPTION : webhook doit répondre 200).';


-- -----------------------------------------------------------------------------
-- 6. RPC service_reject_provider_transaction
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.service_reject_provider_transaction(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.service_reject_provider_transaction(
  p_transaction_id    UUID,
  p_reason            TEXT,
  p_provider_response JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'transaction_not_found',
      'transaction_id', p_transaction_id
    );
  END IF;

  -- Contre-idempotence : si déjà approuvée (crédits attribués), on NE peut
  -- PAS rejeter. Signalement d'un bug logique en amont (VPI reject après success).
  IF v_tx.credits_granted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_approved_cannot_reject',
      'transaction_id', p_transaction_id,
      'granted_at', v_tx.credits_granted_at
    );
  END IF;

  -- État déjà terminal côté reject : no-op success (webhook retry safe)
  IF v_tx.status IN (
    'rejected'::public.payment_status,
    'cancelled'::public.payment_status,
    'failed'::public.payment_status
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'noop', true,
      'current_status', v_tx.status
    );
  END IF;

  UPDATE public.transactions
  SET status            = 'rejected'::public.payment_status,
      rejection_reason  = NULLIF(trim(COALESCE(p_reason, '')), ''),
      provider_response = COALESCE(p_provider_response, provider_response),
      reviewed_at       = now()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'ok', true,
    'transaction_id', p_transaction_id,
    'status', 'rejected'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.service_reject_provider_transaction(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.service_reject_provider_transaction(UUID, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.service_reject_provider_transaction(UUID, TEXT, JSONB) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.service_reject_provider_transaction(UUID, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION public.service_reject_provider_transaction(UUID, TEXT, JSONB) IS
  'Mission P.1 — Reject transaction gateway-auto (VPI webhook). service_role only. Idempotent. Refuse si credits_granted_at déjà set.';
