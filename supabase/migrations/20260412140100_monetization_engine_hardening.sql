-- Monetization engine: authoritative ledger, admin RPCs, boost activation, RLS hardening

-- Ledger traceability (pending tx never affects balance — only profile.credits_balance)
ALTER TABLE public.credits_ledger
  ADD COLUMN IF NOT EXISTS ref_type TEXT,
  ADD COLUMN IF NOT EXISTS ref_id UUID,
  ADD COLUMN IF NOT EXISTS meta JSONB;

DROP POLICY IF EXISTS "Users can insert own credits" ON public.credits_ledger;

-- Credit purchases / moderation metadata
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS credits_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Track how many credits were charged at publish (moderation reject → refund)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS publication_credits_charged INT;

COMMENT ON COLUMN public.listings.publication_credits_charged IS 'Total credits debited when listing was submitted; used for moderation refund';

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS spotlight_until TIMESTAMPTZ;

-- Replace prior 3-arg credit RPCs with traceable versions (drop before create)
DROP FUNCTION IF EXISTS public.consume_credits(UUID, INT, TEXT);
DROP FUNCTION IF EXISTS public.add_credits(UUID, INT, TEXT);

-- ---------------------------------------------------------------------------
-- Admin helper (SECURITY DEFINER so it cannot be fooled by RLS)
CREATE OR REPLACE FUNCTION public.immonex_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'::public.user_role
  );
$$;

REVOKE ALL ON FUNCTION public.immonex_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.immonex_is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- Credits: internal grant (service / admin RPC only — not granted to authenticated)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL
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
  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  UPDATE public.profiles SET credits_balance = credits_balance + p_amount WHERE id = p_user_id;
  INSERT INTO public.credits_ledger (user_id, delta, reason, ref_type, ref_id)
  VALUES (
    p_user_id,
    p_amount,
    COALESCE(p_reason, 'credit'),
    p_ref_type,
    p_ref_id
  );
  PERFORM set_config('immonex.allow_credits_mutation', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.add_credits(UUID, INT, TEXT, TEXT, UUID) FROM PUBLIC;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal INT;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  SELECT credits_balance INTO bal FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF bal IS NULL OR bal < p_amount THEN
    PERFORM set_config('immonex.allow_credits_mutation', 'off', true);
    RETURN FALSE;
  END IF;
  UPDATE public.profiles SET credits_balance = credits_balance - p_amount WHERE id = p_user_id;
  INSERT INTO public.credits_ledger (user_id, delta, reason, ref_type, ref_id)
  VALUES (
    p_user_id,
    -p_amount,
    COALESCE(p_reason, 'consume'),
    p_ref_type,
    p_ref_id
  );
  PERFORM set_config('immonex.allow_credits_mutation', 'off', true);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credits(UUID, INT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credits(UUID, INT, TEXT, TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Approve credit pack purchase: idempotent, grants credits once
CREATE OR REPLACE FUNCTION public.admin_approve_credit_transaction(p_transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.transactions%ROWTYPE;
  pack_credits INT;
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

  PERFORM public.add_credits(
    tx.user_id,
    pack_credits,
    'credit_pack_purchase:' || tx.credit_pack_id,
    'transaction',
    tx.id
  );

  UPDATE public.transactions
  SET
    status = 'approved'::public.payment_status,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    credits_granted_at = now(),
    rejection_reason = NULL
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object('ok', true, 'credits', pack_credits);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_credit_transaction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_credit_transaction(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reject_credit_transaction(
  p_transaction_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.transactions%ROWTYPE;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF tx.credits_granted_at IS NOT NULL THEN
    RAISE EXCEPTION 'credits_already_granted' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.transactions
  SET
    status = 'rejected'::public.payment_status,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = NULLIF(trim(p_reason), ''),
    credits_granted_at = NULL
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_credit_transaction(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_credit_transaction(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Listing moderation: activate + materialize boosts from pending_boost_types
CREATE OR REPLACE FUNCTION public.admin_approve_listing_moderation(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lst public.listings%ROWTYPE;
  owner_agency UUID;
  pending JSONB;
  bt TEXT;
  ends_at TIMESTAMPTZ;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO lst FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF lst.status IS DISTINCT FROM 'pending_review'::public.listing_status THEN
    RAISE EXCEPTION 'invalid_listing_status' USING ERRCODE = 'P0001';
  END IF;

  SELECT agency_id INTO owner_agency FROM public.profiles WHERE id = lst.owner_id;
  pending := COALESCE(lst.pending_boost_types, '[]'::jsonb);

  UPDATE public.listings
  SET status = 'active'::public.listing_status, pending_boost_types = '[]'::jsonb
  WHERE id = p_listing_id;

  FOR bt IN SELECT jsonb_array_elements_text FROM jsonb_array_elements_text(pending)
  LOOP
    IF bt = 'agency_spotlight' THEN
      IF owner_agency IS NOT NULL THEN
        UPDATE public.agencies
        SET spotlight_until = GREATEST(COALESCE(spotlight_until, to_timestamp(0)), now()) + interval '30 days'
        WHERE id = owner_agency;
      END IF;
    ELSIF bt IN ('urgent', 'daily_bump', 'featured', 'top', 'newsletter') THEN
      ends_at := CASE bt
        WHEN 'urgent' THEN now() + interval '14 days'
        WHEN 'daily_bump' THEN now() + interval '7 days'
        WHEN 'featured' THEN now() + interval '14 days'
        WHEN 'top' THEN now() + interval '7 days'
        WHEN 'newsletter' THEN now() + interval '7 days'
      END;
      INSERT INTO public.boosts (listing_id, type, starts_at, ends_at)
      VALUES (p_listing_id, bt::public.boost_type, now(), ends_at);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_listing_moderation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_listing_moderation(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reject_listing_moderation(
  p_listing_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lst public.listings%ROWTYPE;
  charged INT;
  refund_exists BOOLEAN;
BEGIN
  IF NOT public.immonex_is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO lst FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF lst.status IS DISTINCT FROM 'pending_review'::public.listing_status THEN
    RAISE EXCEPTION 'invalid_listing_status' USING ERRCODE = 'P0001';
  END IF;

  charged := COALESCE(lst.publication_credits_charged, 0);

  SELECT EXISTS (
    SELECT 1 FROM public.credits_ledger
    WHERE ref_type = 'listing_reject_refund' AND ref_id = p_listing_id AND delta > 0
  ) INTO refund_exists;

  IF charged > 0 AND NOT refund_exists THEN
    PERFORM public.add_credits(
      lst.owner_id,
      charged,
      'listing_moderation_reject_refund',
      'listing_reject_refund',
      p_listing_id
    );
  END IF;

  UPDATE public.listings
  SET
    status = 'rejected'::public.listing_status,
    rejection_reason = NULLIF(trim(p_reason), ''),
    pending_boost_types = '[]'::jsonb
  WHERE id = p_listing_id;

  RETURN jsonb_build_object('ok', true, 'refunded_credits', CASE WHEN charged > 0 AND NOT refund_exists THEN charged ELSE 0 END);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_listing_moderation(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_listing_moderation(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: admins can read all transactions & listings (operational moderation)
DROP POLICY IF EXISTS "Admins read all transactions" ON public.transactions;
CREATE POLICY "Admins read all transactions"
  ON public.transactions FOR SELECT
  USING (public.immonex_is_admin());

DROP POLICY IF EXISTS "Admins read all listings" ON public.listings;
CREATE POLICY "Admins read all listings"
  ON public.listings FOR SELECT
  USING (public.immonex_is_admin());

-- Payment proof files: admins can read any object in bucket
DROP POLICY IF EXISTS "Admins read all payment proofs" ON storage.objects;
CREATE POLICY "Admins read all payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND public.immonex_is_admin()
  );

-- Boosts: only server-side moderation creates paid boosts (users cannot self-insert)
DROP POLICY IF EXISTS "Owner can manage boosts" ON public.boosts;
