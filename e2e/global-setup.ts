import { seedE2EUsers } from "./fixtures/seedDatabase";

/**
 * Fragment of the production Supabase project ref. If the resolved URL contains
 * this string, we refuse to run the seed: a misconfigured .env.test (or a
 * bypassed dotenv loader) must never end up writing test users / transactions
 * into prod.
 */
const PROD_URL_FRAGMENT = "wtkedamrmtvdoippqanc";

/**
 * Playwright global setup. Runs once before any test.
 *
 * Reads (after playwright.config.ts has loaded .env.test):
 *   - SUPABASE_URL or VITE_SUPABASE_URL  : staging project URL
 *   - SUPABASE_SERVICE_ROLE_KEY          : staging admin key (NEVER bundle this)
 *
 * Failure to find these aborts the test run loudly so we don't run tests
 * against a half-seeded DB.
 */
async function globalSetup(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for E2E setup.\n" +
        "Configure .env.test (staging) before running E2E tests. See docs/E2E_TESTING.md.",
    );
  }

  // Belt-and-braces safety guard: refuse to seed if the resolved URL points at
  // production. If this fires, .env.test was overridden somewhere (or the
  // dotenv loader was bypassed) and continuing would write test rows into prod.
  if (supabaseUrl.includes(PROD_URL_FRAGMENT)) {
    throw new Error(
      `REFUSED: E2E setup resolved Supabase URL to ${supabaseUrl}, which matches the prod project.\n` +
        "This would pollute prod data. Confirm .env.test points at the staging project " +
        "(VITE_SUPABASE_URL_TEST) and that no shell env var is overriding it.",
    );
  }

  console.log(`[E2E] Seeding test users on ${supabaseUrl}...`);
  await seedE2EUsers(supabaseUrl, serviceRoleKey);
  console.log("[E2E] Seed complete.");
}

export default globalSetup;
