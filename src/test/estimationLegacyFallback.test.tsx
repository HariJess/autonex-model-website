import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArgusValuesCard from "@/components/estimation/ArgusValuesCard";
import AuditFooter from "@/components/estimation/AuditFooter";
import DataFreshnessBadge from "@/components/estimation/DataFreshnessBadge";

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

/**
 * PROMPT 10B — Tests rétro-compat V1 : un user en mode legacy (pas dans canary
 * V2 OU fallback V1 silencieux après échec Edge) reçoit un output sans `audit`
 * et sans tradeInPro/privateMarket/dealerRetail. L'UI doit dégrader gracefully :
 *   - 1 seule card (pas 3)
 *   - AuditFooter rend juste le lien méthodologie + disclaimer (pas de détails)
 *   - DataFreshnessBadge fonctionne quand même (avec/sans breakdown)
 */

describe("PROMPT 10B — Legacy V1 fallback rendering (zéro crash)", () => {
  it("ArgusValuesCard : isV2=false sans tradeInPro/privateMarket → 1 card legacy", () => {
    render(
      <ArgusValuesCard
        values={{ estimatedValue: 87_000_000 }}
        isV2={false}
      />,
    );
    expect(screen.getByTestId("argus-values-legacy")).toBeInTheDocument();
    expect(screen.queryByTestId("argus-values-v2")).not.toBeInTheDocument();
  });

  it("ArgusValuesCard : isV2=true mais tradeInPro/dealerRetail absents → fallback à 0 sans crash", () => {
    // Edge case : audit présent mais champs partiels (incohérence backend)
    render(
      <ArgusValuesCard
        values={{ estimatedValue: 87_000_000 }}
        isV2={true}
      />,
    );
    expect(screen.getByTestId("argus-values-v2")).toBeInTheDocument();
    // P10D : 2 cards rendues (trade_in_pro / dealer_retail) sans crash
    expect(screen.getByTestId("argus-card-trade_in_pro")).toBeInTheDocument();
    expect(screen.getByTestId("argus-card-dealer_retail")).toBeInTheDocument();
    // Card "Entre particuliers" supprimée en P10D
    expect(screen.queryByTestId("argus-card-private_market")).not.toBeInTheDocument();
  });

  it("AuditFooter : sans audit → lien + disclaimer mais pas de détails techniques", () => {
    render(
      <MemoryRouter>
        <AuditFooter />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("audit-footer-methodology-link")).toBeInTheDocument();
    expect(screen.getByTestId("audit-footer-disclaimer")).toBeInTheDocument();
    expect(screen.queryByTestId("audit-footer-details")).not.toBeInTheDocument();
  });

  it("DataFreshnessBadge : count=0 + null date → message neutre 'Aucun comparable direct'", () => {
    render(
      <DataFreshnessBadge comparableCountUsed={0} lastDataUpdate={null} />,
    );
    expect(screen.getByTestId("data-freshness-empty")).toBeInTheDocument();
  });
});
