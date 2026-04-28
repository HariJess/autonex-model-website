import type { Page } from "@playwright/test";
import { TEST_USERS } from "../fixtures/testUsers";

/**
 * Login a seeded test user via the actual UI form (not a session injection).
 *
 * Routes (verified against src/App.tsx 2026-04-29):
 *   buyer -> /login   (LoginPage from AuthPages.tsx)
 *   admin -> /admin/login (AdminLoginPage.tsx; redirects to /admin/overview on success)
 */
export async function loginAs(page: Page, role: "buyer" | "admin") {
  const user = TEST_USERS[role];
  const loginPath = role === "admin" ? "/admin/login" : "/login";

  await page.goto(loginPath);

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
