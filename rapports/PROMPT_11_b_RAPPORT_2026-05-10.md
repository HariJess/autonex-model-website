# PROMPT 11.b — RGPD strip + Mode write effectif

**Date** : 2026-05-10
**Brief** : `briefs/PROMPT_11b_RGPD_WRITE_MODE.md`
**Phase** : Hotfix RGPD post-PROMPT 11 + activation mode write
**Status** : ✅ DONE (ready for Ali apply migrations + run write)

---

## 1. Résumé exécutif

PROMPT 11 a livré le pipeline d'ingestion CSV → `market_listings_clean` mais en **dry-run uniquement**. La review post-livraison a identifié 2 axes :

1. **RGPD** : le CSV contient un champ `seller_source` qui contient des **noms personnels en clair** (ex: "Akbaraly Akbaraly", "Stevy Marcus"). Cette colonne ne doit JAMAIS atterrir dans `market_listings_clean` (table à RLS public-readable). Audit confirmant : la colonne n'a jamais existé dans le schéma `market_listings_clean` (foundation `20260417160000` ne l'a pas créée), mais le risque de régression future est réel — il faut une protection à 4 niveaux (schema + helper TS + tests + migration corrective idempotente).
2. **Write mode** : activer l'INSERT effectif vers Supabase quand `--dry-run=false` est passé, avec idempotence stricte (pré-check fingerprint + UNIQUE constraint backstop), retry exponential backoff sur 503, gestion d'erreurs best-effort.

Les deux axes ont été livrés en respectant TOUS les garde-fous du brief :
- ❌ Aucune modification de `engine.ts`, `api.ts`, `repository.ts`, `referenceProfiles.ts`, `presentation.ts`, `EstimationResultReport.tsx`, `Publier.tsx`, `publishDraft.ts`, `e2e/yas-app-visual-audit.spec.ts`, hero baseline.
- ❌ Aucun `git add` / `git commit` / `git push` automatique.
- ❌ Aucune migration appliquée en prod (Ali doit valider et apply).
- ❌ Aucune nouvelle dépendance NPM.
- ❌ Aucun `seller_source` dans le `cleanPayload`.
- ❌ Aucun log de `SUPABASE_SERVICE_ROLE_KEY`.
- ✅ Aucun INSERT sans fingerprint pre-check (sauf `--force` explicite, et même là la couche 2 protège via UNIQUE 23505).

---

## 2. Livrables

### Fichiers créés

| Fichier | LOC | Rôle |
|---|---|---|
| `supabase/migrations/20260510120000_market_listings_clean_rgpd_strip_seller_source.sql` | 47 | Migration corrective RGPD : `DROP COLUMN IF EXISTS seller_source` (no-op préventif) + COMMENT documentation + DO block assertion |
| `src/test/ingestMarketListingsCsvWriteMode.test.ts` | 351 | Suite de 13 tests : RGPD enforcement (4) + write mode mocked supabase (8) + fingerprint pre-check (1) |

### Fichiers modifiés

| Fichier | Δ LOC | Rôle |
|---|---|---|
| `scripts/data/ingest-market-listings-csv.ts` | 508 → 1019 (+511) | Ajout helpers `buildRawPayload` / `buildCleanInsertPayload` / `initSupabaseServiceClient` / `fetchExistingFingerprints` / `insertWithRetry` / `insertMarketListingsBatch` ; refacto parser CLI (support `--key=value`, default `dry-run=true` safe) ; orchestration write dans `main()` |
| `docs/DATA_INGESTION_MARKET_LISTINGS.md` | sections 3 / 5 / 9 / 10 mises à jour | Documentation mode write effectif, RGPD strict, rollback, suppression de la limitation "mode write différé" |

### Garde-fous vérifiés

```
$ git status --short -- src/lib/estimation/engine.ts \
    src/lib/estimation/api.ts src/lib/estimation/repository.ts \
    src/lib/estimation/referenceProfiles.ts \
    src/lib/estimation/presentation.ts \
    'src/components/estimation/**/*.tsx' \
    src/pages/Publier.tsx src/lib/publish/publishDraft.ts e2e/
EXIT=0  (output vide = aucun fichier touché)
```

---

## 3. RGPD — Stratégie de défense en profondeur

Le `seller_source` (texte libre type "Akbaraly Akbaraly") est **bloqué à 4 niveaux** :

### Niveau 1 : Schema DB (migration corrective)

`supabase/migrations/20260510120000_market_listings_clean_rgpd_strip_seller_source.sql` :

```sql
ALTER TABLE public.market_listings_clean DROP COLUMN IF EXISTS seller_source;

COMMENT ON TABLE public.market_listings_clean IS
  'Comparables normalisés pour estimation V2. RGPD : ne contient AUCUN identifiant personnel...';

DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='market_listings_clean'
      AND column_name='seller_source'
  ) THEN
    RAISE EXCEPTION 'RGPD violation: seller_source column still present in market_listings_clean';
  END IF;
END $;
```

**Idempotence** : `DROP COLUMN IF EXISTS` = no-op si la colonne n'existe pas (cas actuel). Le DO block assertion garantit qu'au déploiement, la colonne est confirmée absente.

### Niveau 2 : Helper TS source-of-truth

`buildCleanInsertPayload(row: NormalizedRow)` construit explicitement la liste blanche des 27 champs de `market_listings_clean` :

```ts
return {
  source: row.source,
  source_listing_id: row.sourceListingId,
  fingerprint: row.fingerprint,
  // PII-stripped : seller_type catégorie OK, mais seller_source/contact volontairement absents
  seller_type: row.sellerType,
  normalized_make: row.normalizedMake,
  // ... (24 autres champs)
};
// PAS de spread `...row` — chaque champ est explicitement listé.
```

### Niveau 3 : Tests automatisés

`src/test/ingestMarketListingsCsvWriteMode.test.ts` :

| Test ID | Assertion |
|---|---|
| T-RGPD-1 | `expect(buildCleanInsertPayload(row)).not.toHaveProperty('seller_source')` sur les 10 fixtures |
| T-RGPD-2 | `expect(buildRawPayload(...)).toHaveProperty('seller_source', 'Akbaraly Akbaraly')` (raw conserve) |
| T-RGPD-3 | Roundtrip 10 fixtures → JSON.stringify ne contient JAMAIS "Test Seller" en clean |
| T-W-3 | Mock supabase : tous les `insert clean` capturés → `not.toHaveProperty('seller_source')` |

### Niveau 4 : Visual check à chaque run

Le dry-run (et write mode) affiche systématiquement :

```
[ingest] Sample cleanPayload keys (first row) : 27 keys
[ingest] RGPD : seller_source present in clean ? ✅ NO (OK)
```

Si un jour `❌ YES (BUG)` apparaît, c'est un signal immédiat avant tout INSERT.

---

## 4. Mode write effectif — Architecture

### CLI flags (parser refactoré)

Default safer : `--dry-run=true` par défaut. Pour écrire en DB : `--dry-run=false` explicite.

| Flag | Format | Default |
|---|---|---|
| `--in=<path>` ou `--csv <path>` | path | `data/seed/market_listings_v1_2026.csv` |
| `--source=<tag>` ou `--source-tag <tag>` | string | `csv_seed_v1_2026` |
| `--dry-run=true\|false` ou `--dry-run` | bool | `true` |
| `--batch-size=<n>` | int | `50` |
| `--force=true\|false` | bool | `false` |

### Flow write mode

```
main()
  ↓
parseArgv() → opts
  ↓
read CSV → parse → normalize → stats (RGPD visual check)
  ↓
opts.dryRun ? return 0 : continue write block
  ↓
initSupabaseServiceClient()  ← lit .env.local (parsing manuel, no dotenv dep)
  ↓
chunk(normalized, batchSize)
  ↓
for each batch:
  insertMarketListingsBatch(supabase, batch, { force })
    ├─ fetchExistingFingerprints(supabase, sourceTag)  ← Set<string>
    │
    └─ for each row:
       ├─ if (!force && existingSet.has(fp)) → alreadyInDb++
       │
       ├─ insertWithRetry(() => supabase.from('market_listings_raw').insert(rawPayload).select('id').single())
       │   ├─ retry 3x sur 503/timeout/PGRST503/ECONNRESET (exponential 1s/2s/4s)
       │   └─ on UNIQUE violation 23505 → alreadyInDb++ (skip silently)
       │
       └─ insertWithRetry(() => supabase.from('market_listings_clean').insert({...cleanPayload, raw_listing_id: rawId}).select('id').single())
           ├─ retry 3x sur 503
           ├─ on UNIQUE 23505 → alreadyInDb++ (skip)
           └─ on autre erreur → stats.errors.push({rowId, reason})
  ↓
log batch progress (inserted / skipped / errors / timing)
  ↓
final aggregated report
```

### Idempotence à 2 couches

1. **Pré-check fingerprint** (TS, avant INSERT) : skip silencieux si déjà en DB. Optimise les ré-runs.
2. **UNIQUE constraint 23505** (SQL backstop) : si race entre pré-check et insert, ou `--force` bypass, le `unique(source, fingerprint)` côté DB rattrape. `code === '23505'` → silent skip.

### Erreur handling

- **Erreur transitoire** (503, timeout, ECONNRESET) → retry 3x exponential backoff (max ~7s par row).
- **Erreur fatale** (autre code) → `stats.errors.push()`, le batch continue (best-effort, ne bloque pas les autres rows).
- **Init env manquant** → exit code 4 + message clair "`Mode write requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local`".
- **Duplicate UNIQUE** → silent skip + `alreadyInDb++` (pas dans `errors`).

---

## 5. Tests — Couverture

### Suite existante (PROMPT 11) : 33 tests inchangés

`src/test/ingestMarketListingsCsv.test.ts` — 33/33 green. Aucune régression.

### Nouvelle suite (PROMPT 11.b) : 13 tests

`src/test/ingestMarketListingsCsvWriteMode.test.ts` — 13/13 green.

| ID | Description | Status |
|---|---|---|
| T-RGPD-1 | `cleanPayload` n'a JAMAIS la clé `seller_source` (10 fixtures) | ✅ |
| T-RGPD-2 | `rawPayload` contient `seller_source` + `contact_hash`, PAS de `contact` clear | ✅ |
| T-RGPD-3 | Roundtrip 10 fixtures → aucun "Test Seller" dans JSON.stringify(clean) | ✅ |
| `buildRawPayload` structure | `contact_hash` présent + `_pipeline_version` correct | ✅ |
| T-W-1 | Mock supabase : insert raw appelé avec `{source, source_listing_id, payload, scraped_at}` | ✅ |
| T-W-2 | insert clean reçoit `raw_listing_id` du retour insert raw (chaining OK) | ✅ |
| T-W-3 | insert clean payload **JAMAIS** `seller_source` (mock spy assertion) | ✅ |
| T-W-4 | Pré-check fingerprint existant → skip insert, `alreadyInDb=2`, 0 raw insert | ✅ |
| T-W-5 | Erreur 503 sur 1er insert → retry, succès au 2ème, elapsed ≥ 1000ms | ✅ |
| T-W-6 | Erreur fatale (`permission denied` 42501) → captured in `errors`, batch continue | ✅ |
| T-W-9 | `--force=true` ignore le pré-check, tente l'insert sur fingerprints existants | ✅ |
| T-W-conflict | Duplicate UNIQUE 23505 → silent skip (`alreadyInDb=1`, 0 errors) | ✅ |
| `fetchExistingFingerprints` | Retourne `Set<string>` correct pour le source_tag | ✅ |

**Total tests projet** : 815 → 828 (+13). Tous green.

### Approche mock

- `vi.fn()` sur Supabase chain `.from(table).select().eq()` et `.from(table).insert(row).select().single()`.
- Spies `rawInsertSpy` / `cleanInsertSpy` pour capturer les payloads.
- Pas besoin de connexion DB réelle — tests rapides (1.0s pour les 13).
- Variant `rawSequence` pour scénarios séquentiels (1ère erreur 503, succès 2ème).

---

## 6. Validation — Re-dry-run (non-régression)

```
$ npx tsx scripts/data/ingest-market-listings-csv.ts \
    --in=data/seed/market_listings_v1_2026.csv \
    --source=csv_seed_v1_2026 \
    --dry-run=true

[ingest] === Statistics ===
[ingest] Total CSV rows parsed     : 105
[ingest] include_in_estimation=true : 88
[ingest] include_in_estimation=false: 17
[ingest] FMG converted              : 20
[ingest] Price out_of_band          : 16
[ingest] Duplicates within batch    : 0
[ingest] data_confidence breakdown  : {"medium":20,"high":75,"low":10}
[ingest] Top 10 makes               :
  - Hyundai: 16, Kia: 14, Volkswagen: 12, Toyota: 8, Nissan: 7, ...

[ingest] Sample cleanPayload keys (first row) : 27 keys
[ingest] RGPD : seller_source present in clean ? ✅ NO (OK)

[ingest] --dry-run : aucune écriture DB. Sortie OK.
EXITCODE=0
```

**Stats identiques au baseline PROMPT 11** : 88 usable / 17 skipped / 20 FMG / 0 dupes intra-batch. Aucune régression de normalisation.

**RGPD visual check** : ✅ NO (OK) sur la première ligne sample.

---

## 7. Validation — Suite globale

```
$ npx tsc --noEmit                              EXITCODE=0  ✅
$ npm run test                                  828/828 ✅ (was 815)
$ npm run build                                 ✅ built in 14.54s, 14 prerender shells
```

Bundle inchangé : pas de nouveau chunk, charts toujours isolé (382KB / 105KB gzip), index 583KB / 178KB gzip.

---

## 8. Migrations à appliquer (par Ali)

⚠️ **2 migrations en attente d'apply prod** :

1. `supabase/migrations/20260509120000_market_listings_clean_extension.sql` (PROMPT 11) — extension du schéma avec 11 colonnes + index composite + UNIQUE constraint
2. `supabase/migrations/20260510120000_market_listings_clean_rgpd_strip_seller_source.sql` (PROMPT 11.b) — DROP COLUMN IF EXISTS + COMMENT + assertion

**Ordre d'apply** : 20260509 puis 20260510. Les deux sont idempotentes et non-destructives (`IF NOT EXISTS`, `DROP COLUMN IF EXISTS` sur colonne inexistante = no-op).

**Selon CLAUDE.md (DB Migration Policy v2)** : ce sont des migrations non-destructives — Claude Code peut les appliquer automatiquement. Mais comme P11.b dépend de P11 et qu'Ali doit avoir vu le rapport P11 avant, je laisse Ali appliquer manuellement, OU je peux le faire si confirmé.

### Smoke tests post-apply suggérés

```sql
-- 1. Vérif extension P11
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='market_listings_clean'
ORDER BY column_name;
-- Attendu : 30+ colonnes incl. price_type, negotiable, drivetrain, engine_text, seats,
-- options_summary, condition_notes, include_in_estimation, data_confidence,
-- extraction_notes, duplicate_group, raw_listing_id, fingerprint

-- 2. Vérif RGPD P11.b
SELECT count(*) FROM information_schema.columns
WHERE table_schema='public' AND table_name='market_listings_clean'
  AND column_name='seller_source';
-- Attendu : 0

-- 3. UNIQUE constraint
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.market_listings_clean'::regclass
  AND contype = 'u';
-- Attendu : market_listings_clean_source_fingerprint_unique (ou nom équivalent)
```

---

## 9. Run write effectif — Procédure pour Ali

Une fois les 2 migrations appliquées :

```bash
# 1. .env.local doit avoir SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
# (ne JAMAIS commit ces clés)

# 2. Run write mode
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --in=data/seed/market_listings_v1_2026.csv \
  --source=csv_seed_v1_2026 \
  --batch-size=50 \
  --dry-run=false

# Output attendu :
# [ingest] === Statistics ===   ... (mêmes stats que dry-run)
# [ingest] === Mode WRITE ===
# [ingest] Init Supabase service-role client...
# [ingest] Batches préparés : 3 (taille 50)
# [ingest] Batch 1/3 : ~50 inserted, 0 skipped (already in DB), 0 errors in ~5-15s
# [ingest] Batch 2/3 : ...
# [ingest] Batch 3/3 : ...
# [ingest] === Ingestion mode WRITE complete ===
# [ingest] Total CSV rows                : 105
# [ingest] Already in DB (skipped)        : 0  (premier run)
# [ingest] Newly inserted (raw + clean)   : 88  (rows include_in_estimation=true)
# [ingest] include_in_estimation=false    : 17

# 3. Validation post-ingestion
# Run scripts/data/validate-market-listings-ingestion.sql dans Supabase SQL Editor
# - Query #1 : total ≈ 88 usable, outliers 0-15
# - Query #6 : 0 leaks PII clean
# - Query #9 : 0 leaks PII raw

# 4. Idempotence — re-run = no-op
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --in=data/seed/market_listings_v1_2026.csv \
  --source=csv_seed_v1_2026 \
  --dry-run=false
# Attendu : Already in DB (skipped) : 88, Newly inserted : 0
```

---

## 10. Rollback (si besoin)

```sql
BEGIN;
DELETE FROM public.market_listings_raw WHERE source = 'csv_seed_v1_2026';
-- CASCADE supprime market_listings_clean rows liées
SELECT count(*) FROM public.market_listings_clean WHERE source = 'csv_seed_v1_2026';
-- Expected : 0
COMMIT;
```

Pour rollback la migration RGPD elle-même : aucun rollback nécessaire car `DROP COLUMN IF EXISTS` sur colonne qui n'existe pas est un no-op. La migration est purement préventive.

---

## 11. Prochaines étapes

| Étape | Owner | Status |
|---|---|---|
| Apply migration `20260509120000_market_listings_clean_extension.sql` | Ali | ⏳ |
| Apply migration `20260510120000_market_listings_clean_rgpd_strip_seller_source.sql` | Ali | ⏳ |
| Run write mode `--dry-run=false` (105 rows) | Ali | ⏳ |
| Run `scripts/data/validate-market-listings-ingestion.sql` (10 queries) | Ali | ⏳ |
| Régénérer types DB (`supabase gen types`) | Ali | ⏳ |
| Commit P11 + P11.b artifacts (à proposer après validation Ali) | Claude Code | ⏳ |
| **PROMPT 10A** : brancher `engine.ts` sur `market_listings_clean` | Phase suivante | ⏳ |
| **PROMPT 10B** : UI estimation tirée de market_listings_clean | Phase suivante | ⏳ |

---

**Auteur** : Claude Code (Opus 4.7 1M)
**Référence brief** : `briefs/PROMPT_11b_RGPD_WRITE_MODE.md`
**Référence rapport amont** : `rapports/PROMPT_11_RAPPORT_2026-05-09.md`
