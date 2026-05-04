import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MethodologiePage from "@/pages/MethodologiePage";

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

vi.mock("@/lib/estimation/dataFreshnessHelper", () => ({
  useDataFreshness: () => ({
    data: {
      lastUpdateIso: "2026-05-04T12:00:00.000Z",
      comparableTotalCount: 102,
    },
    isLoading: false,
  }),
  fetchDataFreshness: vi.fn(),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MethodologiePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PROMPT 10B — MethodologiePage", () => {
  it("Rendu de toutes les sections principales", () => {
    renderPage();
    expect(screen.getByTestId("methodologie-page")).toBeInTheDocument();
    expect(screen.getByTestId("methodologie-hero")).toBeInTheDocument();
    expect(screen.getByTestId("methodologie-3-valeurs")).toBeInTheDocument();
    expect(screen.getByTestId("methodologie-fourchette")).toBeInTheDocument();
    expect(screen.getByTestId("methodologie-sources")).toBeInTheDocument();
    expect(screen.getByTestId("methodologie-factors")).toBeInTheDocument();
    expect(screen.getByTestId("methodologie-ajustements")).toBeInTheDocument();
    expect(screen.getByTestId("methodologie-tier")).toBeInTheDocument();
    expect(screen.getByTestId("methodologie-limites")).toBeInTheDocument();
    expect(screen.getByTestId("methodologie-footer-tech")).toBeInTheDocument();
  });

  it("Date de dernière mise à jour rendue dynamiquement", () => {
    renderPage();
    expect(screen.getByTestId("methodologie-last-update").textContent).toContain("04 mai 2026");
  });

  it("Volume comparables affiché dynamiquement", () => {
    renderPage();
    expect(screen.getByTestId("methodologie-total-count").textContent).toBe("102");
  });

  it("Section factors : table avec 5 lignes (sources → facteurs)", () => {
    renderPage();
    const factorSection = screen.getByTestId("methodologie-factors");
    expect(factorSection.textContent).toContain("× 0.93"); // FB particulier
    expect(factorSection.textContent).toContain("× 0.87"); // FB revendeur
    expect(factorSection.textContent).toContain("× 0.96"); // autonex
    expect(factorSection.textContent).toContain("× 1.00"); // tx confirmed
  });

  it("Section tier : 4 badges A/B/C/D rendus", () => {
    renderPage();
    const tierSection = screen.getByTestId("methodologie-tier");
    expect(tierSection.textContent).toContain("STRONG MARKET");
    expect(tierSection.textContent).toContain("MODERATE MARKET");
    expect(tierSection.textContent).toContain("REFERENCE ASSISTED");
    expect(tierSection.textContent).toContain("HEURISTIC ONLY");
  });

  it("Footer technique : version moteur affichée", () => {
    renderPage();
    expect(screen.getByTestId("methodologie-footer-tech").textContent).toContain("v2_2026_05_11");
  });
});
