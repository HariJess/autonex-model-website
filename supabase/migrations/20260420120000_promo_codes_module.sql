-- =============================================================================
-- Promo codes module
--
-- Grants admins the ability to create, update and soft-delete promo codes
-- applied at credit pack purchase time. Two code types (mutually exclusive):
--   - percentage: reduces the price_mga the user pays (grants stay nominal)
--   - bonus_credits: adds extra credits on top of the pack's credits_amount
--
-- Rules (all optional, combinable):
--   - max_redemptions: global quota (NULL = unlimited)
--   - one_per_user: each user can redeem only once
--   - expires_at: expiry date (NULL = permanent)
--   - applicable_pack_ids TEXT[] (NULL = all packs; V2 hook, no V1 UI)
--
-- Design mirrored on admin_user_detail_module + admin_pricing_module:
--   - privileged writes via SECURITY DEFINER RPCs, guarded by immonex_is_admin()
--   - soft delete (active=false); FK from transactions/redemptions stay valid
--   - concurrency safe via FOR UPDATE + UNIQUE(promo_code_id, transaction_id)
--     on promo_code_redemptions (defends double-redeem under race)
--   - admin writes audited via log_admin_action; user redemptions audited
--     by the redemptions row itself
--
-- V1 scope:
--   - Immutable fields on update: code, type, percentage_off, bonus_credits
--     (change = create a new code + soft-delete old one). Preserves historical
--     integrity of redemption records.
--   - Hard delete not exposed in V1 (soft delete only).
--   - applicable_pack_ids column created; V1 validates it but has no UI.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Enum type
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.promo_code_type AS ENUM ('percentage', 'bonus_credits');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- B. Table promo_codes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  TEXT NOT NULL UNIQUE
                          CHECK (char_length(code) BETWEEN 1 AND 50
                                 AND code = upper(code)
                                 AND code ~ '^[A-Z0-9-]+$'),
  description           TEXT,
  type                  public.promo_code_type NOT NULL,
  percentage_off        INTEGER CHECK (percentage_off IS NULL OR (percentage_off > 0 AND percentage_off <= 100)),
  bonus_credits         INTEGER CHECK (bonus_credits IS NULL OR bonus_credits > 0),
  max_redemptions       INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  times_redeemed        INTEGER NOT NULL DEFAULT 0 CHECK (times_redeemed >= 0),
  one_per_user          BOOLEAN NOT NULL DEFAULT false,
  expires_at            TIMESTAMPTZ,
  applicable_pack_ids   TEXT[],
  active                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT promo_codes_type_exclusive CHECK (
    (type = 'percentage'    AND percentage_off IS NOT NULL AND bonus_credits IS NULL)
    OR
    (type = 'bonus_credits' AND bonus_credits IS NOT NULL  AND percentage_off IS NULL)
  )
);

COMMENT ON TABLE public.promo_codes IS
  'Admin-curated promo codes applied at credit pack purchase. Type exclusive: percentage OR bonus_credits. Soft delete via active=false (never hard delete to preserve FK from redemptions).';
COMMENT ON COLUMN public.promo_codes.code IS 'UPPERCASE, alphanumeric + hyphens, max 50 chars. Lookup is case-insensitive (normalised via upper() in RPCs).';
COMMENT ON COLUMN public.promo_codes.applicable_pack_ids IS 'NULL = all packs. V2 hook: admin-curated whitelist of credit_packs.id strings.';
COMMENT ON COLUMN public.promo_codes.times_redeemed IS 'Server-incremented counter (never decremented). Enforces max_redemptions under concurrency via FOR UPDATE lock inside redeem RPC.';

CREATE INDEX IF NOT EXISTS idx_promo_codes_code_active
  ON public.promo_codes (code) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_promo_codes_active_expires
  ON public.promo_codes (active, expires_at);

-- -----------------------------------------------------------------------------
-- C. Table promo_code_redemptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id   UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id  UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, transaction_id)
);

COMMENT ON TABLE public.promo_code_redemptions IS
  'Immutable log of promo code usage. UNIQUE(promo_code_id, transaction_id) defends against double-redeem under race. ON DELETE CASCADE on all FKs: if the code, user or transaction is deleted, the redemption row goes too.';

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code_user
  ON public.promo_code_redemptions (promo_code_id, user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_date
  ON public.promo_code_redemptions (user_id, redeemed_at DESC);

-- -----------------------------------------------------------------------------
-- D. Columns on transactions for promo tracking
-- -----------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_discount_mga BIGINT NOT NULL DEFAULT 0 CHECK (promo_discount_mga >= 0),
  ADD COLUMN IF NOT EXISTS promo_bonus_credits INTEGER NOT NULL DEFAULT 0 CHECK (promo_bonus_credits >= 0);

COMMENT ON COLUMN public.transactions.promo_discount_mga IS
  'Ariary discount applied at purchase (percentage code). Effective amount paid by user = amount_mga - promo_discount_mga. amount_mga stays the nominal pack price.';
COMMENT ON COLUMN public.transactions.promo_bonus_credits IS
  'Extra credits granted on top of the pack credits_amount (bonus_credits code). Admin approval adds credits_amount + promo_bonus_credits.';

-- -----------------------------------------------------------------------------
-- E. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_codes_select_admin_only" ON public.promo_codes;
CREATE POLICY "promo_codes_select_admin_only"
  ON public.promo_codes
  FOR SELECT
  USING (public.immonex_is_admin());
-- No INSERT/UPDATE/DELETE policies: writes are RPC-exclusive (SECURITY DEFINER).

DROP POLICY IF EXISTS "promo_redemptions_select_admin_only" ON public.promo_code_redemptions;
CREATE POLICY "promo_redemptions_select_admin_only"
  ON public.promo_code_redemptions
  FOR SELECT
  USING (public.immonex_is_admin());
-- No write policies: redemptions inserted only by redeem_promo_code RPC.

-- -----------------------------------------------------------------------------
-- F. Trigger set_promo_codes_updated_at
--    Fires only when admin-editable fields change (not on times_redeemed
--    increments during user redemptions — updated_by stays "last admin editor").
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_promo_codes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promo_codes_updated_at ON public.promo_codes;
CREATE TRIGGER trg_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  WHEN (
    OLD.description        IS DISTINCT FROM NEW.description
    OR OLD.max_redemptions    IS DISTINCT FROM NEW.max_redemptions
    OR OLD.one_per_user       IS DISTINCT FROM NEW.one_per_user
    OR OLD.expires_at         IS DISTINCT FROM NEW.expires_at
    OR OLD.applicable_pack_ids IS DISTINCT FROM NEW.applicable_pack_ids
    OR OLD.active             IS DISTINCT FROM NEW.active
  )
  EXECUTE FUNCTION public.set_promo_codes_updated_at();

-- -----------------------------------------------------------------------------
-- G1. admin_create_promo_code
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_promo_code(
  p_code                 TEXT,
  p_description          TEXT,
  p_type                 public.promo_code_type,
  p_percentage_off       INTEGER,
  p_bonus_credits        INTEGER,
  p_max_redemptions      INTEGER,
  p_one_per_user         BOOLEAN,
  p_expires_at           TIMESTAMPTZ,
  p_applicable_pack_ids  TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_id   UUID;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_code := upper(trim(COALESCE(p_code, '')));
  IF char_length(v_code) = 0 THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = '23514';
  END IF;
  IF char_length(v_code) > 50 OR v_code !~ '^[A-Z0-9-]+$' THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = '23514';
  END IF;

  IF p_type = 'percentage' THEN
    IF p_percentage_off IS NULL OR p_percentage_off < 1 OR p_percentage_off > 100 THEN
      RAISE EXCEPTION 'invalid_percentage' USING ERRCODE = '23514';
    END IF;
    IF p_bonus_credits IS NOT NULL THEN
      RAISE EXCEPTION 'invalid_type_fields' USING ERRCODE = '23514';
    END IF;
  ELSIF p_type = 'bonus_credits' THEN
    IF p_bonus_credits IS NULL OR p_bonus_credits <= 0 THEN
      RAISE EXCEPTION 'invalid_bonus_credits' USING ERRCODE = '23514';
    END IF;
    IF p_percentage_off IS NOT NULL THEN
      RAISE EXCEPTION 'invalid_type_fields' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF p_max_redemptions IS NOT NULL AND p_max_redemptions <= 0 THEN
    RAISE EXCEPTION 'invalid_max_redemptions' USING ERRCODE = '23514';
  END IF;

  BEGIN
    INSERT INTO public.promo_codes (
      code, description, type, percentage_off, bonus_credits,
      max_redemptions, one_per_user, expires_at, applicable_pack_ids,
      active, created_by, updated_by
    )
    VALUES (
      v_code, p_description, p_type, p_percentage_off, p_bonus_credits,
      p_max_redemptions, COALESCE(p_one_per_user, false), p_expires_at, p_applicable_pack_ids,
      true, auth.uid(), auth.uid()
    )
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'code_already_exists' USING ERRCODE = '23505';
  END;

  PERFORM public.log_admin_action(
    'create_promo_code',
    NULL,
    'promo_code',
    v_id,
    jsonb_build_object(
      'promo_code_id',         v_id,
      'code',                  v_code,
      'type',                  p_type::text,
      'percentage_off',        p_percentage_off,
      'bonus_credits',         p_bonus_credits,
      'max_redemptions',       p_max_redemptions,
      'one_per_user',          COALESCE(p_one_per_user, false),
      'expires_at',            p_expires_at,
      'applicable_pack_ids',   p_applicable_pack_ids
    )
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_promo_code(TEXT, TEXT, public.promo_code_type, INTEGER, INTEGER, INTEGER, BOOLEAN, TIMESTAMPTZ, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_promo_code(TEXT, TEXT, public.promo_code_type, INTEGER, INTEGER, INTEGER, BOOLEAN, TIMESTAMPTZ, TEXT[]) TO authenticated;

-- -----------------------------------------------------------------------------
-- G2. admin_update_promo_code
--    Only editable fields: description, max_redemptions, one_per_user,
--    expires_at, applicable_pack_ids, active. Type/code/percentage/bonus
--    are immutable by design (change = new code + soft-delete old).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_promo_code(
  p_id                   UUID,
  p_description          TEXT,
  p_max_redemptions      INTEGER,
  p_one_per_user         BOOLEAN,
  p_expires_at           TIMESTAMPTZ,
  p_applicable_pack_ids  TEXT[],
  p_active               BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.promo_codes%ROWTYPE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_old FROM public.promo_codes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'promo_code_not_found' USING ERRCODE = '23503';
  END IF;

  IF p_max_redemptions IS NOT NULL THEN
    IF p_max_redemptions <= 0 THEN
      RAISE EXCEPTION 'invalid_max_redemptions' USING ERRCODE = '23514';
    END IF;
    IF p_max_redemptions < v_old.times_redeemed THEN
      RAISE EXCEPTION 'max_redemptions_below_current' USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.promo_codes
    SET description         = p_description,
        max_redemptions     = p_max_redemptions,
        one_per_user        = COALESCE(p_one_per_user, false),
        expires_at          = p_expires_at,
        applicable_pack_ids = p_applicable_pack_ids,
        active              = COALESCE(p_active, v_old.active)
    WHERE id = p_id;

  PERFORM public.log_admin_action(
    'update_promo_code',
    NULL,
    'promo_code',
    p_id,
    jsonb_build_object(
      'promo_code_id', p_id,
      'code',          v_old.code,
      'old', jsonb_build_object(
        'description',         v_old.description,
        'max_redemptions',     v_old.max_redemptions,
        'one_per_user',        v_old.one_per_user,
        'expires_at',          v_old.expires_at,
        'applicable_pack_ids', v_old.applicable_pack_ids,
        'active',              v_old.active
      ),
      'new', jsonb_build_object(
        'description',         p_description,
        'max_redemptions',     p_max_redemptions,
        'one_per_user',        COALESCE(p_one_per_user, false),
        'expires_at',          p_expires_at,
        'applicable_pack_ids', p_applicable_pack_ids,
        'active',              COALESCE(p_active, v_old.active)
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_promo_code(UUID, TEXT, INTEGER, BOOLEAN, TIMESTAMPTZ, TEXT[], BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_promo_code(UUID, TEXT, INTEGER, BOOLEAN, TIMESTAMPTZ, TEXT[], BOOLEAN) TO authenticated;

-- -----------------------------------------------------------------------------
-- G3. admin_delete_promo_code (soft delete only in V1)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_promo_code(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.promo_codes%ROWTYPE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_old FROM public.promo_codes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'promo_code_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_old.active = false THEN
    RETURN;  -- idempotent
  END IF;

  UPDATE public.promo_codes SET active = false WHERE id = p_id;

  PERFORM public.log_admin_action(
    'delete_promo_code',
    NULL,
    'promo_code',
    p_id,
    jsonb_build_object(
      'promo_code_id', p_id,
      'code',          v_old.code,
      'soft_delete',   true
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_promo_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_promo_code(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- G4. validate_promo_code (user-facing, read-only preview)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code            TEXT,
  p_credit_pack_id  TEXT
)
RETURNS TABLE (
  valid             BOOLEAN,
  error_code        TEXT,
  promo_code_id     UUID,
  type              public.promo_code_type,
  discount_mga      BIGINT,
  bonus_credits     INTEGER,
  final_price_mga   BIGINT,
  final_credits     INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code         TEXT;
  v_promo        public.promo_codes%ROWTYPE;
  v_pack_price   BIGINT;
  v_pack_credits INTEGER;
  v_user_id      UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  v_code := upper(trim(COALESCE(p_code, '')));
  IF char_length(v_code) = 0 THEN
    RETURN QUERY SELECT false, 'invalid_code'::TEXT, NULL::UUID, NULL::public.promo_code_type,
                        0::BIGINT, 0::INTEGER, 0::BIGINT, 0::INTEGER;
    RETURN;
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes WHERE code = v_code AND active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'code_not_found'::TEXT, NULL::UUID, NULL::public.promo_code_type,
                        0::BIGINT, 0::INTEGER, 0::BIGINT, 0::INTEGER;
    RETURN;
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN QUERY SELECT false, 'code_expired'::TEXT, v_promo.id, v_promo.type,
                        0::BIGINT, 0::INTEGER, 0::BIGINT, 0::INTEGER;
    RETURN;
  END IF;

  IF v_promo.max_redemptions IS NOT NULL
     AND v_promo.times_redeemed >= v_promo.max_redemptions THEN
    RETURN QUERY SELECT false, 'code_exhausted'::TEXT, v_promo.id, v_promo.type,
                        0::BIGINT, 0::INTEGER, 0::BIGINT, 0::INTEGER;
    RETURN;
  END IF;

  IF v_promo.applicable_pack_ids IS NOT NULL
     AND NOT (p_credit_pack_id = ANY (v_promo.applicable_pack_ids)) THEN
    RETURN QUERY SELECT false, 'code_not_applicable_to_pack'::TEXT, v_promo.id, v_promo.type,
                        0::BIGINT, 0::INTEGER, 0::BIGINT, 0::INTEGER;
    RETURN;
  END IF;

  IF v_promo.one_per_user AND EXISTS (
    SELECT 1 FROM public.promo_code_redemptions
    WHERE promo_code_id = v_promo.id AND user_id = v_user_id
  ) THEN
    RETURN QUERY SELECT false, 'code_already_used'::TEXT, v_promo.id, v_promo.type,
                        0::BIGINT, 0::INTEGER, 0::BIGINT, 0::INTEGER;
    RETURN;
  END IF;

  SELECT price_mga, credits_amount INTO v_pack_price, v_pack_credits
  FROM public.credit_packs WHERE id = p_credit_pack_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'pack_not_found'::TEXT, v_promo.id, v_promo.type,
                        0::BIGINT, 0::INTEGER, 0::BIGINT, 0::INTEGER;
    RETURN;
  END IF;

  -- All checks passed → compute the preview values.
  IF v_promo.type = 'percentage' THEN
    RETURN QUERY SELECT
      true,
      NULL::TEXT,
      v_promo.id,
      v_promo.type,
      ((v_pack_price * v_promo.percentage_off) / 100)::BIGINT,  -- discount_mga
      0::INTEGER,                                                 -- bonus_credits
      (v_pack_price - ((v_pack_price * v_promo.percentage_off) / 100))::BIGINT,  -- final_price
      v_pack_credits;                                             -- final_credits (unchanged)
  ELSE
    RETURN QUERY SELECT
      true,
      NULL::TEXT,
      v_promo.id,
      v_promo.type,
      0::BIGINT,                                                  -- discount_mga
      v_promo.bonus_credits::INTEGER,                             -- bonus_credits
      v_pack_price,                                               -- final_price (unchanged)
      (v_pack_credits + v_promo.bonus_credits)::INTEGER;          -- final_credits
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_promo_code(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- G5. redeem_promo_code (user action, called inside transaction insert flow)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code            TEXT,
  p_credit_pack_id  TEXT,
  p_transaction_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID;
  v_code         TEXT;
  v_promo        public.promo_codes%ROWTYPE;
  v_pack_price   BIGINT;
  v_pack_credits INTEGER;
  v_discount     BIGINT := 0;
  v_bonus        INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  v_code := upper(trim(COALESCE(p_code, '')));
  IF char_length(v_code) = 0 THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = '23514';
  END IF;

  -- Lock the promo row for the duration of the transaction (serialises
  -- concurrent redeems of the same code, required for max_redemptions safety).
  SELECT * INTO v_promo FROM public.promo_codes
    WHERE code = v_code AND active = true
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'code_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RAISE EXCEPTION 'code_expired' USING ERRCODE = 'P0001';
  END IF;

  IF v_promo.max_redemptions IS NOT NULL
     AND v_promo.times_redeemed >= v_promo.max_redemptions THEN
    RAISE EXCEPTION 'code_exhausted' USING ERRCODE = 'P0001';
  END IF;

  IF v_promo.applicable_pack_ids IS NOT NULL
     AND NOT (p_credit_pack_id = ANY (v_promo.applicable_pack_ids)) THEN
    RAISE EXCEPTION 'code_not_applicable_to_pack' USING ERRCODE = 'P0001';
  END IF;

  IF v_promo.one_per_user AND EXISTS (
    SELECT 1 FROM public.promo_code_redemptions
    WHERE promo_code_id = v_promo.id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'code_already_used' USING ERRCODE = 'P0001';
  END IF;

  SELECT price_mga, credits_amount INTO v_pack_price, v_pack_credits
  FROM public.credit_packs WHERE id = p_credit_pack_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pack_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_promo.type = 'percentage' THEN
    v_discount := (v_pack_price * v_promo.percentage_off) / 100;
  ELSE
    v_bonus := v_promo.bonus_credits;
  END IF;

  -- Insert the redemption first — UNIQUE(promo_code_id, transaction_id)
  -- catches any duplicate attempt (idempotency on client retry).
  BEGIN
    INSERT INTO public.promo_code_redemptions (promo_code_id, user_id, transaction_id)
    VALUES (v_promo.id, v_user_id, p_transaction_id);
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'redemption_already_recorded' USING ERRCODE = '23505';
  END;

  UPDATE public.promo_codes
    SET times_redeemed = times_redeemed + 1
    WHERE id = v_promo.id;

  UPDATE public.transactions
    SET promo_code_id       = v_promo.id,
        promo_discount_mga  = v_discount,
        promo_bonus_credits = v_bonus
    WHERE id = p_transaction_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction_not_found' USING ERRCODE = '23503';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_promo_code(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(TEXT, TEXT, UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- G6. create_transaction_with_promo
--    Atomic wrapper for the purchase flow: INSERT transaction + (optionally)
--    redeem promo code in one PL/pgSQL block.
--
--    DEVIATION FROM SPEC: signature extended with p_payment_proof_url and
--    p_reference so this RPC can be a drop-in replacement for the direct
--    INSERT currently performed in usePurchaseCredits.ts. Otherwise those
--    fields (which the purchase flow relies on) would not make it to the
--    DB and admin approval would break.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_transaction_with_promo(
  p_credit_pack_id     TEXT,
  p_method             TEXT,
  p_amount_mga         BIGINT,
  p_payment_proof_url  TEXT,
  p_reference          TEXT,
  p_promo_code         TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tx_id   UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  IF p_credit_pack_id IS NULL OR char_length(trim(p_credit_pack_id)) = 0 THEN
    RAISE EXCEPTION 'invalid_pack_id' USING ERRCODE = '23514';
  END IF;
  IF p_amount_mga IS NULL OR p_amount_mga <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.transactions (
    user_id, amount_mga, method, status, reference, payment_proof_url, credit_pack_id
  )
  VALUES (
    v_user_id,
    p_amount_mga,
    p_method::public.payment_method,
    'pending'::public.payment_status,
    p_reference,
    p_payment_proof_url,
    p_credit_pack_id
  )
  RETURNING id INTO v_tx_id;

  IF p_promo_code IS NOT NULL AND char_length(trim(p_promo_code)) > 0 THEN
    PERFORM public.redeem_promo_code(p_promo_code, p_credit_pack_id, v_tx_id);
  END IF;

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_transaction_with_promo(TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_transaction_with_promo(TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- H. admin_approve_credit_transaction — updated to honour promo_bonus_credits
--
-- The existing function (pre-promo) granted exactly credit_packs.credits_amount.
-- With promo codes, bonus_credits adds extra credits on top. Percentage codes
-- don't affect the grant (they only reduce the paid price, tracked on
-- transactions.promo_discount_mga for admin ops reporting).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_credit_transaction(p_transaction_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx           public.transactions%ROWTYPE;
  pack_credits INT;
  total_credits INT;
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

  IF tx.status IN ('rejected'::public.payment_status, 'cancelled'::public.payment_status, 'failed'::public.payment_status) THEN
    RAISE EXCEPTION 'transaction_not_approvable' USING ERRCODE = 'P0001';
  END IF;

  IF tx.credit_pack_id IS NULL THEN
    RAISE EXCEPTION 'not_a_credit_pack_transaction' USING ERRCODE = 'P0001';
  END IF;

  SELECT cp.credits_amount INTO pack_credits
    FROM public.credit_packs cp
    WHERE cp.id = tx.credit_pack_id;

  IF pack_credits IS NULL OR pack_credits <= 0 THEN
    RAISE EXCEPTION 'invalid_credit_pack' USING ERRCODE = 'P0001';
  END IF;

  -- Promo bonus_credits stack on top of the pack's native credits.
  total_credits := pack_credits + COALESCE(tx.promo_bonus_credits, 0);

  PERFORM public.add_credits(
    tx.user_id,
    total_credits,
    CASE
      WHEN COALESCE(tx.promo_bonus_credits, 0) > 0
        THEN 'credit_pack_purchase:' || tx.credit_pack_id || ' (+' || tx.promo_bonus_credits || ' promo)'
      ELSE 'credit_pack_purchase:' || tx.credit_pack_id
    END,
    'transaction',
    tx.id
  );

  UPDATE public.transactions
    SET status             = 'approved'::public.payment_status,
        reviewed_at        = now(),
        reviewed_by        = auth.uid(),
        credits_granted_at = now(),
        rejection_reason   = NULL
    WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'credits',        total_credits,
    'pack_credits',   pack_credits,
    'bonus_credits',  COALESCE(tx.promo_bonus_credits, 0)
  );
END;
$$;
-- GRANT preserved from original migration.

-- -----------------------------------------------------------------------------
-- I. admin_list_promo_redemptions — join auth.users.email for the UI history
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_promo_redemptions(p_promo_code_id UUID)
RETURNS TABLE (
  redemption_id   UUID,
  user_id         UUID,
  user_email      TEXT,
  user_full_name  TEXT,
  transaction_id  UUID,
  amount_mga      BIGINT,
  redeemed_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    r.id              AS redemption_id,
    r.user_id,
    u.email::TEXT     AS user_email,
    p.full_name       AS user_full_name,
    r.transaction_id,
    t.amount_mga,
    r.redeemed_at
  FROM public.promo_code_redemptions r
    JOIN auth.users u ON u.id = r.user_id
    LEFT JOIN public.profiles p ON p.id = r.user_id
    LEFT JOIN public.transactions t ON t.id = r.transaction_id
  WHERE r.promo_code_id = p_promo_code_id
  ORDER BY r.redeemed_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_promo_redemptions(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_promo_redemptions(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_list_promo_redemptions IS
  'Admin-only redemption history for a single promo code. Joins auth.users email (cast to TEXT to avoid varchar→text mismatch in RETURN QUERY).';
