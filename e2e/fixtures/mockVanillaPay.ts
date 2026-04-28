import type { Page, Route } from "@playwright/test";

/**
 * Intercept the Supabase Edge Function `vpi-initiate-payment` and return a
 * fake successful checkout payload. The fake checkout_url points back at the
 * same origin so the browser doesn't actually navigate to vanilla-pay.net.
 *
 * Use BEFORE clicking the "Mobile Money" / "Carte bancaire" pay buttons.
 *
 * The matching transaction must be inserted separately via service-role
 * (insertPendingTransaction in seedDatabase.ts) since the real edge function
 * is what would normally create the row.
 */
export async function mockVpiInitiateSuccess(
  page: Page,
  opts: { transactionId: string; amountMga?: number },
) {
  await page.route(/.*\/functions\/v1\/vpi-initiate-payment.*/i, async (route: Route) => {
    const callbackBase = new URL("/paiement/retour", page.url() || "http://localhost").toString();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        checkout_url: `${callbackBase}?status=success&reference=E2E_FAKE_REF&tx=${opts.transactionId}`,
        transaction_id: opts.transactionId,
        amount_mga: opts.amountMga ?? 25_000,
        bonus_credits: 0,
        pack_credits: 200,
        total_credits_expected: 200,
        dry_run: true,
      }),
    });
  });

  // Belt-and-braces: catch any direct request to vanilla-pay.net (the real
  // checkout_url normally lives on that domain) and short-circuit it with the
  // same callback so the test never reaches the external portal.
  await page.route(/.*vanilla-pay\.net.*/i, async (route: Route) => {
    const callbackUrl = `${page.url()
      .split("?")[0]
      .replace(/\/[^/]*$/, "")}/paiement/retour?status=success&reference=E2E_FAKE_REF`;
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<html><head><title>E2E Mock</title></head><body><script>window.location.href=${JSON.stringify(callbackUrl)}</script></body></html>`,
    });
  });
}

/** Force the edge function to return an "amount_cap_exceeded" failure. */
export async function mockVpiInitiateFailure(page: Page) {
  await page.route(/.*\/functions\/v1\/vpi-initiate-payment.*/i, async (route: Route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "amount_cap_exceeded" }),
    });
  });
}
