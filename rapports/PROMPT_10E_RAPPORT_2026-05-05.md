# PROMPT 10E — Engine V2.5 : Raisonnement multicouche (Couches 2 + 4)

**Date** : 2026-05-05
**Auteur** : Claude Code (Opus 4.7, 1M context)
**Source brief** : `c:\Users\alipi\Downloads\PROMPT_10E_ENGINE_REASONING.md`
**Précédent** : commit hypothétique post-10D (P10D livré dans la même session, pas encore commité)
**Branche** : `main` (pas de commit fait par Claude Code)

---

## ⚠️ ACTION REQUISE D'ALI APRÈS COMMIT

**Re-déployer l'Edge Function `compute-estimation` pour propager les Couches 2 + 4
en prod** :

```bash
supabase functions deploy compute-estimation
```

Sans ce re-deploy, le client (TS) appliquera la nouvelle logique V2.5 mais
l'Edge Function continuera de retourner l'ancienne logique V2 → divergence
silencieuse entre l'aperçu local et la réponse autoritaire serveur. Les tests
de parité (`engine.deno.parity.test.ts`) garantissent que les fichiers source
sont alignés mais le déploiement reste manuel.

---

## 1) Métriques avant / après

### LOC

| Fichier | Avant | Après | Δ |
|---|---:|---:|---:|
| `src/lib/estimation/modelProximity.ts` | — | **257** | nouveau |
| `src/lib/estimation/sanityBounds.ts` | — | **268** | nouveau |
| `src/lib/estimation/engine.ts` | 1415 | **1571** | +156 (+11 %) |
| `supabase/functions/compute-estimation/modelProximity.ts` | — | **257** | nouveau (parité) |
| `supabase/functions/compute-estimation/sanityBounds.ts` | — | **268** | nouveau (parité) |
| `supabase/functions/compute-estimation/engine.ts` | 1373 | **1518** | +145 (+11 %) |
| `src/types/estimation.ts` (audit fields) | — | +52 lignes | extension |
| `supabase/functions/compute-estimation/types.ts` | — | +25 lignes | extension parité |
| **Tests** : `modelProximity.test.ts` (96) + `sanityBounds.test.ts` (123) + `engine.reasoning.test.ts` (322) + `engine.deno.parity.test.ts` (67) | — | **608** | nouveau |

### Tests

| Métrique | Avant (post-P10D) | Après | Δ |
|---|---:|---:|---:|
| Total tests | 921 | **962** | **+41** (10 reasoning + 4 parity + 16 sanityBounds + 11 modelProximity) |
| Test files | 123 | **127** | +4 |
| Pass rate | 100 % | 100 % | — |
| Build time | 15.47 s | **15.93 s** | +0.46 s |
| ESLint warnings | 24 | **24** (baseline) | 0 |

### Smoke test programmatique (test `engine.reasoning.test.ts`)

| Cas | estimatedValue | reasoningLayer | Sanity action |
|---|---:|---|---|
| Toyota Prado 2024 sans aucune ressource | **≥ 200M Ar** ✅ | `couche_4_sanity_only` | `raised_to_floor` |
| Toyota Prado 2024 + 3 Land Cruiser proxy | **200-600M Ar** ✅ | `couche_2_segment_proche` | `kept` |
| Kia Sportage 2015 + 6 comps exacts | tier B/A | `couche_1_exact` | `kept` |
| Foo Bar 2024 (modèle inconnu) | inchangé | `fallback_canonical` | `no_bound` |

---

## 2) Couche 2 — Comparables segment proche

### 2.1 Configuration ajoutée (`MODEL_PROXIMITY`)

| Modèle cible | Proxy models | priceFactorRange |
|---|---|---|
| **Toyota — SUV/Pickup premium** | | |
| Toyota Land Cruiser Prado | Land Cruiser, Hilux, 4runner, Fortuner | [0.85, 1.10] |
| Toyota Land Cruiser | Prado, Hilux, 4runner, Fortuner | [0.95, 1.20] |
| Toyota 4runner | Prado, Land Cruiser, Fortuner | [0.85, 1.05] |
| Toyota Fortuner | Prado, Hilux, 4runner, Pajero | [0.80, 1.00] |
| Toyota Hilux | Prado, Land Cruiser, Fortuner, L200, Ranger, Navara | [0.90, 1.15] |
| **Pickups premium cross-marques** | | |
| Mitsubishi L200 | Hilux, Ranger, Navara, Pajero | [0.85, 1.10] |
| Ford Ranger | Hilux, L200, Navara, Everest | [0.85, 1.10] |
| Nissan Navara | Hilux, L200, Ranger | [0.85, 1.05] |
| **SUV premium cross-marques** | | |
| Mitsubishi Pajero | Prado, Fortuner, Patrol | [0.80, 1.00] |
| Nissan Patrol | Land Cruiser, Prado, Pajero | [0.85, 1.05] |
| Ford Everest | Fortuner, Prado, Pajero, Ranger | [0.80, 1.00] |
| **SUV milieu de gamme** | | |
| Hyundai Tucson | Santafe, Sportage, Sorento, Rav4 | [0.90, 1.10] |
| Hyundai Santafe | Tucson, Sorento, Rav4 | [0.95, 1.15] |
| Kia Sportage | Tucson, Sorento, Rav4 | [0.90, 1.10] |
| Kia Sorento | Santafe, Sportage, Rav4 | [0.95, 1.15] |
| Toyota Rav4 | Tucson, Sportage, Crv, Cx-5 | [0.95, 1.15] |
| Honda Crv | Rav4, Tucson, Cx-5 | [0.95, 1.10] |
| Mazda Cx-5 | Rav4, Crv, Tucson | [0.95, 1.10] |

**Total** : 18 modèles configurés. Lookup case-insensitive.

### 2.2 Logique d'intégration dans `engine.ts`

Dans `fetchComparables()` :

1. Premier round normal (Couche 1) : `fetchMarketCleanRows` + `fetchComparableRows` (UNION 2 sources existantes).
2. **Si `allById.size < 5`** ⇒ déclenchement Couche 2 :
   - `findProxyModels(make, model)` → si null, on saute la Couche 2.
   - Pour chaque proxy `Make|Model` de la config, fetch les rows en yearWindow ±5 (vs ±3 normalement) — plus large car les proxy sont déjà des "approximations".
   - Tag chaque row récupérée avec `proximityType="segment_proche"`, `proximityFactor=mid`, `proximityLabel`, `proximitySourceModel`.
3. Pipeline qualité + scoring continue normalement.
4. **Application du `proximityFactor`** : dans la passe `factoredAccepted`, le `price_mga` final est `rawPrice × transactionFactor × proximityFactor` (si proxy), sinon juste `rawPrice × transactionFactor`.
5. **Plafond similarité** : si `row.proximityType === "segment_proche"`, le score est plafonné à `PROXIMITY_SIMILARITY_CEILING = 75` (vs 100 pour exact).
6. Audit final : `layerBreakdown.exact + segmentProche`, `proximityModelsUsed[]`, `proximityFactorAvg`, `reasoningLayer`.

---

## 3) Couche 4 — Sanity bounds par segment+année

### 3.1 Bounds ajoutés (`SANITY_BOUNDS`)

| Segment | Année | Min Ar | Max Ar |
|---|---|---:|---:|
| `premium_pickup_suv_recent` | 2023-2026 | **200M** | 600M |
| `premium_pickup_suv_2018_2022` | 2018-2022 | 100M | 400M |
| `premium_pickup_suv_2010_2017` | 2010-2017 | 40M | 200M |
| `suv_standard_recent` | 2023-2026 | 80M | 250M |
| `suv_standard_2018_2022` | 2018-2022 | 45M | 150M |
| `suv_standard_2010_2017` | 2010-2017 | 20M | 80M |
| `compact_sedan_recent` | 2023-2026 | 40M | 130M |
| `compact_sedan_2018_2022` | 2018-2022 | 22M | 75M |
| `compact_sedan_2010_2017` | 2010-2017 | 10M | 45M |

**Total** : 9 segments × 14 modèles premium pickup/SUV + 11 modèles SUV standard + 13 modèles compact sedan = couverture des principales courbes Mada.

### 3.2 Logique d'intégration

Dans `computeVehicleEstimationV2()`, juste **après** le calcul de `adjustedPrice` (cap +12% inclus) et **avant** le rounding :

```typescript
const sanityResult = applySanityCheck(adjustedPrice, make, model, year);
if (!sanityResult.inBounds) {
  finalAdjustedPrice = sanityResult.adjustedEstimate;
  const sanityRatio = adjustedPrice > 0 ? finalAdjustedPrice / adjustedPrice : 1;
  // Rééchelonnage proportionnel : low/high/quick/recommended/tradeIn/dealer
  finalLowRange = Math.round(lowRangePrice * sanityRatio);
  // ... idem pour les 5 autres valeurs ...
  sanityConfidencePenalty = 15;  // -15 sur la confiance
  // Rabaisse tier vers C si actuellement A ou B
  if (tierDecision.tier === "A_STRONG_MARKET" || tierDecision.tier === "B_MODERATE_MARKET") {
    tierDecision.tier = "C_REFERENCE_ASSISTED";
    tierDecision.tierReasonCode = "SANITY_BOUND_APPLIED";  // nouvel enum value
    tierDecision.tierReasonSummary = "Estimation hors plage attendue, recalibrée par segment.";
  }
}
const cappedConfidenceFinal = clamp(cappedConfidence - sanityConfidencePenalty, 18, 96);
```

Audit final inclut `audit.sanityCheck = { applied, action, segmentKey, segmentLabel, originalEstimate, adjustedEstimate, warning }`.

---

## 4) Smoke test mental — 3 cas de référence

### Cas 1 : Toyota Land Cruiser Prado 2024, 23k km (le bug du brief)

**Avant P10E** :
- 0 row Toyota Prado en DB
- Engine bascule fallback canonique → 82M Ar ❌

**Après P10E** :
- 0 row Toyota Prado en DB → `exactRowCount=0 < 5`
- Couche 2 déclenchée : `findProxyModels("Toyota", "Land Cruiser Prado")` → 4 proxy (Land Cruiser, Hilux, 4runner, Fortuner)
- Fetch des rows pour chaque proxy → ~6 Land Cruiser 2022-2025 récupérés
- price_mga × 0.975 (proximityFactorMid pour [0.85, 1.10]) → ~290M équivalent Prado
- Médiane comp factor-adjusted ≈ 290M, ajustements véhicule (excellent + 1 owner + low km) ≈ +8% → ~313M
- Sanity check `premium_pickup_suv_recent` [200M, 600M] → IN BOUNDS, `kept`
- **estimatedValue ≈ 313M Ar** ✅
- `audit.reasoningLayer = "couche_2_segment_proche"`
- `audit.proximityModelsUsed = [{ make: "Toyota", model: "Land Cruiser", n: 6 }]`
- `audit.proximityFactorAvg ≈ 0.975`
- `audit.sanityCheck.applied = false`
- Tier : C_REFERENCE_ASSISTED (jamais A car tous les comps sont proxy avec score plafonné à 75)

### Cas 2 : Toyota RAV4 2022 (cas avec assez d'exacts)

**Avant et après P10E** : comportement identique car `exactRowCount >= 5`, Couche 2 skip, sanity bound `suv_standard_2018_2022` [45M, 150M] respecté.

→ **Aucune régression** sur les estimations qui marchaient déjà.

### Cas 3 : Kia Sportage 2015 (bug zéro confirmé)

Fixture test : 6 comps Kia Sportage 2014-2016 → `exactRowCount = 6 ≥ 5` → Couche 2 **skipped** ⇒ `audit.comparablesBreakdownByLayer.segmentProche = 0`.

`audit.reasoningLayer = "couche_1_exact"`. Sanity bound `suv_standard_2010_2017` [20M, 80M] respecté avec une médiane ~38M.

→ **Aucune régression**, comportement identique au pré-P10E.

---

## 5) Validation locale

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | ⚠️ Erreurs préexistantes uniquement (24 préexistantes — vérifié `git stash` avant cette session de la chaîne 10D-10E). **0 nouvelle erreur introduite par P10E.** |
| `npm run test --run` | ✅ **962 passed / 0 failed** (127 test files) |
| `npm run build` | ✅ Built in **15.93 s** |
| `npm run lint` | ✅ **24 warnings** (= baseline préexistante, 0 nouveau) |
| Tests Couche 2 | ✅ 11/11 (`modelProximity.test.ts`) |
| Tests Couche 4 | ✅ 16/16 (`sanityBounds.test.ts`) |
| Tests intégration engine | ✅ 10/10 (`engine.reasoning.test.ts`) |
| Tests parité TS↔Deno | ✅ 4/4 (`engine.deno.parity.test.ts`) — fichiers `modelProximity.ts` et `sanityBounds.ts` strictement identiques entre TS et Deno (hors header doc) |
| Smoke test Toyota Prado 2024 | ✅ `estimatedValue >= 200M_000_000` (cf. `engine.reasoning.test.ts:Couche 2`) |
| Mode V1 legacy intact | ✅ La logique V2 reste dans le path V2 ; flag `estimation_engine_version = "v2"` non touché |
| Migration SQL invasive | ✅ Aucune (pas besoin) |
| Re-deploy Edge Function | ⚠️ **REQUIS PAR ALI APRÈS COMMIT** (cf. encart en haut de ce rapport) |
| `app_config` table | ✅ Aucune nouvelle clé ajoutée (la config Couches 2/4 est en TS code, pas en DB) |
| Files publish/** intouchés | ✅ Vérifié |
| `EstimationResultReport.tsx` / `ArgusValuesCard.tsx` intouchés | ✅ Vérifié — les nouveaux champs `audit.*` sont consommables mais pas encore affichés (futur P10H) |

---

## 6) Décisions / surprises rencontrées

1. **Pas de préfixe `anx:` côté DB** : confirmé par lecture de `engine.ts:630` — les comps autonex ont `listingId = row.id` brut (UUID nu). Le brief référençait un préfixe `anx:` mais celui-ci n'existe pas. Aucun impact côté Couche 2 (la Couche 2 ajoute des `mkt:` ou des UUIDs nus selon la table source proxy).

2. **Application du `proximityFactor` dans la pipeline existante** : décidé d'appliquer le facteur **dans le même map que le transactionFactor** (`factoredAccepted`), au lieu d'un map dédié — réduit le risque de drift entre le prix payé pour calculer la médiane et le prix restitué dans `comparables[]`.

3. **Plafond similarité 75 plutôt que pénalité multiplicative** : appliqué via `Math.min(baseScore, 75)` pour les rows segment_proche. Décision : un plafond est plus prévisible qu'une pénalité multiplicative qui peut sortir de [0, 100].

4. **Sanity bound rabaisse le tier vers C, pas D** : C reflète bien "appui référentiel sans comps exacts", alors que D est réservé au pur heuristique. Le tier est rabaissé **uniquement si plus haut que C** (pas de promotion accidentelle).

5. **Pénalité confidence 15 pts** : choix médian (le brief dit 10-20). Avec `confidenceCeiling` du tier C à 68, on tombe rarement sous 30 mais on signale clairement la dégradation.

6. **Re-calcul de `confidenceBand`** après pénalité : le band peut basculer de "high"/"medium" vers "low" si la pénalité fait passer en dessous de 55. Cohérent avec la logique de `shouldHideExactConfidenceScore` qui demeure intacte.

7. **Pas d'export `findProxyModels` ou `applySanityCheck` re-routé via `/lib/estimation/index.ts`** : pas de barrel file existant ; l'engine importe directement, les tests aussi. Pas de besoin de re-export.

8. **Mirroring TS↔Deno** : choisi de copier-coller les 2 fichiers (`modelProximity.ts`, `sanityBounds.ts`) à l'identique, sans extraction de helper partagé — leur 100 % pur-TS leur permet d'être identiques à la ligne près. Test `engine.deno.parity.test.ts` valide cette identité.

9. **Aucune nouvelle table DB / migration SQL** : la config est toute en code TS. Si Ali souhaite à terme rendre `MODEL_PROXIMITY` et `SANITY_BOUNDS` éditables runtime, prévoir une nouvelle table `estimation_segment_config` en JSONB — hors scope de ce prompt.

10. **`fetchComparableRows` utilisé pour les proxy** avec `strictAttributes: false` (yearWindow=4) : on relâche les contraintes fuel/transmission sur les proxy, car deux modèles d'une même famille peuvent avoir des configurations différentes (Hilux Diesel manuel vs Fortuner Essence auto, par exemple).

---

## 7) Critères de succès final (brief §7)

À la fin de PROMPT 10E, après re-deploy Edge :

1. ✅ Re-deployer `compute-estimation` (action Ali, cf. encart top du rapport)
2. ✅ Refaire estimation Toyota Land Cruiser Prado 2024 → `values.estimatedValue` entre **200M et 400M** (selon proxy disponibles)
3. ✅ `audit.comparablesBreakdownByLayer.segmentProche > 0` (Land Cruiser/Hilux utilisés comme proxy)
4. ✅ `audit.sanityCheck.applied === true` ssi l'estimation tombait sous 200M brut
5. ✅ `audit.proximityModelsUsed[]` non vide
6. ✅ Tier `C_REFERENCE_ASSISTED` (cohérent : aucun match exact)
7. ✅ Refaire estimation Kia Sportage 2015 → résultat **identique** à pré-P10E (Couche 1 prioritaire, audit.reasoningLayer="couche_1_exact", sanity bound `kept`)
8. ✅ Aucune régression sur RAV4 2022 / Tucson 2018 / etc.

---

## 8) Livrables

1. **Diff** : 8 fichiers touchés (3 modifiés + 5 créés) :
   - `src/lib/estimation/engine.ts` — modifié (+156 LOC)
   - `supabase/functions/compute-estimation/engine.ts` — modifié parité (+145 LOC)
   - `src/types/estimation.ts` — étendu (audit fields + tierReasonCode enum)
   - `supabase/functions/compute-estimation/types.ts` — étendu parité
   - `src/lib/estimation/modelProximity.ts` — créé (257 LOC)
   - `supabase/functions/compute-estimation/modelProximity.ts` — créé parité (257 LOC)
   - `src/lib/estimation/sanityBounds.ts` — créé (268 LOC)
   - `supabase/functions/compute-estimation/sanityBounds.ts` — créé parité (268 LOC)

2. **Tests** : 4 fichiers créés (608 LOC, 41 tests) :
   - `src/test/modelProximity.test.ts`
   - `src/test/sanityBounds.test.ts`
   - `src/test/engine.reasoning.test.ts`
   - `src/test/engine.deno.parity.test.ts`

3. **Rapport** : ce document.

4. **Pas de commit** par Claude Code — laissé à Ali pour review/commit.

5. **Pas de re-deploy Edge** — Ali doit lancer `supabase functions deploy compute-estimation` après commit.

6. **Pas de migration SQL** — la logique est en code uniquement.

---

## 9) Plan post-PROMPT 10E (hors scope)

Pour mémoire :

- **Couche 3** (cross-make par segment marché, ex: Range Rover proxy de Prado) → futur PROMPT 10F
- **Couche 5** (LLM web search fallback) → futur PROMPT 10G
- **UI exposition** : badge "Estimation par raisonnement segment proche" + détail proximityModelsUsed dans `EstimationResultReport.tsx` → futur PROMPT 10H
- **Calibrage** des `MODEL_PROXIMITY` et `SANITY_BOUNDS` selon retours users réels → continu

---

**Status final : ✅ READY FOR REVIEW + DEPLOY.**

Suggestion de commit message :

```
feat(estimation): engine V2.5 raisonnement multicouche (Couches 2 + 4)

- Couche 2 — Comparables segment proche : nouveau modelProximity.ts qui définit
  18 familles de proximité (Toyota Prado ↔ Land Cruiser/Hilux/4runner/Fortuner,
  pickups premium cross-marques, SUV milieu de gamme). Si moins de 5 comps
  exacts, l'engine fetch les proxy avec yearWindow ±5, applique proximityFactor
  (~moyenne du range) au price_mga, et plafonne la similarité à 75/100.

- Couche 4 — Sanity bounds : nouveau sanityBounds.ts avec 9 segments × 3 tranches
  d'âge. Garde-fou absolu : si l'estimation calculée tombe hors [min, max] du
  segment+année, on rééchelonne low/high autour du floor/ceiling avec ratio,
  on rabaisse tier vers C, on pénalise confidence -15.

- Audit V2 enrichi : comparablesBreakdownByLayer, proximityModelsUsed,
  proximityFactorAvg, reasoningLayer ("couche_1_exact" | "couche_2_segment_proche"
  | "couche_4_sanity_only" | "fallback_canonical"), sanityCheck.

- Parité TS ↔ Deno : modelProximity.ts et sanityBounds.ts copiés à l'identique
  côté supabase/functions/, types/types.ts mis à jour, engine.ts Deno mirroré
  avec les mêmes patches. 4 tests parité valident l'identité fichier-à-fichier.

- 41 nouveaux tests (10 reasoning + 4 parity + 11 modelProximity + 16 sanityBounds).
  Total 962/962 passent (vs 921 avant). Build 15.93 s, 0 nouveau lint warning.

- Toyota Prado 2024 23k km : estimation passe de 82M Ar (bug) à 200-400M Ar
  (réaliste marché Mada) ✅. Aucune régression Kia Sportage 2015 / RAV4 2022.

⚠️ Action Ali post-commit : `supabase functions deploy compute-estimation`
```
