import type { Page } from "@playwright/test";
import { TEST_USERS } from "../fixtures/testUsers";

const BETA_ACCESS_CODE =
  process.env.E2E_BETA_ACCESS_CODE ?? process.env.VITE_BETA_ACCESS_CODE ?? "";

/**
 * AutoNex private-beta gate (BetaLockGate + /beta-login). On first visit
 * the gate redirects every route to /beta-login, where the user must enter
 * the access code. After unlock, useBetaAccess writes the cookie
 * `autonex_beta_access=unlocked` (30-day max-age) and the page does
 * window.location.replace("/").
 *
 * passBetaGate is idempotent: if the gate has already been passed in the
 * current browser context (cookie present, or form not visible), it noops.
 */
async function passBetaGate(page: Page): Promise<void> {
  // If we are not on /beta-login, the gate is either disabled in this
  // build (VITE_BETA_LOCK_ENABLED=false) or the cookie is already set.
  // Either way: no form to fill.
  if (!page.url().includes("/beta-login")) {
    return;
  }

  if (!BETA_ACCESS_CODE) {
    throw new Error(
      "Beta gate is showing but E2E_BETA_ACCESS_CODE (or VITE_BETA_ACCESS_CODE) " +
        "is not set. Add it to .env.test before running E2E tests.",
    );
  }

  const codeInput = page.getByLabel(/code.*acc[èe]s|code.*beta|access.*code/i).first();
  await codeInput.waitFor({ state: "visible", timeout: 10_000 });
  await codeInput.fill(BETA_ACCESS_CODE);

  await page
    .getByRole("button", { name: /acc[ée]der|valider|entrer|continuer/i })
    .first()
    .click();

  // BetaLoginPage does window.location.replace("/") on success — wait for
  // the navigation away from /beta-login.
  await page.waitForURL((url) => !url.pathname.includes("/beta-login"), {
    timeout: 15_000,
  });
}

/**
 * Login a seeded test user via the actual UI form (not a session injection).
 *
 * Routes (verified against src/App.tsx 2026-04-29):
 *   buyer -> /login   (LoginPage from AuthPages.tsx)
 *   admin -> /admin/login (AdminLoginPage.tsx; redirects to /admin/overview on success)
 *
 * If the private-beta gate is enabled in the staging build, navigating to
 * the login URL first lands on /beta-login. We pass the gate, then
 * re-navigate to the intended login route.
 */
export async function loginAs(page: Page, role: "buyer" | "admin") {
  const user = TEST_USERS[role];
  const loginPath = role === "admin" ? "/admin/login" : "/login";

  await page.goto(loginPath);

  // BetaLockGate may redirect to /beta-login. Pass it, then re-navigate.
  await passBetaGate(page);
  if (!page.url().includes(loginPath)) {
    await page.goto(loginPath);
  }

  await page.getByLabel(/email/i).first().fill(user.email);
  await page.getByLabel(/mot de passe|password/i).first().fill(user.password);
  await page
    .getByRole("button", { name: /se connecter|connexion|sign in/i })
    .first()
    .click();

  if (role === "admin") {
    await page.waitForURL(/\/admin\/(?!login)/, { timeout: 15_000 });
  } else {
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15_000,
    });
  }
}

export async function logout(page: Page) {
  await page.context().clearCookies();
  await page.context().clearPermissions();
}
