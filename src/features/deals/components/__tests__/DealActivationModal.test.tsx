import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DealActivationModal } from "@/features/deals/components/DealActivationModal";

// Mock i18n : t(key, fallback) renvoie le fallback (= défaut FR du composant)
// pour permettre des assertions sur les libellés sans charger i18next.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallbackOrOpts?: unknown) => {
      if (typeof fallbackOrOpts === "string") return fallbackOrOpts;
      if (fallbackOrOpts && typeof fallbackOrOpts === "object") {
        const opts = fallbackOrOpts as Record<string, unknown> & { defaultValue?: string };
        let str = typeof opts.defaultValue === "string" ? opts.defaultValue : _key;
        for (const k of Object.keys(opts)) {
          if (k === "defaultValue") continue;
          str = str.split(`{{${k}}}`).join(String(opts[k]));
        }
        return str;
      }
      return _key;
    },
  }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    formatPrice: (v: number) => `${v} Ar`,
    formatPriceSecondary: () => "",
    currency: "MGA",
    setCurrency: vi.fn(),
  }),
}));

const { mockMutate, mockMutationState } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockMutationState: { isPending: false as boolean },
}));

vi.mock("@/features/deals/hooks/useDealMutations", () => ({
  useActivateDeal: () => ({
    mutate: mockMutate,
    isPending: mockMutationState.isPending,
  }),
}));

const baseListing = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Toyota Hilux 2020",
  price_mga: 100_000_000,
};

function renderModal(overrides: Partial<Parameters<typeof DealActivationModal>[0]> = {}) {
  const props = {
    listing: baseListing,
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
    ...overrides,
  };
  return { ...render(<DealActivationModal {...props} />), props };
}

describe("DealActivationModal", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockMutationState.isPending = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the current price and disables the activate CTA initially", () => {
    renderModal();
    expect(screen.getByText("Prix actuel")).toBeInTheDocument();
    // formatPrice mock = `${v} Ar` → "100000000 Ar"
    expect(screen.getAllByText("100000000 Ar").length).toBeGreaterThan(0);
    const activateBtn = screen.getByRole("button", { name: "Activer le deal" });
    expect(activateBtn).toBeDisabled();
  });

  it("does not show the preview until both discount AND duration are picked", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "-10%" }));
    expect(screen.queryByText("Aperçu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activer le deal" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "7 jours" }));
    expect(screen.getByText("Aperçu")).toBeInTheDocument();
  });

  it("computes new price = floor(price * (1 - %/100)) — same formula as the RPC", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "-15%" }));
    fireEvent.click(screen.getByRole("button", { name: "14 jours" }));

    // 100_000_000 * 0.85 = 85_000_000
    const preview = screen.getByText("Aperçu").parentElement!;
    expect(within(preview).getByText("85000000 Ar")).toBeInTheDocument();
    // savings 15_000_000
    expect(within(preview).getByText("15000000 Ar")).toBeInTheDocument();
  });

  it("accepts a valid custom discount within [5, 30]", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Personnalisé" }));
    const input = screen.getByLabelText("Personnalisé") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "30 jours" }));

    expect(screen.getByRole("button", { name: "Activer le deal" })).not.toBeDisabled();
    // 100_000_000 * 0.88 = 88_000_000
    const preview = screen.getByText("Aperçu").parentElement!;
    expect(within(preview).getByText("88000000 Ar")).toBeInTheDocument();
  });

  it("rejects a custom discount below 5%", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Personnalisé" }));
    const input = screen.getByLabelText("Personnalisé") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "7 jours" }));

    expect(screen.getByText("Choisissez un entier entre 5 et 30.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activer le deal" })).toBeDisabled();
  });

  it("rejects a custom discount above 30%", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Personnalisé" }));
    const input = screen.getByLabelText("Personnalisé") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: "7 jours" }));

    expect(screen.getByText("Choisissez un entier entre 5 et 30.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activer le deal" })).toBeDisabled();
  });

  it("calls mutate with the right params on activate", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "-20%" }));
    fireEvent.click(screen.getByRole("button", { name: "30 jours" }));
    fireEvent.click(screen.getByRole("button", { name: "Activer le deal" }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const [params] = mockMutate.mock.calls[0];
    expect(params).toEqual({
      listingId: baseListing.id,
      discountPercent: 20,
      durationDays: 30,
    });
  });

  // ─── Sprint 7 deals — mode "tape directement le nouveau prix" ────────────

  it("priceMode: typing a valid new price derives the % and enables activate", () => {
    renderModal();
    const priceInput = screen.getByLabelText("Ou saisis directement le nouveau prix") as HTMLInputElement;
    // 100M → 80M = -20%
    fireEvent.change(priceInput, { target: { value: "80000000" } });
    fireEvent.click(screen.getByRole("button", { name: "7 jours" }));

    // Helper "Soit -20 % (économie 20000000 Ar)"
    expect(screen.getByText(/Soit -20 %/)).toBeInTheDocument();

    // Aperçu utilise floor(price * (1 - 20/100)) = 80_000_000
    const preview = screen.getByText("Aperçu").parentElement!;
    expect(within(preview).getByText("80000000 Ar")).toBeInTheDocument();

    // Activate doit être activable
    expect(screen.getByRole("button", { name: "Activer le deal" })).not.toBeDisabled();
  });

  it("priceMode: typing a price > current price shows priceTooHigh error and disables activate", () => {
    renderModal();
    const priceInput = screen.getByLabelText("Ou saisis directement le nouveau prix") as HTMLInputElement;
    fireEvent.change(priceInput, { target: { value: "110000000" } });
    fireEvent.click(screen.getByRole("button", { name: "7 jours" }));

    expect(
      screen.getByText("Le nouveau prix doit être inférieur au prix actuel."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activer le deal" })).toBeDisabled();
  });

  it("priceMode: typing a price that implies discount > 30% shows discountTooHigh error", () => {
    renderModal();
    const priceInput = screen.getByLabelText("Ou saisis directement le nouveau prix") as HTMLInputElement;
    // 100M → 50M = -50% (au-delà du max 30%)
    fireEvent.change(priceInput, { target: { value: "50000000" } });
    fireEvent.click(screen.getByRole("button", { name: "7 jours" }));

    expect(screen.getByText(/Remise maximum : 30 %/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activer le deal" })).toBeDisabled();
  });

  it("priceMode: typing a price that implies discount < 5% shows discountTooLow error", () => {
    renderModal();
    const priceInput = screen.getByLabelText("Ou saisis directement le nouveau prix") as HTMLInputElement;
    // 100M → 98M = -2% (sous le min 5%)
    fireEvent.change(priceInput, { target: { value: "98000000" } });
    fireEvent.click(screen.getByRole("button", { name: "7 jours" }));

    expect(screen.getByText(/Remise minimum : 5 %/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activer le deal" })).toBeDisabled();
  });

  it("priceMode ↔ presetMode sync: clicking chip -10% after typing price updates the input value", () => {
    renderModal();
    const priceInput = screen.getByLabelText("Ou saisis directement le nouveau prix") as HTMLInputElement;
    // 1) user tape un prix
    fireEvent.change(priceInput, { target: { value: "80000000" } });
    expect(priceInput.value).toBe("80000000");

    // 2) puis clique chip -10%
    fireEvent.click(screen.getByRole("button", { name: "-10%" }));

    // L'input prix doit afficher le prix dérivé : floor(100M * 0.9) = 90M
    expect(priceInput.value).toBe("90000000");
  });
});
