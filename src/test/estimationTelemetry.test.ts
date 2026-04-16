import { describe, expect, it } from "vitest";
import {
  buildEstimationAuditInspection,
  buildEstimationAuditSnapshot,
  buildEstimationEventContext,
  formatEstimationAuditSnapshot,
} from "@/lib/estimation/telemetry";
import type { EstimationOutputV2 } from "@/types/estimation";
import { ESTIMATION_CALIBRATION_QUERY_PACK } from "@/lib/estimation/calibrationQueryPack";

function makeOutputV2(): EstimationOutputV2 {
  return {
    tierDecision: {
      tier: "B_MODERATE_MARKET",
      tierReasonCode: "MODERATE_COMPARABLE_SET",
      tierReasonSummary: "Moderate set",
    },
    modeGovernance: {
      pricingMode: "partially_market_backed",
      claimMode: "ALLOW_LIMITED_MARKET_CLAIM",
      precisionMode: "medium",
      rangeWidthMode: "standard",
    },
    evidence: {
      comparableCountCandidate: 18,
      comparableCountAfterQualityFilter: 10,
      comparableCountUsed: 6,
      comparableCountStrong: 3,
      comparableSimilarityAvg: 62,
      comparableSimilarityMedian: 60,
      comparableRecencyScore: 70,
      comparableDispersionScore: 63,
      comparableLocationStrength: "mixed",
      canonicalModelCertainty: 78,
      referenceProfileUsed: true,
      referenceProfileStrength: 75,
      fallbackUsed: false,
      fallbackType: null,
    },
    anchors: {
      comparableMarketAnchor: 48_000_000,
      referenceAnchor: 47_000_000,
      heuristicAnchor: null,
      finalBaseAnchor: 47_600_000,
      adjustedMarketEstimate: 49_200_000,
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
      confidenceScore: 72,
      confidenceBand: "medium",
      confidenceCeiling: 82,
      confidenceBeforeCeiling: 74,
      confidenceCapped: true,
      drivers: [],
      explanationMode: "summary_only",
    },
    values: {
      estimatedValue: 49_000_000,
      lowEstimate: 45_000_000,
      highEstimate: 53_000_000,
      quickSalePrice: 46_500_000,
      recommendedListingPrice: 50_000_000,
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
  };
}

describe("estimation telemetry snapshot", () => {
  it("builds compact audit snapshot from V2 output", () => {
    const snapshot = buildEstimationAuditSnapshot(makeOutputV2());
    expect(snapshot.evidenceTier).toBe("B_MODERATE_MARKET");
    expect(snapshot.pricingMode).toBe("partially_market_backed");
    expect(snapshot.claimMode).toBe("ALLOW_LIMITED_MARKET_CLAIM");
    expect(snapshot.comparableCountUsed).toBe(6);
    expect(snapshot.referenceProfileUsed).toBe(true);
    expect(snapshot.fallbackUsed).toBe(false);
    expect(snapshot.anchorBlendMode).toBe("comparables_plus_reference");
  });

  it("merges extras into event context", () => {
    const context = buildEstimationEventContext(makeOutputV2(), { eventSource: "result_page", requestId: "req-1" });
    expect(context.evidenceTier).toBe("B_MODERATE_MARKET");
    expect(context.eventSource).toBe("result_page");
    expect(context.requestId).toBe("req-1");
  });

  it("builds readable internal inspection summary", () => {
    const inspection = buildEstimationAuditInspection(buildEstimationAuditSnapshot(makeOutputV2()));
    expect(inspection.supportLevel).toBe("moderate");
    expect(inspection.severity).toBe("low");
    expect(inspection.headline).toContain("signal marché qualifié");
    expect(inspection.summaryLines.length).toBeGreaterThanOrEqual(4);
  });

  it("formats audit snapshot for QA/dev quick reading", () => {
    const text = formatEstimationAuditSnapshot(buildEstimationAuditSnapshot(makeOutputV2()));
    expect(text).toContain("[LOW][MODERATE]");
    expect(text).toContain("Tier B_MODERATE_MARKET");
    expect(text).toContain("Flags");
  });
});

describe("estimation calibration query pack", () => {
  it("contains core operational calibration queries", () => {
    const ids = ESTIMATION_CALIBRATION_QUERY_PACK.map((q) => q.id);
    expect(ids).toContain("tier_distribution_30d");
    expect(ids).toContain("mode_distribution_30d");
    expect(ids).toContain("fallback_and_caps_30d");
    expect(ids).toContain("action_by_tier_30d");
    expect(ids).toContain("weak_moderate_publish_propensity_30d");
  });

  it("ensures each query has executable SQL text", () => {
    for (const query of ESTIMATION_CALIBRATION_QUERY_PACK) {
      expect(query.sql.toLowerCase()).toContain("select");
      expect(query.sql.trim().length).toBeGreaterThan(30);
    }
  });
});

