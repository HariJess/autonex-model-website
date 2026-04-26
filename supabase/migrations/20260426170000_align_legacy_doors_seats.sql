-- M-LEGACY-1 / Phase B1 — Audit 2026-04-26.
--
-- Aligne les colonnes natives vehicule (doors, seats) avec leurs equivalents
-- legacy ImmoNex (bathrooms, toilets) pour les rows qui n'avaient encore
-- que la valeur legacy.
--
-- Strategie : COALESCE-style. On remplit les natives avec la legacy uniquement
-- si la native est vide. On NE TOUCHE PAS aux rows ou la native a deja une
-- valeur (priorite native), ni aux rows ou les deux sont deja alignees.
--
-- Cette migration est IDEMPOTENTE (rejouable sans effet de bord) :
-- la clause WHERE doors IS NULL fait que la 2eme execution UPDATE 0 ligne.
--
-- Pre-flight verifie par Ali :
--   total_rows=14, mismatch=0, toilets_seats_mismatch=0,
--   bathrooms_only=0, toilets_only=0
-- → la migration UPDATE 0 ligne (donnees deja alignees via le tee bidirectionnel
-- du flux de publication dans publishDraft.ts). On l'applique quand meme pour
-- (a) marquer la phase B1 comme actee dans l'historique migrations,
-- (b) garantir l'idempotence pour des rows futures qui seraient inserees en
-- bypass via dashboard SQL editor (la migration au prochain run alignerait).
--
-- Aucune colonne n'est dropee — c'est la phase B4 qui le fera, apres bascule
-- complete du code ecriture/lecture.
--
-- Couches code touchees en parallele :
--   - src/lib/listingQueryFilters.ts : retire le fallback or(doors.is.null,
--     bathrooms.in.(...)) puisque doors est desormais la source unique pour
--     les filtres recherche (6 sites simplifies).
--   - src/i18n/{fr,en,mg}.json : rename de la cle dead `footer.realEstate`
--     vers `footer.automotive` pour matcher le consumer existant
--     `t("footer.automotive", "Automobile")` dans Footer.tsx (corrige un bug
--     d'affichage EN cote-a-cote).

BEGIN;

UPDATE public.listings
SET doors = bathrooms
WHERE doors IS NULL AND bathrooms IS NOT NULL;

UPDATE public.listings
SET seats = toilets
WHERE seats IS NULL AND toilets IS NOT NULL;

COMMIT;
