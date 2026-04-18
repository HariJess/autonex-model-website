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
- **`SearchFilters`** : JSDoc sur `surfaceMin`/`surfaceMax`/`rooms`/`bathrooms` pour limiter la confusion dans la recherche.

### Suite recommandée (étape 3+)

1. Migration SQL **optionnelle** : vues ou colonnes générées (`mileage_km`, `doors_count`) alimentées depuis les colonnes actuelles pour lecture API plus claire.
2. Renommage **`immonex_is_admin`** → fonction neutre (`autonex_is_staff` ou équivalent) **après** recherche exhaustive dans les migrations et policies.
3. Réduction progressive des fallbacks dans `vehiclePresentation` lorsque `listing.vehicle` est garanti rempli pour toutes les annonces actives.
4. Renommage **optionnel** des champs `SearchFilters` (`surfaceMin` → `mileageMin`, etc.) derrière une couche d’alias URL pour ne pas casser les liens indexés.
