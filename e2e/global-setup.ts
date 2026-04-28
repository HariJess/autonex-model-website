import { seedE2EUsers } from "./fixtures/seedDatabase";

/**
 * Playwright global setup. Runs once before any test.
 *
 * Reads:
 *   - SUPABASE_URL or VITE_SUPABASE_URL  : project URL
 *   - SUPABASE_SERVICE_ROLE_KEY          : admin key (NEVER bundle this client-side)
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
        "Set them in your local .env or in the e2e workflow secrets. See docs/E2E_TESTING.md.",
    );
  }

  console.log("[E2E] Seeding test users (buyer + admin)...");
  await seedE2EUsers(supabaseUrl, serviceRoleKey);
  console.log("[E2E] Seed complete.");
}

export default globalSetup;
