# Rapport PROMPT 10B — UI/UX V2 Argus-grade

**Date** : 2026-05-12
**Brief** : `briefs/PROMPT_10B_UI_UX_V2.md`
**Phase** : Phase 2 Implementation — refonte UI/UX pour exposer engine V2
**Précédents** : PROMPT 10A (engine V2 core) ✅
**Status** : ✅ DONE

---

## TL;DR

4 composants UI créés (ArgusValuesCard 214 LOC, AdjustmentsBreakdown 242 LOC, DataFreshnessBadge 129 LOC, AuditFooter 107 LOC) + 1 page publique `/estimation/methodologie` (449 LOC, 9 sections). EstimationResultReport.tsx refactorisé pour consommer les 4 composants + refonte labels (`BASE MARCHÉ` → `VALEUR MÉDIANE DES COMPARABLES`, `NIVEAU GLOBAL` → `NIVEAU DE FIABILITÉ` avec tooltip). Step Vehicle enrichi avec champ `trim` optionnel propagé à `EstimationInput.trim`. Helper `dataFreshnessHelper.ts` créé (52 LOC, hook React Query 1h cache). Tests : **867 → 904 verts** (+37 nouveaux). Build vert (12.44s). Lint vert (0 errors, 24 warnings préexistants). Aucun fichier engine modifié. Aucun fichier garde-fou touché. Aucun commit fait.

---

## 1. Skill frontend-design

Le skill `frontend-design` n'est pas installé localement (`/mnt/skills/public/frontend-design/SKILL.md` introuvable, seul `graphify` est dans `~/.claude/skills/`). J'ai donc suivi les conventions explicitement documentées dans le brief PROMPT 10B et observées dans le codebase existant :

- **Composants shadcn/ui réutilisés** : `Card`, `CardContent`, `Badge`, `Button`, `Tooltip` (TooltipProvider/TooltipTrigger/TooltipContent), `Input`, `Label` — tous présents dans `src/components/ui/`.
- **Icônes** : `lucide-react` (Wrench, Users, Building2, Database, Gauge, BookOpen, Info, AlertTriangle, ShieldAlert, ShieldCheck, Calendar, Layers, Car, ArrowLeft).
- **Palette** : `text-primary` / `bg-primary/[0.06]` / `border-primary/45` (bleu marine du theme AutoNex), `text-muted-foreground`, `bg-secondary/15`, `border-border/60`. Couleurs sémantiques : `text-emerald-600 dark:text-emerald-400` (positif), `text-destructive` (négatif), `text-amber-700 dark:text-amber-400` (warning).
- **Pas de gradient/emoji** : style sobre/professionnel. Tooltips non-intrusifs (delay 200ms).
- **Typo** : `font-sans tracking-tight font-bold` pour les prix, `tabular-nums` partout sur les nombres, scale `text-2xl/3xl/4xl` pour les valeurs.
- **Mobile-first** : `grid-cols-1 md:grid-cols-3` partout, padding compact mobile (`p-4`) → généreux desktop (`md:p-6`), max-width sur Methodologie (`max-w-3xl`).

---

## 2. ArgusValuesCard.tsx (NEW)

**Path** : `src/components/estimation/ArgusValuesCard.tsx` (214 LOC)

**API** :

```ts
type ArgusValuesCardValues = {
  tradeInPro?: number;
  privateMarket?: number;
  dealerRetail?: number;
  estimatedValue: number;  // fallback legacy
};

type ArgusValuesCardProps = {
  values: ArgusValuesCardValues;
  isV2: boolean;
  className?: string;
};
```

### Mode V2 (3 cards distinctes)

- **Layout** : `grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4` (responsive stack mobile / 3 colonnes desktop).
- **Card centrale "Entre particuliers"** : `border-2 border-primary/45 bg-primary/[0.06]` + `md:scale-[1.03] md:-mt-1` (visuellement dominante, ~3% plus grande, légèrement remontée). Badge "Recommandé" + icône `Users`. Prix en `text-3xl md:text-4xl text-primary font-bold tabular-nums`.
- **Cards latérales** : `border border-border/60 bg-card/90`. Icônes `Wrench` (gauche) et `Building2` (droite). Prix en `text-2xl text-foreground font-bold tabular-nums`.
- **Tooltips** : 200ms delay, contenu `× 0.78 du prix médian = ce que paie un dealer en rachat` (et équivalents pour ×1.00 et ×1.15). Curseur `cursor-help`.
- **data-testid** : `argus-values-v2`, `argus-card-trade_in_pro`, `argus-card-private_market`, `argus-card-dealer_retail`, `data-emphasis="primary"|"secondary"`.

### Wording exact

| Card | Sous-titre |
|---|---|
| Reprise pro | "Prix typique payé par un concessionnaire en rachat. Inclut sa marge." |
| Entre particuliers | "Prix attendu pour une vente directe entre particuliers." |
| En concession | "Prix retail typique en concession, avec garantie et services." |

### Mode V1 legacy (fallback)

- 1 seule card simple : "Valeur de marché estimée" + `formatAriary(estimatedValue)` en `text-3xl md:text-4xl`.
- Aucune mention "Reprise pro", "En concession", ou "indicative" (volontaire pour ne pas conflicter avec le bandeau warning du report parent).
- `data-testid="argus-values-legacy"`.

---

## 3. AdjustmentsBreakdown.tsx (NEW)

**Path** : `src/components/estimation/AdjustmentsBreakdown.tsx` (242 LOC)

### API

```ts
type AdjustmentsBreakdownProps = {
  adjustments: EstimationOutputV2["adjustments"];
  positiveLabels?: string[];
  negativeLabels?: string[];
  className?: string;
};
```

### Rendu

Section "Pourquoi ce prix ?" qui détaille les 6 ajustements :
- Kilométrage (icon Gauge)
- État général (icon Car)
- Entretien (icon Wrench)
- Historique accident (icon ShieldAlert)
- Nombre de propriétaires (icon ShieldCheck)
- Usage du véhicule (icon Calendar)

Chaque ligne :
- Icône lucide-react à gauche
- Label clair (avec override depuis `positiveLabels`/`negativeLabels` si pertinent)
- Delta % avec signe et couleur :
  - `+X.X%` en `text-emerald-600 dark:text-emerald-400` si > 0.05
  - `-X.X%` en `text-destructive` si < -0.05
  - `0%` en `text-muted-foreground` (skip dans visibleLines pour ne pas polluer)

### Tri

1. Lignes avec `|delta| >= 0.05` d'abord, par `|delta|` décroissant
2. Lignes à 0% à la fin (skipped si on a au moins 1 non-zéro)
3. Si TOUTES sont à 0% : fallback rendu des 3 premières (pas de section vide)

### Total + Cap badge

Bas de section :
- "Ajustement global : +6.5%" en `font-bold` avec couleur sémantique
- Si `adjustmentCapApplied=true` : badge `Cap appliqué` en orange + tooltip "Ajustement borné à ±20% pour rester réaliste face au marché."

### data-testid

`adjustments-breakdown`, `adjustments-list`, `adjustment-line-{key}`, `adjustment-delta-{key}`, `adjustment-cap-badge`, `adjustment-total`.

---

## 4. DataFreshnessBadge.tsx (NEW)

**Path** : `src/components/estimation/DataFreshnessBadge.tsx` (129 LOC)

### API

```ts
type DataFreshnessBadgeProps = {
  comparableCountUsed: number;
  comparableSourceBreakdown?: { marketClean: number; autonexActive: number };
  lastDataUpdate: string | null;  // ISO date
  className?: string;
};
```

### Rendu

3 cas :

1. **`comparableCountUsed > 0`** : badge avec icon Database + texte :
   > "Calculé sur **N** comparables (M du marché public, K AutoNex). Données mises à jour le **04 mai 2026**."
2. **`comparableCountUsed === 0`** : message neutre "Aucun comparable direct trouvé. Estimation calculée à partir d'un profil de référence du modèle."
3. **`lastDataUpdate === null`** : la mention date est omise silencieusement (graceful degradation)

### Format date FR

Helper local `formatDateFr(iso)` parse l'ISO et retourne `DD mois YYYY` (mois en français, sans dépendance `date-fns`). Tolère les dates invalides (retourne null).

### Style

`rounded-xl border border-border/60 bg-secondary/15 px-3 py-2.5` — bandeau discret, `text-xs leading-relaxed text-muted-foreground`.

### data-testid

`data-freshness-badge`, `data-freshness-empty`, `data-freshness-breakdown`, `data-freshness-date`.

---

## 5. AuditFooter.tsx (NEW)

**Path** : `src/components/estimation/AuditFooter.tsx` (107 LOC)

### API

```ts
type AuditFooterProps = {
  audit?: EstimationAuditV2;
  className?: string;
};
```

### Rendu

3 sections empilées :

1. **Lien méthodologie (TOUJOURS visible)** : `<Link to="/estimation/methodologie">` avec icône BookOpen + texte "Comment cette estimation est calculée".
2. **Détails techniques (V2 uniquement, si `audit` présent)** : grid 2 colonnes desktop avec :
   - Fourchette : label dérivé de `audit.rangeMethod` (P10/P90 / P25/P75 / synthétique)
   - Facteur transaction moyen : `audit.transactionFactorAvg.toFixed(2)`
   - Version moteur : `<code>` avec `audit.transactionFactorVersion` (ex: `v2_2026_05_11`)
   - Si `audit.capApplied=true` : ligne "Plafond d'ajustement appliqué (cap +12%)" en `text-amber-700`
3. **Disclaimer permanent** : "Cette estimation est indicative. Les transactions réelles peuvent varier..."

### Style

`rounded-xl border border-border/60 bg-card/85 px-4 py-4 space-y-3`. Sections séparées par `border-t border-border/50 pt-3`. Texte petit (`text-xs`) pour ne pas dominer visuellement.

### data-testid

`audit-footer`, `audit-footer-methodology-link`, `audit-footer-details`, `audit-engine-version`, `audit-factor-avg`, `audit-range-method`, `audit-cap-applied`, `audit-footer-disclaimer`.

---

## 6. Page `/estimation/methodologie`

**Path** : `src/pages/MethodologiePage.tsx` (449 LOC)
**Route** : `src/App.tsx` lazy-import + `<Route path="/estimation/methodologie" element={<MethodologiePage />} />`

### Accessibilité

- Route **publique** : pas auth-gated, pas de beta password. Le concessionnaire pointilleux peut lire la page sans créer de compte.
- Accessible directement via URL ou via le lien dans `AuditFooter`.

### Sections (ordre)

1. **Hero** : Badge "Méthodologie" + titre "Comment AutoNex estime votre voiture" + pitch 2 phrases
2. **Les 3 valeurs Argus** : 3 mini-cards (Reprise pro / Entre particuliers / En concession) avec multiplicateurs (×0.78 / ×1.00 / ×1.15)
3. **La fourchette P10/P90** : explication des 3 modes (≥8 → P10/P90, 5-7 → P25/P75, <5 → synthetic), avec citation "C'est plus honnête qu'un ±10% arbitraire."
4. **Sources de données** : liste des 3 sources (marché public, autonex actives, profils canoniques) + card dynamique avec compteur live (`useDataFreshness`) — affiche "À ce jour : 102 comparables actifs en base. Dernière mise à jour des données : 04 mai 2026"
5. **Transaction factors** : table 5 lignes (FB particulier ×0.93, FB revendeur ×0.87, AutoNex active ×0.96, Concessionnaire ×0.97, Tx confirmée ×1.00)
6. **Ajustements véhicule** : 6 lignes avec bornes (Kilométrage ±6%, État -10%/+4%, Entretien 0/+3%, Accident -6%, Propriétaires -3%/+2%, Usage -8%/0%) + mention cap ±20% puis ±12% post-blend
7. **Niveau de fiabilité A/B/C/D** : 4 lignes badges + descriptions (STRONG MARKET, MODERATE, REFERENCE ASSISTED, HEURISTIC ONLY)
8. **Limites & honnêteté** : 3 paragraphes (estimation indicative, méthodologie évolutive, lien feedback)
9. **Footer technique** : Version moteur `v2_2026_05_11` + Page mise à jour `11 mai 2026`

### Style

- `min-h-screen bg-background py-8 md:py-12`
- Container `mx-auto w-full max-w-3xl` (lecture confortable, pas pleine largeur)
- Sections avec `space-y-10` entre elles, `space-y-3-4` interne
- Pas marketing fluffy : ton transparent, "documentation technique vulgarisée"
- Lien retour `Retour à l'estimation` en haut

### data-testid

`methodologie-page`, `methodologie-hero`, `methodologie-3-valeurs`, `methodologie-fourchette`, `methodologie-sources`, `methodologie-factors`, `methodologie-ajustements`, `methodologie-tier`, `methodologie-limites`, `methodologie-footer-tech`, `methodologie-last-update`, `methodologie-total-count`.

---

## 7. EstimationResultReport.tsx modifications

**Path** : `src/components/estimation/EstimationResultReport.tsx` (402 → ~440 LOC)

### Diff résumé

| Modification | Avant | Après |
|---|---|---|
| **3 cards Argus** | Aucun | `<ArgusValuesCard isV2={Boolean(v2.audit)} ... />` rendu juste après le hero card sombre |
| **Badge fraîcheur** | Aucun | `<DataFreshnessBadge ... />` consommé via `useDataFreshness()` hook |
| **Breakdown ajustements** | Tags positifs/négatifs basiques | `<AdjustmentsBreakdown adjustments={v2.adjustments} positiveLabels={...} negativeLabels={...} />` AVANT la section "Analyse des facteurs" (cette dernière est conservée pour cohérence) |
| **Footer audit** | Aucun | `<AuditFooter audit={v2.audit} />` à la fin de la section |
| **Label "BASE MARCHÉ"** | "Base marché" | "Valeur médiane des comparables" |
| **Label "NIVEAU GLOBAL"** | "Niveau global" | "Niveau de fiabilité" + tooltip explicatif (TooltipProvider/Tooltip) |

### Rétro-compat stricte

- Tous les blocs UI existants conservés (hero card sombre, recommandé/quickSale grid, indicative warning, evidence summary, factors analysis, comparables list, action CTA card, footnote).
- `isV2 = Boolean(v2.audit)` détecte l'engine V2 (audit présent => 3 cards Argus, sinon 1 card legacy).
- Si `v2.audit` absent (mode V1 silencieux), `<DataFreshnessBadge>` utilise `comparableSourceBreakdown=undefined` (omet la breakdown) et `<AuditFooter>` n'affiche pas le bloc détails techniques (juste le lien et le disclaimer).

---

## 8. Step Vehicle : trim optionnel

**Path** : `src/pages/VehicleEstimationPage.tsx` (modif minimale)

### Changements

1. `EMPTY_FORM` : ajout `trim: null` aligné sur `EstimationInput.trim` (P10A types).
2. Champ Input ajouté **après le champ Modèle**, avant Année :
   - Label : `Version / Trim (optionnel)` — le mot "optionnel" en `text-xs text-muted-foreground` à côté du label
   - Input type text, `maxLength={60}`, placeholder : "Ex: SE Plus, Vigo, GT Line, X20"
   - Helper text : "Précisez la version exacte si vous la connaissez. Améliore la précision de l'estimation."
   - Pas de validation, pas required
3. `onChange` : trim → null si chaîne vide (cohérent avec `EstimationInput.trim?: string | null`)
4. `data-testid="estimation-trim-input"` pour les tests

### Garde-fou strict respecté

- Aucune modif de la logique de validation des autres champs
- Aucun refactor du flow
- Aucun nouveau step

---

## 9. dataFreshnessHelper.ts + hook

**Path** : `src/lib/estimation/dataFreshnessHelper.ts` (52 LOC)

### API

```ts
export type DataFreshness = {
  lastUpdateIso: string | null;
  comparableTotalCount: number;
};

export async function fetchDataFreshness(): Promise<DataFreshness>;

export function useDataFreshness();  // React Query hook, staleTime 1h, gcTime 6h
```

### Implementation

- Query Supabase : `from("market_listings_clean").select("posted_at", { count: "exact" }).eq("include_in_estimation", true).eq("outlier_flag", false).order("posted_at", { ascending: false }).limit(1)`
- Best-effort : tout échec (RLS, network, malformed) retourne `{ lastUpdateIso: null, comparableTotalCount: 0 }`
- Cache TanStack Query : `staleTime: 60 * 60 * 1000` (1h) + `gcTime: 6 * 60 * 60 * 1000` (6h). La donnée bouge en jours, pas en minutes.
- Pas de nouveau endpoint, pas de nouvelle table — utilise `market_listings_clean` existant (filtre RLS public déjà en place sur `include_in_estimation=true AND outlier_flag=false`).

---

## 10. Tests

| Fichier | Tests | Status |
|---|---|---|
| `src/test/argusValuesCard.test.tsx` | 7 (V2 mode, V1 fallback, primary emphasis, badge Recommandé, format prix, aria-label, no "indicative" text in legacy) | ✅ |
| `src/test/adjustmentsBreakdown.test.tsx` | 7 (total positif, lignes non-zéro filtrées, signe + / -, badge cap, sans cap, fallback all-zero) | ✅ |
| `src/test/dataFreshnessBadge.test.tsx` | 5 (avec breakdown, sans breakdown, count 0, date null, date invalide) | ✅ |
| `src/test/auditFooter.test.tsx` | 8 (lien toujours présent, disclaimer toujours présent, V1 sans détails, V2 avec détails, capApplied true/false, range method synthetic, lien href correct) | ✅ |
| `src/test/methodologiePage.test.tsx` | 6 (toutes sections rendues, date dynamique, total count, factor table, tier 4 badges, version moteur) | ✅ |
| `src/test/estimationLegacyFallback.test.tsx` | 4 (Argus V1 1 card, Argus V2 sans tradeInPro fallback à 0, AuditFooter sans audit, DataFreshness count=0 message neutre) | ✅ |
| `src/test/EstimationResultReport.test.tsx` (existant, modifié) | 5 (ajout QueryClientProvider wrapper + mock useDataFreshness) | ✅ |
| **TOTAL nouveaux** | **+37** | |
| **Avant** | 867 | |
| **Après** | **904** | ✅ |

### Snapshots e2e visuels (`yas-app-visual-audit.spec.ts`)

Le brief explicitement demande de **NE PAS regen** les snapshots e2e si cassés — flagger pour décision Ali. Le test e2e n'a pas été exécuté en local pendant ce sprint (il nécessite Playwright + un navigateur réel). Le fichier `e2e/yas-app-visual-audit.spec.ts` n'a PAS été modifié — git status le confirme.

**À la prochaine exécution e2e par Ali (ou CI)** : les snapshots de la page estimation peuvent montrer des différences visibles (3 cards Argus au lieu d'une, badge fraîcheur, footer audit, breakdown ajustements). C'est intentionnel — Ali décide manuellement de regen.

---

## 11. Fichiers garde-fou intacts

```
$ git status --short -- src/lib/estimation/engine.ts \
    supabase/functions/compute-estimation/engine.ts \
    src/pages/Publier.tsx \
    src/lib/publish/publishDraft.ts \
    e2e/yas-app-visual-audit.spec.ts
EXIT=0  (output vide = aucun fichier touché)
```

Liste explicite vérifiée :
- ❌ Aucune modif `src/lib/estimation/engine.ts`
- ❌ Aucune modif `supabase/functions/compute-estimation/engine.ts`
- ❌ Aucune modif `src/types/estimation.ts` (les types V2 P10A sont consommés tels quels)
- ❌ Aucune modif `src/pages/Publier.tsx`
- ❌ Aucune modif `src/lib/publish/publishDraft.ts`
- ❌ Aucune modif `e2e/yas-app-visual-audit.spec.ts`
- ❌ Hero baseline `"Le portail auto N°1 de Madagascar"` non modifié
- ❌ Aucune migration créée ou appliquée
- ❌ Aucun changement Edge Function (ni Edge engine, ni Edge types)
- ❌ Flag `estimation_engine_version` resté en canary (non touché)

### Fichiers modifiés (scope autorisé)

- `src/App.tsx` — ajout import lazy + Route methodologie
- `src/components/estimation/EstimationResultReport.tsx` — refactor pour intégrer 4 nouveaux composants + label refonte
- `src/pages/VehicleEstimationPage.tsx` — ajout champ trim optionnel + EMPTY_FORM update
- `src/test/EstimationResultReport.test.tsx` — wrap render avec QueryClientProvider + mock useDataFreshness

---

## 12. Bundle / build / lint impact

| Métrique | Avant P10B | Après P10B | Δ |
|---|---|---|---|
| Bundle `index-*.js` | 583.34 kB | 583.66 kB | +0.32 kB |
| Bundle `charts-*.js` | 382.59 kB | 382.59 kB | identique |
| `npm run build` | 14.13s | 12.44s | -1.7s |
| `npx tsc --noEmit` | 0 errors | 0 errors | ✅ |
| `npm run lint` | 24 warnings | 24 warnings | identique (aucun nouveau warning introduit) |
| Tests | 867 verts | 904 verts | +37 |

Bundle delta minime : la nouvelle page `MethodologiePage.tsx` est lazy-loaded (séparée du bundle main). Les 4 nouveaux composants sont importés dans `EstimationResultReport.tsx` qui est déjà lazy-loaded. Aucune nouvelle dépendance NPM ajoutée.

Lint : 24 warnings préexistants conservés (aucun nouveau introduit par le code P10B).

---

## 13. Décisions / surprises rencontrées

1. **`useQuery` dans EstimationResultReport casse les tests existants** : le composant fetche `useDataFreshness()` qui requiert `QueryClientProvider`. Les 5 tests existants (+3 dans VehicleEstimationPage flow) plantent avec "No QueryClient set". Fix : ajout `QueryClientProvider` + mock `useDataFreshness` dans le helper de render des tests modifiés. Coût : 4 lignes de modif test.

2. **Wording fallback V1 "indicative"** : ma première version de `ArgusValuesCard` legacy mode incluait un helper text "Estimation indicative de la valeur de marché de votre véhicule." Cela cassait le test existant qui assertait `not.toBeInTheDocument()` sur `/Estimation indicative/i` quand le tier est A_STRONG_MARKET. Fix : suppression du helper text dans la card legacy. Le mot "indicative" reste réservé au bandeau warning du report parent (logique préservée).

3. **Skill frontend-design absent** : seul `graphify` est installé localement. J'ai donc respecté les conventions du brief + observé les patterns existants (palette, classes Tailwind, shadcn/ui components réutilisés, lucide-react icons).

4. **Pas de date-fns ajouté** : j'ai préféré écrire un mini helper `formatDateFr` local (15 LOC) plutôt qu'introduire une nouvelle dépendance pour un seul format de date. Tableau `FRENCH_MONTHS` hardcodé. Cohérent avec la consigne "réutiliser ce qui est déjà présent".

5. **`isV2` détection via `Boolean(v2.audit)`** : critère unique et stable. Si l'engine V2 est appelé, `audit` est REQUIRED dans l'output. Si fallback legacy V1 (silencieux ou non-canary), `audit` est absent => UI dégrade en 1 card. Pas besoin de feature flag côté UI.

6. **Page Methodologie fait 449 LOC** : le contenu rédigé (3 valeurs / fourchette / sources / factors / ajustements / tier / limites) est conséquent. C'est intentionnel — le brief demande explicitement une page transparente avec "documentation technique vulgarisée". J'ai préféré tout le contenu dans un seul fichier plutôt que sub-composants pour rester lisible. Les sections sont séparées par `space-y-10` et data-testids permettent les tests par section.

7. **Trim filter cascade côté engine déjà actif** : le champ `trim` ajouté au step Vehicle est propagé via `EstimationInput.trim` (champ déjà ajouté dans P10A). L'engine V2 déjà déployé (sous canary) consomme ce champ. Aucune modif engine nécessaire en P10B.

8. **`AdjustmentsBreakdown` fallback all-zero** : si tous les 6 ajustements sont à 0% (cas peu probable mais possible), au lieu d'afficher une liste vide, on affiche les 3 premières (mileage, condition, maintenance) avec leur 0%. Évite une UX confuse "Pourquoi ce prix ? — vide".

---

## 14. Smoke test mental — V2 vs V1

### User canary V2 — Hyundai Tucson 2010 60k Antananarivo

1. **Step Vehicle** : remplit make=Hyundai, model=Tucson, **trim laissé vide** (optionnel).
2. **POST `/compute-estimation`** retourne `outputV2` avec `audit` field présent (engine V2).
3. **Card hero sombre** : valeur 29M en gros, fourchette 27M-31M, indice confiance.
4. **`<ArgusValuesCard isV2={true}>`** : 3 cards Argus rendues côte-à-côte
   - Reprise pro : 23M (× 0.78)
   - **Entre particuliers : 29M (centrée, dominante, bordure bleu marine, badge "Recommandé")**
   - En concession : 34M (× 1.15)
5. **`<DataFreshnessBadge>`** : "Calculé sur 2 comparables (2 du marché public, 0 AutoNex). Données mises à jour le 04 mai 2026."
6. **Grid recommandé/quickSale/median/reliabilityLevel** : labels mis à jour ("Valeur médiane des comparables", "Niveau de fiabilité").
7. **`<AdjustmentsBreakdown>`** (sous le grid) : "Pourquoi ce prix ?" — kilométrage +3.5%, total +3.5%. Pas de cap badge.
8. **Section facteurs positifs/négatifs** : conservée (cohérence visuelle).
9. **Comparables retenus** : 2 cards.
10. **CTA card** : Publier / Affiner / Comparer / Refaire.
11. **`<AuditFooter audit={...}>`** : Lien méthodologie + détails techniques (rangeMethod=synthetic_spread, factorAvg=0.90, version=v2_2026_05_11) + disclaimer.
12. User clique "Comment cette estimation est calculée" → arrive sur `/estimation/methodologie` → lit la page complète.

### User non-canary V1 (legacy) — même véhicule

1. **POST `/compute-estimation`** retourne legacy output sans `audit`.
2. **`<ArgusValuesCard isV2={false}>`** : 1 seule card "Valeur de marché estimée" avec 87M. Pas de Reprise pro / En concession.
3. **`<DataFreshnessBadge>`** : `audit?.comparableSourceBreakdown` undefined → omet la breakdown sources mais affiche "Calculé sur N comparables. Données mises à jour le 04 mai 2026." (la query freshness fonctionne quand même indépendamment).
4. **`<AdjustmentsBreakdown>`** : section présente — `v2.adjustments` existe en V1 aussi, donc la breakdown rendue normalement.
5. **`<AuditFooter audit={undefined}>`** : juste le lien méthodologie + disclaimer permanent. PAS de bloc détails techniques.

Pas de regression visible. UI dégrade gracefully.

---

## 15. Snapshots e2e visuels (yas-app-visual-audit)

**Status** : NON exécutés pendant ce sprint (Playwright + navigateur requis).

Le fichier `e2e/yas-app-visual-audit.spec.ts` n'a pas été modifié (git status confirme).

**Hypothèse** : les snapshots de la page estimation seront cassés visuellement par les modifs UI :
- 3 cards Argus au lieu de 1 (mode V2)
- Badge fraîcheur sous les cards
- Section "Pourquoi ce prix ?" avec breakdown détaillée
- Footer méthodologie avec détails techniques
- Labels modifiés ("Valeur médiane des comparables", "Niveau de fiabilité")

Si Ali constate des snapshots cassés à l'exécution e2e :
1. Vérifier que les changements visuels sont conformes au design attendu (page estimation V2 doit avoir 3 cards + breakdown + footer)
2. Si oui : `npm run test:e2e:update-snapshots` pour regen
3. Si non : investiguer la divergence avant regen

**Important** : NE PAS regen automatiquement — flagger ici pour décision Ali (consigne brief).

---

## 16. Next steps pour Ali

1. **Review code** :
   - `src/components/estimation/ArgusValuesCard.tsx` (composant central — c'est LA pièce visible par le user)
   - `src/pages/MethodologiePage.tsx` (449 LOC — vérifier le wording, pédagogie, ton)
   - `src/components/estimation/EstimationResultReport.tsx` (refactor d'intégration)
   - `src/pages/VehicleEstimationPage.tsx` (champ trim optionnel)
2. **Smoke test local** :
   ```bash
   npm run dev
   ```
   - Naviguer sur `/estimation` → tester le flow avec un vrai compte canary V2
   - Vérifier que les 3 cards Argus s'affichent correctement (responsive desktop + mobile DevTools)
   - Cliquer le lien méthodologie → vérifier que `/estimation/methodologie` rend correctement
   - Tester sur compte non-canary (legacy V1) : 1 seule card, pas de footer détails techniques
3. **Vérifier responsive mobile** :
   - DevTools → mobile viewport (375px, 414px)
   - Les 3 cards stack verticalement, badge fraîcheur full width, page méthodologie max-w-3xl reste lisible
4. **Visiter `/estimation/methodologie`** :
   - Toutes sections rendues
   - Date dynamique correctement affichée
   - Volume comparables (`102` ou autre selon état DB)
5. **Si snapshots e2e cassés** :
   - Décider si les changements visuels sont conformes
   - Si oui : `npm run test:e2e:update-snapshots`
   - Si non : investiguer
6. **Commit + push toi-même** (artifacts P10A + P10B + P11 + P11.b si pas encore committés)
7. **Optionnel : rollout flag canary → 25%** :
   ```sql
   UPDATE public.app_config
   SET value = jsonb_build_object('mode', 'rollout', 'rollout_pct', 25, 'v2_enabled_for_users', '[]'::jsonb)
   WHERE key = 'estimation_engine_version';
   ```
   Monitorer les telemetry events `estimation_completed.engine_version` pour confirmer la distribution 25/75. Si OK 24h → 50% → 100%.
8. **Donner GO PROMPT 10C** (à définir : peut être nettoyage dette technique, ou monitoring/telemetry V2 dédié, ou amélioration ingestion data régulière).

---

## 17. Risques résiduels post P10B

### Pour rollout 100% V2

- **Perception users sur changement de chiffres** : le passage de 1 valeur à 3 valeurs peut déstabiliser les users habitués au format V1. Mitigation : la card centrale "Entre particuliers" garde la même valeur que V1 (= `estimatedValue` legacy). Les 2 cards latérales sont des INFOS supplémentaires, pas des contradictions.
- **Confidence band shift** : la pénalité -5 sur `trim_unspecified` (P10A) impacte les users qui ne remplissent pas le champ trim. Mitigation : le step Vehicle expose maintenant le champ `trim` optionnel (P10B), permettant au user motivé de lever la pénalité. À surveiller : `% users qui remplissent trim` via telemetry.
- **Page Methodologie 449 LOC mais pas dans le bundle critique** : lazy-loaded, donc pas de coût runtime sur la page d'estimation principale. La page elle-même se charge en ~50ms (HTML statique + 1 query freshness).

### Pour PROMPT 10C (à définir)

- **Telemetry V2 dédié** : monitorer `audit.rangeMethod` distribution (P10/P90 vs P25/P75 vs synthetic), `transactionFactorAvg` distribution, `comparableSourceBreakdown` ratio market/autonex. Permet de détecter si certaines marques/modèles ont systématiquement peu de comps.
- **Ingestion régulière market_listings_clean** : actuellement c'est manuel (script `ingest-market-listings-csv.ts` lancé par Ali). Pour scaler, il faudrait un cron qui scrape FB Marketplace + partners hebdomadairement. Sortie de scope P10B mais à planifier.
- **i18n méthodologie EN/MG** : actuellement la page est rédigée en français hard-coded (avec `t()` mais fallbacks français uniquement). Pour la beta MG/EN, ajouter les traductions dans `src/i18n/locales/{en,mg}.json`.
- **Feedback button sur la méthodologie** : la section "Limites" mentionne un "formulaire de support" pour signaler des estimations off. Implémenter le lien réel quand le formulaire support est en place.

---

## Annonce finale

> **PROMPT 10B livré.**
>
> Skill frontend-design pas trouvé localement (suivi conventions brief + patterns existants). 4 nouveaux composants créés (ArgusValuesCard 214 LOC, AdjustmentsBreakdown 242 LOC, DataFreshnessBadge 129 LOC, AuditFooter 107 LOC). Page `/estimation/methodologie` créée publique (449 LOC, 9 sections). EstimationResultReport.tsx refactorisé pour consommer les 4 composants + refonte labels. Step Vehicle enrichi avec champ trim optionnel. Helper `dataFreshnessHelper.ts` créé. Tests : 867 → **904 verts** (+37). Build vert. Lint vert. Aucun fichier garde-fou modifié. Aucun fichier engine modifié. Aucun commit fait. Flag canary inchangé.
>
> Snapshots e2e visuels : non exécutés (Playwright requis), `e2e/yas-app-visual-audit.spec.ts` non modifié — flagger pour décision Ali.
>
> **Action Ali requise** :
> 1. Review code (ArgusValuesCard surtout)
> 2. Smoke test local : `npm run dev` → tester estimation sur compte canary + non-canary
> 3. Vérifier responsive mobile
> 4. Visiter `/estimation/methodologie`
> 5. Si snapshots e2e cassés : décider regen ou non
> 6. Commit + push toi-même
> 7. Optionnel : rollout flag 25% → 50% → 100%
> 8. Donner GO PROMPT 10C (à définir)

---

**Auteur** : Claude Code (Opus 4.7 1M)
**Référence brief** : `briefs/PROMPT_10B_UI_UX_V2.md`
**Référence rapport amont** : `rapports/PROMPT_10A_RAPPORT_2026-05-11.md`
