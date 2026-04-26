-- M-LEGACY-2 / Phase B2 — Audit 2026-04-26.
--
-- Aligne la colonne native vehicule mileage_km avec son equivalent legacy
-- ImmoNex `surface` (qui stockait en realite le kilometrage en km) pour les
-- rows qui n'avaient encore que la valeur legacy.
--
-- Strategie : COALESCE-style. On remplit la native mileage_km avec la legacy
-- surface uniquement si mileage_km est vide. On NE TOUCHE PAS aux rows ou
-- mileage_km a deja une valeur (priorite native).
--
-- Cette migration est IDEMPOTENTE (rejouable sans effet de bord) :
-- la clause WHERE mileage_km IS NULL fait que la 2eme execution UPDATE 0 ligne.
--
-- Pre-flight verifie par Ali :
--   total_rows=14, mismatch=0, surface_only=0, mileage_km_only=0
-- → la migration UPDATE 0 ligne (donnees deja alignees via le tee bidirectionnel
-- du flux de publication dans publishDraft.ts:493 + 850). On l'applique quand
-- meme pour (a) marquer la phase B2 comme actee dans l'historique migrations,
-- (b) garantir l'idempotence pour des rows futures qui seraient inserees en
-- bypass via dashboard SQL editor.
--
-- Aucune colonne n'est dropee — c'est la phase B4 qui le fera, apres bascule
-- complete du code ecriture/lecture.
--
-- Couches code touchees en parallele :
--   - src/lib/listingQueryFilters.ts : retire les fallbacks
--     or(mileage_km.is.null, surface…) sur surfaceMin/Max (2 sites simplifies,
--     analogue strict de la simplification doors/bathrooms en B1).
--   - src/lib/legacyListingVehicleMapping.ts : commentaires acterrent que
--     mileage_km est desormais primary, surface est defensive fallback jusqu'a
--     B4. Aucun changement de logique runtime (la chaine derive→vehicle.mileageKm
--     deja en place lit mileage_km primary).
--
-- Layer d'ecriture (publishDraft.ts:formToListingUpdate +
-- buildListingMaterialSnapshotFromForm) NON touche : continue d'ecrire dans
-- surface ET mileage_km en parallele jusqu'a B4.

BEGIN;

UPDATE public.listings
SET mileage_km = surface
WHERE mileage_km IS NULL AND surface IS NOT NULL;

COMMIT;
