-- =============================================================================
-- M-LEGACY-4b / Phase B4b — DROP COLUMN final + DROP TYPE listing_type
-- =============================================================================
-- /!\ MIGRATION DESTRUCTIVE /!\
--
-- Backup confirme : Supabase Dashboard > Backups > 26 Apr 2026 04:26:24
-- (PHYSICAL, retention 8 jours).
--
-- Cette migration finalise le menage de la dette ImmoNex.
--
-- 4 colonnes legacy supprimees de public.listings :
--   * surface     (was mileage_km legacy mirror)
--   * rooms       (was version/trim numeric, dead in prod since B4a)
--   * bathrooms   (was doors legacy mirror)
--   * toilets     (was seats legacy mirror)
--
-- Enum public.listing_type supprime (zombie depuis 20260424081934 qui
-- avait converti listings.type en TEXT mais garde l'enum pour compat).
--
-- Pre-requis applique dans la migration precedente
-- 20260426200000_patch_legacy_dependencies_pre_drop.sql :
--   1. VIEW listings_vehicle_semantics : recreee sans les colonnes legacy.
--   2. FUNCTION list_my_favorites : recreee sans projection lst_surface/
--      rooms/bathrooms/toilets et lst_type cast en TEXT.
--
-- Audit pg_depend du 2026-04-26 : aucun autre objet DB ne reference les
-- colonnes legacy ni l'enum (constraints = 0, fonctions custom = 0,
-- views = 0 hors celle deja patchee).
--
-- Cote applicatif :
--   * Vercel-prod (commit 6d4bda5 deploye avant cette migration) ne lit ni
--     n'ecrit plus dans les 4 colonnes legacy. Pas de fenetre de risque.
--   * Le cleanup TS final (suppression de DisplayListing.surface/bathrooms,
--     fichiers legacyListingVehicleMapping.ts/legacyListingsDbColumns.ts,
--     renommage form fields per option 2) suivra dans un commit dedie
--     post-DROP, apres regen de database.types.ts.

BEGIN;

ALTER TABLE public.listings DROP COLUMN IF EXISTS surface;
ALTER TABLE public.listings DROP COLUMN IF EXISTS rooms;
ALTER TABLE public.listings DROP COLUMN IF EXISTS bathrooms;
ALTER TABLE public.listings DROP COLUMN IF EXISTS toilets;

DROP TYPE IF EXISTS public.listing_type;

COMMIT;
