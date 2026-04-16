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
  evidenceSummaryLine: string;
  ctaFootnote: string;
};

type ToneProfile = {
  confidenceInterpretation: string;
  evidenceHeadline: string;
  actionHeadline: string;
  actionDescription: string;
  comparablesIntro: string;
  comparablesEmptyTitle: string;
  comparablesEmptyMessage: string;
  ctaFootnote: string;
};

function toneProfile(level: EstimationPresentation["summaryLevel"]): ToneProfile {
  if (level === "Robuste") {
    return {
      confidenceInterpretation: "La base de comparaison est solide ; vous pouvez piloter votre prix avec une marge de négociation maîtrisée.",
      evidenceHeadline: "Évidence marché bien établie",
      actionHeadline: "Publiez maintenant avec un positionnement assumé",
      actionDescription: "Le rapport soutient une décision de publication rapide avec un cap prix crédible.",
      comparablesIntro: "Comparables cohérents et proches du profil de votre véhicule pour soutenir un prix de mise en marché convaincant.",
      comparablesEmptyTitle: "Comparaison marché en consolidation",
      comparablesEmptyMessage: "Le socle d'évidence reste robuste, même si la vitrine de comparables affichée ici est partielle.",
      ctaFootnote: "Conseil AutoNex : un prix aligné sur cette fourchette robuste favorise des prises de contact qualifiées.",
    };
  }
  if (level === "Qualifié") {
    return {
      confidenceInterpretation: "Le signal marché est exploitable, avec une prudence raisonnable sur le positionnement final.",
      evidenceHeadline: "Évidence marché partielle mais exploitable",
      actionHeadline: "Publiez avec un positionnement calibré",
      actionDescription: "Le rapport donne une base sérieuse, à ajuster selon vos priorités de délai et de marge.",
      comparablesIntro: "Comparables utiles pour cadrer le prix, avec un niveau de preuve qualifié et une marge d'interprétation.",
      comparablesEmptyTitle: "Comparaison marché en consolidation",
      comparablesEmptyMessage: "Les comparables exacts sont encore peu nombreux. Le rapport reste utile pour cadrer votre décision avec prudence.",
      ctaFootnote: "Conseil AutoNex : en mode qualifié, restez proche de la fourchette et ajustez selon le rythme des retours marché.",
    };
  }
  if (level === "Indicatif") {
    return {
      confidenceInterpretation: "Le résultat reste utile comme repère initial, mais nécessite une lecture prudente avant décision.",
      evidenceHeadline: "Évidence limitée, appui de référence",
      actionHeadline: "Publiez prudemment ou affinez d'abord les données",
      actionDescription: "Le rapport est indicatif : privilégiez une approche prudente et vérifiez vos hypothèses avant publication.",
      comparablesIntro: "Comparables partiels : utilisez-les comme repères de cadrage, sans surinterpréter le signal marché.",
      comparablesEmptyTitle: "Comparaison marché en consolidation",
      comparablesEmptyMessage: "Le rapport s'appuie surtout sur des signaux de référence. Gardez une stratégie de prix prudente.",
      ctaFootnote: "Conseil AutoNex : en mode indicatif, privilégiez un positionnement prudent et réévaluez après premiers retours.",
    };
  }
  return {
    confidenceInterpretation: "Le résultat reste utile comme repère initial, mais nécessite une lecture prudente avant décision.",
    evidenceHeadline: "Évidence marché insuffisante",
    actionHeadline: "Publiez prudemment ou affinez d'abord les données",
    actionDescription: "Le rapport est indicatif : privilégiez une approche prudente et vérifiez vos hypothèses avant publication.",
    comparablesIntro: "Comparables encore limités : utilisez-les comme repères, pas comme preuve forte.",
    comparablesEmptyTitle: "Comparables encore insuffisants",
    comparablesEmptyMessage: "Le rapport s'appuie surtout sur des signaux de référence. Gardez une stratégie de prix prudente.",
    ctaFootnote: "Conseil AutoNex : en contexte d'évidence faible, privilégiez une stratégie prudente avant de figer le prix.",
  };
}

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
  const profile = toneProfile(summaryLevel);
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
  const evidenceSummaryLine = `Niveau ${summaryLevel.toLowerCase()} : ${profile.evidenceHeadline.toLowerCase()}.`;

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
    confidenceInterpretation: profile.confidenceInterpretation,
    evidenceHeadline: profile.evidenceHeadline,
    actionHeadline: profile.actionHeadline,
    actionDescription: profile.actionDescription,
    comparablesIntro: profile.comparablesIntro,
    comparablesEmptyTitle: profile.comparablesEmptyTitle,
    comparablesEmptyMessage: profile.comparablesEmptyMessage,
    marketSupportLabel,
    marketSupportHeadline,
    marketSupportSummary,
    marketSupportCaution,
    comparableSelectionHint,
    evidenceSummaryLine,
    ctaFootnote: profile.ctaFootnote,
  };
}
