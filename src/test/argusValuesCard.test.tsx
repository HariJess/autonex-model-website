import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ArgusValuesCard from "@/components/estimation/ArgusValuesCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | { defaultValue?: string }, opts?: Record<string, unknown>) => {
      const dv = typeof fallback === "string" ? fallback : fallback?.defaultValue ?? "";
      if (!opts) return dv;
      return Object.entries(opts).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        dv,
      );
    },
  }),
}));

describe("PROMPT 10D — ArgusValuesCard (2 cards)", () => {
  const v2Values = {
    tradeInPro: 23_000_000,
    privateMarket: 29_000_000,
    dealerRetail: 34_000_000,
    estimatedValue: 29_000_000,
  };

  it("V2 mode : 2 cards rendues avec les bons titres (Reprise pro / En concession)", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    expect(screen.getByTestId("argus-values-v2")).toBeInTheDocument();
    expect(screen.getByTestId("argus-card-trade_in_pro")).toBeInTheDocument();
    expect(screen.getByTestId("argus-card-dealer_retail")).toBeInTheDocument();
    expect(screen.getByText("Reprise pro")).toBeInTheDocument();
    expect(screen.getByText("En concession")).toBeInTheDocument();
  });

  it("V2 mode : pas de card 'Entre particuliers' (supprimé en P10D)", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    expect(screen.queryByTestId("argus-card-private_market")).not.toBeInTheDocument();
    expect(screen.queryByText("Entre particuliers")).not.toBeInTheDocument();
  });

  it("V2 mode : pas de badge 'Recommandé' (plus de card 'primary')", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    expect(screen.queryByText("Recommandé")).not.toBeInTheDocument();
  });

  it("V2 mode : les 2 cards ont data-emphasis='secondary' (égalitaires)", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    expect(screen.getByTestId("argus-card-trade_in_pro").getAttribute("data-emphasis")).toBe("secondary");
    expect(screen.getByTestId("argus-card-dealer_retail").getAttribute("data-emphasis")).toBe("secondary");
  });

  it("V2 mode : prix MGA formatés (espaces fr-FR)", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    const tradeIn = screen.getByTestId("argus-card-trade_in_pro");
    expect(tradeIn.textContent).toContain("23");
    expect(tradeIn.textContent).toContain("000");
    expect(tradeIn.textContent).toContain("Ar");
    const dealer = screen.getByTestId("argus-card-dealer_retail");
    expect(dealer.textContent).toContain("34");
  });

  it("V1 legacy : affiche 1 seule card avec estimatedValue", () => {
    render(
      <ArgusValuesCard
        values={{ estimatedValue: 87_000_000 }}
        isV2={false}
      />,
    );
    expect(screen.getByTestId("argus-values-legacy")).toBeInTheDocument();
    expect(screen.queryByTestId("argus-values-v2")).not.toBeInTheDocument();
    expect(screen.getByText("Valeur de marché estimée")).toBeInTheDocument();
  });

  it("V1 legacy : pas de mention 'Reprise pro' / 'En concession'", () => {
    render(
      <ArgusValuesCard
        values={{ estimatedValue: 87_000_000 }}
        isV2={false}
      />,
    );
    expect(screen.queryByText("Reprise pro")).not.toBeInTheDocument();
    expect(screen.queryByText("En concession")).not.toBeInTheDocument();
    expect(screen.queryByText(/indicative/i)).not.toBeInTheDocument();
  });

  it("V2 mode : aria-label sur la section", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    const section = screen.getByTestId("argus-values-v2");
    expect(section.getAttribute("aria-label")).toContain("Argus");
  });
});
