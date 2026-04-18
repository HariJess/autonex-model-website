# Audit externe AutoNex — Findings détaillés

Audit réalisé avril 2026. Notes pour référence lors des améliorations.

---

## Priorité 1 — Route regex cassée

**Fichier :** `src/App.tsx` ligne ~70

**Problème :** la route utilise une syntaxe regex dans le path :
```tsx
<Route path="/:transactionSlug(acheter|location-longue-duree|location-courte-duree)" element={<SeoLandingPage />} />
```

Cette syntaxe fonctionnait en React Router v5 mais **n'est pas supportée en v6** (le projet utilise `react-router-dom ^6.30.1`). La route ne matche probablement pas ce qu'elle devrait. Les routes explicites `/acheter`, `/location-longue-duree`, `/location-courte-duree` existent au-dessus, donc c'est du code probablement mort.

**Action :** supprimer cette ligne OU la remplacer par une vraie validation côté composant si le besoin est de valider le slug.

---

## Priorité 2 — bun.lockb indésirable

**Fichier :** `bun.lockb` à la racine

**Problème :** le README dit explicitement "npm uniquement, les autres lockfiles sont ignorés par git". Pourtant `bun.lockb` (240K) est commité. Soit le `.gitignore` est cassé, soit la consigne n'est pas respectée.

**Action :** 
1. Vérifier que `bun.lockb` est bien dans `.gitignore` (ajouter sinon)
2. `git rm --cached bun.lockb`
3. Commit

---

## Priorité 3 — i18n chargé en synchrone dans le bundle principal

**Fichier :** `src/i18n/index.ts`

**Problème :** les 3 fichiers de langue (~124K au total) sont importés en top-level :
```ts
import fr from "./fr.json";  // 43K
import mg from "./mg.json";  // 42K
import en from "./en.json";  // 38K
```

Un utilisateur francophone télécharge 85K inutilement. De plus, `localStorage.getItem("autonex-lang")` est appelé au top-level → crash potentiel en SSR/test/navigation privée.

**Action :** utiliser i18next backend dynamique avec `import()` à la demande. Exemple :
```ts
i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },  // langue par défaut seulement
  // autres langues chargées à la demande via i18next-http-backend OU dynamic import
});
```

Protéger `localStorage` par `typeof window !== "undefined"`.

---

## Priorité 4 — Sur-fetching homepage

**Fichier :** `src/pages/Index.tsx` lignes ~28-30

**Problème :** la homepage fait 3 appels à `useDbListings` avec limits différents (8, 32, 48). Chaque appel déclenche en cascade : 1 query listings + 1 query listing_photos + 1 query boosts = 9 requêtes réseau au chargement. Beaucoup fetchent des données qui se chevauchent.

**Action :** un seul `useDbListings({ limit: 48 })` + sélecteurs côté client pour les 3 grilles (8 premières, 32 thématiques, 48 deals).

---

## Priorité 5 — ESLint et TypeScript strict

**Fichiers :** `eslint.config.js`, `tsconfig.json`, `tsconfig.app.json`

**Problème :** 3 filets de sécurité désactivés volontairement :
- `"@typescript-eslint/no-unused-vars": "off"` dans eslint.config.js
- `noUnusedLocals: false` dans les 2 tsconfig
- `noUnusedParameters: false` dans les 2 tsconfig

Sur 271 fichiers TS/TSX, c'est quasi certain qu'il y a du code mort (imports, variables, params).

**Action :**
1. Retirer `"@typescript-eslint/no-unused-vars": "off"` (laisser la règle par défaut)
2. Passer `noUnusedLocals: true` et `noUnusedParameters: true`
3. Lancer `npm run lint` et `npm run typecheck`
4. Nettoyer les warnings/erreurs un par un

---

## Priorité 6 — PublishPage.tsx monstrueux

**Fichier :** `src/pages/PublishPage.tsx`

**Problème :** 1630 lignes, 58 useState, 7 useEffect, 13 useMemo, 7 useCallback dans un seul composant. Impossible à tester, chaque setState re-render tout, race conditions entre états quasi-garanties.

**Action :** refactor en plusieurs temps, SANS casser le comportement :
1. Étape 1 : extraire l'état form en `useReducer` OU mieux, utiliser `react-hook-form` (déjà dans les deps !)
2. Étape 2 : déplacer chaque étape (basic, détails, médias, visibilité) dans un composant enfant avec son propre scope
3. Étape 3 : extraire la logique draft/autosave dans un hook dédié (partiellement déjà fait dans `hooks/publish/`)

À faire en plusieurs sessions Claude Code, avec commits intermédiaires.

---

## Priorité 7 — Prix crédits dupliqués

**Fichiers concernés :**
- `src/config/monetization.ts` (front)
- `supabase/migrations/20260418113000_publish_listing_with_credits.sql` (SQL)
- `supabase/migrations/20260414143000_purchase_listing_boosts.sql` (SQL)
- `supabase/migrations/20260412140100_monetization_engine_hardening.sql` (SQL - durations)

**Problème :** les prix (100 crédits publication, 20/30/40/60/120 pour les boosts) sont hardcodés à 3+ endroits. Changer un prix sans synchroniser = UI ment ou DB débite mal.

**Action :**
1. Créer une table `credit_pricing` (key TEXT PRIMARY KEY, amount INT, updated_at)
2. Migration pour seed les valeurs actuelles
3. Créer une RPC `get_pricing()` qui retourne tout
4. RPC `publish_listing_with_credits` lit depuis cette table
5. Front appelle la RPC au lieu d'utiliser les constantes dures

---

## Priorité 8 — Hack visitor_name = auth.uid()

**Fichier :** `supabase/migrations/20260413194500_phone_reveal_and_views_hardening.sql`

**Problème :** pour tracer un phone reveal, le code insère l'UUID du user dans `leads.visitor_name` (censé contenir un vrai nom). Pollution du schéma, exports CSV incompréhensibles, confusion future.

**Action :**
1. Créer une nouvelle migration qui crée `public.phone_reveal_events (user_id, listing_id, created_at)`
2. RLS : INSERT autorisé si auth.uid() = user_id, SELECT only self + admin
3. Adapter `get_listing_owner_phone` pour checker cette nouvelle table
4. Migration de données : déplacer les leads type='phone_reveal' existants vers la nouvelle table
5. Nettoyer les anciens leads polluants

---

## Priorité 9 — Tests RLS manquants

**Problème :** aucun test ne vérifie que les policies RLS font bien leur travail. Un user B pourrait techniquement lire les crédits de A si une policy régresse.

**Action :** créer `src/test/rls/` avec des tests d'intégration qui :
1. Créent 2 users A et B via Supabase
2. Tentent les opérations interdites (read credits de l'autre, update role, insert listing pour autrui, etc.)
3. Vérifient que chaque tentative retourne une erreur

Nécessite un projet Supabase de test dédié (ou docker-compose local).

---

## Priorité 10 — Monitoring erreurs absent

**Problème :** aucun outil de monitoring dans le repo. Un bug silencieux sur `publish_listing_with_credits` = perte de revenus sans alerte.

**Action :**
1. Ajouter Sentry (ou alternative : Axiom, Highlight, etc.)
2. Configurer le SDK côté front pour capturer les erreurs React + promises rejetées
3. Wrapper les RPCs critiques (publish, consume_credits) dans un try/catch qui log contextuellement
4. Idéalement : capturer aussi côté Supabase Edge Functions si vous en avez

---

## Notes secondaires (à traiter opportunément)

- `og:image` de la home = cover d'un article de blog → créer une vraie image OG 1200x630
- Fichiers `public/category-icons/*.svg.svg` : double extension, vérifier si intentionnel
- Favicon `public/favicon.ico` fait 20K, devrait faire <5K
- `strictPort: true` dans vite.config.ts : dev bloqué si port 8091 pris
- Seed listings `src/data/seed-listings.ts` : valeurs `type: "villa"` pour des voitures (conséquence du legacy)
- Scripts `scripts/catalog/reports/*.json` commités = bruit dans le repo
- Pas de `.env.example` visible à la racine
- Pas de Content-Security-Policy dans `index.html`
- `chart.tsx` utilise `dangerouslySetInnerHTML` (vérifier que l'input est bien contrôlé)
- `Toaster` ET `Sonner` sont tous deux montés dans App.tsx — consolider