-- Align profiles.credits_balance with authoritative ledger sum and make consume_credits
-- use the same sum for sufficiency checks (fixes desync when ledger was updated without profile).
-- Must run after 20260412140100_monetization_engine_hardening.sql (replaces consume_credits again).



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
  bal BIGINT;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN FALSE;
  END IF;

  PERFORM set_config('immonex.allow_credits_mutation', '1', true);
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  SELECT COALESCE(SUM(delta), 0) INTO bal
  FROM public.credits_ledger
  WHERE user_id = p_user_id;

  IF bal < p_amount THEN
    PERFORM set_config('immonex.allow_credits_mutation', 'off', true);
    RETURN FALSE;
  END IF;

  INSERT INTO public.credits_ledger (user_id, delta, reason, ref_type, ref_id)
  VALUES (
    p_user_id,
    -p_amount,
    COALESCE(p_reason, 'consume'),
    p_ref_type,
    p_ref_id
  );

  UPDATE public.profiles
  SET credits_balance = (bal - p_amount)::int
  WHERE id = p_user_id;

  PERFORM set_config('immonex.allow_credits_mutation', 'off', true);
  RETURN TRUE;
END;
$$;
