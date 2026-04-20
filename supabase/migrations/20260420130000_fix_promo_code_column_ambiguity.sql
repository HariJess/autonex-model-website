-- =============================================================================
-- Fix: column reference 'promo_code_id' is ambiguous in validate_promo_code
--
-- The previous migration (20260420120000_promo_codes_module) declared
-- validate_promo_code with RETURNS TABLE including an OUT parameter named
-- `promo_code_id UUID`. Inside the body, the one_per_user check did:
--
--   SELECT 1 FROM public.promo_code_redemptions
--   WHERE promo_code_id = v_promo.id AND user_id = v_user_id
--
-- PL/pgSQL could not decide whether `promo_code_id` referred to the OUT
-- parameter or the promo_code_redemptions column, and raised
-- "column reference 'promo_code_id' is ambiguous" at runtime — triggered
-- the first time a user entered a code with one_per_user=true OR when the
-- code had any matching redemption row (EXISTS forces the resolver to
-- actually execute the subquery).
--
-- Fix: alias the table (`r`) and qualify the column reference. No signature
-- change, no client impact.
--
-- Also preventively aliasing redeem_promo_code's EXISTS subquery (no OUT
-- param today, but keeps the style consistent and future-proofs against
-- a later RETURNS TABLE upgrade).
--
-- Normalisation: both RPCs already do `v_code := upper(trim(COALESCE(p_code, '')))`
-- and use v_code in WHERE clauses, so case-insensitivity is already covered.
-- No change needed there.
-- =============================================================================

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

  SELECT * INTO v_promo FROM public.promo_codes pc
    WHERE pc.code = v_code AND pc.active = true;
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

  -- FIX: table alias `r` + qualified column to disambiguate from the
  -- OUT parameter `promo_code_id` declared by RETURNS TABLE above.
  IF v_promo.one_per_user AND EXISTS (
    SELECT 1 FROM public.promo_code_redemptions r
    WHERE r.promo_code_id = v_promo.id AND r.user_id = v_user_id
  ) THEN
    RETURN QUERY SELECT false, 'code_already_used'::TEXT, v_promo.id, v_promo.type,
                        0::BIGINT, 0::INTEGER, 0::BIGINT, 0::INTEGER;
    RETURN;
  END IF;

  SELECT cp.price_mga, cp.credits_amount INTO v_pack_price, v_pack_credits
    FROM public.credit_packs cp WHERE cp.id = p_credit_pack_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'pack_not_found'::TEXT, v_promo.id, v_promo.type,
                        0::BIGINT, 0::INTEGER, 0::BIGINT, 0::INTEGER;
    RETURN;
  END IF;

  IF v_promo.type = 'percentage' THEN
    RETURN QUERY SELECT
      true,
      NULL::TEXT,
      v_promo.id,
      v_promo.type,
      ((v_pack_price * v_promo.percentage_off) / 100)::BIGINT,
      0::INTEGER,
      (v_pack_price - ((v_pack_price * v_promo.percentage_off) / 100))::BIGINT,
      v_pack_credits;
  ELSE
    RETURN QUERY SELECT
      true,
      NULL::TEXT,
      v_promo.id,
      v_promo.type,
      0::BIGINT,
      v_promo.bonus_credits::INTEGER,
      v_pack_price,
      (v_pack_credits + v_promo.bonus_credits)::INTEGER;
  END IF;
END;
$$;

-- GRANTs preserved (CREATE OR REPLACE keeps existing grants when signature
-- is unchanged).


-- Defensive refresh of redeem_promo_code: same alias pattern for the EXISTS
-- subquery and the UPDATE targets, for consistency. No behaviour change today.
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

  SELECT * INTO v_promo FROM public.promo_codes pc
    WHERE pc.code = v_code AND pc.active = true
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
    SELECT 1 FROM public.promo_code_redemptions r
    WHERE r.promo_code_id = v_promo.id AND r.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'code_already_used' USING ERRCODE = 'P0001';
  END IF;

  SELECT cp.price_mga, cp.credits_amount INTO v_pack_price, v_pack_credits
    FROM public.credit_packs cp WHERE cp.id = p_credit_pack_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pack_not_found' USING ERRCODE = '23503';
  END IF;

  IF v_promo.type = 'percentage' THEN
    v_discount := (v_pack_price * v_promo.percentage_off) / 100;
  ELSE
    v_bonus := v_promo.bonus_credits;
  END IF;

  BEGIN
    INSERT INTO public.promo_code_redemptions (promo_code_id, user_id, transaction_id)
    VALUES (v_promo.id, v_user_id, p_transaction_id);
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'redemption_already_recorded' USING ERRCODE = '23505';
  END;

  UPDATE public.promo_codes pc
    SET times_redeemed = pc.times_redeemed + 1
    WHERE pc.id = v_promo.id;

  UPDATE public.transactions t
    SET promo_code_id       = v_promo.id,
        promo_discount_mga  = v_discount,
        promo_bonus_credits = v_bonus
    WHERE t.id = p_transaction_id AND t.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction_not_found' USING ERRCODE = '23503';
  END IF;
END;
$$;
