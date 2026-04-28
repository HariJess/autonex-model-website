import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { mockVpiInitiateSuccess } from "./fixtures/mockVanillaPay";
import {
  cleanupE2EData,
  insertPendingTransaction,
} from "./fixtures/seedDatabase";
import { TEST_PACK } from "./fixtures/testUsers";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Mobile-only happy path. Same flow as happy-path.spec.ts up through the
 * VPI initiate redirect, but on an iPhone 13 viewport so we catch responsive
 * regressions on /credits (pack grid wraps to single column, pay buttons
 * stack vertically, scroll-into-view needed before clicking).
 *
 * The admin step is intentionally skipped: the back-office UI is desktop-only
 * by design (sidebar nav, dense tables) and the value of this mobile spec is
 * confirming the BUYER side works on a phone.
 */
test.describe("Happy path on mobile viewport (iPhone 13)", () => {
  test.afterEach(async () => {
    if (SUPABASE_URL && SERVICE_ROLE) {
      await cleanupE2EData(SUPABASE_URL, SERVICE_ROLE);
    }
  });

  test("buyer initiates purchase on mobile", async ({ page }) => {
    test.skip(!SUPABASE_URL || !SERVICE_ROLE, "missing SUPABASE env vars");

    const txId = await insertPendingTransaction(
      SUPABASE_URL,
      SERVICE_ROLE,
      TEST_PACK.id,
      TEST_PACK.amountMga,
    );

    await loginAs(page, "buyer");
    await mockVpiInitiateSuccess(page, { transactionId: txId, amountMga: TEST_PACK.amountMga });

    await page.goto("/credits");

    const packCard = page.getByTestId(`pack-${TEST_PACK.id}`);
    await packCard.scrollIntoViewIfNeeded();
    await expect(packCard).toBeVisible({ timeout: 10_000 });
    await packCard.click();

    const payButton = page.getByTestId("pay-mobile-money");
    await payButton.scrollIntoViewIfNeeded();
    await payButton.click();

    await expect(page).toHaveURL(/\/paiement\/retour/, { timeout: 15_000 });
  });
});
