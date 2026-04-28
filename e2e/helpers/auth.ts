import type { Page } from "@playwright/test";
import { TEST_USERS } from "../fixtures/testUsers";

const BETA_ACCESS_CODE =
  process.env.E2E_BETA_ACCESS_CODE ?? process.env.VITE_BETA_ACCESS_CODE ?? "";

/**
 * Dismiss AutoNex's cookie consent banner if visible.
 *
 * The banner is rendered with role="dialog" aria-label="Bandeau de consentement
 * cookies" and is sticky at the bottom of the viewport. On desktop it is small
 * enough to leave the beta gate's "Accéder" button reachable, but on mobile
 * (iPhone 13 viewport, 390px wide) it covers the bottom half of the screen and
 * intercepts pointer events on the gate's submit button.
 *
 * Idempotent: noops when the banner is not visible (already dismissed,
 * disabled in build, etc.). Prefers "Tout accepter" but falls back to
 * "Tout refuser" so we never leave the banner up.
 */
async function dismissCookieBanner(page: Page): Promise<void> {
  const banner = page.getByRole("dialog", {
    name: /bandeau.*consentement|cookies/i,
  });
  const isVisible = await banner.isVisible({ timeout: 1500 }).catch(() => false);
  if (!isVisible) {
    return;
  }

  const acceptButton = banner.getByRole("button", {
    name: /tout accepter|accepter tout|accepter/i,
  });
  const refuseButton = banner.getByRole("button", {
    name: /tout refuser|refuser tout|refuser/i,
  });

  if (await acceptButton.isVisible({ timeout: 500 }).catch(() => false)) {
    await acceptButton.click();
  } else if (await refuseButton.isVisible({ timeout: 500 }).catch(() => false)) {
    await refuseButton.click();
  } else {
    console.warn("[E2E] dismissCookieBanner: no accept/refuse button found in banner");
    return;
  }

  await banner.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {
    console.warn("[E2E] dismissCookieBanner: banner still visible after click");
  });
}

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

  // Dismiss the cookie banner first — on mobile viewports it sits on top of
  // the "Accéder" button and intercepts the click.
  await dismissCookieBanner(page);

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

  // BetaLockGate may redirect to /beta-login. Pass it.
  await passBetaGate(page);

  // After passBetaGate, BetaLoginPage triggers window.location.replace("/").
  // Wait for that redirect to fully settle before re-navigating, otherwise
  // the next page.goto races with the in-flight replace() and Playwright
  // throws "Navigation is interrupted by another navigation".
  await page.waitForLoadState("networkidle", { timeout: 15_000 });

  // Now safely re-navigate to the intended login route.
  if (!page.url().includes(loginPath)) {
    await page.goto(loginPath);
  }

  // AutoNex's login form uses non-htmlFor labels, so getByLabel() doesn't match.
  // Use the input type attribute instead — stable and unique per page.
  await page.locator('input[type="email"]').first().fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
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
