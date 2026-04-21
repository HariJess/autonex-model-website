# Contexte projet AutoNex

Marketplace automobile Madagascar. Stack : React 18 + Vite + TypeScript + Supabase + TanStack Query + i18next (fr/en/mg).

## ⚠️ Contexte historique CRITIQUE

Le schéma DB est hérité d'une ancienne app immobilière (ImmoNex) jamais nettoyée.
Conséquences que tu dois connaître en permanence :

- `listing_type` enum = valeurs real-estate : `appartement`, `villa`, `maison`, `terrain`, `local_commercial`, `bureau` (PAS de types véhicule natifs)
- Les colonnes SQL ont une sémantique véhicule détournée :
  - `surface` → kilométrage (km)
  - `rooms` → index de version/finition
  - `bathrooms` → nombre de portes
  - `toilets` → nombre de sièges
- Fonction `immonex_is_admin()` toujours utilisée (renommage = migration coordonnée)
- Fichiers `src/lib/legacyListingVehicleMapping.ts` + `src/lib/legacyListingsDbColumns.ts` gèrent la traduction
- Documentation officielle : `docs/AUTONEX_LEGACY_SCHEMA.md`

## Priorités (détails complets dans docs/AUDIT_FINDINGS.md)

1. Fix route regex React Router v6 cassée (src/App.tsx ligne 70)
2. Supprimer bun.lockb du repo
3. Lazy-load locales i18n (src/i18n/index.ts) — gain bundle ~85K
4. Consolider 3x useDbListings en 1 sur src/pages/Index.tsx
5. ESLint strict + cleanup code mort
6. Refactor src/pages/PublishPage.tsx (1630 lignes, 58 useState) → react-hook-form
7. Single source of truth pour les coûts crédits (front + SQL)
8. Table phone_reveal_events au lieu de visitor_name=auth.uid()::text
9. Tests d'intégration RLS
10. Monitoring d'erreurs (Sentry)

## Règles strictes de travail

- JAMAIS modifier une migration SQL existante dans supabase/migrations/ : toujours créer une nouvelle migration datée
- Après CHAQUE modif : lancer `npm run typecheck` ET `npm run test`
- Préserver le comportement UI actuel (pas de régression visible)
- Proposer un commit Git après chaque tâche terminée avec un message clair
- Demander confirmation AVANT de toucher : la DB, les fichiers de config (vite.config.ts, tsconfig, eslint.config.js), ou package.json
- Ne JAMAIS exécuter `git push` sans demander
- Quand on travaille sur une priorité, consulter la section correspondante de docs/AUDIT_FINDINGS.md

## Database Migration Policy

**CRITICAL — No auto-apply to production.**

Claude Code must NEVER run the following commands against the linked production Supabase database (project `wtkedamrmtvdoippqanc`) during an autonomous session:
- `supabase db push`
- `supabase db reset`
- `supabase migration up` (when linked to prod)
- Any direct SQL execution against prod via MCP, CLI, or any other means that modifies schema, data, or policies

Accepted workflow for migrations:
1. Create migration files in `supabase/migrations/` folder with proper timestamp prefix
2. Validate SQL syntax + logic via code review and unit tests
3. Report the migration as "created, pending prod application" in the final report
4. Ali applies the migration to production manually via:
   - Supabase Dashboard SQL Editor
   - OR `supabase db push` from his local terminal after review

If a migration has already been applied to prod during a previous agent session (edge case), flag it EXPLICITLY in the report with "⚠️ MIGRATION ALREADY APPLIED TO PROD — GIT SYNC NEEDED" so Ali can verify consistency.

Exception : read-only queries for investigation purposes (SELECT, information_schema lookups, schema inspection) are allowed and encouraged during pre-work findings. Any write operation (INSERT/UPDATE/DELETE/DDL) is forbidden.

Rationale : prod DB is shared with autonex.mg live users. Unchecked migrations can break publications, searches, admin flows. Ali must retain full control over what hits production.

## Gotchas connus (pièges à éviter)

- Les règles ESLint `@typescript-eslint/no-unused-vars: off` et `noUnusedLocals: false` sont VOLONTAIREMENT permissives aujourd'hui — les resserrer fait partie de la priorité 5
- La colonne DB `surface` NE veut PAS dire m² — c'est le kilométrage véhicule (legacy)
- Les prix crédits sont dupliqués en 3 endroits (src/config/monetization.ts + 2 migrations SQL) — voir priorité 7
- react-hook-form EST déjà dans les dépendances mais PAS utilisé dans PublishPage — voir priorité 6