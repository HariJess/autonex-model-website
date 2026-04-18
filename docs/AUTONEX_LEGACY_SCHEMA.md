# Héritage schéma Immonex → AutoNex

Ce document résume la dette **connue et assumée** après une passe code (sans migration DB destructive).

## Classification

| Catégorie | Description | Traitement dans cette passe |
|-----------|-------------|------------------------------|
| **A — Naming / lisibilité** | Constantes dupliquées, noms `TYPES_WITH_ROOMS`, clés `localStorage` « immonex » | Constante `LISTING_TYPES_WITH_TRIM_AND_DOORS_FIELDS` ; clés AutoNex + lecture legacy |
| **B — Mapping front / types** | `surface`↔km, `rooms`↔version, `bathrooms`↔portes, fallbacks `vehicle` vs colonnes | `legacyListingsDbColumns.ts`, JSDoc `DisplayListing`, commentaires `vehiclePresentation` / `vehicleCanonical` |
| **C — Schéma DB** | Enum `listing_type`, colonnes inchangées, RPC `immonex_is_admin`, `set_config('immonex.*')` | **Non renommé** ; dépendances RLS/crédits ; migration future hors scope |

## Base de données (inchangée ici)

- **`public.immonex_is_admin()`** — utilisée par les policies RLS et fonctions crédits. Renommage = migration coordonnée + déploiement Supabase.
- **`listing_type`** — enum PostgreSQL conservé ; les libellés produit sont véhicule (`LISTING_TYPE_LABELS` dans `src/types/listing.ts`).
- **Colonnes `surface`, `rooms`, `bathrooms`, `toilets`** — toujours les noms SQL historiques ; sémantique AutoNex documentée dans `src/lib/legacyListingsDbColumns.ts`.

## Stockage navigateur

| Ancienne clé | Nouvelle clé AutoNex | Migration |
|--------------|----------------------|-----------|
| `immonex.publishDraft.v1:*` | `autonex.publishDraft.v1:*` | Lecture legacy → copie vers AutoNex → suppression legacy (`publishDraft.ts`) |
| `immonex_currency` | `autonex_currency` | Idem (`CurrencyContext.tsx`) |
| `immonex_analytics_session_id` | `autonex_analytics_session_id` | Idem (`searchSession.ts`) |

## Étape 2 (code — pas de migration DB)

- **`src/lib/legacyListingVehicleMapping.ts`** : couche unique pour la **lecture** kilométrage / portes / sièges / finition depuis les colonnes legacy et depuis `listing.vehicle`, utilisée par `vehiclePresentation.ts`, `vehicleCanonical.ts`, et les helpers publication (`publishDraft.ts`).
- **`getCanonicalVehicleAttributes`** : les portes et sièges utilisent désormais les **mêmes replis** que l’affichage (`bathrooms`, `toilets`) lorsque `vehicle.doors` / `vehicle.seats` sont absents — alignement avec les miroirs DB sans changer les écritures.
- **`SearchFilters`** : voir étape 4 ; champs canoniques véhicule (`mileageMinKm`, `trimVersionIndices`, …).

### Étape 3 (URL additive + vue lecture DB)

**URL / query params**

- Lecture : accepte les **alias véhicule** `mileage_min`, `mileage_max`, `trim`, `version`, `doors` ; si absents, repli sur les clés legacy `surface_min`, `surface_max`, `chambres`, `sdb`.
- Si à la fois `mileage_min` et `surface_min` sont présents : **`mileage_min` prime** ; idem pour `mileage_max`.
- Si `trim` ou `version` porte au moins une valeur, **`chambres` est ignoré** (alias explicites prioritaires).
- Écriture (navigation interne, liens générés) : **`filtersToSearchParams`** n’émet plus `surface_*` / `chambres` / `sdb` ; il émet **`mileage_min` / `mileage_max` / `trim` / `doors`**. Les anciennes URLs restent valides à la lecture.
- Implémentation : `src/lib/searchVehicleUrlParams.ts`, appelée depuis `searchUrl.ts`.

**Base de données**

- Vue additive **`public.listings_vehicle_semantics`** (migration `20260418194500_listings_vehicle_semantics_view.sql`) : colonnes effectives `mileage_km_effective`, `doors_effective`, `seats_effective`, etc., sans modifier la table physique.
- `GRANT SELECT` pour `anon`, `authenticated`, `service_role` (lecture alignée sur les policies de `listings`).

### Étape 4 (frontend — types / état recherche sans casser URL ni analytics)

**État canonique**

- **`SearchFilters`** utilise désormais **`mileageMinKm`**, **`mileageMaxKm`**, **`trimVersionIndices`**, **`doorCounts`** (`src/types/search.ts`).
- **Hydratation** depuis d’anciens objets JSON encore nommés immobilier : **`hydrateSearchFilters`** dans `src/lib/searchFiltersCompat.ts` (`surfaceMin` → `mileageMinKm`, etc.). Priorité aux clés canoniques si les deux sont présentes.

**Frontières inchangées**

- **URL** : lecture toujours possible des query legacy (`surface_*`, `chambres`, `sdb`) ; écriture toujours en clés véhicule (`mileage_min`, `trim`, `doors`).
- **PostgREST** : `ListingsFilters` / `listingQueryFilters.ts` gardent **`surfaceMin` / `surfaceMax` / `rooms` / `bathrooms`** = noms colonnes DB ; le pont depuis `SearchFilters` est dans **`searchListingFilters.ts`**.
- **Analytics** : colonnes DB `surface_min`, `rooms`, `bathrooms` inchangées ; `searchAnalytics.ts` mappe depuis les champs canoniques.

### Étape 5 (frontend — helpers / docs / frontières explicites, sans migration DB)

**Helpers recherche**

- Renommages à sémantique véhicule : `matchesTrimVersionFilterStrict`, `matchesDoorCountFilterStrict`, `matchesMileageKmMinStrict`, `matchesMileageKmMaxStrict` (`src/lib/searchLocationMatch.ts`) ; anciens noms « surface / rooms / bathrooms » retirés.
- Similarité relâchée : `mileageKmTolerancePenalty`, `relaxedTrimVersionMatch`, `relaxedDoorCountMatch` (`src/lib/searchSimilar.ts`).

**Publication / listing**

- Parse formulaire : `parseMileageKmFromPublishSurfaceField` (remplace l’intitulé long « …LegacySurfaceField » ; le champ payload reste `surface` côté types existants).

**Modules documentés**

- `searchAnalytics.ts` — rappel que les **clés d’insertion** reflètent la table legacy.
- `searchListingFilters.ts`, `listingQueryFilters.ts` — pont « canon UI » ↔ « forme colonnes DB ».

**Volontairement inchangé**

- Schéma DB, colonnes analytics, query params URL, propriétés `DisplayListing.surface` / `rooms` / `bathrooms`.
- Libellés i18n `minSurface` / `maxSurface` (clés historiques ; textes déjà orientés kilométrage).

### Suite recommandée (étape 6+ / DB)

1. Migration SQL **optionnelle** : colonnes générées persistées si besoin de perf indexée sur synonymes uniquement vue.
2. Renommage **`immonex_is_admin`** → fonction neutre (`autonex_is_staff` ou équivalent) **après** recherche exhaustive dans les migrations et policies.
3. Réduction progressive des fallbacks dans `vehiclePresentation` lorsque `listing.vehicle` est garanti rempli pour toutes les annonces actives.
4. Renommage **SQL** des colonnes `surface` / `rooms` / `bathrooms` (ou vues dédiées) lorsque les clients et migrations le permettront.
