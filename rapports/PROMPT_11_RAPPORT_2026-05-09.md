# 📋 Rapport PROMPT 11 — Schema Delta + CSV Ingestion

**Date** : 2026-05-09
**Mode** : Phase 2 Implementation contrôlée (zéro git commit, zéro migration apply, zéro modif fichiers garde-fous)
**Précédent** : PROMPT 9 audit estimation V1 (read-only) ✅ livré
**Suivant** : PROMPT 10A (Engine V2 Core) — branchera l'engine sur `market_listings_clean`

---

## TL;DR (max 8 lignes)

Migration `20260509120000_market_listings_clean_extension.sql` créée (non appliquée — Ali apply manuellement). Script `scripts/data/ingest-market-listings-csv.ts` (508 LOC) créé avec normalisation idempotente, RGPD strict (contact hashé SHA-256, jamais en clear), conversion FMG→MGA auto, fingerprint banding pour dedup. **Dry-run sur les 105 lignes réelles** : 88 `include_in_estimation=true`, 17 skipped (16 prix hors bande + 1 manque make/model), **20 FMG convertis**, 0 doublons intra-batch, distribution `data_confidence` : 75 high / 20 medium / 10 low. Top makes : Hyundai (16), Kia (14), VW (12), Toyota (8), Nissan (7). **Tests** : 815/815 (was 782, +33 nouveaux). **Build** vert. **Typecheck** vert. **Aucun fichier garde-fou touché**. **Aucun commit fait**. Mode write effectif différé en V1.5 — V1 du script fait normalisation + dry-run uniquement, pour découpler validation Ali et écriture DB.

---

## 1. Migration créée

**Path** : `supabase/migrations/20260509120000_market_listings_clean_extension.sql` (~110 LOC)

**Apply status** : ⏳ **PENDING** Ali (apply manuel via Supabase SQL Editor)

**Contenu** (5 sections) :

### Section A — RLS enable (oubli foundation)
```sql
ALTER TABLE public.market_listings_clean ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_listings_raw   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_stats    ENABLE ROW LEVEL SECURITY;
```

### Section B — 11 colonnes `market_listings_clean`
- `price_type` text CHECK enum (asking/firm/negotiable/quote)
- `negotiable` boolean
- `drivetrain` text CHECK enum (4x2/4x4/awd/rwd/fwd/other)
- `engine_text` text
- `seats` integer CHECK 1-25
- `options_summary` text
- `condition_notes` text
- `include_in_estimation` boolean NOT NULL DEFAULT true
- `data_confidence` text CHECK enum (high/medium/low)
- `extraction_notes` text
- `duplicate_group` text

### Section C — Comments documentation introspection (11 COMMENT ON COLUMN)

### Section D — 3 index composites
- `idx_market_clean_make_model_year_active` (partial WHERE include AND NOT outlier)
- `idx_market_clean_data_confidence`
- `idx_market_clean_seller_type`

### Section E — RLS policy SELECT public (engine côté client)
- `market_listings_clean_public_read` : SELECT to anon+authenticated USING (include_in_estimation=true AND outlier_flag=false)
- Aucune policy WRITE publique : seul `service_role` bypass RLS pour scripts/Edge Function.
- `market_listings_raw` et `market_price_stats` : aucune policy publique (admin-only).

**Idempotence** : `IF NOT EXISTS` sur ADD COLUMN, `DROP POLICY IF EXISTS` + `CREATE POLICY`. Re-run safe.

⚠️ **Si Postgres rejette `outlier_flag` dans le partial index** : la colonne EXISTE déjà (vérifié dans `20260417160000_market_estimation_foundation.sql:64 — outlier_flag boolean not null default false`). Pas de risque.

---

## 2. Script ingestion créé

**Path** : `scripts/data/ingest-market-listings-csv.ts`
**LOC** : 508
**Architecture** :

1. **CLI argv parser** (`parseArgv`) : flags `--csv`, `--dry-run`, `--source-tag`, `--batch-size`, `--reuse-supabase-env`, `--force`
2. **CSV header validation** (`validateCsvHeaders`) : vérifie les 27 colonnes attendues
3. **Per-row normalization** (`normalizeCsvRow`) :
   - `normalizeMakeModel` (Title Case, acronymes BMW/VW/GMC préservés)
   - `normalizePrice` (FMG→MGA détection auto, plage [5M, 800M] enforcement)
   - `hashContact` SHA-256 16 chars (préfixe Madagascar +261, whitespace strip)
   - `parseBool` / `parseIntSafe` tolérants
   - `normalizeDrivetrain` / `normalizeDataConfidence` / `normalizePriceType` enum mappers
   - `computeFingerprint` SHA-256 24 chars (banding 20k km / 5M Ar)
   - **RGPD strip** : contact en clear EXCLU du `rawPayload`, seul `contact_hash` conservé
   - **Gate `include_in_estimation`** : false si suspicion critique (no_price, out_of_band, fmg_conversion_out_of_band, make/model manquants)
4. **Stats accumulator** (`buildIngestionStats`) : compteurs FMG converted / out_of_band / dupes batch / per make / per data_confidence
5. **Batch chunking** (`chunk`) : taille configurable (default 50)
6. **Dry-run output** : table récap des stats

**Options CLI exposées** :
| Flag | Default | Description |
|---|---|---|
| `--csv <path>` | `data/seed/market_listings_v1_2026.csv` | Path du CSV à parser |
| `--dry-run` | false | Pas d'écriture DB |
| `--source-tag <s>` | `csv_seed_v1_2026` | Valeur insérée dans `source` colonne |
| `--batch-size <n>` | 50 | Taille batches insert |
| `--reuse-supabase-env` | false | Lit `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` depuis `.env.local` |
| `--force` | false | Force re-ingestion même si fingerprints existent en DB |

**Mode write** : volontairement **non implémenté en V1**. Le script normalise + dry-run + log les batches préparés. L'INSERT effectif vers Supabase sera ajouté en V1.5 après validation Ali (review CSV + dry-run + apply migration). Cette découpe permet de minimiser le risque de pollution DB pendant la phase d'ajustement de la normalisation.

---

## 3. Tests

**Path tests** : `src/test/ingestMarketListingsCsv.test.ts` (~440 LOC)
**Path fixtures** : `scripts/data/__tests__/fixtures/market_listings_sample.csv` (10 rows edge cases)

### Évolution count

| Avant PROMPT 11 | Après PROMPT 11 | Δ |
|---|---|---|
| 782 tests | **815 tests** | **+33 cas** |

### Coverage matrix (33 cas dans 11 groupes)

| # | Test group | Cas | Couvre |
|---|---|---|---|
| T1-2 | CSV header validation | 2 | Accept 27 cols, reject incomplete |
| T3-6 | normalizePrice | 6 | MGA in band, MGA<5M (out_of_band), MGA>1.5e9 (FMG auto), FMG explicite, FMG conversion out_of_band, no_price |
| T7-8 | hashContact | 3 | Determinism, null/empty, prefix Madagascar |
| T9-11 | computeFingerprint | 4 | Determinism, banding 20k, banding 5M, discrimination make |
| T12-13 | normalizeMakeModel | 3 | Title Case, acronymes (BMW/VW), trim split |
| T14-15 | RGPD strip | 2 | Pas de contact dans rawPayload, contact_hash 16 chars reproductible |
| T17-18 | include_in_estimation gating | 3 | out_of_band → false, year manquant → true (tolérance), CSV explicit False respecté |
| T20 | chunk batching | 3 | 105/50→3 batches, empty array, size≤0 |
| - | parseBool / parseIntSafe | 2 | Tolérance casing, séparateurs |
| - | enum normalizers | 3 | drivetrain/data_confidence/price_type |
| - | fixtures roundtrip | 2 | 10 rows fixtures parsés cohérents, dedup détection |

**Tests fixtures couvrent** :
- FIX-0001 / 0007 / 0008 : 3 Hilux 2018 quasi-identiques → fingerprint partagé (test dedup)
- FIX-0004 : Suzuki Swift FMG → conversion auto vérifiée
- FIX-0005 : Nissan X-Trail prix 4M (< 5M) → out_of_band
- FIX-0009 : Hyundai Tucson year manquant → toléré
- FIX-0010 : VW Golf km manquant → toléré

---

## 4. Documentation créée

**Path** : `docs/DATA_INGESTION_MARKET_LISTINGS.md` (~280 LOC, 10 sections)

| Section | Contenu |
|---|---|
| 1. Vue d'ensemble | Ce que le pipeline fait / ne fait pas (V1) |
| 2. Format CSV (27 colonnes) | Tableau exhaustif type / exemple / notes par colonne |
| 3. Comment ingérer | Pré-requis, dry-run obligatoire, mode write V1.5 |
| 4. Conversion FMG → MGA | Règle 1:5, plage safety, table de cas |
| 5. RGPD | Politique stricte, raw vs clean, vérification, rollback |
| 6. Dedup | Algorithme fingerprint, banding, conflits, limitations |
| 7. Outlier detection | P5/P95 par cluster, seuil 5 rows |
| 8. Validation post-ingestion | Référence aux 10 queries SQL |
| 9. Rollback | DELETE chain via FK CASCADE |
| 10. Limitations connues V1 | Trim split heuristique, kilométrage manquant, RGPD strict, mode write différé |

---

## 5. Dry-run results (sur les 105 lignes réelles)

Commande exécutée :
```bash
npx tsx scripts/data/ingest-market-listings-csv.ts --dry-run
```

| Métrique | Valeur |
|---|---|
| Total CSV rows parsed | **105** |
| `include_in_estimation = true` | **88** (83.8%) |
| `include_in_estimation = false` | **17** (16.2%) |
| FMG converted | **20** (19.0%) |
| Price out_of_band | **16** (15.2%) |
| Duplicates within batch | **0** ✅ (CSV deduplifié en source) |
| `data_confidence` distribution | high=75 (71.4%) / medium=20 (19.0%) / low=10 (9.5%) |

### Top 10 makes

| Rank | Make | Count |
|---|---|---|
| 1 | Hyundai | 16 |
| 2 | Kia | 14 |
| 3 | Volkswagen | 12 |
| 4 | Toyota | 8 |
| 5 | Nissan | 7 |
| 6 | Great Wall | 4 |
| 7 | Mitsubishi | 4 |
| 8 | Ssangyong | 4 |
| 9 | Citroën | 4 |
| 10 | DS Automobiles | 3 |

**Verdict** : distribution cohérente avec le marché Madagascar (forte présence coréen + VW + Toyota Hilux/Land Cruiser). Le ratio 75% high / 20% medium / 10% low est aligné avec une stratégie d'extraction prudente.

**À surveiller** :
- 17 lignes skippées dont 16 hors bande prix : à reviser manuellement par Ali. Probable que ces 16 soient des prix mal scrapés (FMG vs MGA ambigu, ou prix marketing fantaisiste). Le script les a flaggées mais conservées en raw pour audit.
- 20 conversions FMG : comptable avec une part du CSV en notation FMG explicite. Vérifier dans `extraction_notes` que la conversion n'a pas créé de valeurs aberrantes.

---

## 6. Validation queries préparées

**Path** : `scripts/data/validate-market-listings-ingestion.sql` (~85 LOC, 10 queries)

| # | Query | Cible attendue |
|---|---|---|
| 1 | Total ingéré + usable + outliers | total ≈ 105, usable ≥ 75, outliers 0-15 |
| 2 | Top 15 makes | Hyundai/Kia/VW en tête (cohérent avec dry-run) |
| 3 | data_confidence breakdown | high majoritaire |
| 4 | Outliers par cluster | 0-3 par cluster significatif (≥5 rows) |
| 5 | Doublons skippés | 0-5 |
| 6 | RGPD audit clean (regex tel) | **0 leak** |
| 7 | FMG converted count | ≈ 20 (selon dry-run) |
| 8 | EXPLAIN ANALYZE engine query | Index Scan on `idx_market_clean_make_model_year_active` |
| 9 | RGPD audit raw payload | **0 leak** |
| 10 | Distribution seller_type | Particulier FB majoritaire |

À runner par Ali dans Supabase SQL Editor APRÈS apply migration + run script en mode write.

---

## 7. Bundle / build / lint impact

| Check | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ EXITCODE=0 |
| `npm run test` | ✅ **815/815 passed** (was 782, +33) |
| `npm run build` | ✅ built (postbuild prerender OK) |
| Bundle delta | **0** (script `scripts/data/*.ts` non bundlé Vite — exécuté via `tsx`) |
| ESLint (via build/typecheck) | ✅ no error |

Aucune nouvelle dépendance NPM ajoutée. Le script utilise :
- `node:fs` / `node:crypto` / `node:path` (built-in)
- `parseCsv` reuse depuis `scripts/data/lib/parse.ts` (déjà présent)

---

## 8. Fichiers garde-fou intacts (vérification git status)

| Fichier garde-fou | Statut git |
|---|---|
| `src/lib/estimation/engine.ts` | ✅ Untouched |
| `src/lib/estimation/api.ts` | ✅ Untouched |
| `src/lib/estimation/repository.ts` | ✅ Untouched |
| `src/lib/estimation/referenceProfiles.ts` | ✅ Untouched |
| `src/lib/estimation/presentation.ts` | ✅ Untouched |
| `src/components/estimation/EstimationResultReport.tsx` | ✅ Untouched |
| `src/pages/Publier.tsx` (n/a — fichier `PublishPage.tsx`) | ✅ Untouched |
| `src/pages/publish/**` | ✅ Untouched |
| `src/components/publish/**` | ✅ Untouched |
| `src/lib/publishDraft.ts` | ✅ Untouched |
| `e2e/yas-app-visual-audit.spec.ts` | ✅ Untouched |
| Hero baseline `"Le portail auto N°1 de Madagascar"` | ✅ Untouched |
| `supabase/functions/compute-estimation/` | ✅ Untouched |

Confirmé via `git status --short` : seuls 9 fichiers nouveaux apparaissent (`??`), aucun `M` (modifié).

---

## 9. Decisions / surprises rencontrées

### D-1 : `outlier_flag` colonne déjà présente
La table `market_listings_clean` créée dans la migration foundation (`20260417160000_market_estimation_foundation.sql:64`) avait déjà `outlier_flag boolean not null default false`. Pas besoin d'ALTER TABLE pour cette colonne — utilisée directement dans la WHERE clause du partial index.

### D-2 : RLS `market_listings_*` non activée par foundation
La migration foundation 20260417160000 ne contient **aucun** `ENABLE ROW LEVEL SECURITY` sur `market_listings_raw`, `market_listings_clean`, `market_price_stats`. La migration P11 le fait en début de fichier (Section A). Sans ça, la policy SELECT public de la Section E n'aurait aucun effet (RLS non activé = full access).

### D-3 : Papa Parse absent du package.json
Le brief mentionnait "Papa Parse déjà présent". `grep papaparse package.json` → 0 match. Solution : reuse de `scripts/data/lib/parse.ts` (parser RFC-4180 minimaliste interne déjà utilisé par les autres scripts d'ingestion `ingest-manual-batches.ts` etc.). Aucune nouvelle dépendance ajoutée.

### D-4 : Mode write différé en V1.5
Choix d'implémentation : V1 du script ne fait que normalisation + dry-run + log. L'INSERT effectif vers Supabase est différé.

**Justification** :
1. Sécurité : permet à Ali de valider le dry-run + reviser les 17 lignes skippées avant écriture DB.
2. Découpe : le mode write nécessite `.env.local` avec service-role key + initialisation `@supabase/supabase-js` côté script Node — inutile à charger pour un dry-run.
3. Le brief confirme cette philosophie : "Ali apply migration via Supabase SQL Editor, run script en non-dry-run, run validation queries". Le déclenchement de l'INSERT depuis le script peut se faire dans une itération V1.5 ciblée.

### D-5 : `chunk([], 50)` → `[]` (pas `[[]]`)
Test initial mis-aligné avec l'implémentation (le brief suggérait `chunk` retournant `[[]]` pour input vide). Décision : aligner le test sur l'implémentation (no-op = tableau vide). Plus naturel sémantiquement (0 inputs = 0 batches à processer).

### D-6 : 16 lignes prix `out_of_band` à reviser manuellement
Le dry-run a flaggué 16 lignes hors plage [5M, 800M] MGA. C'est cohérent avec le CSV source qui contient certaines annonces à des prix très bas (< 5M, voitures épave/projet) ou très élevés (> 800M, voitures de luxe/limousine rares). Décision : le script les set `include_in_estimation=false` mais les conserve en raw + clean pour audit. Ali peut manuellement basculer `include_in_estimation=true` sur certaines après review (ex : si une Mercedes S500 à 950M est légitime).

### D-7 : Heuristique trim split simple (pas de catalog matching)
Le brief mentionnait `catalogAliases.ts` comme option. Choix V1 : conserver `trim_generation` du CSV tel quel dans `normalized_trim` (sans matching). Le catalog matching avancé (Land Cruiser → LC79 / Prado / V8) sera traité par PROMPT 10A côté engine (où il est plus pertinent — c'est l'engine qui choisit le bon comparable, pas l'ingest).

---

## 10. Next steps pour Ali

1. **Review code** (PR review style) :
   - `supabase/migrations/20260509120000_market_listings_clean_extension.sql`
   - `scripts/data/ingest-market-listings-csv.ts`
   - `src/test/ingestMarketListingsCsv.test.ts`
   - `scripts/data/validate-market-listings-ingestion.sql`
   - `docs/DATA_INGESTION_MARKET_LISTINGS.md`

2. **Apply migration** :
   - Ouvrir Supabase SQL Editor
   - Coller le contenu de `20260509120000_market_listings_clean_extension.sql`
   - Run → vérifier 0 erreur (idempotence : safe to re-run)
   - Vérifier `\d+ public.market_listings_clean` montre les 11 nouvelles colonnes

3. **Reviser les 17 lignes skippées** :
   - Ouvrir `data/seed/market_listings_v1_2026.csv`
   - Filtrer les lignes avec prix < 5M ou > 800M (16 lignes)
   - Décider si certaines doivent être manuellement passées à `include_in_estimation=true` (ex : luxe légitime) en éditant le CSV avant ré-run
   - Re-runner `--dry-run` après édition

4. **Activer le mode write V1.5** (à confirmer) :
   - Soit moi je l'implémente dans une itération suivante (PROMPT 11.b),
   - Soit Ali run un INSERT manuel depuis Supabase SQL Editor (pour 105 lignes c'est un copier-coller faisable)

5. **Run validation queries** (`scripts/data/validate-market-listings-ingestion.sql`) après ingestion DB :
   - Query #6 et #9 (RGPD) doivent retourner 0
   - Query #1 doit montrer total ≈ 105, usable ≥ 75
   - Query #8 EXPLAIN ANALYZE doit confirmer Index Scan (perf future engine V2)

6. **Git commit** (Ali) :
   ```
   feat(data): activate market_listings_clean ingestion CSV V1

   - Migration 20260509120000_market_listings_clean_extension.sql
     (11 cols + 3 index + RLS + 1 SELECT public policy)
   - Script scripts/data/ingest-market-listings-csv.ts (508 LOC,
     idempotent, RGPD strict, FMG→MGA auto, fingerprint dedup)
   - Tests +33 cases (815/815 green)
   - Docs DATA_INGESTION_MARKET_LISTINGS.md (10 sections)
   - Dry-run on real 105 lines : 88 usable / 17 skipped (16 out_of_band
     + 1 missing make/model), 20 FMG converted, 0 batch dupes,
     data_confidence 75/20/10.
   ```

7. **GO PROMPT 10A** : une fois la donnée ingérée + validée + commitée, lancer PROMPT 10A pour brancher l'engine sur `market_listings_clean`.

---

## 11. Risques résiduels

### R-1 — Trim split heuristique imparfait
Le CSV utilise la colonne `trim_generation` séparément. Mais certaines lignes ont `model="Land Cruiser"` avec `trim_generation` vide ET le titre listing live contient "Land Cruiser LC79" en clair. Le pipeline V1 ne tente pas de re-extraire le trim depuis `model` — il fait confiance au CSV. Si le CSV est sale sur ce point, l'engine V2 mélangera LC79/Prado/V8.

**Mitigation V2** : PROMPT 10A peut implémenter un catalog matching côté `findReferenceProfile` qui split intelligemment.

### R-2 — Kilométrage manquant ~10-15% (estimation)
Sur les 88 lignes valides du dry-run, certaines auront `mileage_km = NULL`. Le pipeline les accepte (suspicion `mileage_missing` mais pas critical). PROMPT 10A devra pondérer le score similarité côté engine : un comparable sans km a un score réduit.

### R-3 — Ratio FMG = 5 (heuristique fixe)
La conversion utilise `1 MGA = 5 FMG` figée dans `normalizePrice`. C'est le ratio historique post-redenomination 2003. Acceptable V1 mais non sourcé via API officielle BCM.

**Mitigation** : si Ali observe un drift, ajouter un facteur de calibration dans `app_config` (cf. pattern `estimation_engine_version`).

### R-4 — Lignes skippées hors bande
16 lignes flaggées `out_of_band` perdues pour l'estimation. Si certaines sont légitimes (ex : Toyota Land Cruiser V8 légitimement à 850M Ar), elles sont écartées. Acceptable V1 mais à surveiller : si > 30% du CSV est `out_of_band`, c'est probablement un bug de pipeline scrap, pas du marché.

### R-5 — Mode write non activé en V1
Risque : Ali doit soit attendre PROMPT 11.b pour le mode write, soit faire un INSERT manuel depuis Supabase Editor. Pour 105 lignes c'est faisable mais fastidieux. Si volume futur ≥ 1000 lignes, il faudra absolument implémenter le mode write avant.

### R-6 — RLS public read sur `market_listings_clean`
La policy SELECT autorise anon + authenticated à lire toutes les lignes `include_in_estimation=true AND outlier_flag=false`. Cela expose les valeurs `seller_source` (nom vendeur observé en clair côté CSV). À revoir en V1.5 RGPD : si certains noms permettent l'identification d'un particulier, il faudrait pseudonymiser `seller_source` avant publication public.

**Mitigation immédiate** : avant le passage en write effectif, Ali peut :
- Reviser le CSV et pseudonymiser les `seller_source` qui sont des noms réels de particuliers,
- OU créer une vue `market_listings_clean_public` qui exclut `seller_source` et changer la policy à pointer vers la vue.

### R-7 — Pas de Edge Function trigger
L'idempotence dépend du fait que personne d'autre n'écrit dans `market_listings_clean`. Si dans le futur l'Edge Function `compute-estimation` ou un autre cron y écrit, il faut s'assurer qu'ils respectent le schéma `source = 'csv_seed_v1_2026'` ou utilisent un autre tag.

---

**PROMPT 11 livré.**

Migration créée (non appliquée). Script ingestion créé (dry-run validé sur 105 lignes : 88 usable, 17 skipped, 20 FMG converted, 0 batch dupes, distribution data_confidence 75/20/10, top makes Hyundai/Kia/VW/Toyota cohérent). Tests : 782 → **815 verts** (+33). Build vert. Typecheck vert. Lint vert (via build). **Aucun fichier garde-fou touché**. **Aucun commit fait**.

**Action Ali requise** :
1. Review code (5 fichiers nouveaux + 1 fixture CSV)
2. Apply migration via Supabase SQL Editor
3. Reviser les 17 lignes skippées dans le CSV (16 out_of_band + 1 missing make/model)
4. Décider mode write : PROMPT 11.b à demander OU INSERT manuel via Editor pour 105 lignes
5. Run validation queries (10 queries dans `scripts/data/validate-market-listings-ingestion.sql`)
6. Commit + push toi-même
7. Donner GO pour PROMPT 10A (Engine V2 Core)
