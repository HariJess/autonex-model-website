# 🔧 PROMPT 11 — Schema Delta + CSV Ingestion (Phase 2 Implementation)

**Type** : Phase 2 Implementation — modifications CONTRÔLÉES (migration DB + script ingestion + tests)
**Project** : AutoNex Madagascar
**Working dir** : `C:/Users/alipi/Desktop/PROJECT/AUTONEX/autonex-madagascar`
**Précédent** : PROMPT 9 (audit estimation V1 — read-only) ✅ livré
**Suivant** : PROMPT 10A (Engine V2 Core)
**Output attendu** : 1 migration SQL + 1 script ingestion + tests + 1 doc + 1 rapport `.md`

---

## 🎯 Mission

Préparer la DB pour le futur Engine V2 en :

1. **Étendant le schema `market_listings_clean`** avec 11 colonnes manquantes pour accueillir le format CSV scrap
2. **Ingérant 105 lignes du CSV** (`autonex_estimation_market_data_clean.csv`) dans `market_listings_clean` (+ `market_listings_raw` pour trace brute)
3. Avec **idempotence stricte**, **conversion FMG→MGA safe**, **RGPD-compliant** (aucun contact stocké en clear), **dedup intelligent**, **outlier detection** sur clusters significatifs

**Important** : ce PROMPT NE TOUCHE PAS à l'engine (`engine.ts`) ni à l'UI (`EstimationResultReport.tsx`). À la fin de PROMPT 11, **l'estimation V1 continue de fonctionner exactement comme avant** — la donnée est ingérée mais pas encore consommée. C'est PROMPT 10A qui branchera l'engine sur `market_listings_clean`.

---

## 📥 Input attendu

Le CSV à ingérer doit être placé dans le repo à : `data/seed/market_listings_v1_2026.csv` (105 lignes, en-têtes incluses, 27 colonnes — voir spec ci-dessous).

**Si le fichier n'est pas présent, NE PAS le générer** : produire un message clair dans le rapport indiquant que le fichier est attendu à ce path et le PROMPT s'arrête. Ali le déposera à la main.

### Spec colonnes CSV (référence)

```
listing_id, seller_source, seller_type, make, model, trim_generation, year,
price_mga, price_raw, currency_original, price_type, negotiable,
mileage_km, mileage_raw, fuel, transmission, drivetrain, engine, seats,
options_summary, condition_notes, location, contact, include_in_estimation,
duplicate_group, data_confidence, extraction_notes
```

---

## 📋 Périmètre & Garde-fous

### ✅ Tu dois

- Créer **1 fichier de migration SQL** non-destructive (`IF NOT EXISTS`, `ADD COLUMN`)
- Créer **1 script TypeScript** d'ingestion (`scripts/data/ingest-market-listings-csv.ts`)
- Créer **tests Vitest** d'unité + d'intégration sur la logique du script
- Créer **1 doc Markdown** `docs/DATA_INGESTION_MARKET_LISTINGS.md`
- Vérifier que **les 782 tests existants restent verts**
- Produire un **rapport final** `.md`

### 🚫 Tu ne dois PAS

- Modifier **`src/lib/estimation/engine.ts`** ou tout autre fichier moteur (`api.ts`, `repository.ts`, `referenceProfiles.ts`, `presentation.ts`) — c'est PROMPT 10A
- Modifier **`src/components/estimation/EstimationResultReport.tsx`** ou autre composant UI estimation — c'est PROMPT 10B
- Modifier **`src/pages/Publier.tsx`** ou tout `src/pages/publish/**` ou `src/components/publish/**` ou `src/lib/publishDraft.ts` (garde-fou projet)
- Modifier **`e2e/yas-app-visual-audit.spec.ts`**
- Modifier le hero baseline `"Le portail auto N°1 de Madagascar"` (IMMUTABLE)
- Faire **`git add` / `git commit` / `git push`** — Ali commit lui-même
- **Appliquer la migration en prod** — Ali apply via Supabase SQL Editor sur GO explicite
- Modifier l'Edge Function `compute-estimation/` — c'est PROMPT 10A
- Stocker la colonne `contact` du CSV dans `market_listings_clean` (RGPD)

---

## 🔭 Tâches d'implémentation (séquentielles)

### Tâche 1 — Migration schema delta `market_listings_clean`

**Fichier à créer** : `supabase/migrations/20260509120000_market_listings_clean_extension.sql`

**Contenu attendu** (SQL non-destructif, idempotent) :

```sql
-- Migration : extend market_listings_clean for V2 estimation comparables
-- Non-destructive : safe to re-run

-- 1. Colonnes manquantes pour accueillir CSV scrap FB / dealer
ALTER TABLE public.market_listings_clean
  ADD COLUMN IF NOT EXISTS price_type text
    CHECK (price_type IN ('asking','firm','negotiable','quote') OR price_type IS NULL),
  ADD COLUMN IF NOT EXISTS negotiable boolean,
  ADD COLUMN IF NOT EXISTS drivetrain text
    CHECK (drivetrain IN ('4x2','4x4','awd','rwd','fwd','other') OR drivetrain IS NULL),
  ADD COLUMN IF NOT EXISTS engine_text text,
  ADD COLUMN IF NOT EXISTS seats integer
    CHECK ((seats BETWEEN 1 AND 25) OR seats IS NULL),
  ADD COLUMN IF NOT EXISTS options_summary text,
  ADD COLUMN IF NOT EXISTS condition_notes text,
  ADD COLUMN IF NOT EXISTS include_in_estimation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS data_confidence text
    CHECK (data_confidence IN ('high','medium','low') OR data_confidence IS NULL),
  ADD COLUMN IF NOT EXISTS extraction_notes text,
  ADD COLUMN IF NOT EXISTS duplicate_group text;

-- 2. Comments pour documentation introspection
COMMENT ON COLUMN public.market_listings_clean.price_type IS
  'Nature du prix observé : asking (prix demandé), firm (non négociable), negotiable, quote (devis pro)';
COMMENT ON COLUMN public.market_listings_clean.include_in_estimation IS
  'Si false : la ligne ne participe PAS au calcul comparables (qualité insuffisante, conflit donnée)';
COMMENT ON COLUMN public.market_listings_clean.data_confidence IS
  'Niveau de confiance qualitatif sur la ligne (high/medium/low) — pondère son weight dans le matching';
COMMENT ON COLUMN public.market_listings_clean.duplicate_group IS
  'Clé partagée entre plusieurs annonces probables doublons (avant fingerprint exact)';

-- 3. Index composites pour les filtres engine V2
CREATE INDEX IF NOT EXISTS idx_market_clean_make_model_year_active
  ON public.market_listings_clean(normalized_make, normalized_model, year)
  WHERE include_in_estimation = true AND outlier_flag = false;

CREATE INDEX IF NOT EXISTS idx_market_clean_data_confidence
  ON public.market_listings_clean(data_confidence)
  WHERE include_in_estimation = true;

CREATE INDEX IF NOT EXISTS idx_market_clean_seller_type
  ON public.market_listings_clean(seller_type)
  WHERE include_in_estimation = true;

-- 4. RLS public read pour engine côté client
DROP POLICY IF EXISTS "market_listings_clean_public_read" ON public.market_listings_clean;
CREATE POLICY "market_listings_clean_public_read"
  ON public.market_listings_clean
  FOR SELECT
  TO anon, authenticated
  USING (include_in_estimation = true AND outlier_flag = false);

-- 5. Pas de policy WRITE publique : seul service_role peut écrire (script ingestion / Edge Function)
```

**Vérifications** :
- Le fichier précédent qui crée la table (`20260417160000_market_estimation_foundation.sql`) doit déjà avoir activé RLS sur `market_listings_clean`. Si pas le cas → ajouter `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` en début de migration.
- Si `outlier_flag` n'existe pas, le check à inclure dans la migration. Lire la table avant pour confirmer.

---

### Tâche 2 — Script d'ingestion CSV

**Fichier à créer** : `scripts/data/ingest-market-listings-csv.ts`

**Architecture du script** :

```
1. Argv parse : --csv <path> --dry-run --batch-size <n>
2. Charger CSV (Papa Parse)
3. Validate header (27 colonnes attendues)
4. Pour chaque ligne :
   a. Normalize make/model (alias `catalogAliases.ts`)
   b. Convert FMG→MGA si needed (currency_original === 'FMG' OR price > 1.5e9)
   c. Sanity check price_mga ∈ [5_000_000, 800_000_000]
   d. Strip RGPD : NE PAS conserver `contact`
   e. Compute fingerprint = sha256(make_lc + model_lc + year + mileage_band + price_band + city_lc)
   f. Detect duplicate (fingerprint déjà en DB)
   g. Build row payload pour market_listings_raw + market_listings_clean
5. Outlier detection batch (P5/P95 par cluster make+model+year_band±2)
6. Insert/upsert en chunks (batch_size = 50)
7. Output report : ingested_count, skipped_count, duplicate_count, outlier_count, error_count
```

**Inputs CLI** :
- `--csv <path>` : path du CSV (default `data/seed/market_listings_v1_2026.csv`)
- `--dry-run` : ne write rien en DB, juste valide et output report
- `--source-tag <string>` : valeur pour la colonne `source` (default `'csv_seed_v1_2026'`)
- `--batch-size <n>` : taille des batches insert (default 50)
- `--reuse-supabase-env` : lit `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` depuis `.env.local`

**Logique critique à implémenter** :

#### A. Conversion FMG → MGA
```ts
function normalizePrice(rawPriceMga: number | null, currency: string | null, priceRaw: string | null): { price: number, suspicion: string | null } {
  if (currency === 'FMG' || (rawPriceMga !== null && rawPriceMga > 1_500_000_000)) {
    // 1 MGA = 5 FMG → MGA = FMG / 5
    const converted = Math.round(rawPriceMga / 5);
    if (converted < 5_000_000 || converted > 800_000_000) {
      return { price: converted, suspicion: 'fmg_conversion_out_of_band' };
    }
    return { price: converted, suspicion: 'fmg_converted' };
  }
  if (rawPriceMga === null) {
    return { price: 0, suspicion: 'no_price' };
  }
  if (rawPriceMga < 5_000_000 || rawPriceMga > 800_000_000) {
    return { price: rawPriceMga, suspicion: 'out_of_band' };
  }
  return { price: rawPriceMga, suspicion: null };
}
```

Toute ligne avec `suspicion='out_of_band'` ou `'no_price'` → `include_in_estimation = false` ET `extraction_notes` enrichie de la suspicion.

#### B. RGPD strip
La colonne `contact` du CSV ne doit JAMAIS atterrir dans `market_listings_clean`. Elle peut être hashée et stockée dans `market_listings_raw.payload->>'contact_hash'` à des fins de dedup futur, mais **JAMAIS en clear**.

```ts
function hashContact(contact: string | null): string | null {
  if (!contact) return null;
  const normalized = contact.replace(/\s/g, '').replace(/^0/, '+261');
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
```

#### C. Fingerprint pour dedup
```ts
function computeFingerprint(row: NormalizedRow): string {
  const mileageBand = row.mileage_km
    ? Math.floor(row.mileage_km / 20_000) * 20_000  // banded by 20k km
    : null;
  const priceBand = Math.floor(row.price_mga / 5_000_000) * 5_000_000;  // banded by 5M Ar
  const key = [
    row.normalized_make.toLowerCase(),
    row.normalized_model.toLowerCase(),
    row.year ?? 'unknown',
    mileageBand ?? 'unknown',
    priceBand,
    (row.city ?? 'unknown').toLowerCase(),
  ].join('|');
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
}
```

Si fingerprint existe déjà en DB → `duplicate_of` pointe vers le row existant + `include_in_estimation = false` sur le nouveau.

#### D. Outlier detection
Après ingestion brute, runner une seconde passe :

```sql
-- Pour chaque cluster avec ≥5 rows :
WITH clusters AS (
  SELECT
    normalized_make, normalized_model,
    FLOOR(year / 2.0) * 2 AS year_band,
    PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY price_mga) AS p5,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY price_mga) AS p95,
    COUNT(*) AS n
  FROM market_listings_clean
  WHERE source = 'csv_seed_v1_2026' AND price_mga IS NOT NULL
  GROUP BY 1, 2, 3
  HAVING COUNT(*) >= 5
)
UPDATE market_listings_clean m
SET outlier_flag = true
FROM clusters c
WHERE m.normalized_make = c.normalized_make
  AND m.normalized_model = c.normalized_model
  AND FLOOR(m.year / 2.0) * 2 = c.year_band
  AND (m.price_mga < c.p5 OR m.price_mga > c.p95)
  AND m.source = 'csv_seed_v1_2026';
```

Pour les clusters <5 rows : pas d'outlier flag (signal trop faible).

#### E. Insert flow
1. INSERT INTO `market_listings_raw` (raw payload + source_url + source = 'csv_seed_v1_2026')
2. INSERT INTO `market_listings_clean` (FK → raw_id, all 27+derived columns)
3. ON CONFLICT (fingerprint) DO NOTHING — backstop dedup

**Idempotence** : re-runner le script sans `--force` doit faire `0 nouvelles insertions`. Mécanisme :
- Avant insert, SELECT count(*) WHERE source = source_tag → si > 0 + sans `--force`, skip avec message.
- Ou plus fin : pour chaque row, SELECT WHERE source = source_tag AND fingerprint = X → si exist, skip.

---

### Tâche 3 — Tests

**Fichier à créer** : `scripts/data/__tests__/ingest-market-listings-csv.test.ts`

Coverage minimum :

| # | Test | Assertions |
|---|---|---|
| T1 | Parse CSV header valid | 27 columns expected, no malformed |
| T2 | Parse CSV with 5 rows fixtures | 5 rows parsed correctly |
| T3 | normalizePrice : MGA in band | returns input, suspicion=null |
| T4 | normalizePrice : MGA out of band low | suspicion='out_of_band' |
| T5 | normalizePrice : MGA out of band high → FMG conversion | converted /5, suspicion='fmg_converted' |
| T6 | normalizePrice : explicit FMG → MGA | converted, in band |
| T7 | hashContact : strip whitespace + +261 prefix | deterministic 16-char hash |
| T8 | hashContact : null → null | |
| T9 | computeFingerprint : same row → same hash | deterministic |
| T10 | computeFingerprint : different mileage same band → same hash | banding works |
| T11 | computeFingerprint : different make → different hash | discrimination works |
| T12 | normalizeMakeModel : "TOYOTA" → "Toyota" | casing |
| T13 | normalizeMakeModel : "Land Cruiser LC79" → make=Toyota model=Land Cruiser, trim=LC79 | trim split |
| T14 | RGPD : contact stripped from clean payload | no contact key in clean insert |
| T15 | RGPD : contact hashed in raw payload | hash present, not clear text |
| T16 | dedup : same fingerprint inserted twice → second skipped | idempotence |
| T17 | include_in_estimation : suspicion=out_of_band → false | gating works |
| T18 | include_in_estimation : missing year → still true if mileage+price ok | tolerance |
| T19 | dry-run : no DB writes performed | mock supabase, assert no calls |
| T20 | batch chunking : 105 rows / batch 50 → 3 batches | chunking works |

**Fixtures** : créer `scripts/data/__tests__/fixtures/market_listings_sample.csv` avec ~10 rows couvrant les edge cases (FMG, contact format varié, doublons, outliers, year missing, etc.).

---

### Tâche 4 — Validation post-ingestion (queries de smoke)

**Fichier à créer** : `scripts/data/validate-market-listings-ingestion.sql`

Une suite de queries que Ali pourra runner manuellement dans Supabase SQL Editor après apply de la migration + run du script en mode `--dry-run=false` :

```sql
-- 1. Total ingéré
SELECT COUNT(*) AS total,
       SUM(CASE WHEN include_in_estimation THEN 1 ELSE 0 END) AS usable
FROM market_listings_clean
WHERE source = 'csv_seed_v1_2026';
-- Expected : total ≈ 105, usable ≥ 85

-- 2. Distribution par make (top 15)
SELECT normalized_make, COUNT(*) AS n
FROM market_listings_clean
WHERE source = 'csv_seed_v1_2026'
GROUP BY 1
ORDER BY 2 DESC LIMIT 15;
-- Expected : Toyota, Hyundai, Kia, VW, Nissan en tête

-- 3. Distribution data_confidence
SELECT data_confidence, COUNT(*) FROM market_listings_clean
WHERE source = 'csv_seed_v1_2026' GROUP BY 1;
-- Expected : high ≈ 75, medium ≈ 20, low ≈ 10

-- 4. Outliers détectés
SELECT COUNT(*) FROM market_listings_clean
WHERE source = 'csv_seed_v1_2026' AND outlier_flag = true;
-- Expected : 5-15

-- 5. Doublons détectés
SELECT duplicate_of, COUNT(*) FROM market_listings_clean
WHERE source = 'csv_seed_v1_2026' AND duplicate_of IS NOT NULL
GROUP BY 1;
-- Expected : 0-5 doublons (CSV deduplifié en source)

-- 6. RGPD audit : aucun contact stocké en clear en clean
SELECT COUNT(*) FROM market_listings_clean
WHERE source = 'csv_seed_v1_2026'
  AND (extraction_notes LIKE '%@%' OR extraction_notes ~ '\d{3}\s?\d{2}\s?\d{3}\s?\d{2}');
-- Expected : 0 (aucun contact ne fuite dans les notes)

-- 7. Conversion FMG correcte
SELECT COUNT(*) FROM market_listings_clean
WHERE source = 'csv_seed_v1_2026'
  AND extraction_notes LIKE '%fmg_converted%';
-- Expected : ≈ nombre de lignes FMG dans le CSV

-- 8. Index utilisé sur la query engine V2 (à runner avant PROMPT 10A)
EXPLAIN ANALYZE
SELECT * FROM market_listings_clean
WHERE normalized_make ILIKE 'Toyota'
  AND normalized_model ILIKE 'Hilux'
  AND year BETWEEN 2014 AND 2020
  AND include_in_estimation = true
  AND outlier_flag = false;
-- Expected : Index Scan on idx_market_clean_make_model_year_active
```

---

### Tâche 5 — Documentation

**Fichier à créer** : `docs/DATA_INGESTION_MARKET_LISTINGS.md`

Sections obligatoires :

1. **Vue d'ensemble** : pourquoi cette ingestion, ce qu'elle fait, ce qu'elle ne fait pas
2. **Format CSV** : 27 colonnes, type attendu, valeurs autorisées
3. **Comment ingérer un nouveau batch** : commande, env vars, dry-run d'abord, pas en prod sans validation
4. **Conversion FMG→MGA** : règle (1 MGA = 5 FMG), détection, plages safety
5. **RGPD** : contact strippé en clean, hashé en raw
6. **Dedup** : fingerprint algorithm, banding, conflits
7. **Outlier detection** : P5/P95 par cluster make+model+year_band±2, seuil 5 rows
8. **Validation post-ingestion** : queries à runner
9. **Rollback** : `DELETE FROM market_listings_clean WHERE source = '<tag>'` (et raw correspondant)
10. **Limitations connues V1** : trim split heuristique non parfait, kilométrage manquant ~44%, contact RGPD strippé donc pas de re-contact possible

---

### Tâche 6 — Vérifications avant fin de mission

Avant de produire le rapport final, vérifier :

1. **Tests Vitest** : `npm test` → 782 + nouveaux tests verts (cible : 802+)
2. **Build** : `npm run build` → no error
3. **ESLint** : `npm run lint` → no error (NBSP `\u00A0` escapé, NO unused vars sans `_` prefix)
4. **Pre-commit hook** : si lint-staged échoue, fixer avant de produire le rapport
5. **Aucun fichier garde-fou modifié** : `git status` → vérifier que `Publier.tsx`, `e2e/yas-app-visual-audit.spec.ts`, `engine.ts`, `EstimationResultReport.tsx` ne sont PAS dans la liste
6. **Aucun commit fait** : `git log -1` doit montrer le dernier commit Ali, pas un commit Claude Code

---

## ✅ Critères d'acceptance

| Critère | Vérification |
|---|---|
| Migration idempotente | Re-run `ALTER TABLE...IF NOT EXISTS` → no error |
| Script idempotent (sans `--force`) | Re-run script → `0 new rows ingested` message |
| RGPD : aucun contact en clean | Validation query #6 → 0 rows |
| FMG conversion safe | Test T6 vert + validation query #7 cohérente |
| Dedup fonctionnel | Test T16 vert + validation query #5 cohérente |
| Outlier detection cohérent | Validation query #4 dans plage 5-15 |
| Tests verts | 802+ green |
| Build vert | `npm run build` no error |
| ESLint clean | `npm run lint` no error |
| Aucun fichier garde-fou touché | `git status` clean sur `Publier.tsx`, `engine.ts`, `EstimationResultReport.tsx`, `yas-app-visual-audit.spec.ts` |
| Aucun commit auto | `git log -1` montre dernier commit Ali |
| Migration NON appliquée | Migration créée mais pas applied (Ali apply manuellement post-validation) |

---

## 📊 Format du rapport final attendu

Fichier : `rapports/PROMPT_11_RAPPORT_<DATE>.md`

Structure exacte :

```
# 📋 Rapport PROMPT 11 — Schema Delta + CSV Ingestion

## TL;DR (max 8 lignes)
[Migration créée OUI/NON, script créé OUI/NON, tests count avant/après, ingestion dry-run results, statut migration apply (pending Ali)]

## 1. Migration créée
[Path, contenu (extrait), apply status (pending)]

## 2. Script ingestion créé
[Path, LOC, architecture, options CLI]

## 3. Tests
[Path tests, count avant/après PROMPT 11, fixtures créées]

## 4. Documentation créée
[Path doc, sections couvertes]

## 5. Dry-run results (sur le CSV 105 lignes)
[Tableau : total parsed, valides, dedup detected, FMG converted, outliers (estimés), include_in_estimation true/false, errors]

## 6. Validation queries préparées
[Path SQL, liste des 8 queries]

## 7. Bundle / build / lint impact
[Bundle delta (devrait être 0 car script non-bundlé), build green, lint green]

## 8. Fichiers garde-fou intacts (vérification git status)
[Liste des 5 fichiers + leur statut "untouched"]

## 9. Decisions / surprises rencontrées
[Tout edge case CSV imprévu, ambiguïté résolue, choix d'implementation à valider Ali]

## 10. Next steps pour Ali
[
  1. Review code (PR review style)
  2. Apply migration : Supabase SQL Editor → coller content de la migration → run
  3. Run script avec --dry-run sur prod : `npm run ingest:market -- --dry-run`
  4. Si dry-run OK : run sans --dry-run
  5. Run validation queries
  6. Git commit (Ali) : feat(data): activate market_listings_clean ingestion CSV V1
]

## 11. Risques résiduels
[Tout risque ouvert, ex : trim split heuristique imparfait pour Land Cruiser variants]
```

---

## 🚫 Reminder garde-fous critiques

- 🚫 **NE PAS** modifier `engine.ts`, `referenceProfiles.ts`, `presentation.ts`, `api.ts`, `repository.ts` (PROMPT 10A)
- 🚫 **NE PAS** modifier `EstimationResultReport.tsx` (PROMPT 10B)
- 🚫 **NE PAS** modifier `Publier.tsx` ni le sous-arbre publish
- 🚫 **NE PAS** modifier le hero baseline `"Le portail auto N°1 de Madagascar"`
- 🚫 **NE PAS** modifier `e2e/yas-app-visual-audit.spec.ts`
- 🚫 **NE PAS** stocker la colonne `contact` du CSV en clear dans `market_listings_clean`
- 🚫 **NE PAS** appliquer la migration en prod (Ali apply via Supabase SQL Editor sur GO explicite)
- 🚫 **NE PAS** faire `git add` / `commit` / `push`
- 🚫 **NE PAS** introduire de dépendance lourde (script doit utiliser Papa Parse déjà présent + crypto natif)
- 🚫 **NE PAS** inventer des données : si une ligne CSV a un champ ambigu, mettre `include_in_estimation = false` + log dans `extraction_notes`

---

## 📦 Livrable final récapitulatif

| Fichier | Rôle | LOC estimée |
|---|---|---|
| `supabase/migrations/20260509120000_market_listings_clean_extension.sql` | Migration delta + index + RLS | ~80 |
| `scripts/data/ingest-market-listings-csv.ts` | Script ingestion idempotent | ~350 |
| `scripts/data/__tests__/ingest-market-listings-csv.test.ts` | Tests Vitest 20 cas | ~250 |
| `scripts/data/__tests__/fixtures/market_listings_sample.csv` | Fixtures 10 rows edge cases | ~10 |
| `scripts/data/validate-market-listings-ingestion.sql` | 8 queries validation post-apply | ~80 |
| `docs/DATA_INGESTION_MARKET_LISTINGS.md` | Doc 10 sections | ~150 |
| `rapports/PROMPT_11_RAPPORT_<DATE>.md` | Rapport final | ~400 |

**Total estimé** : ~1 320 LOC nouvelles (dont 250 tests + 400 rapport).

---

## 🎯 Annonce finale attendue

À la fin de la mission, Claude Code annonce dans le rapport :

> **PROMPT 11 livré.**
> Migration créée (non appliquée). Script ingestion créé (dry-run validé sur 105 lignes : X usable, Y dedup, Z outliers). Tests : 782 → 802+ verts. Build vert. Lint vert. Aucun fichier garde-fou touché. Aucun commit fait.
>
> **Action Ali requise** :
> 1. Review code
> 2. Apply migration via Supabase SQL Editor
> 3. Run script en non-dry-run
> 4. Run validation queries
> 5. Commit + push toi-même
> 6. Donner GO pour PROMPT 10A (Engine V2 Core)

---

**Bon ingest. La donnée est l'oxygène de l'estimation V2 — sans ces 105 lignes correctement absorbées, l'engine V2 sera un beau moteur sans carburant.**
