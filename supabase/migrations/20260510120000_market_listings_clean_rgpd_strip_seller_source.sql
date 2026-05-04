-- =============================================================================
-- PROMPT 11.b — RGPD strip seller_source from market_listings_clean
--
-- Contexte : la colonne `seller_source` du CSV scrap (PROMPT 11) contient des
-- noms réels de personnes (Particuliers Facebook, ex "Akbaraly Akbaraly"). Elle
-- est exposée potentiellement via la policy SELECT public sur
-- market_listings_clean — ce qui violerait le RGPD (données identifiables
-- accessibles à tous).
--
-- Décision : `seller_source` reste confiné à `market_listings_raw.payload`
-- (admin-only via service_role). La table `clean` n'a JAMAIS contenu cette
-- colonne dans la migration foundation (20260417160000), mais cette migration
-- :
--   1. drop la colonne IF EXISTS (no-op si jamais présente — défense en
--      profondeur contre une régression silencieuse via un futur ALTER TABLE)
--   2. documente l'intention RGPD via COMMENT ON TABLE
--   3. enforce l'invariant final via DO block assertion (RAISE EXCEPTION si
--      la colonne existe encore après le DROP)
--
-- Migration NON-DESTRUCTIVE en pratique (la colonne n'existe pas — vérifié
-- dans l'audit Tâche 1 du PROMPT 11.b). Mais sémantiquement, c'est un
-- DROP COLUMN qui DOIT exclure cette donnée du schema clean si jamais elle
-- y atterrit.
--
-- Référence : briefs/PROMPT_11b_RGPD_WRITE_MODE.md.
-- =============================================================================

-- 1. Drop la colonne seller_source si elle existe (défense en profondeur)
ALTER TABLE public.market_listings_clean
  DROP COLUMN IF EXISTS seller_source;

-- 2. Documentation de l'intention RGPD
COMMENT ON TABLE public.market_listings_clean IS
  'Comparables normalisés pour estimation V2. RGPD : ne contient AUCUN identifiant personnel (nom de vendeur en clair, numéro de contact). Voir market_listings_raw pour audit admin-only avec payload complet (incl. seller_source + contact_hash). PROMPT 11 + 11.b.';

-- 3. Assertion : invariant final = la colonne ne doit JAMAIS exister sur clean
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'market_listings_clean'
      AND column_name = 'seller_source'
  ) THEN
    RAISE EXCEPTION 'RGPD violation: seller_source column still present in market_listings_clean — must be confined to market_listings_raw.payload (admin-only).';
  END IF;
END $$;
