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

## Database Migration Policy (v2)

**Non-destructive migrations** (CREATE TABLE, CREATE FUNCTION, ADD COLUMN, CREATE INDEX, CREATE POLICY, CREATE TRIGGER, GRANT, COMMENT) can be applied directly to production by Claude Code during an autonomous session, provided ALL of the following conditions are met:

1. All migrations are written to files in `supabase/migrations/` with proper timestamp prefix (format `YYYYMMDDHHMMSS_descriptive_name.sql`)
2. All migrations are idempotent (use `IF NOT EXISTS`, `DROP POLICY IF EXISTS ... CREATE POLICY`, etc.)
3. Claude Code commits the migration files to Git BEFORE applying to prod
4. The final report explicitly flags "Applied to prod: YES" for each migration, with SQL Editor execution output
5. Post-application smoke tests are executed (SELECT info from information_schema, basic RPC calls)
6. Types regeneration is committed right after prod application to keep Git in sync

**Destructive migrations** are NEVER applied automatically. They require explicit Ali confirmation in the chat. Destructive = any of:
- `DROP TABLE`, `DROP COLUMN`, `DROP FUNCTION`, `DROP TRIGGER`
- `ALTER COLUMN TYPE` (even with valid casts)
- `ALTER COLUMN SET NOT NULL` on existing column with NULL values
- `DELETE FROM` (data removal)
- `TRUNCATE`
- `DROP POLICY` without immediate `CREATE POLICY` recreation
- Any `REVOKE` of existing grants
- Any migration that could cause data loss, schema breakage, or auth bypass

For destructive migrations, Claude Code must:
1. Write the migration file
2. Flag it explicitly in the report with ⚠️ DESTRUCTIVE
3. Wait for Ali's explicit written confirmation in chat before applying

**Read-only queries** (SELECT, information_schema lookups, schema inspection) are always allowed during investigation.

**Conflict resolution** : if production DB state diverges from Git (e.g., migrations applied manually by Ali that aren't committed), flag with ⚠️ GIT/DB DESYNC DETECTED in the report and propose a reconciliation plan.

**Rationale** : v1 was too slow for rapid iteration. v2 balances agent velocity for safe additive changes with strict safety on destructive ones. Ali retains full control over destructive operations.

## Gotchas connus (pièges à éviter)

- Les règles ESLint `@typescript-eslint/no-unused-vars: off` et `noUnusedLocals: false` sont VOLONTAIREMENT permissives aujourd'hui — les resserrer fait partie de la priorité 5
- La colonne DB `surface` NE veut PAS dire m² — c'est le kilométrage véhicule (legacy)
- Les prix crédits sont dupliqués en 3 endroits (src/config/monetization.ts + 2 migrations SQL) — voir priorité 7
- react-hook-form EST déjà dans les dépendances mais PAS utilisé dans PublishPage — voir priorité 6