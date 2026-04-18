import { describe, expect, it } from "vitest";
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
        comparableCountCandidate: 20,
        comparableCountAfterQualityFilter: 10,
        comparableCountUsed: 8,
        comparableCountStrong: 5,
        comparableSimilarityAvg: 68,
        comparableSimilarityMedian: 70,
        comparableRecencyScore: 72,
        comparableDispersionScore: 64,
        comparableLocationStrength: "mixed",
        canonicalModelCertainty: 80,
        referenceProfileUsed: true,
        referenceProfileStrength: 74,
        fallbackUsed: false,
        fallbackType: null,
      },
      anchors: {
        comparableMarketAnchor: 50_000_000,
        referenceAnchor: 49_000_000,
        heuristicAnchor: null,
        finalBaseAnchor: 50_500_000,
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
        requiredBadges: ["partially_market_backed"],
      },
      ...overrides,
    },
  };
}

describe("estimation presentation governance", () => {
  it("maps strong tier to strong market wording", () => {
    const result = makeResult({
      tierDecision: {
        tier: "A_STRONG_MARKET",
        tierReasonCode: "STRONG_COMPARABLE_SET",
        tierReasonSummary: "Strong.",
      },
      modeGovernance: {
        pricingMode: "market_backed",
        claimMode: "ALLOW_STRONG_MARKET_CLAIM",
        precisionMode: "tight",
        rangeWidthMode: "tight",
      },
    });
    const presentation = buildEstimationPresentation(result);
    expect(presentation.claimLabel).toContain("robuste");
    expect(presentation.summaryLevel).toBe("Robuste");
    expect(presentation.rangeToneLabel).toBe("resserrée");
    expect(presentation.actionHeadline).toContain("Publiez maintenant");
    expect(presentation.comparablesIntro).toContain("Comparables cohérents");
  });

  it("forces indicative framing and hides exact confidence for weak governance", () => {
    const result = makeResult({
      tierDecision: {
        tier: "D_HEURISTIC_ONLY",
        tierReasonCode: "NO_RELIABLE_COMPARABLES",
        tierReasonSummary: "Weak.",
      },
      modeGovernance: {
        pricingMode: "heuristic_only",
        claimMode: "INDICATIVE_HEURISTIC_CLAIM_ONLY",
        precisionMode: "very_coarse",
        rangeWidthMode: "very_wide",
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
      confidence: {
        confidenceScore: 34,
        confidenceBand: "low",
        confidenceCeiling: 45,
        confidenceBeforeCeiling: 34,
        confidenceCapped: false,
        drivers: [],
        explanationMode: "summary_only",
      },
    });
    const presentation = buildEstimationPresentation(result);
    expect(presentation.indicativeRequired).toBe(true);
    expect(presentation.showExactConfidence).toBe(false);
    expect(presentation.confidenceDisplayValue).toBeNull();
    expect(presentation.rangeToneLabel).toBe("prudente");
    expect(presentation.precisionCaution).toBe(true);
    expect(presentation.actionDescription).toContain("indicatif");
    expect(presentation.comparablesEmptyTitle).toContain("insuffisants");
  });

  it("differentiates reference-assisted wording from limited market wording", () => {
    const referenceAssisted = buildEstimationPresentation(
      makeResult({
        modeGovernance: {
          pricingMode: "reference_assisted",
          claimMode: "INDICATIVE_REFERENCE_CLAIM_ONLY",
          precisionMode: "coarse",
          rangeWidthMode: "wide",
        },
      }),
    );
    const moderateMarket = buildEstimationPresentation(
      makeResult({
        modeGovernance: {
          pricingMode: "partially_market_backed",
          claimMode: "ALLOW_LIMITED_MARKET_CLAIM",
          precisionMode: "medium",
          rangeWidthMode: "standard",
        },
      }),
    );
    expect(referenceAssisted.claimLabel).not.toEqual(moderateMarket.claimLabel);
    expect(referenceAssisted.claimMessage).toContain("indicative");
    expect(moderateMarket.claimMessage).toContain("marché");
  });

  it("keeps moderate evidence narrative qualified across sections", () => {
    const presentation = buildEstimationPresentation(
      makeResult({
        tierDecision: {
          tier: "B_MODERATE_MARKET",
          tierReasonCode: "MODERATE_COMPARABLE_SET",
          tierReasonSummary: "Moderate.",
        },
        modeGovernance: {
          pricingMode: "partially_market_backed",
          claimMode: "ALLOW_LIMITED_MARKET_CLAIM",
          precisionMode: "medium",
          rangeWidthMode: "standard",
        },
        evidence: {
          comparableCountCandidate: 18,
          comparableCountAfterQualityFilter: 9,
          comparableCountUsed: 5,
          comparableCountStrong: 3,
          comparableSimilarityAvg: 63,
          comparableSimilarityMedian: 60,
          comparableRecencyScore: 69,
          comparableDispersionScore: 62,
          comparableLocationStrength: "mixed",
          canonicalModelCertainty: 79,
          referenceProfileUsed: true,
          referenceProfileStrength: 74,
          fallbackUsed: false,
          fallbackType: null,
        },
      }),
    );
    expect(presentation.summaryLevel).toBe("Qualifié");
    expect(presentation.evidenceHeadline).toContain("partielle");
    expect(presentation.comparablesIntro).toContain("niveau de preuve qualifié");
    expect(presentation.actionHeadline).toContain("positionnement calibré");
    expect(presentation.ctaFootnote).toContain("mode qualifié");
    expect(presentation.marketSupportHeadline).toContain("exploitable");
  });
});
