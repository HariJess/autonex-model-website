-- =============================================================================
-- Admin pricing module — RPC-exclusive writes for credit_pricing + credit_packs
--
-- Backstage module that lets admins edit credit action costs (credit_pricing)
-- and credit pack offerings (credit_packs) from /admin/monetisation, without
-- manual SQL.
--
-- Design, mirrored after admin_user_detail_module (commit ed8277e):
--   - Every privileged write is a SECURITY DEFINER RPC, guarded by
--     public.immonex_is_admin() at entry, and audited via log_admin_action()
--     into admin_audit_log.
--   - Client-side RLS paths for writes are closed: we drop the existing
--     credit_pricing admin INSERT/UPDATE/DELETE policies so that the ONLY
--     way to mutate pricing (and packs, which had no write policies to
--     begin with) is through these RPCs. SELECT stays public on both
--     tables (required by get_pricing, usePurchaseCredits, etc.).
--
-- V1 scope decisions (product):
--   - UPDATE only. No create, no delete.
--       * credit_pricing: keys are hardcoded in the front (PRICING_KEYS in
--         src/hooks/usePricing.ts). Creating new keys silently would make
--         them invisible to the app anyway. Deleting a key would break
--         runtime (front expects all 6 keys). Seeds stay migration-managed.
--       * credit_packs: ids are referenced by transactions.credit_pack_id
--         as historical data. Deleting a pack would cut off the trace.
--         Adding a new pack is rare; migration SQL stays the path.
--   - The existing credit_pricing_audit_update trigger (BEFORE UPDATE,
--     sets updated_at + updated_by = auth.uid()) keeps working because
--     auth.uid() is preserved across SECURITY DEFINER calls (only the
--     privilege context changes, not the session identity).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. admin_update_credit_pricing
--    Update amount and/or description of an existing pricing key.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_credit_pricing(
  p_key         TEXT,
  p_amount      INTEGER,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_amount      INTEGER;
  v_old_description TEXT;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'invalid_key' USING ERRCODE = '23514';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '23514';
  END IF;

  -- Capture old values AND ensure the key exists (update-only, no create).
  -- FOR UPDATE serialises concurrent edits on the same row.
  SELECT amount, description
    INTO v_old_amount, v_old_description
    FROM public.credit_pricing
    WHERE key = p_key
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pricing_key_not_found' USING ERRCODE = '23503';
  END IF;

  -- No-op guard: identical values → skip write (no trigger fire, no audit row).
  IF v_old_amount = p_amount
     AND v_old_description IS NOT DISTINCT FROM p_description THEN
    RETURN;
  END IF;

  UPDATE public.credit_pricing
    SET amount      = p_amount,
        description = p_description
    WHERE key = p_key;
  -- credit_pricing_audit_update trigger refreshes updated_at + updated_by.

  PERFORM public.log_admin_action(
    'update_credit_pricing',
    NULL,                -- not targeting a user
    'credit_pricing',    -- entity type
    NULL,                -- entity id is TEXT (key), not UUID → captured in metadata
    jsonb_build_object(
      'key',             p_key,
      'old_amount',      v_old_amount,
      'new_amount',      p_amount,
      'old_description', v_old_description,
      'new_description', p_description
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_credit_pricing(TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_credit_pricing(TEXT, INTEGER, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_update_credit_pricing(TEXT, INTEGER, TEXT) IS
  'Admin-only update of an existing credit_pricing row. No create/delete. Audited via admin_audit_log.';


-- -----------------------------------------------------------------------------
-- B. admin_update_credit_pack
--    Update name, credits_amount, price_mga, sort_order of an existing pack.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_credit_pack(
  p_id             TEXT,
  p_name           TEXT,
  p_credits_amount INTEGER,
  p_price_mga      BIGINT,
  p_sort_order     INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.credit_packs%ROWTYPE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR length(trim(p_id)) = 0 THEN
    RAISE EXCEPTION 'invalid_pack_id' USING ERRCODE = '23514';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'invalid_pack_name' USING ERRCODE = '23514';
  END IF;
  IF p_credits_amount IS NULL OR p_credits_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_credits_amount' USING ERRCODE = '23514';
  END IF;
  IF p_price_mga IS NULL OR p_price_mga <= 0 THEN
    RAISE EXCEPTION 'invalid_price_mga' USING ERRCODE = '23514';
  END IF;
  IF p_sort_order IS NULL OR p_sort_order < 0 THEN
    RAISE EXCEPTION 'invalid_sort_order' USING ERRCODE = '23514';
  END IF;

  -- Capture old row + ensure the pack exists (update-only, no create).
  SELECT * INTO v_old FROM public.credit_packs WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pack_not_found' USING ERRCODE = '23503';
  END IF;

  -- No-op guard.
  IF v_old.name = p_name
     AND v_old.credits_amount = p_credits_amount
     AND v_old.price_mga = p_price_mga
     AND COALESCE(v_old.sort_order, 0) = p_sort_order THEN
    RETURN;
  END IF;

  UPDATE public.credit_packs
    SET name           = p_name,
        credits_amount = p_credits_amount,
        price_mga      = p_price_mga,
        sort_order     = p_sort_order
    WHERE id = p_id;

  PERFORM public.log_admin_action(
    'update_credit_pack',
    NULL,
    'credit_pack',
    NULL,                -- pack id is TEXT, not UUID → captured in metadata
    jsonb_build_object(
      'pack_id', p_id,
      'old', jsonb_build_object(
        'name',           v_old.name,
        'credits_amount', v_old.credits_amount,
        'price_mga',      v_old.price_mga,
        'sort_order',     v_old.sort_order
      ),
      'new', jsonb_build_object(
        'name',           p_name,
        'credits_amount', p_credits_amount,
        'price_mga',      p_price_mga,
        'sort_order',     p_sort_order
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_credit_pack(TEXT, TEXT, INTEGER, BIGINT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_credit_pack(TEXT, TEXT, INTEGER, BIGINT, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.admin_update_credit_pack(TEXT, TEXT, INTEGER, BIGINT, INTEGER) IS
  'Admin-only update of an existing credit_packs row. No create/delete (historical integrity: transactions.credit_pack_id). Audited via admin_audit_log.';


-- -----------------------------------------------------------------------------
-- C. RLS hardening on credit_pricing
--
-- Drop the 3 admin-write policies so that client-side writes are impossible
-- for any role. Admins must go through admin_update_credit_pricing RPC, which
-- runs as the function owner (postgres, BYPASSRLS) and audits every call.
--
-- SELECT "credit_pricing_select_all" stays untouched — public read is
-- required by get_pricing, usePricing, CreditsBalanceHero projections, etc.
--
-- credit_packs has no write policies today, so no drop needed there — the
-- absence of policies on an RLS-enabled table is already the closed default.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "credit_pricing_admin_insert" ON public.credit_pricing;
DROP POLICY IF EXISTS "credit_pricing_admin_update" ON public.credit_pricing;
DROP POLICY IF EXISTS "credit_pricing_admin_delete" ON public.credit_pricing;
