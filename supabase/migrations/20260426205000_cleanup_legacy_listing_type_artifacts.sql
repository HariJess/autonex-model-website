-- =============================================================================
-- M-LEGACY-4b / Hotfix — Cleanup pre-existant non-verse des artefacts legacy
--                       avant DROP TYPE listing_type
-- =============================================================================
-- Contexte :
--
-- La migration 20260426210000_drop_legacy_columns_final.sql tente de
-- DROP TYPE public.listing_type apres avoir patche les seules dependances
-- DB connues (VIEW listings_vehicle_semantics, FUNCTION list_my_favorites,
-- via 20260426200000_patch_legacy_dependencies_pre_drop.sql).
--
-- En prod, ce DROP TYPE passe sans erreur — preuve que d'autres dependances
-- (default value sur listings.type, colonne listings.type_legacy) ont ete
-- nettoyees en prod par un script ad-hoc non-verse dans le repo entre les
-- migrations 20260424081934 (convert listing_type to TEXT) et
-- 20260426210000 (DROP final).
--
-- Sur staging (ainsi que sur tout futur environnement recree from scratch),
-- ces objets persistent et bloquent le DROP TYPE :
--   - listings.type a un DEFAULT 'appartement'::listing_type (cast vers
--     l'enum, vestige Immonex pre-pivot vehicule)
--   - listings.type_legacy est une colonne USER-DEFINED de type listing_type,
--     cree comme backup lors de la conversion 20260424081934 puis jamais
--     droppee par migration versee.
--
-- Cette migration retro-corrige cette divergence en versant le cleanup
-- manquant. Idempotente : safe a appliquer sur prod (les operations sont
-- des no-op si les objets n'existent pas) et sur staging (elles font le
-- vrai cleanup).
--
-- Ordre d'execution : doit s'executer APRES
-- 20260426200000_patch_legacy_dependencies_pre_drop.sql (qui patche la
-- VIEW et la FUNCTION dependant aussi de l'enum) et AVANT
-- 20260426210000_drop_legacy_columns_final.sql (qui DROP TYPE).
-- Le timestamp 20260426205000 (20:50:00) place cette migration au bon
-- endroit dans la sequence chronologique.
--
-- Verifications pre-execution effectuees sur staging
-- (autonex-staging, 2026-05-01) :
--   SELECT COUNT(*), COUNT(type_legacy) FROM public.listings
--     -> total=57, rows_with_type_legacy=0
--   ==> aucune perte de donnees possible : type_legacy est vide.
--
-- Cote applicatif : aucun consommateur DB ou code ne depend de type_legacy
-- ni du default 'appartement'::listing_type sur listings.type. Verifie par
-- grep "type_legacy" sur src/ et supabase/functions/ : 0 hit.
-- =============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Retirer le DEFAULT 'appartement'::listing_type sur listings.type
-- ----------------------------------------------------------------------------
-- La colonne listings.type a ete convertie en TEXT par la migration
-- 20260424081934_convert_listing_type_to_text mais son DEFAULT est reste
-- ancre sur l'enum legacy.
-- ALTER ... DROP DEFAULT est idempotent : no-op si pas de default.

ALTER TABLE public.listings ALTER COLUMN type DROP DEFAULT;

-- ----------------------------------------------------------------------------
-- 2. Drop la colonne listings.type_legacy
-- ----------------------------------------------------------------------------
-- Vide en staging (verifie 2026-05-01) ; absente probablement en prod.
-- IF EXISTS rend l'operation idempotente.

ALTER TABLE public.listings DROP COLUMN IF EXISTS type_legacy;

COMMIT;
