import { defineConfig, devices } from "@playwright/test";

/**
 * Config Playwright dédiée à l'audit visuel YAS.
 *
 * Volontairement *séparée* de `playwright.config.ts` :
 *   - pas de `globalSetup` (l'audit ne dépend pas de données seedées)
 *   - pas de `webServer` (s'attache à un dev server existant sur 8090)
 *   - 2 viewports : iPhone 13 (390×844) + Galaxy S8+ (360×740)
 *   - reporter "list" (pas de HTML/CI)
 *
 * Lancement : `npx playwright test -c playwright.audit.config.ts`
 * Prérequis : `npm run dev` actif sur http://localhost:8090.
 */

const BASE_URL = process.env.YAS_AUDIT_BASE_URL ?? "http://localhost:8090";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/yas-app-visual-audit.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Désactive prefers-reduced-motion → captures stables même avec animations
    // CSS désactivées via stylesheet injecté dans le test (cf. spec).
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "iphone-13",
      use: {
        ...devices["iPhone 13"],
      },
    },
    {
      name: "galaxy-s8plus",
      use: {
        // Galaxy S8+ : viewport 360×740, devicePixelRatio 4, isMobile.
        viewport: { width: 360, height: 740 },
        deviceScaleFactor: 4,
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (Linux; Android 9; SM-G955F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      },
    },
  ],
});
