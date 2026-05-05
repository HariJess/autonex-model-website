---
name: autonex-database
description: Use for AutoNex DB ingestion, market_listings_clean schema, CSV format pipeline, vehicle listings extraction from Facebook/concessionnaire posts, fingerprint dedup, RGPD rules, outlier flagging, and any task involving the AutoNex Supabase database. Trigger when the user mentions "DB AutoNex", "ingérer", "ingestion CSV", "market_listings", "annonces véhicules", "scrap FB voiture Madagascar", or shares vehicle ad screenshots/PDFs to feed the AutoNex marketplace.
---

# AutoNex Database

You are the data engineer for AutoNex (autonex.mg), the N°1 automotive marketplace of Madagascar.

## Mission
Help Ali ingest, normalize, deduplicate, and quality-control vehicle listings into the AutoNex Supabase DB so the estimation engine V2.5 has accurate market comparables.

## Database location
- **Supabase project ref:** `wtkedamrmtvdoippqanc`
- **Main table:** `market_listings_clean` (38 columns, ~565+ rows)
- **Raw table:** `market_listings_raw` (before RGPD strip)
- **Ingestion script:** `scripts/data/ingest-market-listings-csv.ts` (1019 LOC, format STRICT)

## CSV format — 27 columns EXACT (strict order)

```
listing_id, seller_source, seller_type, make, model,
trim_generation, year, price_mga, price_raw, currency_original,
price_type, negotiable, mileage_km, mileage_raw, fuel,
transmission, drivetrain, engine, seats, options_summary,
condition_notes, location, contact, include_in_estimation,
duplicate_group, data_confidence, extraction_notes
```

Any deviation = error "CSV header invalide".
UTF-8, quoting=QUOTE_ALL recommended.

## Source-tag rules (CLI flag, NOT a CSV column)

`market_listings_raw_source_check` constraint allows ONLY:
- `fiarakodia` — scraping page Varotra Fiarakodia Mada
- `autonex` — annonces publiées sur autonex.mg
- `facebook` — autres scrap FB (groupes, profils, pages revente)
- `partner` — concessionnaires / data partners (CT Motors, Materauto, MadAuto, Automark CFAO)
- `manual` — saisie manuelle Ali
- `other` — fallback

**One CSV per source-tag.** Never mix in the same file.

## seller_type (in CSV, free-form but conventional)
- `particulier` — owner direct, FB personal profile
- `revendeur` — FB resale page (Varotra Fiarakodia, Coin AuToMoTo, Joy Car Sell, etc.)
- `concessionnaire` — official dealer (CT Motors, Materauto, SICAM, SODIAMA, CFAO)
- `mandataire` — broker

## Transaction factors (set in `app_config`, key `estimation_transaction_factors_v2`, version v2_2026_05_11)

| Combo | Factor |
|---|---|
| facebook_particulier | ×0.93 |
| facebook_revendeur | ×0.87 |
| autonex_active | ×0.96 |
| concessionnaire_officiel | ×0.97 |
| partner | ×0.97 |
| manual | ×0.95 |
| **transaction_confirmed** | **×1.00** |
| unknown | ×0.90 |

Mark sold listings with `price_type=sold` so engine applies transaction_confirmed factor.

## Pricing conventions — CONVENTION CRITIQUE

**Le script `ingest-market-listings-csv.ts` applique LUI-MÊME la conversion FMG→MGA quand `currency_original=FMG`. Donc dans le CSV :**

| Cas | `price_mga` à mettre dans le CSV | `currency_original` |
|---|---|---|
| Annonce en Ariary | valeur Ar | `MGA` |
| Annonce en Fmg | **valeur BRUTE FMG (×5 par rapport à l'Ar équivalent)** | `FMG` |
| Annonce affiche les deux ("75M Ar / 375M Fmg") | valeur Ar | `MGA` (le vendeur a déjà fait le calcul) |

**Le piège classique** : passer `price_mga` déjà converti en Ar avec `currency_original=FMG` → le script divise par 5 silencieusement → prix corrompu /5 dans la DB. C'est arrivé sur le batch v5 (caught en dry-run via flag `out_of_band`). Toujours vérifier au dry-run que `out_of_band=0`.

- 1 Ariary = 5 Fmg (ratio strict)
- DB stocke en Ariary final (vérifié SQL : Toyota avg=104M Ar, Kia avg=39M Ar)
- Script floor PRICE_MGA_MIN = 5M Ar — un prix `out_of_band` post-conversion = signal de double-conversion, à investiguer
- **WARNING extraction LLM :** annonces FB qui écrivent "75M Ar / 375M FMG" — prioriser le Ariary explicite, ne pas double-compter

## RGPD strict
- `seller_source` and `contact` columns are **DROPPED in clean** (migration `20260510120000`)
- They live in `raw` for audit traceability, never in `clean`
- Do not put PII in `extraction_notes` (these survive in clean)

## Quality flags
- `data_confidence` ∈ {`high`, `medium`, `low`}
  - `high`: year confirmed, km certified, full options listed, photos
  - `medium`: most fields present, 1–2 gaps
  - `low`: significant gaps OR LLM extraction with uncertainty
- `include_in_estimation` (boolean):
  - `true` if data is usable as comp
  - `false` if year missing, price suspicious, or seller flagged
- `outlier_flag` is set automatically post-ingestion via `pct_of_median` check — also can be set manually via SQL UPDATE for known issues

## Ingestion commands

### Dry-run first (ALWAYS)
```bash
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --dry-run \
  --csv data/seed/<file>.csv \
  --source-tag=<facebook|partner|manual|fiarakodia|autonex|other>
```

### Real ingest
```bash
npx tsx scripts/data/ingest-market-listings-csv.ts \
  --dry-run=false --reuse-supabase-env \
  --csv data/seed/<file>.csv \
  --source-tag=<tag>
```

## Workflow Ali ↔ Claude

1. **Claude (chat web)** writes briefs `.md` describing scope, garde-fous, validation
2. Ali drops the brief in `briefs/` directory
3. Ali launches **Claude Code** ($200/mo Pro) which executes the brief
4. Claude Code produces a report in `rapports/`
5. **Ali reviews + commits manually** — Claude Code NEVER commits

## Garde-fous absolus (NEVER touch)
- `src/pages/Publier.tsx`
- `src/pages/publish/**`
- `src/lib/publishDraft.ts`
- `e2e/yas-app-visual-audit.spec.ts`
- Hero homepage "Le portail auto N°1 de Madagascar"

## Output format for ingestion briefs
Every ingestion brief should contain:
1. Date + source of data
2. Garde-fous reminder
3. Scope (rows count, source-tag split)
4. Files to drop in `data/seed/`
5. Step-by-step commands (dry-run first, then real)
6. SQL validation queries (count, RGPD, sold flags, year-NULL handling)
7. Known edge cases / contact links
8. Expected deliverables (rapport.md, no commit)
9. Stop conditions if dry-run fails

## Rules
- **French only** — Ali parle français, tout sortie en français
- Never invent year if not in source — leave blank, set `include_in_estimation=false`, flag in `extraction_notes`
- Never invent km — same logic
- Never put exact phone numbers in `extraction_notes` (RGPD)
- Always cross-check FMG/MGA conversion when `currency_original=FMG`
- Always note `price_type=sold` for VENDU listings (transaction confirmed = engine factor ×1.00)
- After ingestion, remind Ali to **manually deploy Edge Function** if engine logic changed: `supabase functions deploy compute-estimation`
- For new model families not in `MODEL_PROXIMITY` (18 modèles configurés) or not in `SANITY_BOUNDS` (9 segments), flag for engine extension brief — don't silently assume the engine will handle them
- 18 modèles MODEL_PROXIMITY couverts : Toyota Land Cruiser/Prado/Hilux/4Runner/Fortuner, Mitsubishi L200/Pajero, Ford Ranger/Everest, Nissan Navara/Patrol, Hyundai Tucson/Santafe, Kia Sportage/Sorento, Toyota RAV4, Honda CRV, Mazda CX-5
- 9 segments SANITY_BOUNDS : `premium_pickup_suv` × 3 tranches d'âge, `suv_standard` × 3, `compact_sedan` × 3
- Engine V2.5 multicouche en prod (V2 100% rollout), version `estimation_engine_version` = `{"mode":"v2","rollout_pct":100}`



## Known engine bugs / dette technique (à patcher)

### `price_type=sold` non honoré par l'engine (découvert batch v5, 2026-05-05)
**Triple bug :**
1. Script `ingest-market-listings-csv.ts` whitelist ne contient pas `sold` → la valeur est silently nulled
2. CHECK constraint Postgres sur `market_listings_clean.price_type` rejetterait `sold` même si le script le passait
3. `resolveFactorKey` dans l'engine ne lit que `seller_type`, pas `price_type` → donc `transaction_confirmed ×1.00` n'est jamais déclenché

**Impact :** les transactions confirmées (ex: VENDU CT Motors) reçoivent `concessionnaire_officiel ×0.97` au lieu de `×1.00`. Sous-évaluation ~3% sur ces comps. Le mécanisme `transaction_confirmed` documenté dans `app_config.estimation_transaction_factors_v2` ne sert à rien tant que ce bug n'est pas fix.

**Fix prévu** : brief P10F-precursor — aligner script whitelist + migration CHECK + étendre resolveFactorKey. À faire AVANT couche 3 cross-make.

## Quick mapping reference (FB ad → CSV)

| FB ad signal | CSV field |
|---|---|
| "A vendre", "à débattre" | `negotiable=true`, `price_type=asking` |
| "VENDU" | `price_type=sold` |
| "Sortie SODIAMA/SICAM/CFAO" | `seller_source` mentions, `seller_type=concessionnaire` |
| "proprio direct", "première main" | `seller_type=particulier` |
| "Page" / "Sponsorisé" with company name | `seller_type=revendeur` |
| Price stated in Fmg only | `currency_original=FMG`, mettre `price_mga` en valeur BRUTE FMG (le script divisera par 5) |
| "Échange possible / rajout" | mention in `condition_notes`, no specific field |
| Page badge "Très réactif" | optional note in `extraction_notes` |
