import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdjustmentsBreakdown from "@/components/estimation/AdjustmentsBreakdown";
import type { EstimationOutputV2 } from "@/types/estimation";

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

function makeAdjustments(overrides?: Partial<{
  mileage: number;
  condition: number;
  maintenance: number;
  accident: number;
  ownership: number;
  usage: number;
  totalDeltaPct: number;
  capApplied: boolean;
}>): EstimationOutputV2["adjustments"] {
  const d = { mileage: 0, condition: 0, maintenance: 0, accident: 0, ownership: 0, usage: 0, totalDeltaPct: 0, capApplied: false, ...overrides };
  const make = (deltaPct: number) => ({ factor: 1 + deltaPct / 100, deltaPct, bounded: true });
  return {
    mileageAdjustment: make(d.mileage),
    conditionAdjustment: make(d.condition),
    maintenanceAdjustment: make(d.maintenance),
    accidentAdjustment: make(d.accident),
    ownershipAdjustment: make(d.ownership),
    usageAdjustment: make(d.usage),
    totalAdjustmentFactor: 1 + d.totalDeltaPct / 100,
    totalDeltaPct: d.totalDeltaPct,
    adjustmentCapApplied: d.capApplied,
  };
}

describe("PROMPT 10B — AdjustmentsBreakdown", () => {
  it("Rendu : affiche le total avec signe et couleur correcte (positif)", () => {
    const adjustments = makeAdjustments({ mileage: 3.5, maintenance: 1, totalDeltaPct: 4.5 });
    render(<AdjustmentsBreakdown adjustments={adjustments} />);
    expect(screen.getByTestId("adjustment-total")).toHaveTextContent("+4.5%");
  });

  it("Rendu : affiche les lignes non-zéro et skip les zéros", () => {
    const adjustments = makeAdjustments({ mileage: 3.5, condition: -4, totalDeltaPct: -0.5 });
    render(<AdjustmentsBreakdown adjustments={adjustments} />);
    expect(screen.getByTestId("adjustment-line-mileage")).toBeInTheDocument();
    expect(screen.getByTestId("adjustment-line-condition")).toBeInTheDocument();
    // Maintenance / accident / ownership / usage = 0 → ne devraient pas apparaître
    expect(screen.queryByTestId("adjustment-line-maintenance")).not.toBeInTheDocument();
    expect(screen.queryByTestId("adjustment-line-accident")).not.toBeInTheDocument();
  });

  it("Signe + (positif) sur ligne kilométrage favorable", () => {
    const adjustments = makeAdjustments({ mileage: 3.5, totalDeltaPct: 3.5 });
    render(<AdjustmentsBreakdown adjustments={adjustments} />);
    expect(screen.getByTestId("adjustment-delta-mileage")).toHaveTextContent("+3.5%");
  });

  it("Signe - (négatif) sur ligne accident", () => {
    const adjustments = makeAdjustments({ accident: -6, totalDeltaPct: -6 });
    render(<AdjustmentsBreakdown adjustments={adjustments} />);
    expect(screen.getByTestId("adjustment-delta-accident")).toHaveTextContent("-6.0%");
  });

  it("Cap badge affiché si adjustmentCapApplied=true", () => {
    const adjustments = makeAdjustments({ mileage: -6, condition: -10, accident: -6, usage: -8, totalDeltaPct: -20, capApplied: true });
    render(<AdjustmentsBreakdown adjustments={adjustments} />);
    expect(screen.getByTestId("adjustment-cap-badge")).toBeInTheDocument();
  });

  it("Cap badge absent si adjustmentCapApplied=false", () => {
    const adjustments = makeAdjustments({ mileage: 3, totalDeltaPct: 3, capApplied: false });
    render(<AdjustmentsBreakdown adjustments={adjustments} />);
    expect(screen.queryByTestId("adjustment-cap-badge")).not.toBeInTheDocument();
  });

  it("Si tous ajustements à zéro : affiche 3 premières lignes (fallback non-vide)", () => {
    const adjustments = makeAdjustments();
    render(<AdjustmentsBreakdown adjustments={adjustments} />);
    const list = screen.getByTestId("adjustments-list");
    expect(list.children.length).toBeGreaterThan(0);
  });
});
