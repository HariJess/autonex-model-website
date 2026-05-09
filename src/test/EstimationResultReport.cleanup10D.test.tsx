import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EstimationResultReport from "@/components/estimation/EstimationResultReport";

vi.mock("@/lib/estimation/dataFreshnessHelper", () => ({
  useDataFreshness: () => ({
    data: { lastUpdateIso: null, comparableTotalCount: 0 },
    isLoading: false,
  }),
  fetchDataFreshness: vi.fn(),
}));

// PROMPT 10D — useTranslation mock to interpolate {{n}} placeholders
// (sans mock, useTranslation tombe en NO_I18NEXT_INSTANCE et n'interpole pas).
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

import { buildEstimationPresentation } from "@/lib/estimation/presentation";
import type { EstimationRunResult } from "@/types/estimation";

function makeResult(overrides?: Partial<EstimationRunResult["outputV2"]>): EstimationRunResult {
  return {
    requestId: "req-1",
    submissionSecret: "00000000-0000-4000-8000-000000000001",
    resultId: "res-1",
    output: {
      marketBasePrice: 50_000_000,
      adjustedPrice: 52_000_000,
      lowRangePrice: 49_000_000,
      highRangePrice: 55_000_000,
      recommendedListingPrice: 53_000_000,
      quickSalePrice: 50_000_000,
      confidenceScore: 74,
      confidenceLabel: "medium",
      positiveFactors: [],
      negativeFactors: [],
      comparables: [],
      hasComparables: false,
      usedReferenceProfile: false,
    },
    outputV2: {
      tierDecision: {
        tier: "B_MODERATE_MARKET",
        tierReasonCode: "MODERATE_COMPARABLE_SET",
        tierReasonSummary: "Comparable set moderate.",
      },
      modeGovernance: {
        pricingMode: "partially_market_backed",
        claimMode: "ALLOW_LIMITED_MARKET_CLAIM",
        precisionMode: "medium",
        rangeWidthMode: "wide",
      },
      evidence: {
        comparableCountCandidate: 22,
        comparableCountAfterQualityFilter: 12,
        comparableCountUsed: 8,
        comparableCountStrong: 5,
        comparableSimilarityAvg: 66,
        comparableSimilarityMedian: 68,
        comparableRecencyScore: 72,
        comparableDispersionScore: 65,
        comparableLocationStrength: "mixed",
        canonicalModelCertainty: 80,
        referenceProfileUsed: true,
        referenceProfileStrength: 77,
        fallbackUsed: false,
        fallbackType: null,
      },
      anchors: {
        comparableMarketAnchor: 50_000_000,
        referenceAnchor: 49_500_000,
        heuristicAnchor: null,
        finalBaseAnchor: 50_200_000,
        adjustedMarketEstimate: 52_000_000,
        anchorBlendMode: "comparables_plus_reference",
      },
      adjustments: {
        mileageAdjustment: { factor: 1, deltaPct: 0, bounded: true },
        conditionAdjustment: { factor: 1, deltaPct: 0, bounded: true },
        maintenanceAdjustment: { factor: 1, deltaPct: 0, bounded: true },
        accidentAdjustment: { factor: 1, deltaPct: 0, bounded: true },
        ownershipAdjustment: { factor: 1, deltaPct: 0, bounded: true },
        usageAdjustment: { factor: 1, deltaPct: 0, bounded: true },
        totalAdjustmentFactor: 1,
        totalDeltaPct: 0,
        adjustmentCapApplied: false,
      },
      confidence: {
        confidenceScore: 56,
        confidenceBand: "medium",
        confidenceCeiling: 82,
        confidenceBeforeCeiling: 56,
        confidenceCapped: false,
        drivers: [],
        explanationMode: "summary_only",
      },
      values: {
        estimatedValue: 45_000_000,
        lowEstimate: 39_000_000,
        highEstimate: 51_000_000,
        quickSalePrice: 42_000_000,
        recommendedListingPrice: 46_000_000,
        tradeInPro: 35_000_000,
        privateMarket: 45_000_000,
        dealerRetail: 51_500_000,
        roundingStepApplied: 250_000,
      },
      comparables: [],
      insights: {
        pricingFactorsPositive: [],
        pricingFactorsNegative: [],
        evidenceNotes: [],
        disclaimers: [],
      },
      uiGovernance: {
        allowedMarketClaim: false,
        mustShowIndicativeLabel: false,
        shouldDeEmphasizePrecision: false,
        shouldHideExactConfidenceScore: false,
        allowedRangeTightness: "standard",
        recommendedPrimaryCTAStyle: "normal",
        requiredBadges: [],
      },
      audit: {
        rangeMethod: "percentile_p25_p75",
        capApplied: false,
        trimFiltering: "unspecified",
        comparableSourceBreakdown: { marketClean: 0, autonexActive: 0 },
        transactionFactorAvg: 1,
        transactionFactorVersion: "v2.test",
      },
      ...overrides,
    },
  };
}

function renderReport(result: EstimationRunResult) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EstimationResultReport
          result={result}
          presentation={buildEstimationPresentation(result)}
          onPublish={vi.fn()}
          onRefine={vi.fn()}
          onCompare={vi.fn()}
          onRestart={vi.fn()}
          onViewComparable={vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PROMPT 10D — Cleanup radical EstimationResultReport", () => {
  it("D1 : aucun badge 'Confiance moyenne/solide/prudente' top-right hors card 'Indice de confiance'", () => {
    renderReport(makeResult());
    // Ancien badge top-right "Confiance moyenne" complètement supprimé
    expect(screen.queryByText(/Confiance\s+(moyenne|solide|prudente|élevée|forte|faible)/i)).not.toBeInTheDocument();
  });

  it("D2 : aucun sous-titre 'Estimation indicative assistée' (claim badge top-left supprimé)", () => {
    renderReport(makeResult({
      modeGovernance: { pricingMode: "reference_assisted", claimMode: "INDICATIVE_REFERENCE_CLAIM_ONLY", precisionMode: "coarse", rangeWidthMode: "wide" },
    }));
    expect(screen.queryByText(/Estimation indicative assistée/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Analyse marché qualifiée/i)).not.toBeInTheDocument();
  });

  it("D3 : label fourchette = 'Fourchette de valorisation' sans qualificatif (prudente)/(équilibrée)/(resserrée)", () => {
    renderReport(makeResult({
      modeGovernance: { pricingMode: "partially_market_backed", claimMode: "ALLOW_LIMITED_MARKET_CLAIM", precisionMode: "medium", rangeWidthMode: "wide" },
    }));
    const matches = screen.getAllByText(/Fourchette de valorisation/i);
    expect(matches.length).toBeGreaterThan(0);
    matches.forEach((node) => {
      expect(node.textContent).not.toMatch(/\(prudente\)/i);
      expect(node.textContent).not.toMatch(/\(équilibrée\)/i);
      expect(node.textContent).not.toMatch(/\(resserrée\)/i);
    });
  });

  it("D4 : pas de phrase d'intro 'Estimation indicative appuyée par...' sous le hero", () => {
    renderReport(makeResult({
      modeGovernance: { pricingMode: "reference_assisted", claimMode: "INDICATIVE_REFERENCE_CLAIM_ONLY", precisionMode: "coarse", rangeWidthMode: "wide" },
    }));
    expect(screen.queryByText(/appuyée par des références/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guidée par le marché/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/principalement appuyée sur des comparables/i)).not.toBeInTheDocument();
  });

  it("D5 : exactement 2 cards Argus (Reprise pro + Concession), pas de 'Entre particuliers'", () => {
    renderReport(makeResult());
    expect(screen.getByTestId("argus-card-trade_in_pro")).toBeInTheDocument();
    expect(screen.getByTestId("argus-card-dealer_retail")).toBeInTheDocument();
    expect(screen.queryByTestId("argus-card-private_market")).not.toBeInTheDocument();
    expect(screen.queryByText("Entre particuliers")).not.toBeInTheDocument();
  });

  it("D6 : pas de grid 4 cards (Conseillé/Rapide/Médiane/Fiabilité) — Médiane + Fiabilité supprimées, Conseillé+Rapide en bloc 'Repères'", () => {
    renderReport(makeResult());
    expect(screen.queryByText(/Valeur médiane des comparables/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Niveau de fiabilité/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("reliability-level")).not.toBeInTheDocument();
    // Bloc compact "Repères" présent avec les 2 prix actionnables
    expect(screen.getByText(/Repères de positionnement/i)).toBeInTheDocument();
    expect(screen.getByText(/Prix conseillé d'annonce/i)).toBeInTheDocument();
    expect(screen.getByText(/Prix de vente rapide/i)).toBeInTheDocument();
  });

  it("D7 : tous les comparables 'mkt:' → aucun bouton 'Voir l'annonce' affiché", () => {
    const result = makeResult({
      comparables: [
        { listingId: "mkt:abc-1", title: "Toyota mkt 1", price: 49_000_000, year: 2019, mileage: 80000, city: "Antananarivo", score: 70 },
        { listingId: "mkt:abc-2", title: "Toyota mkt 2", price: 50_500_000, year: 2020, mileage: 75000, city: "Antananarivo", score: 72 },
      ],
    });
    renderReport(result);
    expect(screen.queryByText(/Voir l'annonce/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("comparable-card")).not.toBeInTheDocument();
    expect(screen.queryByText(/Annonces comparables retenues/i)).not.toBeInTheDocument();
  });

  it("D8 : tous les comparables 'mkt:' → bandeau info 'références du marché public' présent", () => {
    const result = makeResult({
      comparables: [
        { listingId: "mkt:abc-1", title: "Toyota mkt 1", price: 49_000_000, year: 2019, mileage: 80000, city: "Antananarivo", score: 70 },
        { listingId: "mkt:abc-2", title: "Toyota mkt 2", price: 50_500_000, year: 2020, mileage: 75000, city: "Antananarivo", score: 72 },
        { listingId: "mkt:abc-3", title: "Toyota mkt 3", price: 51_000_000, year: 2020, mileage: 60000, city: "Antananarivo", score: 68 },
      ],
    });
    renderReport(result);
    const banner = screen.getByTestId("comparables-mkt-only-banner");
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/3/);
    expect(banner.textContent).toMatch(/marché public/i);
  });

  it("D9 : comparables 'anx:' (= sans préfixe mkt:) → cards cliquables avec 'Voir l'annonce'", () => {
    const result = makeResult({
      comparables: [
        { listingId: "uuid-anx-1", title: "Toyota AutoNex 1", price: 49_000_000, year: 2019, mileage: 80000, city: "Antananarivo", score: 75 },
        { listingId: "uuid-anx-2", title: "Toyota AutoNex 2", price: 50_500_000, year: 2020, mileage: 75000, city: "Antananarivo", score: 78 },
      ],
    });
    renderReport(result);
    expect(screen.getByText(/Annonces comparables retenues/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("comparable-card").length).toBe(2);
    expect(screen.getAllByText(/Voir l'annonce/i).length).toBeGreaterThan(0);
  });

  it("D10 : mix anx + mkt → cards anx affichées + ligne '+N autres références du marché public'", () => {
    const result = makeResult({
      comparables: [
        { listingId: "uuid-anx-1", title: "Toyota AutoNex 1", price: 49_000_000, year: 2019, mileage: 80000, city: "Antananarivo", score: 75 },
        { listingId: "mkt:abc-1", title: "Toyota mkt 1", price: 50_000_000, year: 2019, mileage: 78000, city: "Antananarivo", score: 70 },
        { listingId: "mkt:abc-2", title: "Toyota mkt 2", price: 50_800_000, year: 2020, mileage: 72000, city: "Antananarivo", score: 71 },
      ],
    });
    renderReport(result);
    expect(screen.getAllByTestId("comparable-card").length).toBe(1);
    const extraLine = screen.getByTestId("comparables-mkt-extra-line");
    expect(extraLine).toBeInTheDocument();
    expect(extraLine.textContent).toMatch(/2/);
    expect(extraLine.textContent).toMatch(/marché public/i);
    // Pas de bandeau "mkt-only" quand il y a au moins un anx
    expect(screen.queryByTestId("comparables-mkt-only-banner")).not.toBeInTheDocument();
  });
});
