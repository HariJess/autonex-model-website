# RLS Integration Tests

Tests d'intégration runtime qui vérifient que les Row Level Security policies
de Supabase bloquent bien les accès cross-user. Tournent contre un projet
Supabase staging dédié — JAMAIS contre la prod.

## Setup

Prérequis :

- Projet Supabase staging avec toutes les migrations appliquées
- `.env.test` à la racine du repo (gitignored) contenant :
  - `VITE_SUPABASE_URL_TEST` — URL du projet staging (ex. `https://xxx.supabase.co`)
  - `VITE_SUPABASE_PUBLISHABLE_KEY_TEST` — clé anon publique du projet staging
  - `SUPABASE_SERVICE_ROLE_KEY_TEST` — clé service_role du projet staging (JAMAIS commiter)
- `dotenv-cli` installé (déjà en devDependencies)

## Lancer les tests

```bash
npm run test:rls
```

Durée : ~30-60 secondes. Chaque test crée 2 users via Supabase Auth Admin
(opération réseau réelle, pas mockée). Le pool est `singleFork` pour
sérialiser et éviter les conflits de rate-limit Auth.

## Pourquoi pas en CI ?

- Réseau réel + création de users = lent (~2-3s par test)
- Risque de rate-limit Auth si le CI lance souvent
- Dépendance externe (le projet staging) qui peut être down

À lancer manuellement avant chaque release et après tout changement de RLS.

## Architecture

Chaque test fait :

1. **Setup** (`beforeEach`) — `createTestUser` × 2 → Alice + Bob via service_role
2. **Seed** — insertion des données d'Alice (listing, ledger, transaction…) via service_role
3. **Attaque** — Bob (anon client + JWT après `signInWithPassword`) tente une opération malveillante
4. **Assert** — vérifie soit une erreur RLS, soit un effet zéro (post-check via service_role)
5. **Cleanup** (`afterEach`) — `deleteTestUser` cascade les FK ON DELETE

Trois clients Supabase distincts via `client-factory.ts` :

- `createServiceClient()` — bypass total des RLS, setup uniquement
- `createAnonClient()` — anon sans JWT, pour les endpoints publics (lead form)
- `createUserClient(email, password)` — anon + JWT user → soumis aux RLS

## Couverture actuelle (18 scenarios)

| File                     | Scenarios |
|--------------------------|-----------|
| `profiles.rls.test.ts`   | S1, S2, S3 |
| `credits.rls.test.ts`    | S4, S5, S6 |
| `transactions.rls.test.ts`| S7, S8, S9 |
| `listings.rls.test.ts`   | S10, S11, S12 |
| `phone-reveal.rls.test.ts`| S13, S14 |
| `leads.rls.test.ts`      | S15, S16 |
| `agencies.rls.test.ts`   | S17, S18 |

## Ajouter un test

1. Identifier la table sensible
2. Créer un fichier `<table>.rls.test.ts` ou ajouter dans un fichier existant
3. Pattern :
   - `beforeEach` : `alice = await createTestUser(...); bob = await createTestUser(...);`
   - Body : seed pour Alice via `createServiceClient()`, attaque via `bobClient`
   - Assert : `data null/empty` OU `error truthy` OU vérification post-coup via service_role
   - `afterEach` : `deleteTestUser` × 2 (cascade FK nettoie le reste)

## Failing tests = real findings

Si certains tests ne passent pas, c'est de l'**information** : la policy RLS
correspondante a un trou. **Ne supprime pas le test** — investigue la cause :

- "Bob cannot self-promote to admin" fail → trigger d'escalation absent ou contourné
- "Bob cannot UPDATE alice's listing" fail → policy listings UPDATE cassée
- "Public CAN insert lead" fail avec policy denial → policy publique trop stricte
- "Bob cannot SELECT alice.credits_balance" fail → policy SELECT profile lit la balance (rappel: la policy actuelle est `USING (true)`, donc ce test peut faillir et c'est un finding réel à mitiger)

## Troubleshooting

- **`Missing test env vars (...)`** : `.env.test` absent ou clés manquantes. Le client-factory liste précisément la clé manquante.
- **`createUser failed: rate limit exceeded`** : Supabase Auth rate limit. Attendre 1 min entre runs ou utiliser un projet staging dédié à ces tests.
- **Tests timeout (>30s)** : staging trop lent. Augmenter `testTimeout` dans `vitest.rls.config.ts`.
- **`violates RLS policy` sur seed** : un test utilise `bobClient` au lieu de `createServiceClient()` pour seed. Le seed bypasse toujours les RLS.
