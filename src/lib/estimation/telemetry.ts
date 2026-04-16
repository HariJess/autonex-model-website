import type { EstimationOutputV2 } from "@/types/estimation";

export type EstimationAuditSnapshot = {
  evidenceTier: EstimationOutputV2["tierDecision"]["tier"];
  tierReasonCode: EstimationOutputV2["tierDecision"]["tierReasonCode"];
  pricingMode: EstimationOutputV2["modeGovernance"]["pricingMode"];
  claimMode: EstimationOutputV2["modeGovernance"]["claimMode"];
  precisionMode: EstimationOutputV2["modeGovernance"]["precisionMode"];
  rangeWidthMode: EstimationOutputV2["modeGovernance"]["rangeWidthMode"];
  confidenceScore: number;
  confidenceBand: EstimationOutputV2["confidence"]["confidenceBand"];
  confidenceCapped: boolean;
  confidenceCeiling: number;
  confidenceBeforeCeiling: number;
  comparableCountCandidate: number;
  comparableCountAfterQualityFilter: number;
  comparableCountUsed: number;
  comparableCountStrong: number;
  comparableSimilarityMedian: number;
  comparableRecencyScore: number;
  comparableDispersionScore: number;
  comparableLocationStrength: EstimationOutputV2["evidence"]["comparableLocationStrength"];
  canonicalModelCertainty: number;
  referenceProfileUsed: boolean;
  referenceProfileStrength: number | null;
  fallbackUsed: boolean;
  fallbackType: EstimationOutputV2["evidence"]["fallbackType"];
  anchorBlendMode: EstimationOutputV2["anchors"]["anchorBlendMode"];
  comparableAnchorPresent: boolean;
  referenceAnchorPresent: boolean;
  heuristicAnchorPresent: boolean;
};

export function buildEstimationAuditSnapshot(outputV2: EstimationOutputV2): EstimationAuditSnapshot {
  return {
    evidenceTier: outputV2.tierDecision.tier,
    tierReasonCode: outputV2.tierDecision.tierReasonCode,
    pricingMode: outputV2.modeGovernance.pricingMode,
    claimMode: outputV2.modeGovernance.claimMode,
    precisionMode: outputV2.modeGovernance.precisionMode,
    rangeWidthMode: outputV2.modeGovernance.rangeWidthMode,
    confidenceScore: outputV2.confidence.confidenceScore,
    confidenceBand: outputV2.confidence.confidenceBand,
    confidenceCapped: outputV2.confidence.confidenceCapped,
    confidenceCeiling: outputV2.confidence.confidenceCeiling,
    confidenceBeforeCeiling: outputV2.confidence.confidenceBeforeCeiling,
    comparableCountCandidate: outputV2.evidence.comparableCountCandidate,
    comparableCountAfterQualityFilter: outputV2.evidence.comparableCountAfterQualityFilter,
    comparableCountUsed: outputV2.evidence.comparableCountUsed,
    comparableCountStrong: outputV2.evidence.comparableCountStrong,
    comparableSimilarityMedian: outputV2.evidence.comparableSimilarityMedian,
    comparableRecencyScore: outputV2.evidence.comparableRecencyScore,
    comparableDispersionScore: outputV2.evidence.comparableDispersionScore,
    comparableLocationStrength: outputV2.evidence.comparableLocationStrength,
    canonicalModelCertainty: outputV2.evidence.canonicalModelCertainty,
    referenceProfileUsed: outputV2.evidence.referenceProfileUsed,
    referenceProfileStrength: outputV2.evidence.referenceProfileStrength,
    fallbackUsed: outputV2.evidence.fallbackUsed,
    fallbackType: outputV2.evidence.fallbackType,
    anchorBlendMode: outputV2.anchors.anchorBlendMode,
    comparableAnchorPresent: outputV2.anchors.comparableMarketAnchor != null,
    referenceAnchorPresent: outputV2.anchors.referenceAnchor != null,
    heuristicAnchorPresent: outputV2.anchors.heuristicAnchor != null,
  };
}

export function buildEstimationEventContext(
  outputV2: EstimationOutputV2,
  extras?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...buildEstimationAuditSnapshot(outputV2),
    ...extras,
  };
}

