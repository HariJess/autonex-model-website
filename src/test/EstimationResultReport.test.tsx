import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EstimationResultReport from "@/components/estimation/EstimationResultReport";
import { buildEstimationPresentation } from "@/lib/estimation/presentation";
import type { EstimationRunResult } from "@/types/estimation";

function makeResult(overrides?: Partial<EstimationRunResult["outputV2"]>): EstimationRunResult {
  return {
    requestId: "req-1",
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
  return render(
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
    </MemoryRouter>,
  );
}

describe("EstimationResultReport integration", () => {
  it("renders stronger framing for strong market output", () => {
    const result = makeResult({
      tierDecision: { tier: "A_STRONG_MARKET", tierReasonCode: "STRONG_COMPARABLE_SET", tierReasonSummary: "Strong." },
      modeGovernance: { pricingMode: "market_backed", claimMode: "ALLOW_STRONG_MARKET_CLAIM", precisionMode: "tight", rangeWidthMode: "tight" },
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
  });

  it("forces indicative framing and hides exact confidence when governed", () => {
    const result = makeResult({
      tierDecision: { tier: "D_HEURISTIC_ONLY", tierReasonCode: "NO_RELIABLE_COMPARABLES", tierReasonSummary: "Weak." },
      modeGovernance: { pricingMode: "heuristic_only", claimMode: "INDICATIVE_HEURISTIC_CLAIM_ONLY", precisionMode: "very_coarse", rangeWidthMode: "very_wide" },
      confidence: { confidenceScore: 34, confidenceBand: "low", confidenceCeiling: 45, confidenceBeforeCeiling: 34, confidenceCapped: false, drivers: [], explanationMode: "summary_only" },
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
});
