-- =============================================================================
-- FIX CRITIQUE — Regression RLS profiles : OR-leak via rgpd policy
-- =============================================================================
--
-- Decouvert : Sprint D du 2026-04-26 (tests S1 + S6 dans src/test/rls/).
--
-- Cause : la migration 20260421180000_rgpd_deletion_schema_and_rpcs.sql a
-- ajoute `rgpd_anonymized_blocked_self` comme policy SELECT separee avec le
-- predicat `NOT (is_anonymized AND auth.uid() = id)`. Combinee par OR avec
-- `profiles_select_own` (auth.uid() = id), elle evalue a TRUE pour Bob lisant
-- le profile d'Alice non-anonymisee :
--   NOT (FALSE AND FALSE) = TRUE
-- → toute la table profiles est devenue cross-readable par tout authenticated.
--
-- Impact : PII (phone, whatsapp_phone, full_name), credits_balance et metadata
-- (suspended_reason, agency_id) lisibles par n'importe quel user authentifie.
-- Bypass complet du systeme phone_reveal monetise.
--
-- Fix : DROP les 3 policies SELECT existantes + RECREATE en consolidant
-- l'intention RGPD dans la policy `profiles_select_own` via AND.
--
-- Validation : tests RLS S1 + S6 dans src/test/rls/profiles.rls.test.ts et
-- credits.rls.test.ts doivent passer apres cette migration.
-- =============================================================================

BEGIN;

-- 1. Drop les 3 policies SELECT actuelles (idempotent).
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS rgpd_anonymized_blocked_self ON public.profiles;

-- 2. Recreate avec la semantique correcte.
--    Self peut lire son profile UNIQUEMENT s'il n'est pas anonymise (RGPD).
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (auth.uid() = id AND NOT COALESCE(is_anonymized, FALSE));

--    Admin peut lire tous les profiles (y compris anonymises pour audit RGPD).
--    Si a l'avenir on veut restreindre l'acces admin aux profiles anonymises,
--    cela passera par un module admin dedie avec audit log, pas par RLS.
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT
  USING (public.immonex_is_admin());

-- 3. Note : on ne touche PAS aux policies INSERT/UPDATE/DELETE qui restent
--    correctement scopees (auth.uid() = id pour update, etc.).

COMMIT;

-- =============================================================================
-- Verification post-migration (a lancer en SQL Editor staging apres push) :
-- =============================================================================
-- SELECT polname, polcmd,
--   pg_get_expr(polqual, polrelid) AS using_clause,
--   CASE polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS type
-- FROM pg_policy
-- WHERE polrelid = 'public.profiles'::regclass
-- ORDER BY polcmd, polname;
--
-- Resultat attendu :
--   profiles_select_own    SELECT  USING (auth.uid() = id AND NOT COALESCE(is_anonymized, FALSE))
--   profiles_select_admin  SELECT  USING (immonex_is_admin())
--   Users can insert own profile  INSERT  CHECK (auth.uid() = id)
--   Users can update own profile  UPDATE  USING (auth.uid() = id)
-- =============================================================================
