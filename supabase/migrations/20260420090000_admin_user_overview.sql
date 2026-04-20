-- =============================================================================
-- Admin user overview RPC
--
-- Admin-only lookup returning a full user overview (profile + auth email +
-- last sign in) in a single round-trip. Used by AdminUserDetailPage to render
-- identity, stats, and the delete-confirmation dialog (which requires the
-- user's email to be typed).
--
-- Email is not otherwise exposed client-side: auth.users is not reachable via
-- PostgREST, and no other SELECT path returns it. This SECURITY DEFINER RPC
-- fills that gap without widening the surface area (admin guard + single
-- target, no bulk enumeration).
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
    u.email,
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

REVOKE ALL ON FUNCTION public.admin_user_overview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_overview(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_user_overview IS
  'Admin-only lookup returning full user overview (profile + auth email + last sign in). Used by AdminUserDetailPage.';
