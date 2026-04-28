# E2E testing avec Playwright

## Avertissement initial

Les 4 specs ajoutées dans le sprint C n'ont pas encore été lancées par Claude (l'agent qui les a écrites). La première exécution doit être faite par Ali en local pour itérer les sélecteurs si besoin et confirmer la stabilité avant d'activer le workflow CI.

## Cible Supabase staging (par défaut)

Les tests E2E pointent automatiquement vers le projet Supabase **staging** via `.env.test` (chargé par `playwright.config.ts` au démarrage de Playwright).

Variables requises dans `.env.test` à la racine du repo :

- `VITE_SUPABASE_URL_TEST` — URL du projet staging
- `VITE_SUPABASE_PUBLISHABLE_KEY_TEST` — anon key du staging
- `SUPABASE_SERVICE_ROLE_KEY_TEST` — service-role du staging (NEVER commit)
- `VITE_BETA_ACCESS_CODE` — code beta utilisé par le bundle staging pour vérifier l'unlock dans `useBetaAccess`
- `VITE_BETA_LOCK_ENABLED` — `"true"` ou `"false"`. Si `"false"`, le gate est désactivé et `passBetaGate` est un no-op
- `E2E_BETA_ACCESS_CODE` — même valeur que `VITE_BETA_ACCESS_CODE`. Lu par le helper Playwright pour le saisir dans le formulaire `/beta-login`. Si absent, le helper retombe sur `VITE_BETA_ACCESS_CODE`

`playwright.config.ts` charge ces vars puis les remappe vers les noms attendus par les specs (`SUPABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Le bloc `webServer` rebuild le front à chaque run (`npm run build && npm run preview`) pour que le bundle soit fait avec les vars staging et non avec les vars du `.env` local (prod).

**Garde de sécurité** : `e2e/global-setup.ts` refuse de tourner si l'URL Supabase résolue contient le fragment du projet prod. Impossible de polluer la DB prod par accident, même si `.env.test` est mal configuré.

`.env.test` est gitignoré via le pattern `.env.*` du `.gitignore`. Ne jamais le commit.

## Setup local

1. Installer le navigateur (~150 MB, une seule fois) :
   ```bash
   npx playwright install chromium
   ```

2. `.env.test` à la racine — variables staging :
   ```
   VITE_SUPABASE_URL_TEST=https://<staging-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY_TEST=eyJ...
   SUPABASE_SERVICE_ROLE_KEY_TEST=eyJ...
   ```

3. Lancer :
   ```bash
   npm run e2e         # tous les tests, headless
   npm run e2e:ui      # mode UI interactif (idéal pour itérer les sélecteurs)
   npm run e2e:debug   # step-by-step, ouvre devtools
   npm run e2e:report  # ouvre le dernier rapport HTML
   ```

## Specs présentes

| Fichier | Couverture |
|---------|-----------|
| `e2e/happy-path.spec.ts` | Achat pack → admin approve → 200 crédits crédités |
| `e2e/reject-path.spec.ts` | Achat pack → admin rejette → solde inchangé |
| `e2e/publish-path.spec.ts` | Buyer avec 100 crédits publie une annonce (FIXME — voir section Tests skipped) |
| `e2e/happy-path.mobile.spec.ts` | Initiation achat sur viewport iPhone 13 |

Les tests sont **séquentiels** (`workers: 1`) pour éviter les races sur le buyer/admin partagés. Auto-skippent si `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` manquent en env.

## Tests skipped

### `publish-path.spec.ts` — `buyer creates a listing using credits`

Marqué en `test.fixme()` parce que la PublishPage actuelle (1144 lignes, 58 useState) est un wizard 4-étapes avec génération automatique du titre depuis marque/modèle/année. Le test supposait un champ "Titre" éditable directement.

**À ré-implémenter** lors du sprint refacto PublishPage (planifié), où la page sera réécrite en `react-hook-form` + Zod. Ajouter alors des `data-testid` sur les inputs principaux de chaque étape (`publish-step1-type-transaction`, `publish-step2-brand`, etc.).

**Status courant des E2E** :
- `happy-path` : PASSING
- `reject-path` : PASSING
- `happy-path.mobile` : à valider
- `publish-path` : FIXME (voir ci-dessus)

## Mocks vanilla_pay

`e2e/fixtures/mockVanillaPay.ts` intercepte deux choses via `page.route()` :

1. La requête `POST /functions/v1/vpi-initiate-payment` (Edge Function Supabase) — retournée avec un JSON fake `{ ok: true, checkout_url, transaction_id }`. Le `checkout_url` pointe sur `/paiement/retour?status=success` (loop interne, pas externe).
2. Toute requête vers `vanilla-pay.net` — interceptée et redirigée par script HTML pour que le navigateur de test ne touche jamais la portail externe.

Le mock court-circuite la création réelle de la transaction. C'est pourquoi `seedDatabase.insertPendingTransaction()` est appelé en pré-test : il insère directement une ligne `pending` via service role, que l'admin pourra ensuite approuver/rejeter.

## Données de test

Seed idempotent au démarrage (`global-setup.ts`) :
- `e2e-buyer@autonex-test.local` (rôle `particulier`)
- `e2e-admin@autonex-test.local` (rôle `admin` — promu via `UPDATE profiles SET role='admin'`)

Pack utilisé : `cp_200` (pack canonique défini dans `src/config/monetization.ts`, déjà en prod).

Cleanup `afterEach` : supprime les transactions, ledger entries (sauf `e2e_test_grant`), listings dont le titre commence par `E2E Test Listing`, créés dans la dernière heure pour le buyer de test. Borné au buyer test pour ne pas toucher de la donnée réelle.

## CI

Workflow `.github/workflows/e2e.yml` (séparé de `ci.yml` pour ne pas alourdir le CI normal).

Secrets GitHub requis (à ajouter manuellement par Ali) :
- `VITE_SUPABASE_URL_CI` — URL du projet staging
- `VITE_SUPABASE_ANON_KEY_CI` — clé anon publique du staging
- `SUPABASE_SERVICE_ROLE_KEY_CI` — service-role du staging (**JAMAIS la prod**)

Tant que le secret service-role n'est pas configuré, le workflow E2E échoue immédiatement avec le message `Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` du `global-setup.ts`. C'est le comportement voulu — pas de run silencieux contre une DB indéfinie.

## Debug d'un test flaky

1. Local : `npm run e2e:debug -- happy-path.spec.ts`
2. CI : télécharger l'artifact `playwright-report` du run échoué, puis :
   ```bash
   npx playwright show-report ./playwright-report
   ```
   Trace, screenshots et vidéo de la dernière action sont disponibles.

3. Re-run avec retry forcé :
   ```bash
   CI=1 npm run e2e
   ```
   Reproduit le comportement CI (2 retries avant échec final).

## Limites connues

- **Pas de visual regression** : aucun screenshot comparison. Trop fragile pour V1, viendra plus tard quand la stack UI sera stabilisée.
- **Chromium uniquement** : pas de Firefox/WebKit. À ajouter quand un bug cross-browser sera observé en prod.
- **Selectors PublishPage best-effort** : la page est une bête de 1144 lignes en cours de refacto. Les sélecteurs `getByLabel(/titre/i)` peuvent dériver. Itérer en mode UI au premier run.
- **Mocks vanilla_pay simplifiés** : le mock retourne une réponse statique. Le vrai contrat de l'Edge Function peut évoluer (champs ajoutés, validation côté serveur changée) — surveiller les régressions sur le payload `VpiCheckoutSuccess`.
- **Admin promotion via UPDATE profiles** : si la mécanique d'admin change (ex. table `admin_users` séparée), adapter `seedE2EUsers` dans `e2e/fixtures/seedDatabase.ts`.

## Quand étendre

Ajouter de nouveaux specs dans `e2e/` quand :
- Un bug critique remonté en prod aurait été attrapé par un E2E
- Un nouveau flow paiement est introduit (ex. abonnement récurrent)
- Une nouvelle paie sensible est ajoutée (ex. flow agence)

Critère de qualité d'un nouveau spec : passe deux fois consécutives en local, en CI, en moins de 60s (sinon trop coûteux).
