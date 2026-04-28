import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import {
  cleanupE2EData,
  grantE2ECredits,
  resetBuyerCredits,
} from "./fixtures/seedDatabase";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Publish path test.
 *
 * Pre-requisite: the buyer must have exactly 100 credits at the start of the
 * test. We reset the ledger then grant 100 in beforeEach so each run starts
 * from the same balance regardless of what previous specs did.
 *
 * NOTE: PublishPage is a 1144-line / 58-useState beast (slated for refacto in
 * a future sprint). Selectors here are best-effort; iterate locally if any
 * input shape changes. The test asserts only that submission lands on a
 * success page or shows a success toast — not the exact UI text — so a label
 * tweak shouldn't break it.
 */
test.describe("Publish path: buyer with credits creates a listing", () => {
  test.beforeEach(async () => {
    if (SUPABASE_URL && SERVICE_ROLE) {
      await resetBuyerCredits(SUPABASE_URL, SERVICE_ROLE);
      await grantE2ECredits(SUPABASE_URL, SERVICE_ROLE, 100);
    }
  });

  test.afterEach(async () => {
    if (SUPABASE_URL && SERVICE_ROLE) {
      await cleanupE2EData(SUPABASE_URL, SERVICE_ROLE);
    }
  });

  test("buyer creates a listing using credits", async ({ page }) => {
    test.skip(!SUPABASE_URL || !SERVICE_ROLE, "missing SUPABASE env vars");

    await loginAs(page, "buyer");
    await page.goto("/publier");

    // Wait for the publish form to be ready (any title-like input).
    const titleInput = page.getByLabel(/titre/i).first();
    await expect(titleInput).toBeVisible({ timeout: 15_000 });

    // Required fields — best-effort. Keep the title prefix stable so cleanup
    // can target the test listings explicitly.
    await titleInput.fill("E2E Test Listing - Toyota Hilux 2020");

    const priceInput = page.getByLabel(/prix/i).first();
    if (await priceInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await priceInput.fill("50000000");
    }

    const descInput = page.getByLabel(/description/i).first();
    if (await descInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descInput.fill("Annonce de test E2E. À supprimer automatiquement.");
    }

    // Submit — try the canonical "Publier" button first, fall back to the
    // last button in the form area which is usually the submit.
    const publishBtn = page
      .getByRole("button", { name: /^publier|^valider|^soumettre/i })
      .first();
    await publishBtn.click({ timeout: 10_000 });

    // Success: either redirected to /annonce/<id>, /dashboard, or a toast appears.
    // We accept any of these as proof the submission landed.
    const successSignal = await Promise.race([
      page
        .waitForURL(/\/(annonce|dashboard)\b/, { timeout: 15_000 })
        .then(() => "redirect"),
      page
        .getByText(/publi[ée]e|en ligne|en mod[ée]ration|succ[èe]s|votre annonce/i)
        .first()
        .waitFor({ timeout: 15_000 })
        .then(() => "toast"),
    ]).catch(() => null);

    expect(successSignal).not.toBeNull();
  });
});
