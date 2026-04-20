-- =============================================================================
-- Fix: admin_user_overview email type mismatch
--
-- The previous migration (20260420090000_admin_user_overview) declared the
-- returned `email` column as TEXT, but auth.users.email is VARCHAR.
-- PostgreSQL's RETURN QUERY does not perform implicit varchar → text casting
-- in RETURNS TABLE context, so the RPC raised
--   "structure of query does not match function result type"
-- on every call.
--
-- Fix: explicit u.email::TEXT cast in the SELECT. No other changes.
-- Signature (p_user_id UUID) is unchanged, so CREATE OR REPLACE preserves
-- the existing GRANT EXECUTE on authenticated from the previous migration.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_user_overview(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role user_role,
  full_name TEXT,
  phone TEXT,
  whatsapp_phone TEXT,
  agency_id UUID,
  credits_balance INTEGER,
  seller_type TEXT,
  suspended BOOLEAN,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  suspended_by UUID,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
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
    p.id AS user_id,
    u.email::TEXT,
    p.role,
    p.full_name,
    p.phone,
    p.whatsapp_phone,
    p.agency_id,
    p.credits_balance,
    p.seller_type,
    p.suspended,
    p.suspended_at,
    p.suspended_reason,
    p.suspended_by,
    p.created_at,
    u.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = p_user_id;
END;
$$;
