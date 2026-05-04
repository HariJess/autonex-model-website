import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EstimationResultReport from "@/components/estimation/EstimationResultReport";

// PROMPT 10B — useDataFreshness (TanStack Query) appelé dans le composant
// nécessite un QueryClientProvider. On le mock pour éviter le fetch DB.
vi.mock("@/lib/estimation/dataFreshnessHelper", () => ({
  useDataFreshness: () => ({
    data: { lastUpdateIso: null, comparableTotalCount: 0 },
    isLoading: false,
  }),
  fetchDataFreshness: vi.fn(),
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
        rangeWidthMode: "standard",
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
        confidenceScore: 74,
        confidenceBand: "medium",
        confidenceCeiling: 82,
        confidenceBeforeCeiling: 76,
        confidenceCapped: true,
        drivers: [],
        explanationMode: "summary_only",
      },
      values: {
        estimatedValue: 52_000_000,
        lowEstimate: 49_000_000,
        highEstimate: 55_000_000,
        quickSalePrice: 50_000_000,
        recommendedListingPrice: 53_000_000,
        roundingStepApplied: 250_000,
      },
      comparables: [],
      insights: {
        pricingFactorsPositive: [],
        pricingFactorsNegative: [],
        evidenceNotes: [{ id: "ev1", category: "evidence_note", code: "EV", label: "Évidence partielle.", polarity: "neutral" }],
        disclaimers: [{ id: "d1", category: "disclaimer", code: "DISC", label: "Lecture indicative recommandée.", polarity: "neutral", severity: "warning" }],
      },
      uiGovernance: {
        allowedMarketClaim: false,
        mustShowIndicativeLabel: false,
        shouldDeEmphasizePrecision: false,
        shouldHideExactConfidenceScore: false,
        allowedRangeTightness: "standard",
        recommendedPrimaryCTAStyle: "normal",
        requiredBadges: ["partially_market_backed"],
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

describe("EstimationResultReport integration", () => {
  it("renders stronger framing for strong market output", () => {
    const result = makeResult({
      tierDecision: { tier: "A_STRONG_MARKET", tierReasonCode: "STRONG_COMPARABLE_SET", tierReasonSummary: "Strong." },
      modeGovernance: { pricingMode: "market_backed", claimMode: "ALLOW_STRONG_MARKET_CLAIM", precisionMode: "tight", rangeWidthMode: "tight" },
      evidence: {
        comparableCountCandidate: 30,
        comparableCountAfterQualityFilter: 16,
        comparableCountUsed: 9,
        comparableCountStrong: 7,
        comparableSimilarityAvg: 74,
        comparableSimilarityMedian: 76,
        comparableRecencyScore: 80,
        comparableDispersionScore: 78,
        comparableLocationStrength: "same_city",
        canonicalModelCertainty: 86,
        referenceProfileUsed: true,
        referenceProfileStrength: 80,
        fallbackUsed: false,
        fallbackType: null,
      },
      uiGovernance: {
        allowedMarketClaim: true,
        mustShowIndicativeLabel: false,
        shouldDeEmphasizePrecision: false,
        shouldHideExactConfidenceScore: false,
        allowedRangeTightness: "tight",
        recommendedPrimaryCTAStyle: "strong",
        requiredBadges: ["market_backed"],
      },
      comparables: [{ listingId: "1", title: "Toyota", price: 50_000_000, year: 2020, mileage: 70000, city: "Antananarivo", score: 80 }],
    });
    renderReport(result);
    expect(screen.getByText(/Analyse marché robuste/i)).toBeInTheDocument();
    expect(screen.queryByText(/Estimation indicative/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Publiez maintenant/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Appui marché solide/i).length).toBeGreaterThanOrEqual(1);
  });

  it("forces indicative framing and hides exact confidence when governed", () => {
    const result = makeResult({
      tierDecision: { tier: "D_HEURISTIC_ONLY", tierReasonCode: "NO_RELIABLE_COMPARABLES", tierReasonSummary: "Weak." },
      modeGovernance: { pricingMode: "heuristic_only", claimMode: "INDICATIVE_HEURISTIC_CLAIM_ONLY", precisionMode: "very_coarse", rangeWidthMode: "very_wide" },
      confidence: { confidenceScore: 34, confidenceBand: "low", confidenceCeiling: 45, confidenceBeforeCeiling: 34, confidenceCapped: false, drivers: [], explanationMode: "summary_only" },
      evidence: {
        comparableCountCandidate: 7,
        comparableCountAfterQualityFilter: 2,
        comparableCountUsed: 0,
        comparableCountStrong: 0,
        comparableSimilarityAvg: 0,
        comparableSimilarityMedian: 0,
        comparableRecencyScore: 30,
        comparableDispersionScore: 0,
        comparableLocationStrength: "weak",
        canonicalModelCertainty: 62,
        referenceProfileUsed: false,
        referenceProfileStrength: null,
        fallbackUsed: true,
        fallbackType: "generic_heuristic",
      },
      uiGovernance: {
        allowedMarketClaim: false,
        mustShowIndicativeLabel: true,
        shouldDeEmphasizePrecision: true,
        shouldHideExactConfidenceScore: true,
        allowedRangeTightness: "very_wide",
        recommendedPrimaryCTAStyle: "cautious",
        requiredBadges: ["heuristic_only"],
      },
    });
    renderReport(result);
    expect(screen.getByText("Estimation indicative exploratoire")).toBeInTheDocument();
    expect(screen.getByText(/Affichage prudent/i)).toBeInTheDocument();
    expect(screen.queryByText(/34\s*\/100/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Appui marché faible/i).length).toBeGreaterThanOrEqual(1);
  });

  it("keeps evidence notes/disclaimers separate from pricing factor sections", () => {
    const result = makeResult({
      insights: {
        pricingFactorsPositive: [{ id: "p1", category: "pricing_factor", code: "P1", label: "Entretien suivi", polarity: "positive" }],
        pricingFactorsNegative: [{ id: "n1", category: "pricing_factor", code: "N1", label: "Kilométrage élevé", polarity: "negative" }],
        evidenceNotes: [{ id: "e1", category: "evidence_note", code: "E1", label: "Évidence partielle." }],
        disclaimers: [{ id: "d1", category: "disclaimer", code: "D1", label: "Ceci reste indicatif.", severity: "warning" }],
      },
      uiGovernance: {
        allowedMarketClaim: false,
        mustShowIndicativeLabel: true,
        shouldDeEmphasizePrecision: true,
        shouldHideExactConfidenceScore: false,
        allowedRangeTightness: "wide",
        recommendedPrimaryCTAStyle: "normal",
        requiredBadges: ["reference_assisted"],
      },
    });
    renderReport(result);
    expect(screen.getByText("Facteurs qui renforcent la valeur")).toBeInTheDocument();
    expect(screen.getByText("Points de vigilance prix")).toBeInTheDocument();
    expect(screen.getByText("Lecture d'évidence")).toBeInTheDocument();
    expect(screen.getAllByText("Ceci reste indicatif.").length).toBeGreaterThanOrEqual(1);
  });

  it("shows intentional comparable empty-state messaging when support is weak", () => {
    const result = makeResult({
      tierDecision: { tier: "C_REFERENCE_ASSISTED", tierReasonCode: "WEAK_COMPARABLES_REFERENCE_USED", tierReasonSummary: "Limited." },
      modeGovernance: { pricingMode: "reference_assisted", claimMode: "INDICATIVE_REFERENCE_CLAIM_ONLY", precisionMode: "coarse", rangeWidthMode: "wide" },
      evidence: {
        comparableCountCandidate: 8,
        comparableCountAfterQualityFilter: 3,
        comparableCountUsed: 0,
        comparableCountStrong: 0,
        comparableSimilarityAvg: 0,
        comparableSimilarityMedian: 0,
        comparableRecencyScore: 40,
        comparableDispersionScore: 0,
        comparableLocationStrength: "weak",
        canonicalModelCertainty: 70,
        referenceProfileUsed: true,
        referenceProfileStrength: 75,
        fallbackUsed: true,
        fallbackType: "profile_seeded",
      },
      comparables: [],
    });
    renderReport(result);
    expect(screen.getByText(/Comparables encore insuffisants|Comparaison marché en consolidation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Le rapport s'appuie surtout sur des signaux de référence|Le rapport reste utile pour cadrer votre décision/i).length).toBeGreaterThanOrEqual(1);
  });

  it("keeps moderate evidence with comparables clearly qualified", () => {
    const result = makeResult({
      tierDecision: { tier: "B_MODERATE_MARKET", tierReasonCode: "MODERATE_COMPARABLE_SET", tierReasonSummary: "Moderate." },
      modeGovernance: { pricingMode: "partially_market_backed", claimMode: "ALLOW_LIMITED_MARKET_CLAIM", precisionMode: "medium", rangeWidthMode: "standard" },
      evidence: {
        comparableCountCandidate: 20,
        comparableCountAfterQualityFilter: 10,
        comparableCountUsed: 5,
        comparableCountStrong: 3,
        comparableSimilarityAvg: 62,
        comparableSimilarityMedian: 60,
        comparableRecencyScore: 68,
        comparableDispersionScore: 63,
        comparableLocationStrength: "mixed",
        canonicalModelCertainty: 79,
        referenceProfileUsed: true,
        referenceProfileStrength: 75,
        fallbackUsed: false,
        fallbackType: null,
      },
      comparables: [
        { listingId: "1", title: "Toyota Corolla", price: 49_500_000, year: 2019, mileage: 83000, city: "Antananarivo", score: 74 },
        { listingId: "2", title: "Toyota Corolla S", price: 50_800_000, year: 2020, mileage: 76000, city: "Antananarivo", score: 71 },
      ],
    });
    renderReport(result);
    expect(screen.getByText(/Analyse marché qualifiée/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Évidence marché partielle mais exploitable/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Appui marché exploitable/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/positionnement calibré/i)).toBeInTheDocument();
    expect(screen.queryByText(/Appui marché solide/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Publiez maintenant avec un positionnement assumé/i)).not.toBeInTheDocument();
  });
});
