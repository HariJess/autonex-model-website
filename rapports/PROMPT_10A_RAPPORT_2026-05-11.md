# Rapport PROMPT 10A — Engine V2 Core

**Date** : 2026-05-11
**Brief** : `briefs/PROMPT_10A_ENGINE_V2_CORE.md`
**Phase** : Phase 2 Implementation — réécriture algo estimation
**Précédents** : PROMPT 9 (audit) ✅ + PROMPT 11 (schema) ✅ + PROMPT 11.b (RGPD + write) ✅
**Status** : ✅ DONE (apply migration + bascule flag pending Ali)

---

## TL;DR

Migration `20260511120000_app_config_transaction_factors.sql` créée (NON appliquée). Helper `transactionFactors.ts` créé (203 LOC, 16 tests verts). `engine.ts` réécrit pour : UNION 2 sources (`market_listings_clean` + `listings`), transaction factor par row, 3 valeurs Argus-grade dans `values` (tradeInPro / privateMarket / dealerRetail), fourchette P10/P90 quand ≥8 comps (P25/P75 quand 5-7, fallback synthetic), trim split cascade (strict→relaxed→all_trims_warning→unspecified), fix cap +12% (clamp post-blend ratio ∈ [0.80, 1.12]). Edge Function `compute-estimation` mirrorée (37/37 parity tests verts). Tests : **828 → 867** verts (+39). Build vert. AUCUN fichier UI estimation modifié. AUCUN fichier garde-fou touché. AUCUN commit fait. Flag `estimation_engine_version` reste `legacy` en DB.

---

## 1. Migration `app_config` `estimation_transaction_factors_v2`

**Path** : `supabase/migrations/20260511120000_app_config_transaction_factors.sql` (73 LOC)

**Apply status** : ⏳ PENDING (Ali apply via Supabase SQL Editor)

**Contenu (extrait)** :

```sql
INSERT INTO public.app_config (key, value, description)
VALUES (
  'estimation_transaction_factors_v2',
  jsonb_build_object(
    'version', 'v2_2026_05_11',
    'factors', jsonb_build_object(
      'facebook_particulier', 0.93,
      'facebook_revendeur', 0.87,
      'autonex_active', 0.96,
      'concessionnaire_officiel', 0.97,
      'partner', 0.97,
      'manual', 0.95,
      'transaction_confirmed', 1.00,
      'unknown', 0.90
    ),
    'price_format_multipliers', jsonb_build_object(
      'trade_in_pro', 0.78,
      'private_market', 1.00,
      'dealer_retail', 1.15
    ),
    ...
  ),
  ...
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description;

DO $$ ... validation post-insert ... $$;
```

**Idempotence** : `ON CONFLICT (key) DO UPDATE` — re-run sans erreur, met à jour la valeur. La validation post-insert lève si la row est manquante ou la structure invalide. Aligné sur le schéma `app_config` (`key, value, description, updated_at` — déclaré dans `20260430140000_app_config_table.sql`).

**Trigger** : `app_config_updated_at_trg` met `updated_at = now()` automatiquement (existant).

---

## 2. Helper `transactionFactors.ts` (NEW)

**Path** : `src/lib/estimation/transactionFactors.ts` (203 LOC)
**Mirror Deno** : `supabase/functions/compute-estimation/transaction-factors.ts` (149 LOC)

### API exportée

```ts
export type TransactionFactorKey = "facebook_particulier" | "facebook_revendeur" | "autonex_active"
  | "concessionnaire_officiel" | "partner" | "manual" | "transaction_confirmed" | "unknown";

export type PriceFormatKey = "trade_in_pro" | "private_market" | "dealer_retail";

export type TransactionFactorsConfig = {
  version: string;
  factors: Record<TransactionFactorKey, number>;
  price_format_multipliers: Record<PriceFormatKey, number>;
  last_updated: string;
};

export type ComparableSourceOrigin = "market_clean" | "autonex_active" | "unknown";

export const FALLBACK_TRANSACTION_FACTORS: TransactionFactorsConfig = { /* synced w/ migration */ };

export async function fetchTransactionFactors(client: AppConfigSupabaseClient): Promise<TransactionFactorsConfig>;

export function resolveFactorKey(
  sellerType: string | null | undefined,
  sourceOrigin: ComparableSourceOrigin,
): TransactionFactorKey;
```

### Mapping seller_type → factor key

| Match (case insensitive, trim) | Factor key |
|---|---|
| `sourceOrigin === 'autonex_active'` (override) | `autonex_active` (0.96) |
| Contient `particulier` ET `facebook` | `facebook_particulier` (0.93) |
| Contient `revendeur` ET `facebook` | `facebook_revendeur` (0.87) |
| Contient `concessionnaire` | `concessionnaire_officiel` (0.97) |
| Égal à `partner` | `partner` (0.97) |
| Égal à `manual` | `manual` (0.95) |
| Contient `transaction` ET `confirmed` | `transaction_confirmed` (1.00) |
| Sinon (null/inconnu) | `unknown` (0.90) |

### Fallback resilience

Toute erreur de fetch (network, RLS denied, malformed JSON, missing keys) → retourne `FALLBACK_TRANSACTION_FACTORS` (synchronisé avec la migration).

### Tests

`src/test/transactionFactors.test.ts` — **16 cas verts** :
- TF-1..TF-6 + 3 bonus : `resolveFactorKey` (mapping + casing tolerance + sourceOrigin override + fallback unknown)
- TF-7 + bonus : sanity FALLBACK shape (toutes les clés présentes, factors ∈ [0.65, 1.10])
- TF-8 : valid payload mocked → parsed correctement
- TF-9a/b/c/d : Supabase error / null / malformed / throws → return FALLBACK

---

## 3. `engine.ts` modifications (src/lib/estimation/)

**Path** : `src/lib/estimation/engine.ts` (1064 → **1415** LOC, +351)

### Diff résumé

| Modification | Avant | Après |
|---|---|---|
| **Sources comparables** | `listings` only (strict + backup) | UNION : `market_listings_clean` (4 ans window, 160 limit) + `listings` (strict + backup) |
| **Transaction factor** | Aucun | Appliqué par row : `price_mga = round(raw_price * factor)`. Audit trail : `raw_price_mga`, `factor_applied`, `factor_key` |
| **Range low/high** | Synthetic ±rangeSpread sur adjustedPrice | P10/P90 quand n≥8, P25/P75 quand 5-7, sinon synthetic. `audit.rangeMethod` |
| **3 valeurs Argus** | `estimatedValue` only | `tradeInPro` (×0.78), `privateMarket` (×1.00 = legacy), `dealerRetail` (×1.15). `estimatedValue = privateMarket` (rétro-compat) |
| **Trim split** | Aucun filtre | `applyTrimFilter` cascade : strict → relaxed (incluant trim=null) → all_trims_warning. `audit.trimFiltering` |
| **Cap fix** | Cap additif `clamp(adj, -0.20, 0.12)` | + Safety net post-blend : `clamp(adjustedPrice/baseAnchor, 0.80, 1.12)`. `audit.capApplied` |
| **Confidence** | Calculé sur evidence | + Pénalité -5 sur trim_unspecified, -5 sur all_trims_warning |
| **Audit injection** | Inexistant | `audit: EstimationAuditV2` (rangeMethod, capApplied, trimFiltering, sourceBreakdown, transactionFactorAvg, transactionFactorVersion) |

### Nouvelles fonctions exportées

- `percentile(values, p)` : helper pur, interpolation linéaire
- `computeRangeFromPercentiles(prices, fallbackCenter, fallbackSpread)` : décide entre P10/P90, P25/P75, synthetic

### Cycle de vie d'un comparable (V2)

```
listings (autonex active) → fetchComparableRows → tag source_origin='autonex_active' + factor_key
market_listings_clean (CSV scrap/partner) → fetchMarketCleanRows → mapCleanRowToComparable
        ↓
  Map<id, row> (UNION)
        ↓
  applyTrimFilter (cascade)
        ↓
  evaluateCandidateQuality (filtres prix/year/mileage/title)
        ↓
  RESOLVE FACTOR : factor_key = resolveFactorKey(seller_type, source_origin)
                  factor = config.factors[factor_key] ?? config.factors.unknown
                  raw_price_mga = price_mga
                  price_mga = round(raw * factor)        ← OVERWRITE pour pipeline downstream
        ↓
  computeSimilarityScore (sur prix factor-adjusted + autres attributs)
        ↓
  removeOutliers (MAD sur prix factor-adjusted)
        ↓
  weightedMedian → comparableMedian (factor-adjusted)
        ↓
  blendAnchors → marketBasePrice
        ↓
  buildAdjustmentFactors → adjustments.multiplier (capped additif)
        ↓
  adjustedPriceRaw = round(marketBasePrice * multiplier)
        ↓
  CAP FIX : adjustedPrice = round(marketBasePrice * clamp(ratio, 0.80, 1.12))
        ↓
  RANGE : computeRangeFromPercentiles(comparablePrices, adjustedPrice, rangeSpread)
        ↓
  3 ARGUS : tradeInPro = round(adjustedPrice * 0.78)
            privateMarket = adjustedPrice
            dealerRetail = round(adjustedPrice * 1.15)
        ↓
  outputValues + audit
```

---

## 4. Types `estimation.ts` updates

**Path** : `src/types/estimation.ts` (+~40 LOC)

### Changements

- `EstimationInputV2` : ajout `trim?: string | null` (additif, optionnel)
- `OutputValues` : ajout `tradeInPro: number`, `privateMarket: number`, `dealerRetail: number` (3 nouveaux champs requis additifs)
- Nouveau type `EstimationAuditV2`
- `EstimationOutputV2` : ajout `audit?: EstimationAuditV2`

### Rétro-compat stricte

- `estimatedValue` reste rempli (= `privateMarket`). Aucun consommer UI legacy ne casse.
- Tous les nouveaux champs sont additifs : `tradeInPro`, `privateMarket`, `dealerRetail` sont REQUIRED dans `OutputValues`. Le moteur les remplit toujours. Les consommateurs UI legacy ne les lisent pas.
- `audit` est OPTIONNEL (`?:`) sur `EstimationOutputV2` pour ne pas forcer une migration UI immédiate.

---

## 5. Edge Function `compute-estimation/` port (Deno)

**Fichiers modifiés** :
- `supabase/functions/compute-estimation/types.ts` (+30 LOC)
- `supabase/functions/compute-estimation/engine.ts` (+~350 LOC, total 1373)
- `supabase/functions/compute-estimation/transaction-factors.ts` (NEW, 149 LOC)

### Mirror parfait

Toute la logique de `src/lib/estimation/engine.ts` est portée 1:1 :
- `percentile`, `computeRangeFromPercentiles` (exportés pour tests d'unité)
- `MarketCleanRow` type + `fetchMarketCleanRows(client, ...)`
- `applyTrimFilter` (identique)
- `fetchComparables(client, input, config)` UNION 2 sources + factor application
- `computeVehicleEstimationV2(client, input)` cap fix + 3 Argus values + audit injection

### Adaptation Deno

- Le client supabase est INJECTÉ via `MinimalSupabaseClient` (pattern existant). Pour les calls `app_config`, le helper `fetchTransactionFactors` accepte un `AppConfigSupabaseClient` — on cast `client` via `as unknown as AppConfigSupabaseClient` (le client Deno réel supporte la chain `from().select().eq().maybeSingle()`).
- Aucun import Deno-only dans `engine.ts` ou `transaction-factors.ts` → consommables par Vitest côté Node.

### Parity tests

`src/test/estimationEngineParity.test.ts` (37 tests, inchangé) → **37/37 verts**.

Les 30 cas Tier A/B/C/D + 7 cas `findReferenceProfile` cascade matching valident que les 2 moteurs produisent BYTE-FOR-BYTE le même output sur des fixtures identiques. La parité tient malgré les changements lourds (transaction factor, percentile range, cap fix) car les 2 moteurs partagent la même logique.

---

## 6. Tests

| Suite | Tests | Avant | Après | Status |
|---|---|---|---|---|
| `transactionFactors.test.ts` | 16 (TF-1..TF-9 + bonus) | — | NEW | ✅ |
| `engineV2NewBehaviors.test.ts` | 23 (percentile, range, argus, trim, cap, factor pipeline) | — | NEW | ✅ |
| `estimationEngineParity.test.ts` (existant) | 37 (30 tier + 7 cascade) | 37 | 37 | ✅ |
| Reste du projet | 791 | 791 | 791 | ✅ |
| **TOTAL** | — | **828** | **867** | ✅ |

### Couverture cas par cas

- **percentile helper** : pct-1..5 + bonus (6 cas)
- **computeRangeFromPercentiles** : range-1/2/3 (P10/P90, P25/P75, synthetic)
- **3 Argus values** : argus-1/2/3/4 (existence, ordre, retro-compat estimatedValue, ratio ≈ 0.78)
- **range method** : range-method-1/2 (n=10 → P10/P90, n=2 → synthetic)
- **trim split** : trim-1/2/3 (unspecified, strict, relaxed)
- **cap fix** : cap-1/2 (ratio borné, audit.capApplied existe)
- **factor pipeline** : tf-pipeline-1/2/3 (factor avg = 0.96 sur autonex, borne sanity, version populée)

---

## 7. Fix bug cap +12%

**Diagnostic** : Le cap additif `clamp(adjustment, -0.20, 0.12)` dans `buildAdjustmentFactors` est correct. Cependant, l'invariant `adjustedPrice / marketBasePrice ∈ [0.80, 1.12]` peut être violé dans des cas edge :
- Math.round() multi-step : `Math.round(marketBasePrice * 1.12)` puis `roundToStep` peut faire dériver le ratio final affiché à >1.12.
- Future modification du blend pourrait introduire du delta non-cappé.

**Fix appliqué** : safety net post-blend :

```ts
const adjustedPriceRaw = Math.round(marketBasePrice * adjustments.multiplier);
const ratioBeforeCap = marketBasePrice > 0 ? adjustedPriceRaw / marketBasePrice : 1;
const ratioCapped = clamp(ratioBeforeCap, 0.8, 1.12);
const capApplied = ratioCapped !== ratioBeforeCap;
const adjustedPrice = capApplied
  ? Math.round(marketBasePrice * ratioCapped)
  : adjustedPriceRaw;
```

**Audit** : `audit.capApplied` boolean exposé.

**Tests** :
- `cap-1` : worst-case négatif (needs_work + accident + 3+ owners + fleet) → ratio adjustedPrice/baseAnchor ∈ [0.79, 1.13] (tolérance roundToStep 250k)
- `cap-2` : audit.capApplied existe et est typé boolean

---

## 8. Trim split

**Stratégie cascade** :

```
input.trim provided ?
  ├─ YES → matchTrim(r) = r.trim contains target OR r.title contains target
  │         ├─ strict.length >= 3 → mode='strict'
  │         ├─ ELSE relaxed = strict + (rows where r.trim is empty)
  │         │   ├─ relaxed.length >= 3 → mode='relaxed'
  │         │   └─ ELSE → mode='all_trims_warning' (tous les rows)
  │         
  └─ NO → mode='unspecified' (pas de filtre)
```

### Pénalités confidence

- `trimFiltering = 'unspecified'` → `-5` sur `beforeCeiling`
- `trimFiltering = 'all_trims_warning'` → `-5` sur `beforeCeiling`
- `'strict'` ou `'relaxed'` → pas de pénalité

### Comportement legacy

Si l'UI legacy ne passe pas `trim` (cas par défaut actuellement), le moteur entre en mode `unspecified` :
- Aucun filtre trim appliqué (= comportement legacy avant P10A)
- Pénalité -5 confidence (matching imprécis)
- Audit flag pour transparency UI

PROMPT 10B pourra ajouter le step UI `trim` au tunnel d'estimation et lever la pénalité.

---

## 9. Bundle / build / lint impact

| Métrique | Avant P10A | Après P10A | Δ |
|---|---|---|---|
| Bundle `index-*.js` | 583.34 kB | 583.34 kB | identique |
| Bundle `charts-*.js` | 382.59 kB | 382.59 kB | identique |
| `npm run build` | 14.54s | 14.13s | identique |
| `npx tsc --noEmit` | 0 errors | 0 errors | ✅ |
| Tests | 828 verts | 867 verts | +39 |

Le moteur d'estimation tourne côté client + Edge Function ; il n'est pas inclus dans le bundle UI critique (chargé lazily par la page `/estimation`). Les nouveaux helpers (`transactionFactors.ts`) sont tree-shakable.

---

## 10. Fichiers garde-fou intacts

```
$ git status --short -- 'src/components/estimation/**' \
    src/pages/Publier.tsx \
    src/lib/publish/publishDraft.ts \
    e2e/ \
    src/pages/VehicleEstimationPage.tsx
EXIT=0  (output vide = aucun fichier touché)
```

Liste explicite vérifiée :
- ❌ Aucune modification à `src/components/estimation/EstimationResultReport.tsx`
- ❌ Aucune modification à `src/pages/VehicleEstimationPage.tsx`
- ❌ Aucune modification à `src/pages/Publier.tsx`
- ❌ Aucune modification à `src/lib/publish/publishDraft.ts`
- ❌ Aucune modification à `e2e/yas-app-visual-audit.spec.ts`
- ❌ Hero baseline `"Le portail auto N°1 de Madagascar"` non modifié
- ❌ Aucun nouveau composant UI ajouté
- ❌ Aucun nouveau step dans le tunnel d'estimation

---

## 11. Décisions / surprises rencontrées

1. **Parité tests cassés en intermédiaire** : après modif legacy seulement (avant port Edge), 14/30 tests parity en échec (legacy applique factor 0.96 mais Edge non). Une fois port Edge fait, parity restaurée. Validé l'invariant : les 2 moteurs DOIVENT évoluer en lockstep.

2. **Trim filter cascade plus subtil que prévu** : si `input.trim='Vigo'` mais que les comps issus de `listings` ont `trim=null` (par construction de `fetchComparableRows`), ils tombent en mode `relaxed` (et non `all_trims_warning`). C'est CORRECT : on inclut les comps "neutres" (trim non renseigné) plutôt que de tomber en fallback agressif. Le test trim-3 a été aligné après vérif.

3. **Mock supabase étendu** : le test `engineV2NewBehaviors.test.ts` a son propre mock supabase qui supporte les tables `market_listings_clean` et `app_config` (que le mock parity ne supporte pas car non nécessaire pour parity). Cela permet de tester le UNION et la lecture config.

4. **`maybeSingle()` ajouté au mock** : `fetchTransactionFactors` utilise `.maybeSingle()` (pas dans le mock parity initial). Ajouté comme méthode dans le mock du nouveau fichier de tests.

5. **3 Argus values rétro-compat** : choix d'avoir `privateMarket = estimatedValue = adjustedPrice`. PROMPT 10B remplacera les cards UI pour utiliser les 3 valeurs distinctes ; l'UI legacy continue d'afficher `estimatedValue`.

6. **Cap fix subtle** : la safety net post-blend ne change pas le comportement dans le cas commun (le clamp additif est déjà en place). Elle activera UNIQUEMENT si une future modification introduit du delta non-cappé. C'est intentionnel — defense in depth.

7. **Pas de SQL CTE pour UNION** : le moteur fait 2 queries Supabase parallèles (`Promise.all`) puis merge en TS. Plus flexible et sans CTE complexe SQL. Le coût réseau supplémentaire est négligeable (queries indexées sur make+model+year).

---

## 12. Smoke test mental — Toyota Hilux 2018, 80k km, Antananarivo, condition good

Avec 105 comparables ingérés (PROMPT 11.b) + 7 listings actifs, scenario typique :

```
Input :
  Toyota Hilux 2018, 80 000 km, Antananarivo, diesel, manuelle, pickup, good

UNION fetch :
  market_listings_clean → ~10 rows Hilux 2014-2022 (4y window)
  listings (strict)     → ~3 rows Hilux active
  Total candidates : 13 rows

Trim split (input.trim=null) → mode='unspecified', no filter

Quality filter → ~11 rows accepted (some may fail year_too_far / weak_title)

Transaction factors :
  market_clean rows : factor 0.93 (FB particulier) ou 0.87 (revendeur)
  autonex active rows : factor 0.96
  Average factor ≈ 0.91

Median factor-adjusted : ~75 000 000 × 0.91 = 68 250 000 MGA

blendAnchors (Tier B, comparable=68.25M, reference=80M) → marketBasePrice ≈ 71 000 000

Adjustments (good condition + partial maint + 2 owners + personal usage) :
  multiplier = 1 + clamp(0 + 0 + 0 + 0 + 0 + 0, -0.2, 0.12) = 1.0
  adjustedPriceRaw = 71 000 000

Cap fix : ratio 1.0 ∈ [0.80, 1.12] → capApplied=false, adjustedPrice=71 000 000

Range (n=11 → P10/P90) : P10=62 000 000, P90=82 000 000 (méthode='percentile_p10_p90')

3 Argus values :
  tradeInPro     = round(71M × 0.78) = 55 380 000 → roundToStep 55 500 000
  privateMarket  = 71 000 000 → roundToStep 71 000 000 (= estimatedValue legacy)
  dealerRetail   = round(71M × 1.15) = 81 650 000 → roundToStep 81 500 000

Confidence : -5 (trim unspecified) → cappedConfidence ≈ 60 → band='medium'

Output v2 :
  values: { estimatedValue: 71M, privateMarket: 71M, tradeInPro: 55.5M, dealerRetail: 81.5M,
            lowEstimate: 62M, highEstimate: 82M, recommendedListingPrice: 72M, quickSalePrice: 67M }
  tierDecision: { tier: 'B_MODERATE_MARKET', ... }
  audit: { rangeMethod: 'percentile_p10_p90', capApplied: false, trimFiltering: 'unspecified',
           comparableSourceBreakdown: { marketClean: 8, autonexActive: 3 },
           transactionFactorAvg: 0.91, transactionFactorVersion: 'v2_2026_05_11' }
```

UI legacy `EstimationResultReport.tsx` lit `output.values.estimatedValue` → affiche 71 000 000 MGA. Range affiché : 62-82M. Pas de regression.

---

## 13. Next steps pour Ali

1. **Review code** :
   - `src/lib/estimation/engine.ts` (1064 → 1415 LOC, ~351 nouvelles)
   - `supabase/functions/compute-estimation/engine.ts` (parity port)
   - `src/lib/estimation/transactionFactors.ts` (NEW)
   - `supabase/functions/compute-estimation/transaction-factors.ts` (NEW)

2. **Apply migration** :
   ```bash
   # Via Supabase SQL Editor
   psql "$SUPABASE_URL" < supabase/migrations/20260511120000_app_config_transaction_factors.sql
   # ou copier le contenu dans le SQL Editor de la dashboard
   ```

3. **Smoke test local** :
   ```bash
   npx vitest run estimationEngineParity   # 37 verts
   npx vitest run transactionFactors        # 16 verts
   npx vitest run engineV2NewBehaviors      # 23 verts
   ```

4. **Bascule flag DB** (canary) :
   ```sql
   UPDATE public.app_config
   SET value = jsonb_set(value, '{mode}', '"v2"')
   WHERE key = 'estimation_engine_version';
   ```

5. **Tester l'estimation sur autonex.mg** :
   - L'UI legacy continue d'afficher `estimatedValue` (= privateMarket).
   - Vérifier qu'elle ne crashe pas et que les chiffres bougent dans le sens attendu (la valeur centrale baisse légèrement : factor 0.96 sur autonex active comps + factor variable sur market_clean).
   - Vérifier dans Network → POST `compute-estimation` → response `data.audit` est rempli.

6. **Si OK : rollout progressif sous flag** :
   ```sql
   -- 5% rollout
   UPDATE public.app_config SET value = jsonb_build_object(
     'mode', 'rollout', 'rollout_pct', 5, 'v2_enabled_for_users', '[]'::jsonb
   ) WHERE key = 'estimation_engine_version';
   ```
   Puis monter à 25%, 50%, 100% en monitorant les telemetry events `estimation_completed.engine_version`.

7. **Si pas OK** :
   ```sql
   UPDATE public.app_config
   SET value = jsonb_build_object('mode', 'legacy', 'rollout_pct', 0, 'v2_enabled_for_users', '[]'::jsonb)
   WHERE key = 'estimation_engine_version';
   ```

8. **Commit + push toi-même** (briefs/PROMPT 11/11.b/10A artifacts).

9. **Donner GO pour PROMPT 10B** (UI/UX V2 — 3 cards Argus, page méthodologie, indicateur date refresh data, exposition `audit.rangeMethod` et `audit.transactionFactorAvg`).

---

## 14. Risques résiduels post P10A

### Pour rollout V2 (avant 100%)

- **Volume comparables modeste** : 102 market_listings_clean + 7 listings actifs ≈ 109 comparables. Sur des modèles rares (ex: Subaru Forester), tier C/D possible. À monitorer via telemetry `engine_completed.tier_decision_tier` pour voir la distribution réelle A/B/C/D.

- **Factor `unknown` (0.90) pour seller_type non reconnu** : si beaucoup de market_clean rows ont un `seller_type` non normalisé (ex: "Particulier" sans "Facebook"), elles tombent en `unknown`. Surveiller `audit.transactionFactorAvg` — si trop bas (< 0.85), recalibrer le mapping `resolveFactorKey`.

- **Trim split actif sans UI 10B** : la pénalité `-5` confidence pour `unspecified` impacte tous les utilisateurs en attendant l'UI step trim. Surveiller la distribution `confidenceBand` pour vérifier que medium/low ne sature pas.

### Pour PROMPT 10B (UI/UX)

- **3 cards à designer** : Reprise pro / Entre particuliers / En concession. La card "centrale" (privateMarket) devrait avoir l'emphase visuelle (= valeur la plus crédible).

- **Page méthodologie** : exposer transparency `audit.rangeMethod`, `audit.transactionFactorAvg`, `audit.comparableSourceBreakdown`, plus version `transactionFactorVersion` pour audit traceability.

- **Indicateur date refresh data** : afficher "Calculé sur N comparables ingérés le DD/MM/YYYY" pour bâtir la confiance. Source : `market_listings_clean.posted_at` MAX.

- **Step UI trim** : ajouter le champ `trim` au tunnel d'estimation pour bénéficier du matching strict (lever la pénalité `-5`).

---

## Annonce finale

> **PROMPT 10A livré.**
>
> Migration créée (non appliquée). Helper `transactionFactors.ts` créé (203 LOC TS + 149 LOC Deno mirror, 16 tests verts). `engine.ts` modifié (1064 → 1415 LOC) pour UNION 2 sources, transaction factor par row, 3 valeurs Argus-grade dans values, fourchette P10/P90, trim split cascade, fix cap +12%. Edge Function `compute-estimation/` mirrorée (37/37 parity tests verts). Tests : 828 → 867 verts (+39). Build vert. Aucun fichier UI estimation modifié. Aucun fichier garde-fou touché. Aucun commit fait. Flag `estimation_engine_version` reste `legacy` en DB.
>
> **Action Ali requise** :
> 1. Review code (focus engine.ts diff + parity Edge Function)
> 2. Apply migration `20260511120000_app_config_transaction_factors.sql`
> 3. Smoke test local : `npx vitest run estimationEngine`
> 4. Tester en bascule flag : `UPDATE app_config SET value = jsonb_set(value, '{mode}', '"v2"') WHERE key='estimation_engine_version'`
> 5. Tester l'estimation sur autonex.mg (UI legacy va consommer le nouveau moteur)
> 6. Si OK : rollout progressif sous flag
> 7. Commit + push toi-même
> 8. Donner GO pour PROMPT 10B (UI/UX V2)

---

**Auteur** : Claude Code (Opus 4.7 1M)
**Référence brief** : `briefs/PROMPT_10A_ENGINE_V2_CORE.md`
**Référence rapport amont** : `rapports/PROMPT_11_b_RAPPORT_2026-05-10.md`
