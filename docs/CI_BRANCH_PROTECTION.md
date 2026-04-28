# Configuration CI + Branch Protection (action manuelle requise)

Une fois les commits du sprint 1+2+3 mergés sur `main`, Ali doit configurer GitHub UI pour activer la protection de la branche.

## 1. Secrets CI (optionnel mais recommandé)

Les workflows `.github/workflows/ci.yml` utilisent des placeholders pour `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` au moment du build. Le bundle compile sans jamais taper Supabase, c'est suffisant pour valider la build. Pour un build de fidélité (par exemple si on ajoute plus tard des vérifications statiques qui dépendent du client Supabase), ajouter les secrets :

- Repo Settings > Secrets and variables > Actions > New repository secret
- `VITE_SUPABASE_URL_CI` = URL Supabase prod ou staging dédié
- `VITE_SUPABASE_ANON_KEY_CI` = clé anon publique correspondante

Le workflow lit `${{ secrets.VITE_SUPABASE_URL_CI || 'placeholder' }}`, donc absence de secret = placeholder, jamais d'échec sur secret manquant.

## 2. Branch protection sur `main`

- Settings > Branches > Branch protection rules > Add rule (ou edit existing)
- Branch name pattern : `main`
- Cocher :
  - [x] Require a pull request before merging
    - Required approvals : `0` (Ali bosse seul, mais on garde la PR comme gate de CI)
    - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require status checks to pass before merging
    - [x] Require branches to be up to date before merging
    - Status checks required (apparaissent dans le picker après le 1er run de CI) :
      - `ci / Typecheck + Lint + Test + Build`
      - `migration-check / Validate migration files` (apparaît seulement quand la PR touche `supabase/migrations/**`)
  - [x] Require conversation resolution before merging
  - [x] Do not allow bypassing the above settings
  - [ ] Allow force pushes : DÉSACTIVÉ
  - [ ] Allow deletions : DÉSACTIVÉ

## 3. Workflow de chantier post-protection

Plus de push direct sur `main`. Pour chaque chantier :

```bash
git checkout -b feat/mon-chantier
# ... commits ...
git push origin feat/mon-chantier
# Ouvrir PR sur GitHub UI ou via gh pr create
# Attendre CI verte (~3-5 min)
# Merge via UI GitHub (Squash & merge ou Rebase, selon préférence)
```

C'est environ 30 secondes de plus par chantier. Le bénéfice : un push qui ne typecheck pas / ne build pas / casse les tests ne touche jamais la prod.

## 4. Que valide chaque workflow ?

### `ci.yml` (toutes les PR + push direct main)

1. `npm ci` — install propre
2. `npm run typecheck` — `tsc --noEmit -p tsconfig.app.json`
3. `npx eslint --quiet "src/**/*.{ts,tsx}"` — lint silencieux
4. `npm run test -- --run` — vitest unit tests (mocks Supabase, pas besoin de vraie DB)
5. `npm run build` — Vite production build avec placeholders Supabase

Timeout : 15 min. En pratique tourne en ~3-5 min.

### `migration-check.yml` (PR qui touchent `supabase/migrations/**`)

1. Vérifie le format de nom de chaque fichier : `YYYYMMDDHHMMSS_snake_case.sql`
2. Bloque les migrations contenant `DROP TABLE` sans `IF EXISTS` ou `TRUNCATE` (DB Migration Policy v2 considère ces opérations comme destructive et exige confirmation manuelle d'Ali — on ne devrait pas voir ces patterns en PR)

Timeout : 5 min.

## 5. Tests RLS d'intégration (hors CI)

Les tests sous `src/test/rls/*.rls.test.ts` ne tournent **pas** dans la CI standard. Ils nécessitent une instance Supabase staging et les variables `VITE_SUPABASE_URL_TEST` / `VITE_SUPABASE_PUBLISHABLE_KEY_TEST` (voir `src/test/rls/README.md`). Lancer manuellement avec `npm run test:rls` avant un release majeur ou un changement RLS sensible.

Si tu veux les ajouter en CI plus tard : workflow séparé déclenché en `workflow_dispatch` (manuel) ou `schedule` (nightly), avec les secrets staging.
