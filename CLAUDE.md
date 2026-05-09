# Contexte projet AutoNex

Marketplace automobile Madagascar. Stack : React 18 + Vite + TypeScript + Supabase + TanStack Query + i18next (fr/en/mg).

## État au 29 avril 2026

Dernier audit complet : `audit/AUDIT_COMPLET_2026-04-28.md` (note 6.5/10).

Récents (avril 2026) :
- Tracking impressions/clics partner ads (`partner_ad_events` + RPC `track_partner_ad_event`)
- Dashboard stats par campagne (`/admin/partenaires`, panneau collapsible)
- Dashboard revenus AutoNex (`/admin/revenus`, KPIs + chart + top users + breakdowns)
- View `partner_ad_campaign_stats` passée en `security_invoker = true`
- View `listings_vehicle_semantics` passée en `security_invoker = true` (29 avril)
- Code mort `src/lib/market/*.ts` (referençait service-role key) supprimé (29 avril)

En cours / planifié (Sprints 1+2+3 fusionnés, 29 avril) :
- CI GitHub Actions + Husky pre-commit + branch protection
- Indexes critiques sur `transactions` et `credits_ledger`
- Quick wins perf : blog covers WebP, libphonenumber-js/min, lazy-load i18n par langue, bundle visualizer
- Observabilité : web-vitals → GA4, doc UptimeRobot
- A11y : skip-link, ErrorBoundary icône Lucide

Différé (sprints suivants) :
- Refacto `PublishPage.tsx` (1144 lignes, 58 useState) → react-hook-form
- Bumps de dépendances majeures (React 19, vite 8, recharts 3, tailwind 4, zod 4, etc.)
- E2E Playwright sur le funnel paiement
- M-LEGACY-5 (rename `immonex_is_admin()` → `autonex_is_admin()`)
- M-DB-DESYNC-INVESTIGATION (RPC `email_log` non capturées en Git)
- PWA / service worker pour MG

## Contexte historique CRITIQUE

Le schéma DB et le `listing_type` enum legacy ImmoNex ont été **nettoyés** par le sprint M-LEGACY-4b (terminé 2026-04-27). Les colonnes legacy `surface` / `rooms` / `bathrooms` / `toilets` ont été DROP, l'enum `listing_type` aussi. La table `public.listings` utilise désormais ses colonnes véhicule natives : `mileage_km`, `doors`, `seats`, `body_style`, etc. Form fields renommés en `mileageKmInput` / `doorsInput` / `seatsInput`.

Le seul identifiant `immonex_*` qui subsiste est la fonction `public.immonex_is_admin()` — utilisée par les RLS policies, son renommage est planifié dans un sprint dédié (M-LEGACY-5) post-launch.

Documentation officielle : `docs/AUTONEX_LEGACY_SCHEMA.md` (section « Migration history (closed) »).

## Priorités

État au 29 avril 2026 (les anciennes priorités ImmoNex étaient majoritairement closes ou obsolètes — voir `audit/AUDIT_COMPLET_2026-04-28.md` pour le diagnostic à jour).

| # | Priorité | Statut | Source |
|---|----------|--------|--------|
| 1 | Route regex React Router cassée (App.tsx ligne 70) | OBSOLÈTE — la ligne 70 a été refactorisée, plus de regex bug | Anc. ImmoNex |
| 2 | Supprimer `bun.lockb` du repo | OPEN | Anc. ImmoNex |
| 3 | Lazy-load locales i18n (gain ~85 KB) | EN COURS (Sprint 1+2+3, chantier 4.3) | Anc. ImmoNex |
| 4 | Consolider 3x useDbListings sur Index.tsx | DONE — `src/pages/Index.tsx:35` n'appelle plus qu'1 fois | Anc. ImmoNex |
| 5 | ESLint strict + cleanup code mort | DONE — `eslint.config.js` met `no-unused-vars: error`, `tsconfig.app.json` a `noUnusedLocals: true` et `noUnusedParameters: true` | Anc. ImmoNex |
| 6 | Refactor `PublishPage.tsx` → react-hook-form | OPEN — 1144 lignes, 58 useState. Sprint dédié à venir | Anc. ImmoNex |
| 7 | Single source of truth coûts crédits (front + SQL) | À vérifier | Anc. ImmoNex |
| 8 | Table `phone_reveal_events` au lieu de `visitor_name=auth.uid()::text` | DONE — table créée par `20260419120000_phone_reveal_events.sql` | Anc. ImmoNex |
| 9 | Tests d'intégration RLS | DONE — 7 fichiers dans `src/test/rls/` | Anc. ImmoNex |
| 10 | Monitoring d'erreurs (Sentry) | DONE — `src/lib/monitoring.ts` + `initMonitoring()` au boot dans `main.tsx`, ErrorBoundary route les erreurs React | Anc. ImmoNex |

Findings ouverts du dernier audit (28 avril 2026) — détail dans `audit/AUDIT_COMPLET_2026-04-28.md` :
- CRITICAL : aucune CI/CD (en cours, Sprint 1+2+3 chantier 3.1)
- CRITICAL : indexes manquants `transactions(status, created_at)` + `credits_ledger(user_id, created_at)` (en cours, chantier 2.1)
- HIGH : ~5 fichiers > 800 lignes dans `src/pages/` (PublishPage géré, autres listés)
- HIGH : 4 blog covers JPG 200-348 KB à convertir WebP (en cours, chantier 4.1)
- HIGH : pas d'E2E paiement (différé)
- MEDIUM : 6 vulns npm (3 low, 3 moderate) toutes vite ≤6.4.1 (différé bump majeur)
- MEDIUM : `immonex_is_admin()` legacy (M-LEGACY-5)

## Règles strictes de travail

- JAMAIS modifier une migration SQL existante dans `supabase/migrations/` : toujours créer une nouvelle migration datée
- Après CHAQUE modif : lancer `npm run typecheck` ET `npm run test`
- Préserver le comportement UI actuel (pas de régression visible)
- Proposer un commit Git après chaque tâche terminée avec un message clair
- Demander confirmation AVANT de toucher : la DB, les fichiers de config (vite.config.ts, tsconfig, eslint.config.js), ou package.json
- Ne JAMAIS exécuter `git push` sans demander
- Une fois la branch protection activée (cf. `docs/CI_BRANCH_PROTECTION.md`) : workflow de chantier = `git checkout -b feat/<chantier>` + commits + push branche + PR + merge UI

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

- Les prix crédits sont dupliqués en plusieurs endroits (`src/config/monetization.ts` + migrations SQL) — voir priorité 7
- `react-hook-form` est déjà en dépendance mais pas utilisé dans `PublishPage` — voir priorité 6
- `recharts` (382 KB / 105 KB gzip) n'est utilisé que par les pages admin (`AdminRevenuesPage`, `CampaignStatsPanel`). Garder ce chunk isolé via `manualChunks` dans `vite.config.ts`
- Le wrapper shadcn `src/components/ui/chart.tsx` était dead code et a été supprimé le 29 avril
- Status enum `payment_status` est plus large que prévu : `pending | under_review | approved | rejected | failed | cancelled | success`. Pour le revenu, seul `approved` compte. Pour les buckets opérationnels, `rejected_count = rejected + failed + cancelled`, `pending_count = pending + under_review`
- `profiles` table n'a PAS de colonne `email` — l'email vit dans `auth.users`. RPC SECURITY DEFINER pour le joindre quand admin
- Les tests dans ce repo vivent sous `src/test/`, pas `src/test/__tests__/` ni `__tests__/`. Suivre la convention existante

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
