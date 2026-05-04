import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuditFooter from "@/components/estimation/AuditFooter";
import type { EstimationAuditV2 } from "@/types/estimation";

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

function makeAudit(overrides?: Partial<EstimationAuditV2>): EstimationAuditV2 {
  return {
    rangeMethod: "percentile_p10_p90",
    capApplied: false,
    trimFiltering: "unspecified",
    comparableSourceBreakdown: { marketClean: 7, autonexActive: 3 },
    transactionFactorAvg: 0.91,
    transactionFactorVersion: "v2_2026_05_11",
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("PROMPT 10B — AuditFooter", () => {
  it("Lien méthodologie toujours présent (V1 ou V2)", () => {
    renderWithRouter(<AuditFooter />);
    expect(screen.getByTestId("audit-footer-methodology-link")).toBeInTheDocument();
  });

  it("Disclaimer permanent toujours visible", () => {
    renderWithRouter(<AuditFooter />);
    expect(screen.getByTestId("audit-footer-disclaimer")).toBeInTheDocument();
  });

  it("V1 (audit absent) : pas de bloc détails techniques", () => {
    renderWithRouter(<AuditFooter />);
    expect(screen.queryByTestId("audit-footer-details")).not.toBeInTheDocument();
  });

  it("V2 (audit présent) : bloc détails techniques visible", () => {
    renderWithRouter(<AuditFooter audit={makeAudit()} />);
    expect(screen.getByTestId("audit-footer-details")).toBeInTheDocument();
    expect(screen.getByTestId("audit-engine-version")).toHaveTextContent("v2_2026_05_11");
    expect(screen.getByTestId("audit-factor-avg")).toHaveTextContent("0.91");
    expect(screen.getByTestId("audit-range-method")).toHaveTextContent("P10 / P90");
  });

  it("V2 capApplied=true → bandeau 'Plafond appliqué' visible", () => {
    renderWithRouter(<AuditFooter audit={makeAudit({ capApplied: true })} />);
    expect(screen.getByTestId("audit-cap-applied")).toBeInTheDocument();
  });

  it("V2 capApplied=false → bandeau 'Plafond appliqué' absent", () => {
    renderWithRouter(<AuditFooter audit={makeAudit({ capApplied: false })} />);
    expect(screen.queryByTestId("audit-cap-applied")).not.toBeInTheDocument();
  });

  it("rangeMethod synthetic_spread → label 'Fourchette synthétique'", () => {
    renderWithRouter(<AuditFooter audit={makeAudit({ rangeMethod: "synthetic_spread" })} />);
    expect(screen.getByTestId("audit-range-method").textContent).toContain("synthétique");
  });

  it("Lien méthodologie pointe vers /estimation/methodologie", () => {
    renderWithRouter(<AuditFooter />);
    const link = screen.getByTestId("audit-footer-methodology-link");
    expect(link.getAttribute("href")).toBe("/estimation/methodologie");
  });
});
