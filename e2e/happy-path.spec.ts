import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { mockVpiInitiateSuccess } from "./fixtures/mockVanillaPay";
import {
  cleanupE2EData,
  insertPendingTransaction,
} from "./fixtures/seedDatabase";
import { TEST_PACK, TEST_USERS } from "./fixtures/testUsers";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

test.describe("Happy path: buyer purchases credits, admin approves, credits granted", () => {
  test.afterEach(async () => {
    if (SUPABASE_URL && SERVICE_ROLE) {
      await cleanupE2EData(SUPABASE_URL, SERVICE_ROLE);
    }
  });

  test("end-to-end purchase flow", async ({ page, browser }) => {
    test.skip(!SUPABASE_URL || !SERVICE_ROLE, "missing SUPABASE env vars");

    // ---------------------------------------------------------------
    // STEP 1 — Pre-create a pending transaction via service role.
    // We bypass the real vpi-initiate-payment edge function because:
    //   (a) it would talk to vanilla-pay.net,
    //   (b) we want this test to be deterministic without external deps.
    // The mock below makes the UI think the call succeeded.
    // ---------------------------------------------------------------
    const txId = await insertPendingTransaction(
      SUPABASE_URL,
      SERVICE_ROLE,
      TEST_PACK.id,
      TEST_PACK.amountMga,
    );

    // ---------------------------------------------------------------
    // STEP 2 — Buyer logs in, opens /credits, clicks the pay button.
    // ---------------------------------------------------------------
    await loginAs(page, "buyer");
    await mockVpiInitiateSuccess(page, { transactionId: txId, amountMga: TEST_PACK.amountMga });

    await page.goto("/credits");

    const packCard = page.getByTestId(`pack-${TEST_PACK.id}`);
    await expect(packCard).toBeVisible({ timeout: 10_000 });
    await packCard.click();

    await page.getByTestId("pay-mobile-money").click();

    // The mock redirects to /paiement/retour?status=success — wait for that route.
    await expect(page).toHaveURL(/\/paiement\/retour/, { timeout: 15_000 });

    // ---------------------------------------------------------------
    // STEP 3 — Admin logs in (separate context = separate session) and
    // approves the pending transaction.
    // ---------------------------------------------------------------
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await loginAs(adminPage, "admin");
    await adminPage.goto("/admin/monetisation");

    const txRow = adminPage.getByTestId(`tx-row-${txId}`);
    await expect(txRow).toBeVisible({ timeout: 15_000 });

    await txRow.getByTestId("approve-tx-btn").click();

    // Toast confirmation from the approveTx mutation.
    await expect(adminPage.getByText(/approuvée|crédités/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await adminContext.close();

    // ---------------------------------------------------------------
    // STEP 4 — Buyer reloads /credits and verifies their balance.
    // The credits-balance testid wraps the numeric span in CreditsBalanceHero.
    // ---------------------------------------------------------------
    await page.goto("/credits");
    const balance = page.getByTestId("credits-balance");
    await expect(balance).toContainText(String(TEST_PACK.expectedCreditsAfterApprove), {
      timeout: 15_000,
    });

    // Sanity: the buyer's email should be in the page (header avatar / dashboard link).
    // Not asserted strictly because the header layout may not show email visibly.
    void TEST_USERS;
  });
});
