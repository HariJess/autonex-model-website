import type { Page } from "@playwright/test";
import { TEST_USERS } from "../fixtures/testUsers";

/**
 * Dismiss AutoNex's cookie consent banner if visible.
 *
 * The banner is rendered with role="dialog" aria-label="Bandeau de consentement
 * cookies" and is sticky at the bottom of the viewport. On mobile (iPhone 13
 * viewport, 390px wide) it covers the bottom half of the screen and intercepts
 * pointer events on the form's submit button, so dismiss it before interacting.
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
 * Login a seeded test user via the actual UI form (not a session injection).
 *
 * Routes (verified against src/App.tsx):
 *   buyer -> /login        (LoginPage from AuthPages.tsx)
 *   admin -> /admin/login  (AdminLoginPage.tsx; redirects to /admin/overview on success)
 */
export async function loginAs(page: Page, role: "buyer" | "admin") {
  const user = TEST_USERS[role];
  const loginPath = role === "admin" ? "/admin/login" : "/login";

  await page.goto(loginPath);

  // Dismiss the cookie banner — on mobile viewports it sits on top of the
  // form's submit button and intercepts the click.
  await dismissCookieBanner(page);

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
