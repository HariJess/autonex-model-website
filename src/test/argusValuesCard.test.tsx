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

describe("PROMPT 10B — ArgusValuesCard", () => {
  const v2Values = {
    tradeInPro: 23_000_000,
    privateMarket: 29_000_000,
    dealerRetail: 34_000_000,
    estimatedValue: 29_000_000,
  };

  it("V2 mode : 3 cards rendues avec les bons titres", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    expect(screen.getByTestId("argus-values-v2")).toBeInTheDocument();
    expect(screen.getByTestId("argus-card-trade_in_pro")).toBeInTheDocument();
    expect(screen.getByTestId("argus-card-private_market")).toBeInTheDocument();
    expect(screen.getByTestId("argus-card-dealer_retail")).toBeInTheDocument();
    expect(screen.getByText("Reprise pro")).toBeInTheDocument();
    expect(screen.getByText("Entre particuliers")).toBeInTheDocument();
    expect(screen.getByText("En concession")).toBeInTheDocument();
  });

  it("V2 mode : la card centrale a data-emphasis='primary'", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    const central = screen.getByTestId("argus-card-private_market");
    expect(central.getAttribute("data-emphasis")).toBe("primary");
    const left = screen.getByTestId("argus-card-trade_in_pro");
    expect(left.getAttribute("data-emphasis")).toBe("secondary");
  });

  it("V2 mode : badge 'Recommandé' sur la card centrale uniquement", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    const recommended = screen.getAllByText("Recommandé");
    expect(recommended.length).toBe(1);
  });

  it("V2 mode : prix MGA formatés (espaces fr-FR)", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    // formatAriary produit "29 000 000 Ar" avec NBSP
    const central = screen.getByTestId("argus-card-private_market");
    expect(central.textContent).toContain("29");
    expect(central.textContent).toContain("000");
    expect(central.textContent).toContain("Ar");
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
    // Le mot "indicative" ne doit PAS apparaître dans la card legacy
    // (réservé au bandeau warning d'EstimationResultReport quand showIndicative=true).
    expect(screen.queryByText(/indicative/i)).not.toBeInTheDocument();
  });

  it("V2 mode : aria-label sur la section", () => {
    render(<ArgusValuesCard values={v2Values} isV2 />);
    const section = screen.getByTestId("argus-values-v2");
    expect(section.getAttribute("aria-label")).toContain("Argus");
  });
});
