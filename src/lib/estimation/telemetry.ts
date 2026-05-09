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

export type EstimationAuditSupportLevel = "strong" | "moderate" | "limited" | "weak";
export type EstimationAuditSeverity = "low" | "medium" | "high";

/**
 * Optional metadata produced par l'orchestration `runVehicleEstimation`
 * indiquant quel moteur a été utilisé pour cette exécution. Sert à corréler
 * un éventuel skew de comportement (legacy vs v2) lors du rollout v2.
 */
export type EstimationEngineTelemetry = {
  engineVersion: "legacy" | "v2";
  /** True si v2 a été demandé puis a échoué et qu'on a fallback automatiquement vers legacy. */
  v2FallbackToLegacy: boolean;
};

export type EstimationAuditInspection = {
  supportLevel: EstimationAuditSupportLevel;
  severity: EstimationAuditSeverity;
  headline: string;
  summaryLines: string[];
  flags: string[];
  /** Présent dès qu'un orchestrateur fournit l'info ; absent dans les snapshots purs (tests, audit offline). */
  engineVersion?: "legacy" | "v2";
  /** True si v2 a été tenté puis fallback vers legacy. Absent quand le contexte n'est pas fourni. */
  v2FallbackToLegacy?: boolean;
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

export function deriveSupportLevel(snapshot: EstimationAuditSnapshot): EstimationAuditSupportLevel {
  if (snapshot.comparableCountStrong >= 6 && snapshot.comparableSimilarityMedian >= 68) return "strong";
  if (snapshot.comparableCountStrong >= 3 && snapshot.comparableSimilarityMedian >= 55) return "moderate";
  if (snapshot.comparableCountUsed >= 1) return "limited";
  return "weak";
}

export function buildEstimationAuditInspection(
  snapshot: EstimationAuditSnapshot,
  engineTelemetry?: EstimationEngineTelemetry,
): EstimationAuditInspection {
  const supportLevel = deriveSupportLevel(snapshot);
  const severity: EstimationAuditSeverity =
    snapshot.claimMode === "INDICATIVE_HEURISTIC_CLAIM_ONLY" || snapshot.fallbackType === "generic_heuristic"
      ? "high"
      : snapshot.claimMode === "INDICATIVE_REFERENCE_CLAIM_ONLY" || snapshot.fallbackUsed
        ? "medium"
        : "low";
  const headline =
    supportLevel === "strong"
      ? "Estimation majoritairement soutenue par des comparables solides."
      : supportLevel === "moderate"
        ? "Estimation soutenue par un signal marché qualifié."
        : supportLevel === "limited"
          ? "Estimation avec support marché partiel, lecture prudente recommandée."
          : "Estimation surtout indicative avec support marché faible.";

  const summaryLines = [
    `Tier ${snapshot.evidenceTier} (${snapshot.tierReasonCode})`,
    `Mode ${snapshot.pricingMode} / ${snapshot.claimMode}`,
    `Confiance ${snapshot.confidenceBand} (${snapshot.confidenceScore}/100${snapshot.confidenceCapped ? ", cap appliqué" : ""})`,
    `Comparables: ${snapshot.comparableCountUsed} retenus, ${snapshot.comparableCountStrong} solides, similarité médiane ${Math.round(snapshot.comparableSimilarityMedian)}/100`,
    `Fallback: ${snapshot.fallbackUsed ? snapshot.fallbackType ?? "oui" : "non"} ; blend ${snapshot.anchorBlendMode}`,
  ];
  if (engineTelemetry) {
    summaryLines.push(
      `Moteur: ${engineTelemetry.engineVersion}${engineTelemetry.v2FallbackToLegacy ? " (fallback v2→legacy)" : ""}`,
    );
  }

  const flags: string[] = [];
  if (snapshot.fallbackUsed) flags.push("fallback_used");
  if (snapshot.confidenceCapped) flags.push("confidence_capped");
  if (snapshot.comparableCountUsed === 0) flags.push("no_comparables_used");
  if (snapshot.claimMode.includes("INDICATIVE")) flags.push("indicative_claim_mode");
  if (snapshot.referenceProfileUsed) flags.push("reference_profile_used");
  if (engineTelemetry?.v2FallbackToLegacy) flags.push("v2_fallback_to_legacy");

  return {
    supportLevel,
    severity,
    headline,
    summaryLines,
    flags,
    ...(engineTelemetry
      ? {
          engineVersion: engineTelemetry.engineVersion,
          v2FallbackToLegacy: engineTelemetry.v2FallbackToLegacy,
        }
      : {}),
  };
}

export function formatEstimationAuditSnapshot(snapshot: EstimationAuditSnapshot): string {
  const inspection = buildEstimationAuditInspection(snapshot);
  return [
    `[${inspection.severity.toUpperCase()}][${inspection.supportLevel.toUpperCase()}] ${inspection.headline}`,
    ...inspection.summaryLines.map((line) => `- ${line}`),
    inspection.flags.length ? `- Flags: ${inspection.flags.join(", ")}` : "- Flags: none",
  ].join("\n");
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

