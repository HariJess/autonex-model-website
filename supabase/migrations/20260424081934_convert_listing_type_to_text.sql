-- Migration : Convertir colonne listings.type de enum
-- listing_type (immobilier) vers TEXT libre (automobile)
--
-- Contexte : AutoNex marketplace automobile utilise une base
-- heritee d'un projet immobilier (ImmoNex). L'enum listing_type
-- ne contient que des valeurs immobilieres (appartement, villa,
-- maison, terrain, local_commercial, bureau) ce qui bloque toute
-- publication automobile (erreur 406 "Cannot coerce to single
-- JSON object" des qu'un user saisit "Cabriolet", "Pickup"...).
--
-- Passage en TEXT libre pour flexibilite marketplace (Leboncoin /
-- La Centrale / FB Marketplace pattern). Suggestions gerees cote
-- frontend via Combobox.
--
-- ATTENTION : ALTER COLUMN TYPE est DESTRUCTIF. Cette migration
-- DOIT etre appliquee manuellement par un humain, apres review.
-- Principe de reversibilite : on conserve l'enum ET la colonne
-- type_legacy en place pour rollback possible.

BEGIN;

-- 1. Sauvegarder la valeur actuelle dans une colonne temporaire
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS type_legacy listing_type;

UPDATE listings
  SET type_legacy = type
  WHERE type_legacy IS NULL;

-- 2. Convertir la colonne type en TEXT.
--    Le cast enum -> text est trivial et preserve les valeurs.
ALTER TABLE listings
  ALTER COLUMN type TYPE TEXT USING type::TEXT;

-- 3. Commentaire explicatif pour les prochains devs
COMMENT ON COLUMN listings.type IS
  'Type de vehicule (texte libre, suggestions gerees cote frontend). Valeurs recommandees : citadine, berline, break, coupe, cabriolet, monospace, suv, 4x4, pickup, fourgon, camion, minibus, moto, scooter, quad, bateau, jetski, autre. Les anciennes valeurs immobilieres (appartement, villa...) restent en base pour retrocompat ; le frontend les remappe via legacy labels.';

-- 4. Index partiel pour perf sur filtres type (omet les NULL)
CREATE INDEX IF NOT EXISTS idx_listings_type
  ON listings (type)
  WHERE type IS NOT NULL;

-- Note : L'enum listing_type et la colonne type_legacy ne sont
-- PAS supprimes ici. Nettoyage possible dans une migration
-- future (ex : + 2 semaines apres validation prod).

COMMIT;
