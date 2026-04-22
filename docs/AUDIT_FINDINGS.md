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
- **P-rename publish sections** (post-P6) : harmoniser les paths des 4 sections du flow publish sous `src/pages/publish/sections/`. État actuel :
  - `src/pages/publish/components/PublishBasicInfoSection.tsx` (step 0)
  - `src/pages/publish/components/PublishDetailsSection.tsx` (step 1)
  - `src/pages/publish/components/PublishMediaSection.tsx` (step 2)
  - `src/components/publish/PublishStepVisibility.tsx` (step 3, dossier distinct)

  Scope : 4 git mv + ~6-10 updates d'imports. Zéro risque logique. PR dédié `chore: harmonize publish sections paths` après Phase 6.
- **Mixed i18n pattern publish sections** (post-P6) : `PublishBasicInfoSection` et `PublishDetailsSection` utilisent simultanément `useTranslation()` importé directement ET `labels` prop venant du parent. Harmoniser vers un pattern unique (tout `useTranslation()` dans les sections, `labels` prop supprimée). Scope : ~20-30 substitutions par section, zéro risque logique.
- **P-test publish integration** (post-P6) : ajouter 3 tests d'intégration sur flows publish non couverts par les 236 tests Vitest existants :
  1. autosave debounced avec `lastSavedAt` visible UI,
  2. cleanup unmount qui DELETE un draft <4 chars et PRÉSERVE un draft ≥4 chars (pattern stale closure du commit `aff1c30`),
  3. publish success flow avec `pending_review` en DB.

  Également à envisager : snapshot tests sur contenu dropdowns publish (`BODY_STYLE_OPTIONS`, `FUEL_OPTIONS`, etc.) pour attraper les omissions accidentelles type "moto" (cf rapport 6.4.c).
- **P-email-transactional-boost-expiry** (P11) : infra email transactionnel à valider avant Q6 email J-1 expiration boost. Fallback MVP = toast in-app only.
- **P-refund-boost-on-delete** (P11) : pas de refund boost sur suppression annonce (décision produit alignée Jiji 10+ ans). Mitigation UI : message "crédits non remboursables" clairement affiché à la confirmation boost. Possibilité `add_credits` admin manuel pour gestes commerciaux exceptionnels.
- **P-credits-expiration-12mo** (P11) : expiration crédits 12 mois depuis achat (modèle Jiji). À implémenter : colonne `expires_at` dans `credits_ledger` positive entries + `consume_credits` RPC skip entries expirées + UI warning "vos crédits expirent le DD/MM/YYYY" sur `/credits`. À clarifier dans T&C et FAQ.
- **P-tcs-credits-clauses** (P11) : rédaction des clauses T&C à faire en parallèle (juriste/rédacteur) — "crédits sans valeur monétaire / non remboursables / non transférables / non échangeables / expiration 12 mois / no refund boost actif". Liens vers T&C à intégrer à chaque achat dès P11.b.
- **P-gitignore-sitemap-artifacts** (basse priorité) : `npm run prebuild` régénère plusieurs fichiers dans `public/sitemaps/` (`agencies-prerender-data*.json`, `listings-prerender-data*.json`, `listings-html-data*.jsonl`, `listings-*.xml`) qui ne sont pas trackés en git. Convention de fait = "régénérés au build, pas committés". Ajouter un commit dédié `chore: gitignore generated sitemap caches` avec patterns explicites pour prévenir les `git add public/sitemaps/` accidentels. Fichiers historiquement trackés à conserver (fallbacks SEO) : `public/sitemap.xml`, `public/sitemaps/prerender-routes.json`, `public/sitemaps/static.xml`.
- ✅ **RESOLVED (Mission P.2.1, 2026-04-22) — Supabase JWT algorithm mismatch (ES256 vs HS256)** : Initialement identifié en P.2 Étape 8.B comme blocker PRÉ-P.3 : Supabase émettait des JWT en ES256 (migration récente asymmetric signing keys) mais le toggle Dashboard "Verify JWT with legacy secret" sur `vpi-initiate-payment` + `vpi-check-status` faisait une pré-vérification HS256 au niveau gateway, rejetant toute requête user-authenticated avec `401 UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM` avant même d'atteindre le code des fonctions.

  **Résolution** : désactivation du Dashboard toggle "Verify JWT with legacy secret" sur les 2 fonctions concernées. La validation ES256 est alors déléguée au serveur Supabase Auth via `supabase.auth.getUser(jwt)` côté code, qui émet un GET REST `/auth/v1/user` — endpoint qui valide nativement ES256 (puisque c'est le même serveur qui a émis le token). Aucun changement de code nécessaire (les 2 fonctions avaient déjà le guard `if (!authHeader) → 401` et `auth.getUser()` dans leur flow auth). Re-smoke TEST 7 (ghost tx + user JWT → 404 tx_not_found) + TEST 8 full E2E (initiate → dry-run-checkout → webhook → service_approve RPC → credits_balance=200 → replay idempotence) : 9 PASS / 0 FAIL, sans bypass SQL, sans service_role. Investigation SDK a confirmé (`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:2460-2467`) que `getUser(jwt)` délègue toujours la validation au serveur Auth via REST, donc compatible ES256 out-of-the-box.

- 🟢 **OPTIMISATION POSSIBLE (Path Y — post-P.3 si besoin)** : remplacer `supabase.auth.getUser(jwt)` par un helper JWKS local (`_shared/vpi-jwt-verify.ts`) qui fetch la clé publique depuis `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, cache 1h, et valide ES256 via Web Crypto API. Évite un round-trip réseau (~50-100 ms) vers `/auth/v1/user` à chaque appel user-auth. À évaluer si le polling `vpi-check-status` devient fréquent en prod ou si la latence perçue sur `vpi-initiate-payment` (un seul appel au clic "Payer", moins critique) dégrade l'UX. Décorrélé de la sécurité : les deux approches valident une signature émise par le même serveur.

- 🟢 **Alignement spec ↔ code sur `vpi-check-status` response** (basse priorité) : le mega-prompt smoke test P.2 Étape 8.4 attendait un champ `source: "db_terminal"` dans la réponse JSON, mais le code actuel retourne `terminal: boolean` à la place. Le comportement métier est strictement équivalent. À décider : renommer `terminal` → `source` au prochain commit de `vpi-check-status`, ou mettre à jour la doc/spec pour refléter le champ actuel. Soft preference pour conserver `terminal` (déjà largement référencé dans les tests smoke).

- 🟡 **Post-P.5 (après 7 jours stabilité VPI) — étendre Sentry VPI analytics** : l'instrumentation de base (`captureVpiError` / `captureVpiMessage` dans `src/lib/monitoring.ts`) a été ajoutée en P.4.B, avec tags `feature=vpi` + `action=initiate|check_status_fetch|check_status_timeout|return_missing_tx`. Actions à câbler une fois les volumes prod réels connus :
  - Dashboard Sentry dédié filtré sur `feature=vpi`
  - Alertes Slack/email sur seuils (ex: >10 erreurs `initiate`/h, >5 `check_status_timeout`/h, tout `webhook_rpc_failure` côté backend log)
  - Calibrer les seuils après 7 jours d'observation pour éviter le bruit

- `Toaster` ET `Sonner` sont tous deux montés dans App.tsx — consolider