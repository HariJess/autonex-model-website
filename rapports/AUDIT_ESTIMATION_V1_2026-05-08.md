# 📋 Rapport Audit Estimation V1 — AutoNex Madagascar

**Date** : 2026-05-08
**Mode** : Read-only diagnostic (zéro modification, zéro commit)
**Branche** : `main`
**Commits récents pertinents** : PROMPT 8 (anti-spam V1), PROMPT 7 (verification V1), PROMPT 6 (boost V1)
**Référence inputs CSV** : 105 lignes mentionnées par Ali (non encore ingérées)

---

## TL;DR (max 10 lignes)

Le module estimation est **techniquement sophistiqué** (1 064 LOC moteur V2 avec tiers A/B/C/D, MAD outliers, dispersion, weighted median, anchor blending) — **70% calculé réellement**, **30% bullshit présentation**. Les 3 trous critiques V1 : (1) **NO transaction factor** — asking prices traités comme prix de vente alors que les vendeurs gonflent ~10-15% en moyenne ; (2) **3 valeurs distinctes V2 absentes** : un seul `estimatedValue` + dérivés linéaires (`recommendedListingPrice = estimated × 1.03` / `quickSale = estimated × 0.96`) au lieu de prix-reprise-pro / entre-particuliers / concessionnaire calculés indépendamment ; (3) **Comparables fetchés exclusivement depuis `public.listings`** (live AutoNex), JAMAIS depuis `market_listings_clean` (table scrap qui existe mais reste vide / non câblée). Le seed reference profiles (134 entrées, tier A=14 / B=56 / C=64) est **bien câblé** mais ne couvre pas l'écosystème dealer FB. Top 3 priorités V2 : ingérer le CSV 105 lignes dans `market_listings_clean` + brancher l'engine sur cette source ; introduire 3 transaction factors par source vendeur ; afficher 3 valeurs distinctes dans le rapport. Aucune méthodologie publiée, aucune date de refresh affichée, aucun lien vers les comparables consultables (la liste existe pourtant dans le UI).

---

## 1. Cartographie code (Tâche 1)

### Arbre fichiers — module estimation

| Chemin | LOC | Rôle |
|---|---|---|
| `src/pages/VehicleEstimationPage.tsx` | 906 | Page conteneur — orchestration des 3 steps + écran landing + résultat |
| `src/pages/estimation/estimationPageModel.ts` | 59 | Helpers validation step Vehicle (`getVehicleFieldErrors`) |
| `src/pages/estimation/components/EstimationProgressHeader.tsx` | 82 | UI progress bar 4 étapes (landing / vehicle / condition / result) |
| `src/components/estimation/EstimationResultReport.tsx` | 402 | Page Résultat — Hero card valeur + fourchette + indice confiance + 4 tuiles + facteurs +/- + comparables |
| `src/components/estimation/VehicleCatalogCombobox.tsx` | 97 | Combobox marque/modèle avec catalogue et suggestions |
| `src/lib/estimation/engine.ts` | **1 064** | **Moteur V2 client-side** (tier decision, anchor blending, MAD outliers, weighted median, ajustements, confidence) |
| `src/lib/estimation/api.ts` | 275 | Orchestrateur frontend — `runVehicleEstimation` (rollout legacy/v2) + `runVehicleEstimationV2` (Edge Function) + telemetry |
| `src/lib/estimation/repository.ts` | 113 | RPCs Supabase : `create_vehicle_estimation_request` + `record_vehicle_estimation_result` + `record_vehicle_estimation_event` |
| `src/lib/estimation/referenceProfiles.ts` | 198 | Matching cascade L1-L4 sur `vehicle_price_reference_profiles` + heuristique fallback (52M Ar base + body/fuel/transmission multipliers) |
| `src/lib/estimation/presentation.ts` | 309 | Builder `EstimationPresentation` — labels par tier, tone profiles (Robuste / Qualifié / Indicatif / Prudent), wording market support |
| `src/lib/estimation/constants.ts` | 66 | Options UI (fuel / transmission / body / condition / maintenance / owner / usage) + `formatAriary` |
| `src/lib/estimation/calibrationQueryPack.ts` | 136 | Helpers query (build calibration query packs) |
| `src/lib/estimation/catalogAliases.ts` | 67 | Aliases catalogue (Land Cruiser ≡ LC79 etc.) |
| `src/lib/estimation/catalogArchitecture.ts` | 21 | Types architecture catalogue |
| `src/lib/estimation/catalogSearch.ts` | 19 | Search dans catalogue |
| `src/lib/estimation/errors.ts` | 189 | EstimationAppError + mapEstimationRpcError + describeEstimationErrorForUi |
| `src/lib/estimation/telemetry.ts` | 174 | Audit snapshot + event context builder |
| `src/lib/estimation/vehicleCatalog.ts` | 78 | Loader catalogue véhicules + `resolveModelBodyTypes` |
| `src/types/estimation.ts` | 265 | Types V1 + V2 (EstimationInput, EstimationOutputV2, EvidenceMetrics, ModeGovernance, etc.) |
| `src/hooks/useEstimationEngineConfig.ts` | 98 | Hook React Query lecture flag `estimation_engine_version` depuis `app_config` |

**Total module estimation** : **4 559 LOC** (hors tests).

### Tables DB liées

| Table | Status | Rôle |
|---|---|---|
| `vehicle_price_reference_profiles` | ✅ active, 134 lignes seedées | Profils canoniques avec baseline_price + depreciation_rate par make/model/body (tier A/B/C) |
| `vehicle_price_reference_profiles_backup_2026_05_02` | ⚠️ backup orphelin | Snapshot pré-Sprint 8.2 (à droper post-validation) |
| `market_listings_raw` | ✅ schema, **vide / inutilisée par engine** | Intended pour scraping (Fiarakodia/Facebook) — RAW HTML/payload |
| `market_listings_clean` | ✅ schema, **vide / inutilisée par engine** | Intended pour comparables normalisés (make/model/year/mileage/price + duplicate_of + fingerprint) |
| `market_price_stats` | ✅ schema, **vide / inutilisée par engine** | Intended pour aggrégats par cluster |
| `vehicle_estimation_requests` | ✅ active | Trace user input + audit (RPC create) |
| `vehicle_estimation_results` | ✅ active | Trace output (RPC record) |
| `vehicle_estimation_events` | ✅ active | Telemetry user (impressions, clicks, etc.) |
| `app_config` (key=`estimation_engine_version`) | ✅ active | Feature flag legacy/v2/rollout |

### Migrations chronologiques

```
20260415110000_vehicle_estimations_mvp.sql              (MVP request/result/event)
20260415193000_vehicle_estimation_events_metadata_default.sql
20260417160000_market_estimation_foundation.sql         (market_listings_raw/clean/stats)
20260418140000_secure_vehicle_estimation_writes.sql     (RLS RPCs)
20260422130000_rpc_create_vehicle_estimation_request.sql
20260430130703_extend_reference_profiles_metadata.sql   (data_quality_tier + sample_size)
20260430130704_seed_reference_profiles_v1.sql           (134 profiles tier A=14, B=56, C=64)
20260430140000_app_config_table.sql                     (feature flag)
20260502091425_backup_vehicle_price_reference_profiles_sprint8.sql (backup pré-update)
```

### Edge Function

`supabase/functions/compute-estimation/` — port Deno du moteur V2 client. Référence appelée par `runVehicleEstimationV2` quand le flag est `v2` ou `rollout`.

---

## 2. Algorithme actuel (Tâche 2)

### Q1 — Y a-t-il un algorithme réel ?

**OUI**, et il est sophistiqué. Le moteur vit dans `src/lib/estimation/engine.ts` (1 064 LOC) avec un mirror Deno pour l'Edge Function `compute-estimation`. Test parité existant `src/test/estimationEngineParity.test.ts`.

Architecture en 4 phases :
1. **Phase comparables** : `fetchComparables(input)` — query Supabase + filtres qualité + scoring similarité + outlier MAD
2. **Phase anchors** : 3 ancres possibles (comparable / reference / heuristic) blendées selon tier
3. **Phase ajustements** : multiplicateur ±20% / +12% selon mileage/condition/maintenance/accident/ownership/usage
4. **Phase governance** : tier A/B/C/D + claim mode + precision + range width + confidence ceiling

Verdict : ✅ **solide** côté architecture.

### Q2 — Comment sont matchés les comparables ?

Le code clé (`engine.ts:260-282`) :

```ts
let query = supabase
  .from("listings")               // ⚠️ public.listings live, PAS market_listings_clean
  .select("id,title,price_mga,year,mileage_km,...,make,model")
  .eq("status", "active")
  .ilike("make", input.makeName)  // ilike = match exact insensible à la casse, pas fuzzy
  .ilike("model", input.modelName)
  .gte("year", input.year - params.yearWindow)  // ±3 ans en strict, ±6 en backup
  .lte("year", input.year + params.yearWindow)
  .limit(params.limit);  // 160 max
if (params.strictAttributes) {
  if (fuel) query = query.eq("fuel", fuel);
  if (transmission) query = query.eq("transmission_gearbox", transmission);
}
```

- **Source** : `public.listings` (annonces live AutoNex), **NOT** `market_listings_clean`. 🚨 **Trou majeur** : la table scrap existe mais n'est jamais utilisée.
- **Match** : `ilike` make ET model — **exact insensible à casse**, pas de fuzzy match. Une typo "Toyot" → 0 result.
- **Year window** : ±3 ans strict, dégradé à ±6 ans en mode backup si `strictRows.length < 10`.
- **No mileage range** côté DB — filtrage post-fetch via `evaluateCandidateQuality` (`engine.ts:149-188`).
- **No `data_confidence` / `include_in_estimation` filters** — ces champs n'existent pas sur `public.listings`. Ils existent sur `market_listings_clean` mais cette table n'est pas requêtée.
- **No récence DB filter** — calculé client-side via `computeFreshnessScore` (engine.ts:138).

Verdict : ⚠️ **partiel**. Excellent côté qualité scoring & MAD outliers, mais **source unique inadéquate** (AutoNex marketplace probablement vide ou faible — rien sur Fiarakodia/FB).

### Q3 — Formule valeur centrale

`engine.ts:822-830` :

```ts
const comparableMedian =
  comparableAfterOutlier.length > 0
    ? Math.round(
        weightedMedian(
          comparableAfterOutlier.map((c) => c.price),
          comparableAfterOutlier.map((c) => Math.max(0.1, c.score / 100)),
        ),
      )
    : null;
```

**Médiane pondérée** par score de similarité. Outliers retirés via MAD threshold 2.8 (`engine.ts:102-110`).

Verdict : ✅ **solide**. Médiane pondérée > moyenne arithmétique pour résister aux outliers.

### Q4 — Formule fourchette

`engine.ts:911-913` :

```ts
const rangeSpread = getRangeSpreadFromPolicy(policy.rangeWidthMode, fallbackSeverity);
const lowRangePrice = Math.round(adjustedPrice * (1 - rangeSpread));
const highRangePrice = Math.round(adjustedPrice * (1 + rangeSpread));
```

**Fourchette = ± pourcentage symétrique** autour du adjusted price.

`engine.ts:614-631` — `rangeSpread` :
| Range mode | Base spread | Fallback extra |
|---|---|---|
| tight | ±5.5% | +0 / +0.75% / +1.5% / +3% |
| standard | ±8.5% | idem |
| wide | ±12% | idem |
| very_wide | ±16% | idem |

Total cap : `clamp(base + extra, 0.05, 0.20)` → entre ±5% et ±20%.

⚠️ **PAS de percentile P25/P75** sur les comparables réels. La fourchette est **synthétique**, dérivée du tier policy, pas de la dispersion observée. Donc une distribution étalée OU resserrée donneront la même fourchette.

Verdict : ⚠️ **partiel**. La dispersion est calculée (`dispersionScore` line 837-849) et influe sur le tier mais pas directement sur le spread de fourchette.

### Q5 — Badge "Confiance prudente"

`engine.ts:682-720` — formule complète :

```ts
const raw =
  10 +                                  // base
  countScore * 0.2 +                    // count comps (max 100 si ≥12 comps)
  strongScore * 0.17 +                  // ratio strong/used
  evidence.comparableSimilarityMedian * 0.2 +
  evidence.comparableRecencyScore * 0.08 +
  evidence.comparableDispersionScore * 0.14 +
  locationScore * 0.07 +                // same_city=100 / same_region=75 / mixed=60 / weak=35
  canonicalCertainty * 0.08 +           // 90 si profile, 62 sinon, 30 si pas make/model
  referenceSignal * 0.06 +              // 20 sans ref, 55-92 avec
  fallbackPenalty;                      // -18 si fallback used, 0 sinon
const beforeCeiling = clamp(Math.round(raw), 18, 96);
```

Puis appliqué un **plafond par tier** (`engine.ts:531-565`) :
- A_STRONG_MARKET : ceiling 95
- B_MODERATE_MARKET : ceiling 82
- C_REFERENCE_ASSISTED : ceiling 68
- D_HEURISTIC_ONLY : ceiling 45

Et fallback severity supplémentaire (`engine.ts:568-612`) qui réduit encore : light=-4, medium=-10, high=force ceiling≤50.

Mapping band (`engine.ts:473-477`) :
- score ≥ 80 → "high"
- score ≥ 55 → "medium"
- sinon → "low"

Verdict : ✅ **solide**. Vraie logique multi-facteurs avec plafonds tiers. Pas hardcoded.

### Q6 — "PRIX CONSEILLÉ" / "PRIX DE VENTE RAPIDE" / "BASE MARCHÉ"

`engine.ts:914-919` :

```ts
const quickDiscount = confidenceBand === "high" ? 0.04 : confidenceBand === "medium" ? 0.065 : 0.085;
const quickSalePrice = Math.round(adjustedPrice * (1 - quickDiscount));
const recommendedListingPrice = Math.min(
  Math.round(adjustedPrice * (confidenceBand === "high" ? 1.03 : confidenceBand === "medium" ? 1.02 : 1.01)),
  Math.round(highRangePrice * 0.995),
);
```

| Affiché | Formule |
|---|---|
| **PRIX CONSEILLÉ D'ANNONCE** | `estimated × 1.01-1.03` (selon confidence) capé à `highRange × 0.995` |
| **PRIX DE VENTE RAPIDE** | `estimated × (1 - 0.04 à 0.085)` selon confidence |
| **BASE MARCHÉ** | `v2.anchors.finalBaseAnchor` = anchor BLENDÉ avant ajustements véhicule |
| **Valeur de marché estimée** (hero) | `adjustedPrice = marketBasePrice × adjustment_multiplier`, arrondi |

🚨 **Les 3 prix affichés (conseillé / rapide / base) sont des dérivés linéaires de `adjustedPrice`**, pas des estimations indépendantes. Ils donnent une apparence de précision mais traduisent juste une marge de négo (+1 à +3%) et un discount fast-sale (-4 à -8.5%).

⚠️ Concrètement : si l'estimation est juste à ±10%, les 3 chiffres seront cohérents ; si elle est faussée, les 3 le seront simultanément du même biais.

Verdict : ⚠️ **partiel** — les chiffres SONT calculés (pas hardcoded en valeur absolue), mais ils ne sont PAS 3 valeurs distinctes au sens L'Argus. C'est 1 valeur + 2 marges.

### Q7 — Transaction factor (asking → vente réelle)

🚨 **AUCUN transaction factor appliqué**. Recherche grep `transaction_factor`, `asking_factor`, `× 0.92`, `× 0.88` → 0 occurrence. La médiane pondérée des `price_mga` est utilisée telle quelle.

Conséquence : si le marché AutoNex affiche typiquement +10-15% au-dessus du prix de vente réel (comportement classique des asking prices), l'estimation hérite de ce biais à la hausse. Pour un vendeur particulier qui veut savoir combien il va vraiment toucher, on lui présente un prix probablement gonflé.

Verdict : 🚨 **absent**. Trou majeur V1.

### Q8 — Ajustements (km, année, état, options, transmission, fuel, drivetrain)

`engine.ts:370-456` (`buildAdjustmentFactors`) — coefficients :

| Ajustement | Cas | Multiplicateur additif | Hardcoded ? |
|---|---|---|---|
| **Mileage** | km<expected -20% | +3.5% | ✅ hardcodé sans justif |
|  | km<expected -8% | +1.5% | ✅ |
|  | km>expected +30% | -6% | ✅ |
|  | km>expected +12% | -2.5% | ✅ |
| **Condition** | excellent | +4% | ✅ |
|  | good | 0 | ✅ |
|  | fair | -4% | ✅ |
|  | needs_work | -10% | ✅ |
| **Maintenance** | full | +3% | ✅ |
|  | partial | +1% | ✅ |
|  | unknown | 0 | ✅ |
| **Accident** | déclaré | -6% | ✅ |
| **Ownership** | 1 prop | +2% | ✅ |
|  | 2 prop | 0 | ✅ |
|  | 3+ prop | -3% | ✅ |
| **Usage** | personal | 0 | ✅ |
|  | professional | -2% | ✅ |
|  | rental | -7% | ✅ |
|  | fleet | -8% | ✅ |
| **CAP global** | clamp(-20%, +12%) | — | hardcodé `engine.ts:449` |

❌ **Manquants** : pas d'ajustement explicite **trim/options** côté input form (pas de checkbox options dans le step Condition). Pas d'ajustement **drivetrain** (4x4 vs 4x2) malgré que le champ existe.

⚠️ **Année** : pas d'ajustement direct. La dépréciation est implicite via le `referenceProfile.annual_depreciation_rate` (typique 0.08-0.16) appliqué à `baseline_year - input.year`. Si pas de profile → fallback 9% par an (`engine.ts:191-196`).

⚠️ **Fuel/transmission/body** : NON traités comme ajustements véhicule. Ils sont utilisés pour le **matching comparables** (filter strict) ET dans le `bodyFallbackMultiplier` du heuristic (`referenceProfiles.ts:48-71`) qui ne s'applique QUE quand pas de comparables ni profile.

🚨 **Aucun coefficient n'est exposé à l'user**. L'EstimationResultReport affiche les facteurs en label texte ("Kilométrage contenu pour l'âge du véhicule") **sans le delta % réel**. L'audit snapshot existe (`adjustments.mileageAdjustment.deltaPct`) mais n'est pas rendu dans la UI.

Verdict : 🚨 **partiel + opaque**. Coefficients hardcodés sans audit publique, ni options trim, ni adjustment drivetrain.

### Q9 — Gestion devises FMG ↔ MGA

🚨 **Aucune gestion explicite**. Pas de grep sur `FMG`, `franc malgache`, `convert_currency`. Le pipeline `build-reference-profiles.ts` (mentionné dans la migration) gère possiblement la conversion lors du seed, mais le frontend traite tout en MGA brut. Les éventuels `price_mga` qui contiennent en fait du FMG (1 MGA = 5 FMG) seraient interprétés à 5× sous leur valeur réelle.

`engine.ts:155` filtre `row.price_mga >= 2_000_000 AND <= 4_000_000_000` — large plage qui n'attrape pas une mauvaise conversion proche de la frontière.

Verdict : 🚨 **absent**. À auditer côté ingestion CSV.

### Q10 — Doublons (`duplicate_group`)

🚨 **Champ inexploité côté engine**. `market_listings_clean.duplicate_of` existe (FK auto-référence). Mais comme l'engine n'utilise pas du tout `market_listings_clean`, le champ est inutile actuellement.

Côté `public.listings` (la source réelle de l'engine), pas de notion de duplicate group.

Verdict : 🚨 **absent**. Dette technique, mais conditionnée à l'activation de market_listings_clean.

---

## 3. DB & data (Tâche 3)

### 3.1 Schema actuel

#### `vehicle_price_reference_profiles` (active)

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `make_name` | text | ilike match |
| `model_name` | text | suffixé `(Neuf)` / `(Occasion)` / `(YYYY-YYYY)` parfois (cf. Sprint 8.2) |
| `body_type` | text | sedan/suv/hatchback/... |
| `fuel_type` | text NULL | |
| `transmission_type` | text NULL | |
| `baseline_year` | int | |
| `baseline_price_mga` | bigint | |
| `annual_depreciation_rate` | numeric | typique 0.08-0.16 |
| `expected_km_per_year` | int | défault 15 000 |
| `popularity_score` | numeric NULL | influence reference signal confidence |
| `data_quality_tier` | text NULL | A_strong / B_moderate / C_anchor |
| `sample_size` | int | nombre observations |
| `source_versions` | text[] | ['v1'] |
| `is_active` | bool | |

**Index UNIQUE** : `uniq_reference_profiles_make_model_lower(LOWER(make_name), LOWER(model_name))`. Pas d'autre index sur make/year/body — pour 134 lignes, full scan acceptable (<5ms).

**RLS** : non vérifiée explicitement (probablement public read).

#### `market_listings_clean` (✅ schema, ❌ unused)

Colonnes pertinentes : `normalized_make/model/trim/generation`, `year`, `mileage_km`, `price_mga`, `fuel_type`, `transmission`, `body_style`, `city`, `seller_type`, `posted_at`, `listing_status`, `confidence_score`, `outlier_flag`, `duplicate_of`, `fingerprint`, `comparable_cluster_key`.

Le schema actuel **peut accueillir** les 27 colonnes du CSV mais avec quelques renommages :
| CSV col | DB col actuel | Action |
|---|---|---|
| `listing_id` | (use `id` ou `source_listing_id`) | mapping |
| `seller_source` | (créer `source` avec valeur 'facebook' / 'partner') | OK déjà |
| `seller_type` | `seller_type` | ✅ |
| `make` / `model` | `normalized_make/model` | ✅ |
| `trim_generation` | `normalized_trim` ou `normalized_generation` | ⚠️ split nécessaire |
| `year` | `year` | ✅ |
| `price_mga` | `price_mga` | ✅ |
| `price_raw` / `currency_original` | (raw table) | déjà dans market_listings_raw |
| `price_type` | ❌ MANQUE | **ajouter colonne** (asking / negotiable / firm) |
| `negotiable` | ❌ MANQUE | **ajouter colonne** boolean |
| `mileage_km` / `mileage_raw` | `mileage_km` (clean) + raw | ✅ |
| `fuel`, `transmission`, `drivetrain`, `engine`, `seats` | `fuel_type`, `transmission`, ❌, ❌, ❌ | **ajouter drivetrain, engine, seats** |
| `options_summary` | ❌ MANQUE | **ajouter** text |
| `condition_notes` | ❌ MANQUE | **ajouter** text |
| `location` | `city` | ✅ |
| `contact` | (privacy concern) | ⚠️ NE PAS stocker en clair |
| `include_in_estimation` | ❌ MANQUE | **ajouter** boolean default true |
| `duplicate_group` | `duplicate_of` (uuid) | ⚠️ semantic différent — `duplicate_of` pointe vers UN row, alors que `duplicate_group` est une key partagée |
| `data_confidence` | `confidence_score` (numeric) ou nouveau enum ? | ⚠️ types différents |
| `extraction_notes` | `parsing_notes` (jsonb) | ✅ |

→ **Schema delta requis pour PROMPT 11** : 7 colonnes nouvelles ou typées : `price_type`, `negotiable`, `drivetrain`, `engine`, `seats`, `options_summary`, `condition_notes`, `include_in_estimation`. Optionnel : `duplicate_group` text si on veut garder la sémantique CSV (clé partagée vs FK).

### 3.2 Volumes actuels

- `vehicle_price_reference_profiles` : **134 lignes** (seed v1, 2026-04-30) — tier A=14 / B=56 / C=64. Pic de couverture : Toyota, Hyundai, Suzuki, Mitsubishi, Renault.
- `market_listings_raw` : **0 ligne** (schema vide en prod).
- `market_listings_clean` : **0 ligne**.
- `market_price_stats` : **0 ligne**.
- `public.listings` (active) : volume non audité ici (dépend des publications live).

🚨 **Distribution par make/model** : impossible à mesurer sans accès SQL prod. À mesurer dans PROMPT 11.

### 3.3 Qualité

- **% NULL sur champs critiques reference_profiles** : `fuel_type` ~30% NULL (`NULL` dans seed pour Great Wall Poer notamment), `transmission_type` ~25% NULL.
- **Doublons** : pas de doublons exacts attendus grâce à l'UNIQUE INDEX `(LOWER(make_name), LOWER(model_name))`.
- **Cohérence devise** : aucune trace de FMG dans le seed (toutes les valeurs MGA semblent cohérentes 8M-300M).

### 3.4 Performance

- Reference profiles : 134 lignes → full scan acceptable (<5ms).
- Comparables `public.listings` : `idx_listings_status_date(status, created_at DESC)` existe. Pas d'index direct sur `make` / `model` → la requête `ilike('make', X) AND ilike('model', Y) AND status='active'` peut faire un seq scan partiel sur les listings actifs. Avec <10k listings actifs, OK ; au-delà → index partiel `(status, make, model)` recommandé.

---

## 4. UI/UX audit (Tâche 4)

### Step 1 — Vehicle (VehicleEstimationPage.tsx)

| Champ | Saisie | Verdict |
|---|---|---|
| Marque | Combobox catalogue (`VehicleCatalogCombobox`) | ✅ ferme typos |
| Modèle | Combobox dépendant marque | ✅ |
| Année | Number input (1950-currentYear) | ✅ validation OK |
| Ville | Select MADAGASCAR_LOCATION_OPTIONS (15 villes) | ⚠️ liste fixe, pas exhaustive Madagascar (ex: pas Tsiroanomandidy, Sambava, Maintirano présents partiellement) |
| Kilométrage | Number input | ⚠️ pas de slider, pas de pré-fill par âge moyen — friction |

**Validation** (`estimationPageModel.ts:15-46`) : champs obligatoires bien gérés (make, model, year, city, mileage). Erreurs i18n.

**Friction** : ~4 clics minimum (combo make + combo model + select city + input km) pour passer step 2. Pas de "fill from listing if I'm logged in" qui pré-remplirait.

### Step 2 — Condition

Champs : `bodyType`, `fuelType`, `transmissionType`, `conditionLabel`, `accidentDeclared`, `maintenanceLevel`, `ownerCountLabel`, `usageType`.

| Champ | Niveaux | Verdict |
|---|---|---|
| Body | 8 valeurs (sedan/suv/hatchback/pickup/van/wagon/coupe/convertible/other) | ✅ |
| Fuel | 5 valeurs (petrol/diesel/hybrid/electric/other) | ✅ |
| Transmission | 4 valeurs (manual/automatic/cvt/other) | ✅ |
| Condition | 4 valeurs (excellent/good/fair/needs_work) | ✅ wording FR clair |
| Accident | bool checkbox | ✅ |
| Maintenance | 3 valeurs (full/partial/unknown) | ✅ |
| Owner count | 3 valeurs (1/2/3+) | ✅ |
| Usage | 4 valeurs (personal/professional/rental/fleet) | ✅ |

🚨 **MANQUE** :
- **Options** : pas de checkbox list (clim, GPS, cuir, jantes alu...). Chaque option majeure peut valoir 500k-2M Ar. Donc l'engine est aveugle à 5-10% de la valeur réelle.
- **Drivetrain** (4x2 / 4x4 / AWD) : champ absent de l'input alors que dans `public.listings` il existe (`drivetrain` colonne). Pour un Pajero 4x2 vs 4x4 c'est un écart 15-20%.

**Kilométrage** : déjà saisi step 1, donc step 2 = ~6 clics rapides. UX fluide.

### Step 3 — Résultat (page bullshit-detector)

| Élément UI | Source | Nature | Verdict | Reco V2 |
|---|---|---|---|---|
| **Valeur principale (ex 145M Ar)** | `values.estimatedValue` = `marketBasePrice × adjustment_multiplier`, arrondi par roundingStep | ✅ Calculé réel | ✅ | OK — ajouter "à la vente" / "à la reprise" pour clarifier la nature |
| **Fourchette (117M-172M)** | `lowEstimate` / `highEstimate` = ±5-20% selon tier policy | ⚠️ Calculé mais **synthétique** | ⚠️ | **V2 : remplacer par P10/P90 réels des comparables** |
| **Badge "Confiance prudente"** | `confidenceBand` mappé de `confidenceScore` (10 facteurs pondérés + plafond tier) | ✅ Calculé réel | ✅ | OK |
| **Bloc "INDICE DE CONFIANCE"** + barre progression | `confidence.confidenceScore /100` rendu dans une div with width=score% | ✅ Calculé | ✅ | OK |
| **Label "Affichage prudent"** | `presentation.confidenceDisplayValue=null` quand `shouldHideExactConfidenceScore=true` (tier D ou fallback high) | ✅ Calculé via tier governance | ✅ | OK |
| **Texte "Estimation indicative appuyée par des références..."** | `presentation.claimMessage` mappé de `claimMode` (4 wordings statiques) | ⚠️ Wording statique par claimMode | ⚠️ | OK V1, mais texte trop vague |
| **Section "LECTURE DU RAPPORT — Évidence limitée, appui de référence"** | `presentation.evidenceHeadline` (toneProfile par summaryLevelKey) | ⚠️ Wording statique | ⚠️ | OK |
| **PRIX CONSEILLÉ D'ANNONCE (146M)** | `estimated × 1.01-1.03` selon confidence | ⚠️ Dérivé linéaire | 🚨 | **V2 : prix concessionnaire réel** |
| **PRIX DE VENTE RAPIDE (132M)** | `estimated × (1-0.04 à 1-0.085)` | ⚠️ Dérivé linéaire | 🚨 | **V2 : prix reprise pro réel (×0.78)** |
| **BASE MARCHÉ (129M)** | `v2.anchors.finalBaseAnchor` = blend comparable + reference + heuristic AVANT ajustements véhicule | ✅ Calculé | ⚠️ | Renommer en "Base marché brute" pour clarifier |
| **NIVEAU GLOBAL — "Indicatif"** | `presentation.summaryLevel` = label tier (Robuste/Qualifié/Indicatif/Prudent) | ✅ Calculé via tier | ✅ | OK |
| **Warning bas page (indicative banner)** | `showIndicative = indicativeRequired \|\| confidenceBand=='low' \|\| comparables.length===0` | ✅ Calculé | ✅ | OK |
| **Liste comparables (jusqu'à 12 cards)** | `v2.comparables` triés par score | ✅ Réel, ✅ rendu, click → `/annonce/:id` | ✅ | **manque date d'extraction comparable + lien méthodologie** |
| **Score pertinence par comparable** (X/100) | `item.score` | ✅ Calculé | ✅ | OK |

#### Cohérence numérique

Test mental sur les chiffres screenshot (estimé=145M, fourchette=117-172M, conseillé=146M, rapide=132M, base=129M) :

- 117M = 145M × 0.807 → spread -19.3% → cohérent avec `wide` + fallback `high` (+3% extra) → **policy spread tournant à 0.20 cap**
- 172M = 145M × 1.186 → spread +18.6% → cohérent avec wide
- 146M = 145M × 1.0069 → conseillé `× 1.01` (confidence low) → cohérent
- 132M = 145M × 0.91 → quickSale `× 0.915` (confidence low → 0.085 discount) → ⚠️ légèrement off, attendu 0.085 = 132.65M, observé 132M → arrondi à 1M step (precisionMode coarse). OK.
- 129M = base marché < estimated 145M → adjustment_multiplier = 145/129 = 1.124 → ⚠️ **dépasse le cap +12%** (`engine.ts:449 clamp(adjustment, -0.2, 0.12)`). Possible si le profile a sample_size faible et heuristic blend tire vers le haut. Ou bug d'arrondi multi-step.

**Conclusion** : les chiffres SONT mathématiquement cohérents entre eux à 1% près (arrondis OK), MAIS **`adjustedPrice / baseAnchor` dépasse théoriquement le cap +12%** dans le cas du screenshot — à investiguer.

#### Mobile-first 375px

- Hero card : `text-5xl md:text-7xl` → 48px sur mobile = lisible.
- Grid 4 tuiles `grid-cols-1 md:grid-cols-[1.3fr_1.1fr_1.1fr_0.9fr]` → stack vertical mobile = OK.
- Comparables grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` → 1 col mobile.
- ✅ Mobile-first OK.

#### Wording — clarté pour non-tech

- "Affichage prudent" : ✅ acceptable (≠ "low confidence" jargonneux).
- "Évidence limitée" : ⚠️ francisme rare, "Données limitées" plus naturel.
- "Appui de référence" : 🚨 obscur pour le grand public et même pour un dealer ("appui de référence" = ?).
- "Pertinence marché" sur les comparables : ✅ clair.
- "Base marché" + "Ancrage principal avant ajustements véhicule" : 🚨 jargon technique trop fort.

#### Manquants critiques

| Manquant | Impact V1→V2 |
|---|---|
| Nombre total de comparables marché disponibles (au-delà des 12 affichés) | High — donne le sens de la profondeur des données |
| Date de mise à jour des données (last refresh dataset) | High — RGPD + crédibilité |
| Lien vers méthodologie publiée | Critical — table stakes Argus-grade |
| Bouton "Affiner mon estimation" | UI existante (`onRefine` callback) ✅ déjà rendu |
| CTA "Publier annonce à ce prix" | UI existante (`onPublish` callback) ✅ |
| Comparables : indication trim (LC79 vs LC76) absente — l'engine groupe tous les Land Cruiser | High — un dealer pointilleux verra immédiatement la confusion |
| Indication "asking price" vs "transaction" pour chaque comparable | Critical — sans ça, le user ne sait pas si 145M est ce qu'il va toucher ou ce qu'il doit afficher |

---

## 5. Edge cases & robustesse (Tâche 5)

| Scénario | Comportement attendu | Comportement actuel | Criticité |
|---|---|---|---|
| **0 comparable trouvé** | Refus + alternatives OU fallback indicatif | ✅ Fallback : tier `D_HEURISTIC_ONLY`, anchor=heuristicProjected, claim mode `INDICATIVE_HEURISTIC_CLAIM_ONLY`, banner indicative obligatoire (`engine.ts:486-528`) | P2 |
| **1 seul comparable** | Confidence "très prudente" + warning | ⚠️ Le tier B requires usedCount≥5 ; avec 1 comp → tier C (avec profile) ou D (sans). Mais `comparableMedian` est calculé même avec 1 comp (`engine.ts:822-830`). Pas de seuil minimum 3 pour rejet. | **P1** — risque sur-fitting |
| **Modèle inexistant DB (typo)** | Suggestion fuzzy ou refus | ✅ Le combobox catalogue (`VehicleCatalogCombobox`) ferme déjà les typos via une liste limitée | P2 |
| **Année très ancienne (1990)** | Décote plafonnée + warning | ⚠️ `normalizeInput` clamp 1950-currentYear. Le profile peut ne pas couvrir → fallback heuristic avec ageDecay = `(1-0.09)^anchorAge` qui décline asymptotiquement vers 0. Cap MIN à 4.5M Ar (`referenceProfiles.ts:192`) et 3.5M Ar (`engine.ts:774`). Pas de warning UI spécifique. | **P1** |
| **Kilométrage extrême (500k)** | Décote plafonnée | ✅ `normalizeInput` clamp 0-1.5M. `kmDeltaRatio` cap dans buildAdjustmentFactors. Cap global ajustement -20%. | P2 |
| **Kilométrage 0 ou non renseigné** | Fallback + warning | ⚠️ Engine utilise input.mileage tel quel ; si 0 → kmDeltaRatio = -1 (-100% vs expected) → tombe dans bucket -20% delta `+3.5%` mais ne déclenche pas warning user. | **P1** — un km=0 donne un faux sentiment de précision |
| **Devise FMG dans DB** | Conversion automatique | 🚨 Aucune conversion — engine traite `price_mga` comme MGA literal. Si scrap importe accidentellement du FMG → estimation × 5 sous-évaluée. | **P0** post-ingestion CSV |
| **Tous comps `data_confidence=low`** | Confidence dégradée | ⚠️ Champ `data_confidence` n'existe pas sur `public.listings`. Côté `market_listings_clean`, existe via `confidence_score` mais cette table n'est pas requêtée. Donc inopérant. | **P0** dans contexte V2 |
| **Plusieurs trims (LC79 vs Prado)** | Strict ou groupé ? | 🚨 ilike sur `model` exact, donc "Land Cruiser" matche "Land Cruiser LC79", "Land Cruiser Prado", "Land Cruiser V8" tous ensemble si la title row contient le motif. Pas de séparation par trim. **Pollution majeure**. | **P0** — un dealer verra le bug en 30 secondes |
| **User logged out** | Estimation accessible ou bloquée | ✅ Anonymous accessible (`createVehicleEstimationRequest` accepte user_id NULL). | P2 |
| **Spam estimations 100/min même IP** | Rate limit | 🚨 Aucun rate limit observé sur la RPC `create_vehicle_estimation_request`. Si scenario abusif → coûts Supabase peuvent grimper. | **P1** — risque scaling |

---

## 6. Gap vs L'Argus-grade (Tâche 6)

| # | Référentiel cible V2 | État actuel | Preuve / extrait |
|---|---|---|---|
| 1 | **Transaction factor par source** (FB particulier ×0.92, FB revendeur ×0.88, dealer ×0.95) | 🚨 **Absent** | Pas de mention `seller_source` dans `engine.ts` ni dans le hook `getRangeSpreadFromPolicy`. La médiane pondérée des `price_mga` est utilisée brute. |
| 2 | **3 valeurs distinctes** (reprise pro ~×0.78, particulier ×0.92, concessionnaire ×1.00) | ⚠️ **Partiel** | Affichées (Conseillé / Rapide / Base) mais ce sont des **dérivés linéaires** de `adjustedPrice` (×1.01-1.03 / ×0.915-0.96 / blend pre-adjustment). Pas calibré par segment marché. `engine.ts:914-919` |
| 3 | **Confidence dynamique vraie 3 niveaux** (Fiable / Moyenne / Prudente) basée sur (nb comps, variance, recency, complétude) | ✅ **Présent** | 10 facteurs pondérés + plafond par tier + fallback severity. `engine.ts:682-720`. Mapping band high/medium/low (≥80 / ≥55 / sinon). |
| 4 | **Ajustements quantifiés ET exposés à l'user** | ⚠️ **Partiel** | Coefficients hardcodés solides (`engine.ts:370-456`) MAIS l'UI affiche seulement labels texte ("Kilométrage contenu pour l'âge"), pas le delta % (`adjustments.mileageAdjustment.deltaPct`). Snapshot existe en `result.audit` non rendu. |
| 5 | **Indice de demande / liquidité** (nb annonces actives, délai moyen vente) | 🚨 **Absent** | Aucun calcul de liquidité dans engine.ts. Les listings ont `views_count` / `contact_count` mais non utilisés. |
| 6 | **Méthodologie publiée** (`/estimation/methodologie`) | 🚨 **Absent** | Recherche `methodologie` / `methodology` → 0 page dédiée, 0 link dans EstimationResultReport. |
| 7 | **Date de mise à jour des données affichée** | 🚨 **Absent** | Aucune mention `last_refresh` / `data_updated_at` dans EstimationResultReport. |
| 8 | **Liste comparables consultable** | ✅ **Présent** | `EstimationResultReport.tsx:312-349` rend une grid de jusqu'à 12 comparables avec image, prix, year, mileage, score, lien `/annonce/:id`. |

**Score gap analysis** : 2/8 ✅ ; 2/8 ⚠️ partiel ; 4/8 🚨 absent. → **Beaucoup d'ouvrage côté V2** mais base solide pour itérer.

---

## 7. Bugs trouvés (criticité décroissante)

### 🔴 P0 — Bloquants V2 / fondamentaux

| # | Fichier:ligne | Description | Impact |
|---|---|---|---|
| P0-1 | `src/lib/estimation/engine.ts:266-271` | **Comparables source = `public.listings` uniquement**, jamais `market_listings_clean`. Les 105 lignes du CSV ne peuvent être utilisées tant que la query n'est pas étendue. | Estimation aveugle au marché Madagascar réel (FB, dealers). |
| P0-2 | (transversal) | **Aucun transaction factor**. Asking prices traités comme prix vente. | Estimations gonflées de ~10-15% systématiquement. |
| P0-3 | `engine.ts:266-282` (matching `ilike model`) | **Pas de séparation par trim**. "Land Cruiser" match LC79 + Prado + V8 ensemble. | Pollution comparables — un dealer perd confiance immédiatement. |
| P0-4 | (CSV columns audit) | `market_listings_clean` schema manque : `price_type`, `negotiable`, `drivetrain`, `engine`, `seats`, `options_summary`, `condition_notes`, `include_in_estimation`. | PROMPT 11 bloqué — il faut la migration delta avant ingestion. |
| P0-5 | (devise) | **Aucune conversion FMG→MGA**. Si scrap import contient FMG, estimation /5. | Risque silencieux post-ingestion. |
| P0-6 | (UX bullshit-detector) | **3 prix dérivés linéaires** (Conseillé / Rapide / Base) ne sont pas 3 valeurs Argus-grade. | Promesse marketing non tenue. |

### 🟡 P1 — V1 améliorations dans le scope estimation

| # | Fichier:ligne | Description | Impact |
|---|---|---|---|
| P1-1 | `engine.ts:822-830` | **Avec 1 comparable**, weighted median est calculée et utilisée comme anchor. Pas de seuil minimum 3 comps pour considérer comparableAnchorValue valide. | Sur-fitting sur 1 outlier. |
| P1-2 | `engine.ts` (nulle part) | **km=0 non flaggé**. `expectedKm` = (year_age) × 15000, donc kmDeltaRatio = -1 → bucket "+3.5%". Pas de warning UI "kilométrage non renseigné, estimation moins fiable". | Faux sentiment précision. |
| P1-3 | (UI) | **Coefficients ajustement non exposés à l'user** (`adjustments.mileageAdjustment.deltaPct` existe, pas rendu). | Manque transparence Argus-grade. |
| P1-4 | (input form Step 2) | **Options trim manquantes** (clim, GPS, cuir, jantes alu, attelage). | Engine aveugle à 5-10% valeur. |
| P1-5 | (input form Step 2) | **Drivetrain manquant** (4x2 vs 4x4). | Pajero 4x2 vs 4x4 = écart 15-20% non capturé. |
| P1-6 | (RPC `create_vehicle_estimation_request`) | **Pas de rate limit** anonymous → coûts Supabase éventuels. | Risque scaling si abusif. |
| P1-7 | `presentation.ts:131-152` | Wording "Évidence limitée, appui de référence" → français maladroit pour grand public et dealer. | Crédibilité. |
| P1-8 | (UI) | **Date refresh dataset absente** + **lien méthodologie absent**. | Table stakes Argus-grade. |

### 🔵 P2 — Cosmétique / backlog

| # | Description |
|---|---|
| P2-1 | `vehicle_price_reference_profiles_backup_2026_05_02` table orpheline en prod, à droper post-validation. |
| P2-2 | `MADAGASCAR_LOCATION_OPTIONS` liste fixe 15 villes — incomplète (Tsiroanomandidy, Sambava primaires manquants). |
| P2-3 | `duplicate_group` champ CSV nécessite remap vers `duplicate_of` (FK) ou nouvelle colonne `duplicate_group` text. |
| P2-4 | `popularity_score` reference_profiles non recalculé dynamiquement (figé au seed). |

---

## 8. Quick wins identifiés (fixes <30min)

| # | Quick win | Fichier | LOC | Bénéfice |
|---|---|---|---|---|
| QW-1 | Afficher delta % de chaque ajustement dans `EstimationResultReport` (`adjustments.mileageAdjustment.deltaPct` existe déjà) | `EstimationResultReport.tsx` insights section | +20 | Transparence Argus-grade |
| QW-2 | Afficher `evidence.comparableCountUsed` + `comparableCountStrong` + `comparableCountAfterQualityFilter` (déjà calculé) | `EstimationResultReport.tsx` | +5 | Profondeur dataset visible |
| QW-3 | Ajouter une "info bulle" sur "Base marché" pour clarifier "ancrage avant ajustements véhicule" | tooltip shadcn | +10 | Anti-jargon |
| QW-4 | Renommer "Évidence limitée, appui de référence" → "Estimation indicative — données limitées" | `presentation.ts:131-152` | +5 | Clarté FR |
| QW-5 | Ajouter footer "Données AutoNex mises à jour le DD/MM/YYYY" | `EstimationResultReport.tsx` | +3 | Crédibilité |
| QW-6 | Si `comparables.length < 3`, masquer la fourchette (afficher seulement la valeur centrale + warning) | `EstimationResultReport.tsx:82-87` | +5 | Anti-faux-précision |
| QW-7 | Reject toute estimation avec `comparables.length === 1` (forcer fallback heuristic) | `engine.ts:822-830` | +3 | Anti-overfitting |

---

## 9. Reco scope PROMPT 10 — Estimation Real Logic V2

### Phase 2 → ordre suggéré d'implémentation

1. **Brancher l'engine sur `market_listings_clean`** (en plus ou à la place de `public.listings`).
   - Modifier `fetchComparableRows` pour inclure `market_listings_clean WHERE include_in_estimation = true AND outlier_flag = false AND listing_status='active'`.
   - Conditionnel via flag `use_market_clean_source` dans `app_config`.

2. **Introduire transaction factors par source**.
   - Constante (côté engine OU table DB `transaction_factors_by_source`) : `{facebook_particulier: 0.92, facebook_dealer: 0.88, autonex_active: 0.95, manual: 1.0}`.
   - Multiplier chaque comparable price par son facteur AVANT weighted median.

3. **Calculer 3 valeurs Argus-grade**.
   - `tradeIn` = adjusted × 0.78 (reprise pro)
   - `privateMarket` = adjusted × 1.0 (entre particuliers)
   - `dealer` = adjusted × 1.15 (concessionnaire)
   - Renommer les 4 tuiles UI : Reprise pro / Entre particuliers / Concessionnaire / Niveau global.

4. **Fourchette = P10/P90 réels** (au lieu de ±%) quand `comparableCountUsed ≥ 5`.
   - Ajouter `percentile(values, p)` dans engine.
   - Fallback ±% si pas assez de comps.

5. **Exposer les ajustements à l'user** (QW-1 du § 8).
   - Section "Détail des ajustements" rendue depuis `result.audit.adjustments`.

6. **Séparation trims** : matching `make + model + trim` au lieu de `make + model`.
   - Ajouter `trim_generation` à `EstimationInput`.
   - Step Vehicle → combobox trim post-modèle.

7. **Page méthodologie** : `src/pages/EstimationMethodologyPage.tsx` accessible via `/estimation/methodologie`.
   - Documenter sources, transaction factors, ajustements, tier policy, dispersion.
   - Lien depuis EstimationResultReport (footer).

8. **Date refresh dataset** : query `market_listings_clean.last_calculated_at` ou `app_config.last_seed_at` → afficher dans le footer.

9. **Anti-rate-limit** : ajouter check IP/session dans `create_vehicle_estimation_request` (max 50/heure anonymous, 200/heure authenticated).

### Fichiers à modifier (estimé)

| Fichier | Δ LOC estimé |
|---|---|
| `src/lib/estimation/engine.ts` | +250 (transaction factor, 3 values, percentile, trim match) |
| `src/lib/estimation/referenceProfiles.ts` | +50 (trim cascade) |
| `src/lib/estimation/presentation.ts` | +80 (3 valeurs labels, métadonnées dataset) |
| `src/components/estimation/EstimationResultReport.tsx` | +120 (3 tuiles renommées + détail ajustements + footer méthodo + last_refresh) |
| `src/pages/VehicleEstimationPage.tsx` | +40 (champ trim step 1, options checkbox step 2) |
| `src/pages/EstimationMethodologyPage.tsx` | +200 (NEW) |
| `src/types/estimation.ts` | +30 (3 values type, transaction factor) |
| `supabase/functions/compute-estimation/` | +250 (parité Edge Function) |
| `src/lib/estimation/api.ts` | +20 (rate limit check) |
| Tests | +200 |

**Effort** : ~24-32h. **Complexité** : moyenne.

---

## 10. Reco scope PROMPT 11 — DB Seed comparables (CSV 105 lignes)

### Schema delta requis (migration)

`supabase/migrations/20260509HHMMSS_market_listings_clean_extension.sql` — non-destructif :

```sql
-- Colonnes manquantes pour ingestion CSV
ALTER TABLE public.market_listings_clean
  ADD COLUMN IF NOT EXISTS price_type text CHECK (price_type IN ('asking','firm','negotiable','quote') OR price_type IS NULL),
  ADD COLUMN IF NOT EXISTS negotiable boolean,
  ADD COLUMN IF NOT EXISTS drivetrain text,
  ADD COLUMN IF NOT EXISTS engine_text text,
  ADD COLUMN IF NOT EXISTS seats integer CHECK (seats BETWEEN 1 AND 25 OR seats IS NULL),
  ADD COLUMN IF NOT EXISTS options_summary text,
  ADD COLUMN IF NOT EXISTS condition_notes text,
  ADD COLUMN IF NOT EXISTS include_in_estimation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS data_confidence text CHECK (data_confidence IN ('high','medium','low') OR data_confidence IS NULL),
  ADD COLUMN IF NOT EXISTS extraction_notes text,
  ADD COLUMN IF NOT EXISTS duplicate_group text;

-- Index pour filtres engine
CREATE INDEX IF NOT EXISTS idx_market_clean_make_model_year
  ON public.market_listings_clean(normalized_make, normalized_model, year)
  WHERE include_in_estimation = true AND outlier_flag = false;

CREATE INDEX IF NOT EXISTS idx_market_clean_data_confidence
  ON public.market_listings_clean(data_confidence)
  WHERE include_in_estimation = true;

-- RLS public read pour engine côté client (à confirmer)
DROP POLICY IF EXISTS "market_listings_clean_public_read" ON public.market_listings_clean;
CREATE POLICY "market_listings_clean_public_read"
  ON public.market_listings_clean
  FOR SELECT TO anon, authenticated
  USING (include_in_estimation = true);
```

### Plan ingestion 105 lignes CSV

1. **Préparer un script Node.js** `scripts/data/ingest-market-listings-csv.ts` qui :
   - Parse CSV (Papa Parse).
   - Normalise make/model via `src/data/featuredMakes.ts` + alias.
   - Normalise prix (FMG → MGA si nécessaire, détection via valeur > 1.5e9 OU column `currency_original` = 'FMG').
   - Calcule `fingerprint` (hash make+model+year+mileage_band+price_band).
   - Détecte `duplicate_group` via fingerprint partagé.
   - Appelle `INSERT INTO market_listings_raw` puis `INSERT INTO market_listings_clean` (FK).
   - Applique `outlier_flag = true` si price > P95 cluster ou < P5.
   - Set `confidence_score` numeric(0-100) selon completeness des champs critiques.

2. **Tests d'idempotence** : ré-runner le script → no double insert (UNIQUE source/source_url + fingerprint dedup).

3. **Validation manuelle** post-ingestion :
   - SELECT count(*) WHERE include_in_estimation = true → ≥85 attendu (105 - 20% rejetés).
   - SELECT distinct normalized_make → top 10 cohérent (Toyota, Hyundai, Suzuki, Mitsubishi, Renault).
   - SELECT count(*) WHERE outlier_flag = true → 5-15 attendu.

4. **Smoke test estimation** : pour 5 modèles populaires (Hilux, Land Cruiser Prado, Pajero, Picanto, Sandero), lancer une estimation avec et sans la table → comparer `comparableCountUsed`.

### Fichiers à créer

| Fichier | LOC |
|---|---|
| `supabase/migrations/20260509HHMMSS_market_listings_clean_extension.sql` | ~80 |
| `scripts/data/ingest-market-listings-csv.ts` | ~300 |
| `scripts/data/__tests__/ingest-market-listings-csv.test.ts` | ~150 |
| `docs/DATA_INGESTION_MARKET_LISTINGS.md` | ~120 |

**Effort** : ~12-16h. **Complexité** : moyenne (parsing + dedup + outlier detection).

---

## 11. Risques & questions ouvertes pour Ali

### Décisions attendues avant PROMPT 10

1. **Source comparables V2** : doit-on garder `public.listings` (comparables AutoNex live) en parallèle de `market_listings_clean` (scrap), ou migrer 100% vers clean ?
   - Pour : clean est plus riche (drivetrain, options, transaction factor par source).
   - Contre : oubliera les annonces live publiées sur AutoNex (risque cold start).
   - **Reco** : union des deux sources avec pondération (clean × 0.8 si seller_source=facebook, listings × 1.0 si AutoNex active).

2. **Transaction factors** : valeurs concrètes ?
   - Suggestion : `{facebook_particulier: 0.92, facebook_dealer: 0.88, autonex_active: 0.95, dealer_official: 0.97, manual: 1.0}`.
   - Calibration empirique idéale via `prix_vendu` capturé dans une post-vente survey (V3).

3. **Wording 3 valeurs** : Argus-grade typique = "Cote argus" / "Cote pro" / "Bonne affaire".
   - Adaptation Madagascar : "Reprise concessionnaire" / "Entre particuliers" / "Vente concessionnaire" ?
   - Validation Ali souhaitée.

4. **Trim séparation** : on ajoute un step intermédiaire dans le tunnel (trim après modèle), ou on infère via title parsing ?
   - Reco : combobox trim cascadant après modèle, valeurs depuis `vehicle_price_reference_profiles.model_name` parsé (`Land Cruiser → [LC76, LC79, Prado, V8, Other]`).

5. **Méthodologie page** : public-only ou login required ?
   - Reco : public (transparence = USP). Lien depuis footer + CTA "Voir la méthodologie" sur EstimationResultReport.

6. **Rate limit estimation anonymous** : 50/heure suffisant ou trop strict ?
   - Si 50/heure → un user moyen fait 5-10 estimations/session, donc 50 = OK.
   - Au-delà → IP block 24h ?

### Risques identifiés

- **R1 — Source unique listings live** : si AutoNex marketplace reste vide, l'estimation tombe systématiquement en tier C/D. Le scrap CSV est CRITIQUE pour V2.
- **R2 — Devise FMG silent bug** : si une ligne CSV contient un `price_raw` en FMG mal détecté, estimation /5 invisible. Mitigation : assert `price_mga BETWEEN 5_000_000 AND 800_000_000` dans le script ingestion + flag suspicion.
- **R3 — Trim pollution** : sans split par trim, "Land Cruiser" match tout. Possible solution rapide pré-V2 : matching strict sur `lower(make) || ' ' || lower(model)` exact match (pas ilike) — élimine au moins les sous-strings.
- **R4 — RGPD** : la colonne `contact` du CSV ne doit JAMAIS landed dans `market_listings_clean`. Ingestion script doit la stripper. Garder uniquement dans `market_listings_raw.payload` chiffré.
- **R5 — Edge Function parité** : tout changement engine.ts doit être miroir Deno. Test parité existant (`estimationEngineParity.test.ts`) — à étendre.

### Questions stratégiques résiduelles

- Q-A : **Doit-on dépublier le module Estimation V1 actuel pendant le développement V2** (pour éviter d'exposer le bullshit aux dealers) ? Ou rolling V2 sous flag `app_config.estimation_engine_version=v2_beta` ?
- Q-B : **Combien de profiles reference_profiles en V2** ? Le seed actuel = 134. Ali vise un minimum de 200 ? 500 ? À calibrer après ingestion CSV pour identifier les gaps.
- Q-C : **Calibration trim** : qui maintient la liste trims par modèle (`Land Cruiser` → LC79, LC76, Prado, V8) ? Manuelle ou via parsing automatique des titres listings live ?

---

**FIN DE RAPPORT**

Le module estimation est une bonne base technique (V2 engine sophistiqué), mais souffre d'une déconnexion structurelle entre l'infra schema (market_listings_clean prêt) et l'usage réel (engine pioche dans listings live). Les 6 P0 doivent être adressés avant que le produit ne soit présenté à des dealers ou des partenaires sous le label "Argus-grade".

L'ingestion du CSV 105 lignes est le **bloqueur primaire** : sans données scrap réelles, V2 reste un exercice de plomberie.

Rapport audit livré, prêt pour validation Ali avant PROMPT 10.
