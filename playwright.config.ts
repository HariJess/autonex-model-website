import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.E2E_PORT ? parseInt(process.env.E2E_PORT, 10) : 4173;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Playwright config for AutoNex E2E tests.
 *
 * Tests target a real Supabase project (URL via SUPABASE_URL or VITE_SUPABASE_URL).
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
 * Required env vars (see docs/E2E_TESTING.md):
 *   - VITE_SUPABASE_URL or SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (for global-setup seeding only — NEVER bundle)
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
          command: "npm run preview -- --port 4173",
          port: 4173,
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
});
