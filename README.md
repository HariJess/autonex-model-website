# ImmoNex Madagascar

ImmoNex is a real-estate marketplace for Madagascar: property listings (sale, rent, vacation), agencies, and a credit-based monetization layer (publication, boosts, agency spotlight).

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
| `npm run preview` | Preview production build   |
| `npm run lint`    | ESLint                     |
| `npm run test`    | Vitest unit tests          |
| `npx tsc --noEmit`| Typecheck without emit     |

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
