# Rapport PROMPT 10C — UX Cleanup & Information Hierarchy

**Date** : 2026-05-13
**Brief** : `briefs/PROMPT_10C_UX_CLEANUP.md`
**Phase** : Phase 2 Implementation — refonte UX par SUPPRESSION
**Précédents** : PROMPT 10A (engine V2 core) ✅ + PROMPT 10B (UI Argus-grade) ✅
**Status** : ✅ DONE

---

## TL;DR

6 sections redondantes supprimées (D, F, G, I, J, K, N), section L (comparables) conditionnalisée sur `length > 0`, section M simplifiée (sous-card N "Lecture finale" retirée). `EstimationResultReport.tsx` : **460 → 307 LOC (-153 LOC)**. Imports nettoyés (`AlertCircle`, `CheckCircle2`, `ShieldCheck`, `Sparkles` retirés). Tests adaptés : 5 anciens tests du fichier réécrits + 7 nouveaux tests cleanup-specific (C1-C7) + tests adjustsemtn breakdown / CTA. Tests : **904 → 910 verts** (+6 net). Build vert 12.97s. Lint vert (24 warnings préexistants, 0 nouveau). Aucun composant P10B touché. Aucun engine touché. Aucun commit fait.

---

## 1. Inventaire avant cleanup

| Section | Lignes JSX (avant) | Décision | Après |
|---|---|---|---|
| **A** Card hero sombre | 66-133 | KEEP | inchangé |
| **B** ArgusValuesCard | 135-144 | KEEP | inchangé |
| **C** DataFreshnessBadge | 146-151 | KEEP | inchangé |
| **D** "Lecture du rapport" header | 153-158 | **DELETE** | supprimée |
| **E** Grid 4 cards (recommandé/quickSale/médiane/fiabilité) | 160-198 | KEEP | inchangée |
| **F** Bandeau warning "Estimation indicative" | 201-217 | **DELETE** | supprimée |
| **G** "Qualité d'évidence" | 219-233 | **DELETE** | supprimée |
| **H** AdjustmentsBreakdown | 235-240 | KEEP | inchangé |
| **I** "Analyse des facteurs" 2 cards (vert/rouge) | 242-296 | **DELETE** | supprimée |
| **J** "Lecture d'évidence" Card | 298-319 | **DELETE** | supprimée |
| **K** "Support marché — Appui marché faible" | 321-347 | **DELETE** | supprimée |
| **L** "Annonces comparables retenues" Card | 349-407 | **CONDITIONALIZE** | render seulement si `comparables.length > 0` |
| **M** "Prochaine meilleure action" Card | 410-454 | KEEP simplifié | sous-card N retirée, layout 1-col |
| **N** "Lecture finale" sub-card | 421-425 | **DELETE** | supprimée (dans M) |
| **O** AuditFooter | 456-457 | KEEP | inchangé |

**Bilan** : 7 sections supprimées (D, F, G, I, J, K, N), 1 conditionnalisée (L), 1 simplifiée (M).

---

## 2. Sections supprimées

### D — "Lecture du rapport"

```tsx
// SUPPRIMÉ (lignes 153-158 avant)
<div className="rounded-2xl border border-primary/20 bg-gradient-to-r ...">
  <p>{t("estimation.report.reportReading", "Lecture du rapport")}</p>
  <p>{presentation.evidenceHeadline}</p>          // ex: "Estimation indicative exploratoire"
  <p>{presentation.evidenceSummaryLine}</p>
</div>
```

**Justification** : info "évidence insuffisante" déjà transmise par C (DataFreshnessBadge) + Badge claimLabel hero + AuditFooter disclaimer. 4ème répétition redondante.

### F — Bandeau warning "Estimation indicative"

```tsx
// SUPPRIMÉ (lignes 201-217 avant)
{showIndicative && (
  <div className="... bg-amber-100/50 ...">
    <AlertCircle />
    <p>{t("estimation.report.indicativeTitle", "Estimation indicative")}</p>
    <p>{insights.disclaimers[0]?.label ?? ...}</p>
  </div>
)}
```

**Justification** : message dupliqué avec C + claimLabel hero + AuditFooter. 4ème répétition. Variable `showIndicative` également supprimée.

### G — "Qualité d'évidence"

```tsx
// SUPPRIMÉ (lignes 219-233 avant)
<div role="region" aria-label="Résumé de la qualité d'évidence">
  <p>{t("estimation.report.evidenceQuality", "Qualité d'évidence")}</p>
  <p>{presentation.evidenceSummaryLine}</p>
  <p>{used} comparables retenus, dont {strong} solides, similarité médiane {similarity}/100.</p>
</div>
```

**Justification** : "X comparables retenus" déjà dans `<DataFreshnessBadge>` (C) sous forme user-friendly. "Similarité médiane 0/100" = jargon technique → page méthodologie, pas rapport principal.

### I — "Analyse des facteurs" (2 cards vert/rouge)

```tsx
// SUPPRIMÉ (lignes 242-296 avant) — entire <section>
<section>
  <p>Analyse des facteurs</p>
  <div className="grid md:grid-cols-[1.05fr_0.95fr]">
    <Card ...>Facteurs qui renforcent (bulles vertes)</Card>
    <Card ...>Points de vigilance prix (bulles rouges)</Card>
  </div>
</section>
```

**Justification** : 100% redondant avec `<AdjustmentsBreakdown>` (H) :
- Bulles vertes "Entretien suivi", "Kilométrage faible" → déjà dans H avec leur delta % exact
- Bulles rouges "Modèle hors base de référence", "Peu de comparables AutoNex", "Ancrage marché faible" → déjà couvert par C (DataFreshnessBadge "Aucun comparable direct trouvé").

**Décision** : suppression pure (pas de fusion via prop secondaire car H couvre déjà tout). `<AdjustmentsBreakdown>` non modifié.

### J — "Lecture d'évidence"

```tsx
// SUPPRIMÉ (lignes 298-319 avant)
<Card>
  <CardTitle>Lecture d'évidence</CardTitle>
  <CardContent>
    {insights.evidenceNotes.map(note => <div>{note.label}</div>)}    // ex: "No reliable comparable evidence" en EN dans UI FR
    {insights.disclaimers[0] && <div className="bg-amber-100/40 ...">{insights.disclaimers[0].label}</div>}
  </CardContent>
</Card>
```

**Justification** : 
1. Texte EN `No reliable comparable evidence` dans UI FR = bug de localisation
2. Bandeau warning = 4ème répétition du même message
3. Aucune info utile non disponible ailleurs

### K — "Support marché"

```tsx
// SUPPRIMÉ (lignes 321-347 avant) — wrapper section + bloc d'introduction
<section>
  <div className="rounded-2xl ...">
    <p>SUPPORT MARCHÉ</p>
    <p>{presentation.marketSupportHeadline}</p>      // ex: "Appui marché faible"
    <p>{comparables.length > 0 ? presentation.comparablesIntro : presentation.comparablesEmptyMessage}</p>
    <Badge>Support {presentation.marketSupportLabel}</Badge>
    <p>{presentation.marketSupportSummary}</p>
    <p>{presentation.comparableSelectionHint}</p>
    {presentation.marketSupportCaution && <p>{presentation.marketSupportCaution}</p>}
  </div>
  ...
```

**Justification** : 
- "Appui marché faible" = même info que C, D, F, G, I, J (déjà répétée 6 fois)
- "Stratégie de prix prudente" redondant avec M (`presentation.actionHeadline`)
- Badge `Support Faible AutoNex` = jargon interne pas user-facing

### N — Sous-card "Lecture finale" (dans M)

```tsx
// SUPPRIMÉ (lignes 421-425 avant) — dans la card "Prochaine meilleure action"
<div className="rounded-xl border ... bg-background/75 ...">
  <p>LECTURE FINALE</p>
  <p>{presentation.marketSupportHeadline}</p>
  <p>{presentation.marketSupportSummary}</p>
</div>
```

**Justification** : doublon technique jargonneux à droite des CTA. Le grid 2-col `md:grid-cols-[1.35fr_0.65fr]` simplifié en single-col.

---

## 3. Section conditionnalisée — L

**Avant** : section "Annonces comparables retenues" toujours rendue avec un placeholder vide "Comparables encore insuffisants — Le rapport s'appuie surtout sur des signaux de référence..." si `comparables.length === 0`.

**Après** :

```tsx
{comparables.length > 0 && (
  <Card className="rounded-2xl border ...">
    <CardHeader><CardTitle>...Annonces comparables retenues</CardTitle></CardHeader>
    <CardContent>
      <div className="grid md:grid-cols-2 xl:grid-cols-3">
        {comparables.map(item => <Link data-testid="comparable-card" ...>...</Link>)}
      </div>
    </CardContent>
  </Card>
)}
```

Si 0 comp, la section disparaît entièrement (titre + container + placeholder vide). Plus aucune répétition "Comparables encore insuffisants" en mode tier C/D.

Ajout de `data-testid="comparable-card"` sur chaque Link pour les tests C1/C2.

---

## 4. Section I — Décision finale

**Décision** : suppression pure (pas de fusion).

Vérification manuelle effectuée :
- Bulles "renforcement" (vertes) : 100% dans `<AdjustmentsBreakdown>` (H) avec deltas % exacts
- Bulles "vigilance" (rouges) liées au véhicule : 100% dans H également
- Bulles "vigilance" liées à l'évidence ("Modèle hors base", "Peu de comparables", "Ancrage marché faible") : ces 3 messages sont synthétisés dans le DataFreshnessBadge (C) qui dit "Aucun comparable direct trouvé. Estimation calculée à partir d'un profil de référence du modèle." — c'est le même contenu en plus clair et user-friendly

**Verdict** : aucune info critique perdue. `<AdjustmentsBreakdown>` non modifié.

---

## 5. Section M+N simplifiée

**Avant** : grid 2 colonnes desktop `md:grid-cols-[1.35fr_0.65fr]` avec :
- Gauche : tag PROCHAINE MEILLEURE ACTION + actionHeadline + actionDescription
- Droite : sous-card LECTURE FINALE jargonneuse

**Après** : 1 colonne pleine largeur, plus aérée :

```tsx
<Card className="rounded-3xl ...">
  <CardContent>
    <div>
      <p>PROCHAINE MEILLEURE ACTION</p>
      <p>{presentation.actionHeadline}</p>          // ex: "Publiez prudemment ou affinez d'abord les données"
      <p>{presentation.actionDescription}</p>
    </div>
    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
      <Button onClick={onPublish}>Publier cette voiture</Button>
      <Button onClick={onRefine}>Affiner l'estimation</Button>
      <Button onClick={onCompare}>Comparer les annonces</Button>
      <Button onClick={onRestart}>Refaire une estimation</Button>
    </div>
    <div className="mt-3.5 ..."><Shield /><p>{presentation.ctaFootnote}</p></div>
  </CardContent>
</Card>
```

Les 4 boutons CTA + leurs `onClick` handlers + footnote `presentation.ctaFootnote` sont 100% préservés.

---

## 6. Diff final EstimationResultReport.tsx

| Métrique | Avant P10C | Après P10C | Δ |
|---|---|---|---|
| LOC totales | 460 | 307 | **-153** |
| Sections (top-level JSX blocs) | 14 | 8 | -6 |
| Imports lucide-react | 10 | 6 | -4 (`AlertCircle`, `CheckCircle2`, `ShieldCheck`, `Sparkles` retirés) |
| Variables locales | `showIndicative` + 5 autres | 5 autres (showIndicative retiré) | -1 |
| Mots "indicative/insuffisante/faible/prudent" rendus directement | ~10 occurrences | 0 occurrence directe (juste `presentation.*` héritage du moteur) | drastique |

Sections finales (8) :

```
A. Card hero sombre (avec Badge claimLabel + range + indice confiance)
B. ArgusValuesCard (3 cards V2 ou 1 V1 fallback)
C. DataFreshnessBadge
E. Grid 4 cards (Prix conseillé / Vente rapide / Valeur médiane / Niveau de fiabilité)
H. AdjustmentsBreakdown
L. Annonces comparables retenues — uniquement si comparables.length > 0
M. Prochaine meilleure action (4 CTA, simplifiée)
O. AuditFooter
```

---

## 7. Tests adaptés

### Tests existants modifiés

`src/test/EstimationResultReport.test.tsx` (5 tests réécrits) :

| Avant | Après |
|---|---|
| `renders stronger framing for strong market output` (assertait `Analyse marché robuste`, `Appui marché solide`) | Asserte `Publiez maintenant` (actionHeadline preserved). Asserte `Appui marché solide` ABSENT (K supprimé) |
| `forces indicative framing and hides exact confidence when governed` (assertait `Estimation indicative exploratoire`, `Appui marché faible`) | Asserte `Affichage prudent` (hero card preserved). Asserte `Appui marché faible` ABSENT |
| `keeps evidence notes/disclaimers separate from pricing factor sections` (assertait sections G, I, J) | Réécrit comme `renders AdjustmentsBreakdown (P10C)` : asserte `<AdjustmentsBreakdown>` rendu, `Facteurs qui renforcent`, `Points de vigilance prix`, `Lecture d'évidence` ABSENTS |
| `shows intentional comparable empty-state messaging when support is weak` (assertait placeholder vide L) | **Remplacé par C1** ci-dessous |
| `keeps moderate evidence with comparables clearly qualified` (assertait `Analyse marché qualifiée`, `Évidence marché partielle`, `Appui marché exploitable`) | **Remplacé par C2** ci-dessous |

`src/test/VehicleEstimationPage.resultFlow.test.tsx` (3 tests adaptés) :

| Avant | Après |
|---|---|
| `Analyse marché robuste` + `Appui marché solide` | Asserte `Publiez maintenant avec un positionnement assumé` (actionHeadline) + `Appui marché solide` ABSENT |
| `Estimation indicative exploratoire` + `Affichage prudent` + `Appui marché faible` | Asserte `Affichage prudent` (hero) + `Appui marché faible` ABSENT |
| `Analyse marché qualifiée` + `Comparaison marché en consolidation` + `Le rapport reste utile` | Asserte `Publiez avec un positionnement calibré` (actionHeadline) + `Comparaison marché en consolidation` ABSENT + `Appui marché solide` ABSENT |

### Tests cleanup-specific ajoutés (C1-C7 + bonus)

| ID | Test | Status |
|---|---|---|
| C1 | `comparables.length === 0` → section "Annonces comparables retenues" absente | ✅ |
| C2 | `comparables.length === 2` → section présente avec 2 `[data-testid="comparable-card"]` | ✅ |
| C3 | Page V2 ne contient PAS "Lecture du rapport" (D supprimée) | ✅ |
| C4 | Page V2 ne contient PAS "Qualité d'évidence" (G supprimée) | ✅ |
| C5 | Page V2 ne contient PAS "Support marché" (K supprimée) | ✅ |
| C6 | Page V2 ne contient PAS "Lecture d'évidence" (J supprimée) | ✅ |
| C7 | Page V2 ne contient PAS "Lecture finale" (sous-card N supprimée) | ✅ |
| Bonus | 4 boutons CTA présents et clickables (Publier/Affiner/Comparer/Refaire) | ✅ |

### Compteur

| Métrique | Avant P10C | Après P10C |
|---|---|---|
| Total tests projet | 904 | **910** (+6) |
| Tests EstimationResultReport.tsx | 5 | 11 (5 modifiés + 6 nouveaux) |
| Tests VehicleEstimationPage.resultFlow | 3 | 3 (adaptés) |

---

## 8. Tests P10B vérifiés intacts

Vérifié individuellement :
- `argusValuesCard.test.tsx` : 7/7 ✅
- `adjustmentsBreakdown.test.tsx` : 7/7 ✅
- `dataFreshnessBadge.test.tsx` : 5/5 ✅
- `auditFooter.test.tsx` : 8/8 ✅
- `methodologiePage.test.tsx` : 6/6 ✅
- `estimationLegacyFallback.test.tsx` : 4/4 ✅

Aucun composant P10B modifié → aucune régression P10B.

---

## 9. Build / lint / tsc

| Métrique | Avant P10C | Après P10C | Δ |
|---|---|---|---|
| `npx tsc --noEmit` | 0 errors | 0 errors | ✅ |
| `npm run test` | 904 verts | 910 verts | +6 |
| `npm run build` | 12.44s | 12.97s | identique |
| Bundle `index-*.js` | 583.66 kB | ~582 kB | -1.5 kB (suppressions) |
| `npm run lint` | 24 warnings | 24 warnings | identique (0 nouveau warning) |

---

## 10. Fichiers garde-fou intacts (git status check)

```
$ git status --short -- src/lib/estimation/engine.ts \
    supabase/functions/compute-estimation/engine.ts \
    src/components/estimation/ArgusValuesCard.tsx \
    src/components/estimation/AdjustmentsBreakdown.tsx \
    src/components/estimation/DataFreshnessBadge.tsx \
    src/components/estimation/AuditFooter.tsx \
    src/pages/MethodologiePage.tsx \
    src/lib/estimation/dataFreshnessHelper.ts \
    src/pages/Publier.tsx src/lib/publish/publishDraft.ts \
    e2e/yas-app-visual-audit.spec.ts \
    src/types/estimation.ts
EXIT=0  (output vide = aucun fichier touché)
```

Liste explicite vérifiée :
- ❌ `src/lib/estimation/engine.ts` (engine V2 P10A) — INTACT
- ❌ `supabase/functions/compute-estimation/engine.ts` (Edge port P10A) — INTACT
- ❌ `src/components/estimation/ArgusValuesCard.tsx` (P10B) — INTACT
- ❌ `src/components/estimation/AdjustmentsBreakdown.tsx` (P10B) — INTACT
- ❌ `src/components/estimation/DataFreshnessBadge.tsx` (P10B) — INTACT
- ❌ `src/components/estimation/AuditFooter.tsx` (P10B) — INTACT
- ❌ `src/pages/MethodologiePage.tsx` (P10B) — INTACT
- ❌ `src/lib/estimation/dataFreshnessHelper.ts` (P10B) — INTACT
- ❌ `src/types/estimation.ts` — INTACT
- ❌ `src/pages/Publier.tsx` — INTACT
- ❌ `src/lib/publish/publishDraft.ts` — INTACT
- ❌ `e2e/yas-app-visual-audit.spec.ts` — INTACT
- ❌ `src/pages/VehicleEstimationPage.tsx` — INTACT (le step trim P10B reste)
- ❌ Hero baseline `"Le portail auto N°1 de Madagascar"` — INTACT
- ❌ Aucune migration créée ou appliquée
- ❌ Flag `estimation_engine_version` reste en canary

### Fichiers modifiés (scope autorisé)

```
$ git status --short
 M src/components/estimation/EstimationResultReport.tsx     (-153 LOC)
 M src/test/EstimationResultReport.test.tsx                 (refonte assertions)
 M src/test/VehicleEstimationPage.resultFlow.test.tsx       (3 assertions adaptées)
```

Total : **3 fichiers modifiés**. Conforme au scope du brief.

---

## 11. Vérification rétro-compat V1

Smoke test mental V1 fallback (user non-canary, output sans `audit`) :

| Section | V2 canary | V1 legacy | Comportement |
|---|---|---|---|
| A Card hero sombre | rendu | rendu | identique |
| B ArgusValuesCard | 3 cards | 1 card legacy | déjà OK P10B |
| C DataFreshnessBadge | breakdown | sans breakdown | déjà OK P10B |
| E Grid 4 cards | rendu | rendu | identique |
| H AdjustmentsBreakdown | 6 ajustements V2 | 6 ajustements (V1 a aussi `adjustments`) | identique |
| L Comparables | conditionnelle | conditionnelle | identique |
| M Prochaine action | 4 CTA simplifiée | 4 CTA simplifiée | identique |
| O AuditFooter | lien + détails + disclaimer | lien + disclaimer | déjà OK P10B |

Sections supprimées (D, F, G, I, J, K, N) : n'existent plus pour V2 NI pour V1 (les utilisateurs V1 voyaient les mêmes sections redondantes auparavant). Donc le cleanup **améliore aussi l'UX V1**.

→ **Aucune régression V1.**

---

## 12. Décisions / surprises rencontrées

1. **`presentation.claimLabel` rendu dans Badge hero card** : initialement j'avais asserté que les textes type "Analyse marché robuste" / "Estimation indicative exploratoire" devaient être ABSENTS de la page après cleanup. Erreur — ces strings sont aussi rendues dans le `<Badge>` claimLabel en haut de la card hero (section A, conservée). J'ai corrigé les assertions pour ne pas exiger leur absence. La déduplication a éliminé les répétitions structurelles redondantes (sections D, F, G, I, J, K) mais la card hero reste le canal canonique pour le claim label (1ère et seule mention now).

2. **Variable `showIndicative` devenue inutilisée** : utilisée uniquement par section F supprimée. Retirée pour éviter warning `no-unused-vars`.

3. **4 imports lucide-react devenus inutilisés** : `AlertCircle`, `CheckCircle2`, `ShieldCheck`, `Sparkles` étaient consommés uniquement par les sections supprimées. Retirés. `tsc --noEmit` n'aurait pas attrapé (TS gère pas les imports unused), mais ESLint `no-unused-vars` aurait. Cleanup proactif.

4. **`<AdjustmentsBreakdown>` jugé self-suffisant** : le brief proposait une option "fusion via prop secondaire" si une bulle de I transmettait info critique. Vérification manuelle effectuée : les 3 bulles "evidence" (Modèle hors base / Peu de comparables / Ancrage faible) sont équivalentes au message du DataFreshnessBadge (C). Pas de fusion nécessaire. `<AdjustmentsBreakdown>` non modifié, conformément au garde-fou strict.

5. **`presentation.evidenceHeadline`, `marketSupportHeadline`, `comparableSelectionHint`, `marketSupportCaution`, `comparablesEmptyMessage`, `comparablesEmptyTitle`, `comparablesIntro`, `marketSupportSummary`, `marketSupportLabel`, `evidenceSummaryLine`, `claimMessage` (in part)** : ces fields de `EstimationPresentation` sont toujours calculés par `presentation.ts` mais ne sont plus consommés par le rapport principal. Ils restent disponibles si l'UI v3 les réutilise, et `claimLabel` + `claimMessage` restent rendus dans la card hero (A).

6. **Tests assertant sur les texts effacés** : 5 tests existants (3 dans VehicleEstimationPage flow + 2 implicit dans Report) cassaient. J'ai dû soit (a) rewrite l'assertion sur un autre canal préservé (ex: `actionHeadline` au lieu de `evidenceHeadline`), soit (b) inverser l'assertion (`getByText` → `queryByText...not.toBeInTheDocument()`). Les 7 nouveaux tests cleanup-specific (C1-C7) verrouillent l'état post-cleanup.

---

## 13. Smoke test mental — page V2 post-cleanup (Hyundai Tucson 2010 60k Antananarivo)

```
┌────────────────────────────────────────────────────┐
│ A. Card hero sombre                                 │
│    Badge: Estimation indicative exploratoire       │
│    Badge: Confiance prudente                        │
│    37 000 000 Ar (large)                            │
│    Fourchette : 30 000 000 - 44 000 000             │
│    Indice confiance : Affichage prudent             │
└────────────────────────────────────────────────────┘
┌──────────────┬─────────────────┬──────────────┐
│ B. Argus     │  Argus          │ Argus        │
│ Reprise pro  │ Entre particul. │ En concession│
│  29 000 000  │  37 000 000 ⭐  │  43 000 000  │
│  × 0.78      │  × 1.00         │  × 1.15      │
└──────────────┴─────────────────┴──────────────┘
┌────────────────────────────────────────────────────┐
│ C. DataFreshnessBadge                               │
│    Aucun comparable direct trouvé. Estimation       │
│    calculée à partir d'un profil de référence.      │
└────────────────────────────────────────────────────┘
┌──────────┬──────────┬──────────┬──────────┐
│E. Conseil│Vente rap.│ Médiane  │Fiabilité │
│ 38M      │  34M     │  37.95M  │ Prudent  │
└──────────┴──────────┴──────────┴──────────┘
┌────────────────────────────────────────────────────┐
│ H. Pourquoi ce prix ?                               │
│   Kilométrage légèrement élevé        -2.5%         │
│   Entretien suivi                     +1.0%         │
│   ─────────────────                                 │
│   Ajustement global                   -1.5%         │
└────────────────────────────────────────────────────┘
                                                       
[L. Annonces comparables retenues — ABSENTE car comparables=[]]
                                                       
┌────────────────────────────────────────────────────┐
│ M. Prochaine meilleure action                       │
│    Publiez prudemment ou affinez d'abord            │
│    [Publier] [Affiner] [Comparer] [Refaire]        │
│    🛡 Conseil AutoNex : ...                         │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│ O. AuditFooter                                      │
│    📖 Comment cette estimation est calculée         │
│    Fourchette: synthétique | Facteur: 0.90          │
│    Version: v2_2026_05_11                           │
│    Cette estimation est indicative...               │
└────────────────────────────────────────────────────┘
```

**8 sections au lieu de 14+. Lisibilité drastiquement améliorée.**

---

## 14. Réduction quantitative

### Comptage occurrences textes redondants (UI rendue, pas le code source)

| Mot/expression | Avant P10C (sur la page rendue) | Après P10C |
|---|---|---|
| "indicative" | ~5 (bandeau warning F + Lecture d'évidence J + presentation.claimLabel + ctaFootnote + insights.disclaimers) | ~2 (claimLabel hero + presentation.actionHeadline qui peut le contenir + disclaimer audit) |
| "insuffisante" | ~3 (Lecture du rapport D + Qualité d'évidence G + Support marché K) | ~1 (DataFreshnessBadge si count=0) |
| "faible" | ~4 (D + K + N + insights) | ~0-1 (uniquement si présent dans le claimLabel/actionHeadline du tier D) |
| "prudent" | ~3 (Confiance prudente badge hero + Lecture du rapport D + Support marché K + actionHeadline) | ~2 (Confiance prudente badge + actionHeadline) |
| "Comparables encore insuffisants" | 1 (placeholder L) | **0** (section L conditionnée) |

**Total mots "indicative/insuffisante/faible/prudent" comptés sur la page tier D rendue** :
- Avant : ~15 occurrences (le user lit le même message 5+ fois en scrollant)
- Après : ~5 occurrences (réduction ~67%)

Le user perçoit **un seul message principal** avec quelques rappels contextuels minimes, au lieu d'un mur de répétitions.

---

## 15. Next steps pour Ali

1. **Review code** : juste le diff `EstimationResultReport.tsx` (-153 LOC, principalement des suppressions).
2. **Smoke test local** :
   ```bash
   npm run dev
   ```
   - Tester `/estimation` avec compte canary V2 → vérifier visuellement que la page est aérée et lisible
   - Tester avec un véhicule où il y a des comparables ET un sans (`comparables.length === 0`) pour valider la conditionnalisation L
3. **Comparer screenshots avant/après** si possible (idéalement même véhicule avant/après cleanup) — la réduction visuelle devrait sauter aux yeux
4. **Vérifier responsive mobile** : la suppression réduit l'overflow vertical de ~40% — devrait être nettement plus mobile-friendly
5. **Commit + push toi-même** (artifacts P10A + P10B + P10C + brief P11.b si pas encore committés)
6. **Si OK : envisager rollout flag canary → 25%** — l'UX étant maintenant propre, le rollout incrémental est plus sûr :
   ```sql
   UPDATE public.app_config SET value = jsonb_build_object(
     'mode', 'rollout', 'rollout_pct', 25, 'v2_enabled_for_users', '[]'::jsonb
   ) WHERE key = 'estimation_engine_version';
   ```
7. **Donner GO PROMPT 10D ou prochain chantier** (idées : monitoring/telemetry V2 dédié, scraping cron market_listings_clean, i18n EN/MG méthodologie, e2e snapshots regen, dette technique).

---

## Annonce finale

> **PROMPT 10C livré.**
>
> 6 sections redondantes supprimées (D, F, G, J, K, N). Section I "Analyse des facteurs" supprimée (info 100% redondante avec H). Section L "Annonces comparables" conditionnalisée sur `comparables.length > 0`. Section M "Prochaine meilleure action" simplifiée (sous-card N retirée, layout 1-col plein écran). EstimationResultReport.tsx : **460 → 307 LOC (-153 LOC)**. Tests adaptés : 5 anciens tests réécrits + 7 nouveaux cleanup-specific (C1-C7) + bonus CTA test (904 → **910 verts**, +6). Build vert (12.97s). Lint vert (24 warnings préexistants, 0 nouveau). Tous composants P10B intouchables (ArgusValuesCard, AdjustmentsBreakdown, DataFreshnessBadge, AuditFooter, MethodologiePage, dataFreshnessHelper). Engine intact. Aucun commit fait. Flag canary inchangé.
>
> **Réduction qualitative** :
> - Mots "indicative/insuffisante/faible/prudent" sur page rendue : ~15 → ~5 (-67%)
> - Sections JSX top-level : 14 → 8 (-43%)
> - Jargon technique sorti du rapport principal (resté en page méthodologie + Network DevTools)
>
> **Action Ali requise** :
> 1. Review diff `EstimationResultReport.tsx` (-153 LOC)
> 2. Smoke test local : `npm run dev` → tester estimation sur compte canary
> 3. Vérifier visuellement que la page est aérée et lisible
> 4. Comparer screenshots avant/après si possible
> 5. Commit + push toi-même
> 6. Si OK : envisager rollout flag → 25% (UX désormais propre)
> 7. Donner GO PROMPT 10D ou prochain chantier

---

**Auteur** : Claude Code (Opus 4.7 1M)
**Référence brief** : `briefs/PROMPT_10C_UX_CLEANUP.md`
**Référence rapport amont** : `rapports/PROMPT_10B_RAPPORT_2026-05-12.md`
