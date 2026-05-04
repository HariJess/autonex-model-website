import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FALLBACK_PRICING } from "@/hooks/usePricing";

/**
 * Regression test PROMPT 5 — fix bug ICU runtime latent identique au
 * PROMPT 3.8 sur CreditPacksGrid.
 *
 * `balance.toLocaleString("fr-MG")` faisait silencieusement fallback sur
 * "150000" sans NBSP sur Node minimal / Safari ancien / pré-rendu SEO.
 * Le hero passe désormais par `formatNumber` (regex robuste, NBSP U+00A0
 * garanti indépendamment du runtime ICU).
 */

const NBSP = " ";

vi.mock("@/hooks/useCreditsBalance", () => ({
  useCreditsBalance: () => ({ data: 150_000, isPending: false }),
}));

vi.mock("@/hooks/usePricing", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/usePricing")>(
    "@/hooks/usePricing",
  );
  return {
    ...actual,
    usePricing: () => ({
      prices: actual.FALLBACK_PRICING,
      boostPrice: () => 0,
      totalBoosts: () => 0,
      totalPublication: () => 0,
      isLoading: false,
      error: null,
    }),
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      fallback?: string | { defaultValue?: string },
      opts?: Record<string, unknown>,
    ) => {
      const dv = typeof fallback === "string" ? fallback : fallback?.defaultValue ?? "";
      if (!opts) return dv;
      return Object.entries(opts).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        dv,
      );
    },
  }),
}));

async function importHero() {
  return await import("@/pages/credits/components/CreditsBalanceHero");
}

describe("CreditsBalanceHero — fix ICU fallback (PROMPT 5)", () => {
  it("formate le solde 150 000 avec NBSP (U+00A0) garanti runtime-indépendant", async () => {
    const { CreditsBalanceHero } = await importHero();
    render(<CreditsBalanceHero />);
    const balanceEl = screen.getByTestId("credits-balance");
    expect(balanceEl.textContent).toBe(`150${NBSP}000`);
  });

  it("FALLBACK_PRICING reste exposé (sanity check pour le mock)", () => {
    expect(FALLBACK_PRICING.publish_listing).toBeGreaterThan(0);
  });
});
