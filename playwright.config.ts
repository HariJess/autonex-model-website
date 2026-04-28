import { defineConfig, devices } from "@playwright/test";
import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve __dirname under ESM (Vite/Node loader). Required because this config
// is loaded as ESM by Playwright.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.test BEFORE reading any process.env in this file.
// This routes every E2E run to the staging Supabase project so we can never
// pollute prod data by accident.
dotenvConfig({ path: path.resolve(__dirname, ".env.test") });

// Map the *_TEST suffixed vars to the names the test code expects.
// .env.test owns the staging credentials; the test code stays env-agnostic.
if (process.env.VITE_SUPABASE_URL_TEST && !process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL_TEST;
}
if (process.env.VITE_SUPABASE_URL_TEST && !process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL_TEST;
}
if (process.env.VITE_SUPABASE_PUBLISHABLE_KEY_TEST && !process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY_TEST;
}
if (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY_TEST &&
  !process.env.VITE_SUPABASE_PUBLISHABLE_KEY
) {
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY_TEST;
}
if (process.env.SUPABASE_SERVICE_ROLE_KEY_TEST && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_TEST;
}

const PORT = process.env.E2E_PORT ? parseInt(process.env.E2E_PORT, 10) : 4173;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Playwright config for AutoNex E2E tests.
 *
 * Tests target the staging Supabase project (loaded from .env.test above).
 * The vanilla_pay edge function is intercepted via Playwright's route() — the
 * tests never hit the real vanilla-pay.net portal.
 *
 * Sequential execution (workers: 1, fullyParallel: false) is required because the
 * tests share a single seeded buyer / admin in the test DB and would race on
 * transactions and credits_ledger rows.
 *
 * Run locally:  npm run e2e
 * Run UI mode:  npm run e2e:ui
 * Run debug:    npm run e2e:debug
 *
 * Required vars in .env.test (see docs/E2E_TESTING.md):
 *   - VITE_SUPABASE_URL_TEST
 *   - VITE_SUPABASE_PUBLISHABLE_KEY_TEST
 *   - SUPABASE_SERVICE_ROLE_KEY_TEST  (for global-setup seeding only — NEVER bundle)
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html"], ["github"]] : "list",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
      testIgnore: "**/*.mobile.spec.ts",
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 13"],
      },
      testMatch: "**/*.mobile.spec.ts",
    },
  ],
  webServer:
    process.env.CI || process.env.E2E_USE_RUNNING_SERVER
      ? undefined
      : {
          // Rebuild before preview so the bundle picks up the staging vars
          // mapped above (npm run preview serves dist/ as-is).
          command: "npm run build && npm run preview -- --port 4173",
          port: 4173,
          timeout: 180_000,
          reuseExistingServer: !process.env.CI,
          env: {
            VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "",
            VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? "",
            VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
            // Propagate the beta-gate vars so the staging bundle's
            // useBetaAccess.unlock() can compare against the same code the
            // E2E helper types into the form.
            VITE_BETA_LOCK_ENABLED: process.env.VITE_BETA_LOCK_ENABLED ?? "",
            VITE_BETA_ACCESS_CODE: process.env.VITE_BETA_ACCESS_CODE ?? "",
          },
        },
});
