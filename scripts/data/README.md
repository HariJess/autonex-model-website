# Pipeline d'ingestion `vehicle_price_reference_profiles`

Pipeline reproductible pour calibrer les profils de prix de référence à partir
de plusieurs sources (FB scrap, formulaires occasions, catalogues
concessionnaires).

## Comment lancer

```bash
# 1. Déposer les CSV sources dans scripts/data/inputs/
#    - fb_extractions_v1.csv
#    - occasions_structured_v1.csv
#    - dealers_v1.csv
#    Pour la vague 2, garder le même nom OU adapter `read*` dans build-reference-profiles.ts.

# 2. Lancer le pipeline (npx récupère tsx à la volée, pas de dépendance ajoutée)
npx tsx scripts/data/build-reference-profiles.ts
# ou via le raccourci npm
npm run build:reference-profiles
```

## Sorties

Tout est écrit dans `scripts/data/output/` (gitignored sauf `INGESTION_REPORT.md`) :

- `INGESTION_REPORT.md` — rapport markdown synthétique (à lire en premier)
- `normalized_dataset.csv` — dataset post-normalisation/filtrage (debug)
- `calibrated_profiles.csv` — profils calibrés avant export SQL (debug)
- `rejected_rows.csv` — chaque ligne rejetée + code + raison
- `unknown_terms.csv` — marques/modèles non reconnus (à enrichir manuellement)
- `unfinishable_profiles.csv` — couples (marque, modèle) qui n'ont pas atteint
  le seuil minimum de qualité (data v1 trop sparse — à reprendre vague 2)

Et dans `supabase/migrations/` :

- `<TS>_extend_reference_profiles_metadata.sql` — ajoute les colonnes meta
  (`data_quality_tier`, `sample_size`, `source_versions`, `updated_at`) et
  l'index unique requis pour le `ON CONFLICT`. Idempotent.
- `<TS>_seed_reference_profiles_v1.sql` — upsert des profils calibrés.
  Préserve les 10 profils existants si non recouverts.

Ali colle les deux migrations dans Supabase Studio → SQL Editor (metadata
d'abord, seed ensuite).

## Idempotence

Le pipeline détecte si les migrations existent déjà (par suffixe) et **réutilise
le timestamp existant** au lieu d'en créer un nouveau. Relancer sur les mêmes
inputs → mêmes fichiers, même contenu.

## Configuration

Tout est piloté par les fichiers JSON dans `scripts/data/config/` :

| Fichier | Contenu |
|---|---|
| `pipeline.config.json` | Coefficients (FB -12%), caps, filtres, seuils tiers |
| `brand_normalizations.json` | Alias marques → marque canonique |
| `model_normalizations.json` | Alias modèles par marque |
| `body_style_normalizations.json` | Alias body type |
| `fuel_normalizations.json` | Alias carburant |
| `transmission_normalizations.json` | Alias transmission |

Pas de modif de code TS nécessaire pour étendre la couverture : ajouter des
alias dans le JSON et relancer.

## Architecture

```
scripts/data/
├── inputs/                          ← CSV déposés par Ali (gitignored)
├── config/*.json                    ← configs paramétrables
├── output/                          ← rapports + debug CSV (gitignored)
├── lib/
│   ├── configs.ts                   ← chargeur JSON typé
│   ├── parse.ts                     ← CSV RFC-4180, parser prix multi-devises
│   ├── normalize.ts                 ← normalisation marque/modèle/body/fuel/trans
│   ├── calibrate.ts                 ← régression log-linéaire log(price)~year
│   ├── validate.ts                  ← attribution tier A/B/C/REJECTED
│   └── generate-sql.ts              ← génération migrations SQL
└── build-reference-profiles.ts      ← entry point (orchestration)
```

Tests sous `src/test/dataPipeline*.test.ts` (≥ 30 cas, run via `npm run test`).

## Extraction LLM (Sprint 2)

Pour passer de ~5 % de rendement (regex) à 30-50 % sur les annonces FB, on
ajoute un étage d'extraction LLM avec **Claude Haiku 4.5** + `tool_use` (output
JSON garanti).

### Pré-requis

```bash
# Copier le fichier d'exemple et y coller la vraie clé Anthropic.
cp .env.local.example .env.local
# Puis éditer ANTHROPIC_API_KEY dans .env.local

# Déposer les CSV scrap FB dans inputs/
#   - fb_scrap_v1_varotra_apr2026.csv      (~6473 lignes)
#   - fb_scrap_v2_coinautomoto_jul2025_apr2026.csv (~5000 lignes)
```

### Lancer le batch

```bash
npm run data:llm-extract
```

Le batch :
1. Charge les 2 CSV FB scrap depuis `scripts/data/inputs/`
2. Dédoublonne par texte trimé (filtre les posts < 30 chars)
3. Pour chaque post unique : check cache disque → sinon appel Claude Haiku
4. Stop dès que le coût cumulé atteint `LLM_BUDGET_USD_MAX` ($5 par défaut)
5. Écrit `scripts/data/output/llm_extractions.csv` (les vrais véhicules
   uniquement — `is_vehicle_listing && !is_buyer_post`)
6. Écrit `scripts/data/output/llm_budget_log.json` (tokens / $$ / erreurs)

### Coût attendu

- ~$0.001 par post (Haiku 4.5, ~330 input + ~80 output tokens / appel)
- ~$5-7 pour les 6064 posts uniques estimés
- Re-run sur le même corpus = $0 grâce au cache disque (`llm_cache.json`)

### Composer avec le pipeline calibration

```bash
# Étape 1 : extraction LLM (1 fois, batch)
npm run data:llm-extract

# Étape 2 : calibration (consomme llm_extractions.csv en plus des autres sources)
npm run data:build-profiles
```

`build-reference-profiles.ts` détecte automatiquement la présence de
`scripts/data/output/llm_extractions.csv` et l'ajoute en source `fb_scrap`
(`source_detail = "fb_scrap_llm"`). Le coefficient FB -12 % et le cap vendeur
s'appliquent donc à ces lignes comme aux autres extractions FB.

### Documentation détaillée

Voir [`docs/llm-pipeline.md`](../../docs/llm-pipeline.md) pour le schéma
tool_use, l'architecture du cache, les coûts par 1000 posts et la procédure
d'ajout de nouveaux groupes FB.

## Vague 2 (à venir)

Pour ingérer plus de data sans toucher au code :

1. Remplacer ou augmenter les CSV dans `scripts/data/inputs/`.
2. Si nouveaux modèles non reconnus, lire `unknown_terms.csv` et enrichir
   `model_normalizations.json` ou `brand_normalizations.json`.
3. Optionnel : ajuster les coefficients dans `pipeline.config.json`
   (ex: réduire `fb_listing_to_transaction` si on observe un écart différent
   entre prix FB et prix réels).
4. Bumper `version` dans `pipeline.config.json` (`v1` → `v2`) — la migration
   sera nommée `_seed_reference_profiles_v2.sql` (idempotente, distincte de v1).
5. Relancer `npm run build:reference-profiles`.

## Limitations vague 1

- Data v1 (493 lignes) trop sparse au niveau modèle pour atteindre l'objectif
  de 60-80 profils calibrés. Résultat actuel : ~38 profils
  (~1 A, ~10 B, ~27 C). Voir `INGESTION_REPORT.md` pour détail par marque.
- BMW génération codes (E30/E36/E90/F30) sont collapsés sur "Serie 3" mais le
  spread de prix reste trop élevé pour calibrer (CV > 0.45). Vague 2 : séparer
  par génération si plus d'observations.
- 1-2 obs FB sans dealer Neuf → REJECTED par construction (cf. spec). Pour
  acquérir ces modèles vague 2, il faut soit obtenir un ancrage prix neuf
  concessionnaire, soit accumuler plus d'observations.
