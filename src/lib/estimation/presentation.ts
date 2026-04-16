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
  confidenceInterpretation: string;
  evidenceHeadline: string;
  actionHeadline: string;
  actionDescription: string;
  comparablesIntro: string;
  comparablesEmptyTitle: string;
  comparablesEmptyMessage: string;
  marketSupportLabel: "Fort" | "Modéré" | "Limité" | "Faible";
  marketSupportHeadline: string;
  marketSupportSummary: string;
  marketSupportCaution: string | null;
  comparableSelectionHint: string;
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
  const confidenceInterpretation =
    confidenceBand === "high"
      ? "La base de comparaison est solide ; vous pouvez piloter votre prix avec une marge de négociation maîtrisée."
      : confidenceBand === "medium"
        ? "Le signal marché est exploitable, avec une prudence raisonnable sur le positionnement final."
        : "Le résultat reste utile comme repère initial, mais nécessite une lecture prudente avant décision.";
  const evidenceHeadline =
    summaryLevel === "Robuste"
      ? "Évidence marché bien établie"
      : summaryLevel === "Qualifié"
        ? "Évidence marché partielle mais exploitable"
        : summaryLevel === "Indicatif"
          ? "Évidence limitée, appui de référence"
          : "Évidence marché insuffisante";
  const actionHeadline =
    summaryLevel === "Robuste"
      ? "Publiez maintenant avec un positionnement assumé"
      : summaryLevel === "Qualifié"
        ? "Publiez avec un positionnement calibré"
        : "Publiez prudemment ou affinez d'abord les données";
  const actionDescription =
    summaryLevel === "Robuste"
      ? "Le rapport soutient une décision de publication rapide avec un cap prix crédible."
      : summaryLevel === "Qualifié"
        ? "Le rapport donne une base sérieuse, à ajuster selon vos priorités de délai et de marge."
        : "Le rapport est indicatif : privilégiez une approche prudente et vérifiez vos hypothèses avant publication.";
  const comparablesIntro =
    summaryLevel === "Robuste"
      ? "Comparables cohérents pour soutenir un prix de mise en marché convaincant."
      : summaryLevel === "Qualifié"
        ? "Comparables utiles pour cadrer le prix, avec une marge d'interprétation."
        : "Comparables encore limités : utilisez-les comme repères, pas comme preuve forte.";
  const comparablesEmptyTitle =
    summaryLevel === "Prudent"
      ? "Comparables encore insuffisants"
      : "Comparaison marché en consolidation";
  const comparablesEmptyMessage =
    summaryLevel === "Prudent"
      ? "Le rapport s'appuie surtout sur des signaux de référence. Gardez une stratégie de prix prudente."
      : "Les comparables exacts sont encore peu nombreux. Le rapport reste utile pour cadrer votre décision.";
  const marketSupportLabel =
    v2.evidence.comparableCountStrong >= 6 && v2.evidence.comparableSimilarityMedian >= 68
      ? "Fort"
      : v2.evidence.comparableCountStrong >= 3 && v2.evidence.comparableSimilarityMedian >= 55
        ? "Modéré"
        : v2.evidence.comparableCountUsed >= 1
          ? "Limité"
          : "Faible";
  const localityPhrase =
    v2.evidence.comparableLocationStrength === "same_city"
      ? "majoritairement dans la même ville"
      : v2.evidence.comparableLocationStrength === "same_region"
        ? "principalement dans la même région"
        : v2.evidence.comparableLocationStrength === "mixed"
          ? "avec une couverture géographique mixte"
          : "avec une couverture géographique limitée";
  const marketSupportHeadline =
    marketSupportLabel === "Fort"
      ? "Appui marché solide"
      : marketSupportLabel === "Modéré"
        ? "Appui marché exploitable"
        : marketSupportLabel === "Limité"
          ? "Appui marché partiel"
          : "Appui marché faible";
  const marketSupportSummary = `${v2.evidence.comparableCountUsed} comparables retenus (${v2.evidence.comparableCountStrong} solides), similarité médiane ${Math.round(v2.evidence.comparableSimilarityMedian)} / 100, ${localityPhrase}.`;
  const marketSupportCaution =
    marketSupportLabel === "Fort"
      ? null
      : marketSupportLabel === "Modéré"
        ? "Le signal marché soutient l'estimation, mais une marge de prudence reste recommandée."
        : "Le signal marché reste partiel : utilisez ce rapport comme repère de décision, pas comme preuve forte.";
  const comparableSelectionHint =
    "Comparables sélectionnés sur proximité modèle/année/kilométrage, qualité d'annonce et cohérence prix.";

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
    confidenceInterpretation,
    evidenceHeadline,
    actionHeadline,
    actionDescription,
    comparablesIntro,
    comparablesEmptyTitle,
    comparablesEmptyMessage,
    marketSupportLabel,
    marketSupportHeadline,
    marketSupportSummary,
    marketSupportCaution,
    comparableSelectionHint,
  };
}
