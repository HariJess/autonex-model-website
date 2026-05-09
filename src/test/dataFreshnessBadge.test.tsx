import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("PROMPT 10B — DataFreshnessBadge", () => {
  it("Rendu : N comparables + breakdown sources + date FR", () => {
    render(
      <DataFreshnessBadge
        comparableCountUsed={10}
        comparableSourceBreakdown={{ marketClean: 7, autonexActive: 3 }}
        lastDataUpdate="2026-05-04T12:00:00.000Z"
      />,
    );
    const badge = screen.getByTestId("data-freshness-badge");
    expect(badge.textContent).toContain("10 comparables");
    expect(badge.textContent).toContain("7 du marché public");
    expect(badge.textContent).toContain("3 AutoNex");
    expect(badge.textContent).toContain("04 mai 2026");
  });

  it("Rendu : sans breakdown sources → omis proprement", () => {
    render(
      <DataFreshnessBadge
        comparableCountUsed={5}
        lastDataUpdate="2026-05-04T12:00:00.000Z"
      />,
    );
    const badge = screen.getByTestId("data-freshness-badge");
    expect(badge.textContent).toContain("5 comparables");
    expect(screen.queryByTestId("data-freshness-breakdown")).not.toBeInTheDocument();
  });

  it("Fallback : 0 comparables → message 'Aucun comparable direct'", () => {
    render(
      <DataFreshnessBadge
        comparableCountUsed={0}
        lastDataUpdate={null}
      />,
    );
    expect(screen.getByTestId("data-freshness-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("data-freshness-badge")).not.toBeInTheDocument();
  });

  it("Date null : badge rendu mais sans la mention date", () => {
    render(
      <DataFreshnessBadge
        comparableCountUsed={5}
        comparableSourceBreakdown={{ marketClean: 5, autonexActive: 0 }}
        lastDataUpdate={null}
      />,
    );
    const badge = screen.getByTestId("data-freshness-badge");
    expect(badge.textContent).toContain("5 comparables");
    expect(screen.queryByTestId("data-freshness-date")).not.toBeInTheDocument();
  });

  it("Date invalide → omis silencieusement (graceful)", () => {
    render(
      <DataFreshnessBadge
        comparableCountUsed={5}
        lastDataUpdate="not-a-date"
      />,
    );
    expect(screen.queryByTestId("data-freshness-date")).not.toBeInTheDocument();
  });
});
