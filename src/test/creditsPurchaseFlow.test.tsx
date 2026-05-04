import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CreditPackRow } from "@/lib/creditPacks";
import type { VpiCheckoutSuccess } from "@/hooks/payments/useVpiCheckout";

/**
 * Tests PROMPT 5 — guard double-submit dans CreditsPurchaseFlow.
 *
 * Vérifie que le state `isRedirecting` :
 *   - garde les boutons VPI désactivés après `onSuccess` (entre la fin de
 *     mutation et la navigation effective vers VPI)
 *   - revient à false après `onError` pour que l'utilisateur puisse réessayer
 */

type MutateOpts = {
  onSuccess: (data: VpiCheckoutSuccess) => void;
  onError: (err: Error) => void;
};

const mocks = vi.hoisted(() => ({
  mutateImpl: ((_input: unknown, _opts: unknown) => {}) as (
    input: { paymentMode: string },
    opts: MutateOpts,
  ) => void,
  isPending: false as boolean,
  variables: null as null | { paymentMode: "mobile_money" | "international" },
}));

vi.mock("@/hooks/payments/useVpiCheckout", () => ({
  useVpiCheckout: () => ({
    mutate: vi.fn((input: { paymentMode: string }, opts: MutateOpts) => {
      mocks.mutateImpl(input, opts);
    }),
    isPending: mocks.isPending,
    variables: mocks.variables,
  }),
  mapVpiCheckoutErrorToI18nKey: () => "payment.vanilla.initiateFailed",
}));

const PACKS: CreditPackRow[] = [
  { id: "discover", name: "Pack Découverte", credits_amount: 25_000, bonus_credits: 0, price_mga: 25_000, sort_order: 1 },
  { id: "standard", name: "Pack Standard", credits_amount: 75_000, bonus_credits: 12_500, price_mga: 75_000, sort_order: 2 },
];

vi.mock("@/hooks/credits/usePurchaseCredits", () => ({
  usePurchaseCredits: () => ({
    selectedPackId: "discover",
    setSelectedPackId: vi.fn(),
    paymentMethod: "",
    setPaymentMethod: vi.fn(),
    proofFile: null,
    setProofFile: vi.fn(),
    promoCode: "",
    setPromoCode: vi.fn(),
    promoValidation: null,
    setPromoValidation: vi.fn(),
    creditPacks: PACKS,
    selectedPack: PACKS[0],
    paymentMethods: [],
    canSubmit: false,
    submit: vi.fn(),
    submitting: false,
  }),
}));

vi.mock("@/hooks/usePaymentFlags", () => ({
  usePaymentFlags: () => ({ isManualPaymentEnabled: false }),
}));

vi.mock("@/pages/credits/components/CreditPacksGrid", () => ({
  CreditPacksGrid: () => <div data-testid="credit-packs-grid-stub" />,
}));

vi.mock("@/pages/credits/components/CreditPurchaseForm", () => ({
  CreditPurchaseForm: () => <div data-testid="credit-purchase-form-stub" />,
}));

vi.mock("@/pages/credits/components/CreditsTransactionsHistory", () => ({
  CreditsTransactionsHistory: () => <div data-testid="credits-tx-history-stub" />,
}));

vi.mock("@/components/credits/PromoCodeInput", () => ({
  PromoCodeInput: () => <div data-testid="promo-code-input-stub" />,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | { defaultValue?: string }) => {
      const dv = typeof fallback === "string" ? fallback : fallback?.defaultValue ?? "";
      return dv;
    },
  }),
}));

async function importFlow(): Promise<{
  CreditsPurchaseFlow: (props: { variant: "standalone" | "fallback-in-publish"; children?: ReactNode }) => JSX.Element;
}> {
  return (await import("@/components/credits/CreditsPurchaseFlow")) as unknown as {
    CreditsPurchaseFlow: (props: { variant: "standalone" | "fallback-in-publish"; children?: ReactNode }) => JSX.Element;
  };
}

describe("CreditsPurchaseFlow — guard double-submit (PROMPT 5)", () => {
  const originalAssign = window.location.assign;
  const assignSpy = vi.fn();

  beforeEach(() => {
    mocks.mutateImpl = () => {};
    mocks.isPending = false;
    mocks.variables = null;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign: assignSpy },
    });
    assignSpy.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign: originalAssign },
    });
  });

  it("post-onSuccess : les boutons restent disabled (verrou isRedirecting)", async () => {
    mocks.mutateImpl = (_input, opts) => {
      opts.onSuccess({
        ok: true,
        checkout_url: "https://example.test/checkout",
        transaction_id: "tx-uuid",
        amount_mga: 25_000,
        bonus_credits: 0,
        pack_credits: 25_000,
        total_credits_expected: 25_000,
        dry_run: false,
      });
    };

    const { CreditsPurchaseFlow } = await importFlow();
    render(<CreditsPurchaseFlow variant="standalone" />);

    const mobileBtn = screen.getByTestId("pay-mobile-money") as HTMLButtonElement;
    const cardBtn = screen.getByTestId("pay-international") as HTMLButtonElement;
    expect(mobileBtn.disabled).toBe(false);
    expect(cardBtn.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(mobileBtn);
    });

    // Après onSuccess, navigation déclenchée + state isRedirecting=true
    expect(assignSpy).toHaveBeenCalledWith("https://example.test/checkout");
    expect(mobileBtn.disabled).toBe(true);
    expect(cardBtn.disabled).toBe(true);
    expect(mobileBtn.getAttribute("aria-busy")).toBe("true");
    // Label spinner "Redirection en cours..." visible
    expect(mobileBtn.textContent).toMatch(/Redirection en cours/);
  });

  it("post-onError : isRedirecting reste false → boutons cliquables à nouveau", async () => {
    mocks.mutateImpl = (_input, opts) => {
      opts.onError(new Error("initiate_failed"));
    };

    const { CreditsPurchaseFlow } = await importFlow();
    render(<CreditsPurchaseFlow variant="standalone" />);

    const mobileBtn = screen.getByTestId("pay-mobile-money") as HTMLButtonElement;
    const cardBtn = screen.getByTestId("pay-international") as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(mobileBtn);
    });

    expect(assignSpy).not.toHaveBeenCalled();
    expect(mobileBtn.disabled).toBe(false);
    expect(cardBtn.disabled).toBe(false);
    expect(mobileBtn.getAttribute("aria-busy")).toBe("false");
  });
});
