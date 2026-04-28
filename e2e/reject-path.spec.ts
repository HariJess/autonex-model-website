import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { mockVpiInitiateSuccess } from "./fixtures/mockVanillaPay";
import {
  cleanupE2EData,
  insertPendingTransaction,
  resetBuyerCredits,
} from "./fixtures/seedDatabase";
import { TEST_PACK } from "./fixtures/testUsers";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

test.describe("Reject path: admin rejects a pending transaction, no credits granted", () => {
  test.beforeEach(async () => {
    if (SUPABASE_URL && SERVICE_ROLE) {
      await resetBuyerCredits(SUPABASE_URL, SERVICE_ROLE);
    }
  });

  test.afterEach(async () => {
    if (SUPABASE_URL && SERVICE_ROLE) {
      await cleanupE2EData(SUPABASE_URL, SERVICE_ROLE);
    }
  });

  test("admin rejects, no credits granted", async ({ page, browser }) => {
    test.skip(!SUPABASE_URL || !SERVICE_ROLE, "missing SUPABASE env vars");

    // STEP 1 — pre-create a pending transaction.
    const txId = await insertPendingTransaction(
      SUPABASE_URL,
      SERVICE_ROLE,
      TEST_PACK.id,
      TEST_PACK.amountMga,
    );

    // STEP 2 — buyer triggers the (mocked) initiate flow so the UI shows
    // the same state as the happy path before admin action.
    await loginAs(page, "buyer");
    await mockVpiInitiateSuccess(page, { transactionId: txId, amountMga: TEST_PACK.amountMga });
    await page.goto("/credits");
    await page.getByTestId(`pack-${TEST_PACK.id}`).click();
    await page.getByTestId("pay-mobile-money").click();
    await expect(page).toHaveURL(/\/paiement\/retour/, { timeout: 15_000 });

    // Capture buyer balance BEFORE admin action so we can compare after.
    await page.goto("/credits");
    const balanceBefore = await page
      .getByTestId("credits-balance")
      .innerText({ timeout: 15_000 })
      .catch(() => "0");

    // STEP 3 — admin rejects.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAs(adminPage, "admin");
    await adminPage.goto("/admin/monetisation");

    const txRow = adminPage.getByTestId(`tx-row-${txId}`);
    await expect(txRow).toBeVisible({ timeout: 15_000 });

    await txRow.getByTestId("reject-tx-btn").click();

    // Optional reason input; if it appears, fill it.
    const reasonInput = adminPage.getByLabel(/motif|raison/i).first();
    if (await reasonInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await reasonInput.fill("E2E test rejection");
    }

    await txRow.getByTestId("confirm-reject-tx-btn").click();
    await expect(adminPage.getByText(/rejet[ée]e|refus[ée]e/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await adminContext.close();

    // STEP 4 — buyer balance must be unchanged (no credits granted).
    await page.goto("/credits");
    const balanceAfter = await page
      .getByTestId("credits-balance")
      .innerText({ timeout: 15_000 });

    expect(balanceAfter).toBe(balanceBefore);
  });
});
