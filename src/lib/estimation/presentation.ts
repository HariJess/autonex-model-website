import type { ClaimMode, ConfidenceBand, EstimationRunResult } from "@/types/estimation";

export function claimModeLabel(claimMode: ClaimMode): string {
  if (claimMode === "ALLOW_STRONG_MARKET_CLAIM") return "Analyse marché robuste";
  if (claimMode === "ALLOW_LIMITED_MARKET_CLAIM") return "Analyse marché qualifiée";
  if (claimMode === "INDICATIVE_REFERENCE_CLAIM_ONLY") return "Estimation indicative assistée";
  return "Estimation indicative exploratoire";
}

export function claimModeMessage(claimMode: ClaimMode): string {
  if (claimMode === "ALLOW_STRONG_MARKET_CLAIM") {
    return "Estimation principalement appuyée sur des comparables solides du marché AutoNex.";
  }
  if (claimMode === "ALLOW_LIMITED_MARKET_CLAIM") {
    return "Estimation guidée par le marché, avec un niveau de prudence supplémentaire.";
  }
  if (claimMode === "INDICATIVE_REFERENCE_CLAIM_ONLY") {
    return "Estimation indicative appuyée par des références et un signal marché partiel.";
  }
  return "Estimation indicative en contexte de données marché encore insuffisantes.";
}

export function confidenceLabelFr(label: ConfidenceBand): string {
  if (label === "high") return "élevée";
  if (label === "medium") return "moyenne";
  return "prudente";
}

export type EstimationPresentation = {
  claimLabel: string;
  claimMessage: string;
  confidenceBand: ConfidenceBand;
  showExactConfidence: boolean;
  confidenceDisplayValue: number | null;
  indicativeRequired: boolean;
  rangeToneLabel: "resserrée" | "équilibrée" | "prudente";
  summaryLevel: "Robuste" | "Qualifié" | "Indicatif" | "Prudent";
  precisionCaution: boolean;
};

export function buildEstimationPresentation(result: EstimationRunResult): EstimationPresentation {
  const v2 = result.outputV2;
  const claimLabel = claimModeLabel(v2.modeGovernance.claimMode);
  const claimMessage = claimModeMessage(v2.modeGovernance.claimMode);
  const confidenceBand = v2.confidence.confidenceBand;
  const showExactConfidence = !v2.uiGovernance.shouldHideExactConfidenceScore;
  const confidenceDisplayValue = showExactConfidence ? v2.confidence.confidenceScore : null;
  const indicativeRequired = v2.uiGovernance.mustShowIndicativeLabel;
  const rangeToneLabel =
    v2.modeGovernance.rangeWidthMode === "tight"
      ? "resserrée"
      : v2.modeGovernance.rangeWidthMode === "standard"
        ? "équilibrée"
        : "prudente";
  const summaryLevel =
    v2.tierDecision.tier === "A_STRONG_MARKET"
      ? "Robuste"
      : v2.tierDecision.tier === "B_MODERATE_MARKET"
        ? "Qualifié"
        : v2.tierDecision.tier === "C_REFERENCE_ASSISTED"
          ? "Indicatif"
          : "Prudent";

  return {
    claimLabel,
    claimMessage,
    confidenceBand,
    showExactConfidence,
    confidenceDisplayValue,
    indicativeRequired,
    rangeToneLabel,
    summaryLevel,
    precisionCaution: v2.uiGovernance.shouldDeEmphasizePrecision,
  };
}
