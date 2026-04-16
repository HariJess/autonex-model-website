# AutoNex Madagascar

AutoNex is an automotive marketplace for Madagascar: vehicle listings (achat, location, courte duree), concessionnaires, and a credit-based monetization layer (publication, boosts, agency spotlight).

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Router, i18next
- **Backend / data:** Supabase (PostgreSQL, Auth, Row Level Security, Storage, Edge-ready RPCs)

## Local setup

1. **Clone** the repository and install dependencies:

   ```bash
   npm install
   ```

2. **Environment:** copy `.env.example` to `.env` and fill in values from the Supabase dashboard (**Project Settings → API**):

   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (anon/public key)
   - `VITE_SUPABASE_URL`

   The `.env` file is gitignored; never commit secrets.

3. **Supabase migrations:** SQL migrations live in `supabase/migrations/`. Apply them to your linked project with the Supabase CLI (or paste into the SQL editor in the dashboard):

   ```bash
   npx supabase db push
   ```

   **You** run migrations against your own Supabase project; do not rely on the repo alone to update production.

## Commands

| Command           | Description                |
|-------------------|----------------------------|
| `npm run dev`     | Start Vite dev server      |
| `npm run build`   | Production build           |
| `npm run seo:preflight` | SEO preflight contract (warn-mode) |
| `npm run seo:preflight:staging` | Strict preflight for staging |
| `npm run seo:preflight:production` | Strict preflight for production |
| `npm run seo:verify` | Verify SEO artifacts (warn-mode) |
| `npm run seo:verify:strict` | Verify SEO artifacts (strict, fails if inventory SEO expected but missing) |
| `npm run seo:verify:staging` | Strict verify with staging thresholds |
| `npm run seo:verify:production` | Strict verify with production thresholds |
| `npm run build:release` | Release build + strict SEO verification |
| `npm run preview` | Preview production build   |
| `npm run lint`    | ESLint                     |
| `npm run test`    | Vitest unit tests          |
| `npx tsc --noEmit`| Typecheck without emit     |

## Production SEO pipeline (release gating)

AutoNex generates critical SEO artifacts during `npm run build`:

- `public/sitemap.xml` (sitemap index) + `public/sitemaps/*.xml`
- inventory exports under `public/sitemaps/` (prerender data / listing HTML data)
- listing HTML pages under `dist/annonce/<id>/index.html` (when inventory env is present)

For release safety, use:

```bash
npm run build:release
```

`build:release` now runs:

1) `seo:preflight:production` (before expensive build work)  
2) `build`  
3) `seo:verify:production`

In production preflight/verify mode, the pipeline expects:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

If these are missing, preflight fails before build starts.
If generated coverage/artifacts are insufficient, verify fails after build.

### Inventory minimum coverage thresholds

`seo:verify` now checks coverage quality, not only artifact existence.

Default thresholds:

- **local (warn mode)**: informational only (`1` sitemap URL, `1` HTML page, ratio `0.02`)
- **staging**: minimum listing sitemap URLs `50`, listing HTML pages `20`, HTML/sitemap ratio `0.10`
- **production**: minimum listing sitemap URLs `200`, listing HTML pages `100`, HTML/sitemap ratio `0.20`

The verifier logs expected vs actual counts and fails in strict mode when below thresholds.

Safe overrides (CI/env):

- `SEO_VERIFY_ENV=local|staging|production`
- `SEO_MIN_LISTING_SITEMAP_URLS`
- `SEO_MIN_LISTING_HTML_PAGES`
- `SEO_MIN_HTML_VS_SITEMAP_RATIO`
- `SEO_ENFORCE_INVENTORY_COVERAGE` (`1`/`true` to force inventory requirements)
- `SEO_ENFORCE_INVENTORY_PREFLIGHT` (`1`/`true` to force preflight inventory env checks)

### Audit artifacts

Each run writes machine-readable JSON reports:

- `artifacts/seo-preflight-report.json`
- `artifacts/seo-verify-report.json`

These reports include mode, strict flag, env presence, thresholds, result (`pass`/`warn`/`fail`), and reason codes/messages.

## Launch locally

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Git / deploy workflow

- Push code with your usual Git remote (GitHub, etc.).
- Push database changes by applying new files under `supabase/migrations/` to the target Supabase project (CLI `db push`, migration CI, or manual SQL).

## Product notes

- **Blog / conseils:** sample content may use seed data; see in-app copy and `src/data/seed-listings` where relevant.
- **Credits:** the UI’s **available balance** is driven by the sum of `credits_ledger` (see `useCreditsBalance` / `fetchCreditsBalanceFromLedger`).

## License

Proprietary — All rights reserved unless otherwise stated.
