-- Audit: list every SECURITY DEFINER function in the public schema that
-- does NOT have an explicit search_path setting. Such functions are
-- vulnerable to search-path hijacking (an attacker that can create a
-- function or table in pg_temp or another schema can shadow public.*
-- references inside the function body).
--
-- Run this in Supabase Studio SQL editor against the production DB.
-- The static grep over migration files (29 April 2026) returned zero
-- candidates, but the static analysis cannot see functions that were
-- created out-of-band (Supabase Studio, manual dashboard SQL, etc.),
-- so this query is the source of truth.
--
-- Expected output: zero rows. If non-empty, run for each row:
--   ALTER FUNCTION public.<name>(<args>) SET search_path = public;

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS is_security_definer,
  p.proconfig AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND (p.proconfig IS NULL OR NOT (p.proconfig::text LIKE '%search_path%'))
ORDER BY p.proname;
