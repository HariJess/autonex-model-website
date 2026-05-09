# Ingestion CSV → `market_listings_clean`

**Pipeline** : `scripts/data/ingest-market-listings-csv.ts`
**Migration delta** : `supabase/migrations/20260509120000_market_listings_clean_extension.sql`
**Migration RGPD** : `supabase/migrations/20260510120000_market_listings_clean_rgpd_strip_seller_source.sql`
**Validation** : `scripts/data/validate-market-listings-ingestion.sql`
**Référence brief** : `briefs/PROMPT_11_DB_INGESTION_CSV.md` + `briefs/PROMPT_11b_RGPD_WRITE_MODE.md`

---

## ⚠️ Contraintes critiques à connaître AVANT de lancer une ingestion

### 1. Check constraint sur `market_listings_raw.source`

La colonne `source` n'autorise QUE les valeurs suivantes (CHECK `market_listings_raw_source_check`) :

```
'fiarakodia', 'autonex', 'facebook', 'partner', 'manual', 'other'
```

→ Le flag `--source-tag` du script DOIT impérativement matcher l'une de ces valeurs sous peine de violation 100% du batch (toutes les rows rejetées par Postgres).

### 2. Identifier un batch d'import via `source_url`

Comme `source` est limité à 6 valeurs sémantiques (origine de la donnée, pas batch), l'identifiant de batch est porté par `source_url` :

```
source_url = csv://<source-tag>/<csv_listing_id>
```

Exemple production : `csv://facebook/ANX-MKT-0001`.

Pour requêter un batch précis :

```sql
WHERE source = 'facebook'
  AND source_url LIKE 'csv://facebook/%'
  AND created_at >= '2026-05-04'
```

### 3. Production run 2026-05-04 (référence)

| Métrique | Valeur |
|---|---|
| Date ingestion | 2026-05-04 13:01-13:02 UTC |
| `source-tag` utilisé | `facebook` |
| Total inséré | 105 rows (raw + clean) |
| `include_in_estimation = true` | 88 |
| `include_in_estimation = false` | 17 (16 prix out_of_band + 1 missing make/model) |
| FMG → MGA conversions | 20 |
| Errors / dupes | 0 / 0 |
| Top makes | Hyundai 16, Kia 14, VW 12, Toyota 8, Nissan 7 |

---

## 1. Vue d'ensemble

### Ce que ce pipeline fait

- Parse un CSV de 27 colonnes contenant des annonces véhicules scrapées (Facebook particuliers, revendeurs, concessionnaires, ventes manuelles partenaires)
- Normalise les valeurs (casing make/model, conversion FMG → MGA, parsing booleans/ints tolérants)
- Calcule un `fingerprint` SHA-256 (24 chars) par ligne pour dedup intelligent
- Hashe le contact (SHA-256, 16 chars) avant ingestion — **AUCUN contact en clear**
- Insère dans `market_listings_raw` (payload brut moins contact) puis `market_listings_clean` (colonnes normalisées)
- Détecte les outliers post-batch via P5/P95 par cluster `make+model+year_band`
- Gate `include_in_estimation = false` quand suspicion critique (prix hors bande, make/model manquants, conversion FMG out_of_band)

### Ce qu'il ne fait PAS (intentionnellement V1)

- Branche l'engine sur `market_listings_clean` — c'est **PROMPT 10A**
- Modifie l'UI estimation — c'est **PROMPT 10B**
- Stocke les contacts en clair — RGPD strict
- Effectue la conversion via API officielle BCM — heuristique 1 MGA = 5 FMG conservée
- Détecte les variants trim avec catalog matching avancé — heuristique simple via la colonne `trim_generation` du CSV

---

## 2. Format CSV (27 colonnes)

| Colonne | Type | Exemple | Notes |
|---|---|---|---|
| `listing_id` | string | `ANX-MKT-0001` | ID unique par ligne CSV (peut être réutilisé pour audit) |
| `seller_source` | string | `Akbaraly Akbaraly` | Nom vendeur observé (texte libre, pas normalisé). **Strippé du `clean` (RGPD)**, conservé seulement dans `raw.payload` |
| `seller_type` | string | `Particulier Facebook` | Catégorie source : `Particulier Facebook` / `Revendeur Facebook` / `Concessionnaire` / autre |
| `make` | string | `Toyota` | Marque, casing libre (sera normalisé Title Case) |
| `model` | string | `Hilux` | Modèle |
| `trim_generation` | string | `LC79` ou `Vigo` | Trim/génération (optionnel) |
| `year` | int | `2018` | Année de fabrication (1950 - currentYear+1) |
| `price_mga` | int | `75000000` | Prix en MGA. Si dépasse 1.5e9 → suspect FMG |
| `price_raw` | string | `75 000 000 Ar / 99 500 000 Fmg` | Texte original (audit trail) |
| `currency_original` | enum | `MGA` ou `FMG` | Si `FMG` → conversion auto /5 |
| `price_type` | enum | `asking` / `firm` / `negotiable` / `quote` | Nature du prix (autorisé NULL) |
| `negotiable` | bool | `True` / `False` | Marqueur explicite vendeur |
| `mileage_km` | int | `80000` | Kilométrage (0 - 1.5e6) |
| `mileage_raw` | string | `80 000 km` | Texte original |
| `fuel` | string | `Diesel` / `Essence` / `Hybride` | Texte libre (pas encore normalisé enum DB côté V1) |
| `transmission` | string | `Manuelle` / `Automatique` / `CVT` | Texte libre |
| `drivetrain` | enum | `4x4` / `4x2` / `awd` / `rwd` / `fwd` / `other` | Normalisé enum DB |
| `engine` | string | `V8 turbo diesel` | Texte libre, stocké dans `engine_text` |
| `seats` | int | `5` ou `7` | Nombre de places (1-25) |
| `options_summary` | string | `Clim, GPS, cuir, jantes alu` | Liste options en clair |
| `condition_notes` | string | `Bon état apparent` | Notes vendeur |
| `location` | string | `Antananarivo` | Ville observée |
| `contact` | string | `032 12 345 67` | **JAMAIS stocké en clear**. Hashé SHA-256 (16 chars) dans `market_listings_raw.payload.contact_hash` |
| `include_in_estimation` | bool | `True` / `False` | Marqueur Ali si une ligne doit être exclue manuellement. Le pipeline peut aussi forcer false sur suspicion critique |
| `duplicate_group` | string | `LC79-2024-toamasina` | Clé partagée si Ali a déjà identifié un cluster doublons |
| `data_confidence` | enum | `high` / `medium` / `low` | Pondérera le weight V2 |
| `extraction_notes` | string | `Année non indiquée` | Notes pipeline scrap. Le script append ses propres notes (`pipeline:fmg_converted,year_invalid_or_missing`) |

### Encodage CSV

UTF-8, BOM toléré (le script strippe automatiquement). Délimiteur `,`. Champs entre `"..."` pour gérer les virgules embarquées (parser `parseCsv` reuse depuis `scripts/data/lib/parse.ts`).

---

## 3. Comment ingérer un nouveau batch

### Pré-requis

1. Migrations delta + RGPD appliquées en prod (`20260509120000_market_listings_clean_extension.sql` + `20260510120000_market_listings_clean_rgpd_strip_seller_source.sql`)
2. CSV déposé à `data/seed/<filename>.csv`
3. (mode write) `.env.local` contient `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
4. Le `--source-tag` choisi DOIT être l'une des valeurs whitelistées : `fiarakodia`, `autonex`, `facebook`, `partner`, `manual`, `other` (cf. section "Contraintes critiques" en haut)

### Commande

**Dry-run par défaut** (safety) — pour écrire en DB il faut explicitement passer `--dry-run=false`.

```bash
# Dry-run (default, safe) — pas d'écriture DB
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --in=data/seed/market_listings_v1_2026.csv \
  --source-tag=facebook
```

Le dry-run affiche :
- Nombre total de lignes parsées
- Compteurs `include_in_estimation` true/false
- Lignes converties FMG → MGA
- Lignes hors bande
- Doublons détectés dans le batch (même fingerprint)
- Top 10 makes
- Distribution `data_confidence`
- **Visual RGPD check** : sample des clés du premier `cleanPayload`, log `RGPD : seller_source present in clean ? ✅ NO (OK)`. Si jamais ❌ apparaît, c'est un bug pipeline à corriger avant write.

### Mode write effectif (PROMPT 11.b)

```bash
# Pré-requis : .env.local doit contenir SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --in=data/seed/market_listings_v1_2026.csv \
  --source-tag=facebook \
  --batch-size=50 \
  --dry-run=false \
  --reuse-supabase-env
```

Comportement mode write :

1. **Init Supabase service-role client** : lecture manuelle de `.env.local` (parsing ligne par ligne, gère les valeurs quotées). Erreur claire avec exit code 4 si `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` manquant.
2. **Pré-check fingerprints** : avant chaque batch, fetch `Set<fingerprint>` existants pour le batch courant (filtre `source` + pattern `source_url LIKE 'csv://<tag>/%'`). Skip silencieux des rows déjà en DB (sauf `--force`).
3. **INSERT raw → INSERT clean** : pour chaque row :
   - `INSERT INTO market_listings_raw (source, source_url, source_listing_id, payload, scraped_at)` retourne `id` UUID. `source_url` = `csv://<source-tag>/<csv_listing_id>`.
   - `INSERT INTO market_listings_clean (..., raw_listing_id = $rawId, fingerprint, ...)` link explicite.
4. **Idempotence layer 2** : si UNIQUE constraint violation (code `23505`), incrémente `alreadyInDb` au lieu d'erreur — utile en cas de race entre pré-check et insert.
5. **Retry exponential backoff** sur 503 / timeout / `ECONNRESET` / `ETIMEDOUT` / `PGRST503` : 3 tentatives max, délai 1s → 2s → 4s.
6. **Erreurs fatales** (autres que 503/conflict) : collectées dans `stats.errors[]`, le batch continue (best-effort).
7. **Reporting** : par batch (timing, count inserted/skipped/errors), puis aggregé final.

### Idempotence

Sans `--force` : un re-run après ingestion réussie détecte les fingerprints existants en DB et skip silencieusement (0 INSERT, log "Already in DB"). Avec `--force=true` : ignore le pré-check fingerprint et tente l'insert ; la couche 2 (UNIQUE constraint) protège quand même contre les vrais doublons SQL.

### CLI flags supportés

| Flag | Format | Default | Notes |
|---|---|---|---|
| `--in=<path>` ou `--csv <path>` | path | `data/seed/market_listings_v1_2026.csv` | Path du CSV à ingérer |
| `--source-tag=<tag>` | string | `facebook` | Source de la donnée. **MUST** match the `market_listings_raw_source_check` constraint : `fiarakodia`, `autonex`, `facebook`, `partner`, `manual`, `other`. L'identifiant de batch (date ingestion, version dataset) est conservé dans `source_url` au format `csv://<tag>/<csv_listing_id>` et identifiable via `created_at`. |
| `--dry-run=true\|false` ou `--dry-run` | bool | `true` (safe default) | Dry-run par défaut. Pour écrire : `--dry-run=false` |
| `--batch-size=<n>` | int | `50` | Taille des chunks d'insertion |
| `--force=true\|false` ou `--force` | bool | `false` | Ignore le pré-check fingerprint |
| `--reuse-supabase-env` | bool | `false` | Lit `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` depuis `.env.local` |

---

## 4. Conversion FMG → MGA

**Règle** : `1 MGA = 5 FMG`. La conversion est appliquée si :
- `currency_original == 'FMG'` (cas explicite), OU
- `price_mga > 1 500 000 000` (cas suspect : la valeur de prix dépasse le seuil de plausibilité MGA)

### Plage de sécurité après conversion

`5 000 000 ≤ price_mga ≤ 800 000 000` (5M à 800M Ar).

| Cas | Action | `extraction_notes` |
|---|---|---|
| MGA dans plage | Aucune modification | (pas de note pipeline) |
| MGA hors plage | `include_in_estimation = false` | `pipeline:out_of_band` |
| FMG → MGA dans plage | Converti, accepté | `pipeline:fmg_converted` |
| FMG → MGA hors plage | Converti, `include_in_estimation = false` | `pipeline:fmg_conversion_out_of_band` |
| Prix manquant/0/négatif | `include_in_estimation = false` | `pipeline:no_price` |

---

## 5. RGPD

### Politique stricte

- **`market_listings_clean`** (lecture publique via RLS) : aucune donnée à caractère personnel.
  - **Aucun `contact`** (téléphone) recopié — ni en clear, ni hashé.
  - **Aucun `seller_source`** (nom vendeur texte libre type "Akbaraly Akbaraly", "Stevy Marcus") recopié. La colonne n'existe pas dans la table (DROP IF EXISTS appliqué par migration `20260510120000_market_listings_clean_rgpd_strip_seller_source.sql`).
  - Garde-fou TS : `buildCleanInsertPayload()` construit explicitement la liste blanche des champs et n'inclut JAMAIS `seller_source`. Tests unitaires T-RGPD-1 / T-RGPD-3 vérifient l'absence de la clé sur les 10 fixtures + assertion `expect(cleanPayload).not.toHaveProperty('seller_source')`.
  - Visual check à l'exécution : le dry-run affiche `RGPD : seller_source present in clean ? ✅ NO (OK)` à chaque run.
- **`market_listings_raw`** (admin-only via service_role, RLS denied pour anon/authenticated) : conserve la trace complète du payload CSV brut MOINS le contact en clair.
  - `payload.seller_source` est conservé (admin trail, traçabilité scrap).
  - `payload.contact` n'existe pas — remplacé par `payload.contact_hash` (SHA-256 tronqué 16 chars du contact normalisé : whitespace strip + prefix `+261` pour les 03X malagasy).
  - `payload._pipeline_version` : tag de version du pipeline (`v1_2026_05_09`).

### Vérification

| Source de vérité | Query | Résultat attendu |
|---|---|---|
| Visual dry-run output | `RGPD : seller_source present in clean ?` | `✅ NO (OK)` |
| Tests Vitest | `npm test -- ingestMarketListingsCsvWriteMode` | T-RGPD-1/2/3 + T-W-3 green (4 tests RGPD) |
| Schéma DB | `information_schema.columns WHERE table_name='market_listings_clean' AND column_name='seller_source'` | 0 rows |
| Validation post-ingestion (query #6) | `extraction_notes ~ '\d{3}\s?\d{2}\s?\d{3}\s?\d{2}'` filtré sur le batch | 0 |
| Validation post-ingestion (query #9) | Même regex sur `market_listings_raw.payload::text` | 0 |

### Si une fuite est détectée

```sql
-- Adapter le filtre selon le batch concerné (source-tag utilisé + plage created_at)
DELETE FROM market_listings_clean
WHERE source = 'facebook'
  AND source_url LIKE 'csv://facebook/%'
  AND extraction_notes ~ '\d{3}\s?\d{2}\s?\d{3}\s?\d{2}';

DELETE FROM market_listings_raw
WHERE source = 'facebook'
  AND source_url LIKE 'csv://facebook/%'
  AND payload::text ~ '\d{3}\s?\d{2}\s?\d{3}\s?\d{2}';
```

Investiguer le pipeline et corriger la fuite avant ré-ingestion.

---

## 6. Dedup

### Algorithme fingerprint

```
fingerprint = SHA-256(
  make.lower() | model.lower() | year | mileage_band(20k) | price_band(5M Ar) | city.lower()
).slice(0, 24)
```

### Banding

- `mileage_band` : floor(mileage_km / 20 000) × 20 000 — deux annonces avec 80k et 85k km partagent la même bande "80 000".
- `price_band` : floor(price_mga / 5 000 000) × 5 000 000 — deux annonces à 75M et 75.5M Ar partagent la bande "75 000 000".

### Conflits

- **Même fingerprint dans le batch** : compté dans `duplicateInBatch` du dry-run. Lors de l'insert, le 2e+ row aura `include_in_estimation = false` + `extraction_notes += ' | duplicate_in_batch'`.
- **Fingerprint déjà en DB** (re-run) : INSERT skippé, log "déjà ingéré".

### Limitation connue

L'algorithme banding peut faux-flagger des annonces réellement distinctes (deux Hilux 2018 à 75M dans le même quartier d'Antananarivo, mais un avec 78k km et l'autre avec 82k → même fingerprint). Acceptable V1 — le `data_confidence` du CSV permet à Ali de marquer manuellement les cas critiques.

---

## 7. Outlier detection

**Stratégie** : passe SQL post-batch (à runner via `scripts/data/validate-market-listings-ingestion.sql` query #4) qui :

1. Groupe par `(normalized_make, normalized_model, FLOOR(year/2)*2)` → cluster bi-annuel.
2. Pour chaque cluster avec **≥ 5 rows** : calcule P5 et P95 du `price_mga`.
3. Met `outlier_flag = true` sur les rows où `price < P5` OR `price > P95`.

**Clusters < 5 rows** : pas de flag (signal trop faible).

**Cible** : 5-15 outliers sur 105 lignes (≈ 5-15%).

---

## 8. Validation post-ingestion

10 queries dans `scripts/data/validate-market-listings-ingestion.sql`. Lancer dans Supabase SQL Editor après ingestion. Cibles attendues documentées en commentaire dans chaque query.

⚠️ **Adaptation du filtre** : si tu utilises `--source-tag=facebook` (pour respecter la check constraint), les queries qui filtrent par `WHERE source = 'csv_seed_v1_2026'` doivent être adaptées en `WHERE source = 'facebook' AND source_url LIKE 'csv://facebook/%' AND created_at >= '<date_ingestion>'`.

---

## 9. Rollback

Si une ingestion s'avère défaillante (mauvais batch, dataset corrompu) :

```sql
BEGIN;

-- Adapter le filtre selon le source-tag utilisé et la date d'ingestion du batch
-- Exemple production run 2026-05-04 (tag = facebook) :
DELETE FROM public.market_listings_raw
WHERE source = 'facebook'
  AND source_url LIKE 'csv://facebook/%'
  AND created_at >= '2026-05-04'
  AND created_at < '2026-05-05';

-- Vérifier — le FK ON DELETE CASCADE de raw_listing_id supprime aussi les rows clean liées
SELECT COUNT(*) FROM public.market_listings_clean
  WHERE source = 'facebook'
    AND source_url LIKE 'csv://facebook/%'
    AND created_at >= '2026-05-04'
    AND created_at < '2026-05-05';
-- Expected : 0
SELECT COUNT(*) FROM public.market_listings_raw
  WHERE source = 'facebook'
    AND source_url LIKE 'csv://facebook/%'
    AND created_at >= '2026-05-04'
    AND created_at < '2026-05-05';
-- Expected : 0

COMMIT;
```

Les `market_listings_clean` rows sont supprimés en cascade via `raw_listing_id` FK ON DELETE CASCADE (défini dans la migration `20260417160000_market_estimation_foundation.sql`).

### Re-ingest après rollback

Après un DELETE complet, lancer le mode write idempotent :

```bash
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --in=data/seed/market_listings_v1_2026.csv \
  --source-tag=facebook \
  --dry-run=false \
  --reuse-supabase-env
```

L'idempotence (couche 1 : pré-check fingerprint, couche 2 : UNIQUE constraint 23505) garantit que toute relance produit le même état final.

---

## 10. Limitations connues V1

- **`source-tag` limité aux 6 valeurs whitelistées** : `fiarakodia`, `autonex`, `facebook`, `partner`, `manual`, `other`. Le batch identifier (ex: `csv_seed_v1_2026`) ne peut PAS être utilisé directement comme `source` ; il est porté par `source_url` au format `csv://<tag>/<id>`. Pour requêter un batch précis, combiner `source` + `source_url LIKE` + `created_at`.
- **Trim split heuristique imparfait** : la colonne `trim_generation` du CSV est conservée telle quelle dans `normalized_trim`. Les variants implicites (Land Cruiser LC79 vs Prado vs V8 dans la colonne `model` sans suffixe) ne sont pas auto-séparés. Pour V2, prévoir un catalog matching via `src/lib/estimation/catalogAliases.ts`.
- **Kilométrage manquant ~44%** : sur le CSV live, plusieurs lignes n'ont pas de mileage. Le pipeline accepte (`include_in_estimation = true` si make+model+price OK) mais `extraction_notes` flag `mileage_missing`. PROMPT 10A devra pondérer le score similarité en conséquence.
- **Contact RGPD strippé** : impossibilité de re-contacter un vendeur depuis la DB. Acceptable pour un dataset comparables (lecture seule).
- **Outlier detection en passe SQL séparée** : le script ne flag pas les outliers en TS. Ali doit runner manuellement la query #4 (UPDATE) après ingestion. Acceptable car nécessite des fonctions PERCENTILE_CONT côté Postgres.
- **Pas de calibration `confidence_score` numérique** : le CSV fournit `data_confidence` (enum high/medium/low). Le `confidence_score` numeric(0-100) sur `market_listings_clean` reste NULL en V1 (peut être calculé par PROMPT 10A en pondérant `data_confidence` + complétude champs).
