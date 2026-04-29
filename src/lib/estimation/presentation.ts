import type { ClaimMode, ConfidenceBand, EstimationRunResult } from "@/types/estimation";

export type EstimationTFn = (key: string, defaultValue: string, options?: Record<string, unknown>) => string;

const passthroughT: EstimationTFn = (_key, defaultValue) => defaultValue;

export function claimModeLabel(claimMode: ClaimMode, t: EstimationTFn = passthroughT): string {
  if (claimMode === "ALLOW_STRONG_MARKET_CLAIM") return t("estimation.report.claimModeStrong", "Analyse marché robuste");
  if (claimMode === "ALLOW_LIMITED_MARKET_CLAIM") return t("estimation.report.claimModeLimited", "Analyse marché qualifiée");
  if (claimMode === "INDICATIVE_REFERENCE_CLAIM_ONLY") return t("estimation.report.claimModeReference", "Estimation indicative assistée");
  return t("estimation.report.claimModeExploratory", "Estimation indicative exploratoire");
}

export function claimModeMessage(claimMode: ClaimMode, t: EstimationTFn = passthroughT): string {
  if (claimMode === "ALLOW_STRONG_MARKET_CLAIM") {
    return t("estimation.report.claimMessageStrong", "Estimation principalement appuyée sur des comparables solides du marché AutoNex.");
  }
  if (claimMode === "ALLOW_LIMITED_MARKET_CLAIM") {
    return t("estimation.report.claimMessageLimited", "Estimation guidée par le marché, avec un niveau de prudence supplémentaire.");
  }
  if (claimMode === "INDICATIVE_REFERENCE_CLAIM_ONLY") {
    return t("estimation.report.claimMessageReference", "Estimation indicative appuyée par des références et un signal marché partiel.");
  }
  return t("estimation.report.claimMessageExploratory", "Estimation indicative en contexte de données marché encore insuffisantes.");
}

export function confidenceLabelFr(label: ConfidenceBand, t: EstimationTFn = passthroughT): string {
  if (label === "high") return t("estimation.report.confidenceHigh", "élevée");
  if (label === "medium") return t("estimation.report.confidenceMedium", "moyenne");
  return t("estimation.report.confidenceLow", "prudente");
}

export type EstimationPresentation = {
  claimLabel: string;
  claimMessage: string;
  confidenceBand: ConfidenceBand;
  showExactConfidence: boolean;
  confidenceDisplayValue: number | null;
  indicativeRequired: boolean;
  rangeToneLabel: string;
  summaryLevel: string;
  summaryLevelKey: "Robuste" | "Qualifié" | "Indicatif" | "Prudent";
  precisionCaution: boolean;
  confidenceInterpretation: string;
  evidenceHeadline: string;
  actionHeadline: string;
  actionDescription: string;
  comparablesIntro: string;
  comparablesEmptyTitle: string;
  comparablesEmptyMessage: string;
  marketSupportLabel: string;
  marketSupportLabelKey: "Fort" | "Modéré" | "Limité" | "Faible";
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

function toneProfile(level: EstimationPresentation["summaryLevelKey"], t: EstimationTFn): ToneProfile {
  if (level === "Robuste") {
    return {
      confidenceInterpretation: t(
        "estimation.report.toneRobust.confidenceInterpretation",
        "La base de comparaison est solide ; vous pouvez piloter votre prix avec une marge de négociation maîtrisée.",
      ),
      evidenceHeadline: t("estimation.report.toneRobust.evidenceHeadline", "Évidence marché bien établie"),
      actionHeadline: t("estimation.report.toneRobust.actionHeadline", "Publiez maintenant avec un positionnement assumé"),
      actionDescription: t(
        "estimation.report.toneRobust.actionDescription",
        "Le rapport soutient une décision de publication rapide avec un cap prix crédible.",
      ),
      comparablesIntro: t(
        "estimation.report.toneRobust.comparablesIntro",
        "Comparables cohérents et proches du profil de votre véhicule pour soutenir un prix de mise en marché convaincant.",
      ),
      comparablesEmptyTitle: t("estimation.report.toneRobust.comparablesEmptyTitle", "Comparaison marché en consolidation"),
      comparablesEmptyMessage: t(
        "estimation.report.toneRobust.comparablesEmptyMessage",
        "Le socle d'évidence reste robuste, même si la vitrine de comparables affichée ici est partielle.",
      ),
      ctaFootnote: t(
        "estimation.report.toneRobust.ctaFootnote",
        "Conseil AutoNex : un prix aligné sur cette fourchette robuste favorise des prises de contact qualifiées.",
      ),
    };
  }
  if (level === "Qualifié") {
    return {
      confidenceInterpretation: t(
        "estimation.report.toneQualified.confidenceInterpretation",
        "Le signal marché est exploitable, avec une prudence raisonnable sur le positionnement final.",
      ),
      evidenceHeadline: t("estimation.report.toneQualified.evidenceHeadline", "Évidence marché partielle mais exploitable"),
      actionHeadline: t("estimation.report.toneQualified.actionHeadline", "Publiez avec un positionnement calibré"),
      actionDescription: t(
        "estimation.report.toneQualified.actionDescription",
        "Le rapport donne une base sérieuse, à ajuster selon vos priorités de délai et de marge.",
      ),
      comparablesIntro: t(
        "estimation.report.toneQualified.comparablesIntro",
        "Comparables utiles pour cadrer le prix, avec un niveau de preuve qualifié et une marge d'interprétation.",
      ),
      comparablesEmptyTitle: t("estimation.report.toneQualified.comparablesEmptyTitle", "Comparaison marché en consolidation"),
      comparablesEmptyMessage: t(
        "estimation.report.toneQualified.comparablesEmptyMessage",
        "Les comparables exacts sont encore peu nombreux. Le rapport reste utile pour cadrer votre décision avec prudence.",
      ),
      ctaFootnote: t(
        "estimation.report.toneQualified.ctaFootnote",
        "Conseil AutoNex : en mode qualifié, restez proche de la fourchette et ajustez selon le rythme des retours marché.",
      ),
    };
  }
  if (level === "Indicatif") {
    return {
      confidenceInterpretation: t(
        "estimation.report.toneIndicative.confidenceInterpretation",
        "Le résultat reste utile comme repère initial, mais nécessite une lecture prudente avant décision.",
      ),
      evidenceHeadline: t("estimation.report.toneIndicative.evidenceHeadline", "Évidence limitée, appui de référence"),
      actionHeadline: t("estimation.report.toneIndicative.actionHeadline", "Publiez prudemment ou affinez d'abord les données"),
      actionDescription: t(
        "estimation.report.toneIndicative.actionDescription",
        "Le rapport est indicatif : privilégiez une approche prudente et vérifiez vos hypothèses avant publication.",
      ),
      comparablesIntro: t(
        "estimation.report.toneIndicative.comparablesIntro",
        "Comparables partiels : utilisez-les comme repères de cadrage, sans surinterpréter le signal marché.",
      ),
      comparablesEmptyTitle: t("estimation.report.toneIndicative.comparablesEmptyTitle", "Comparaison marché en consolidation"),
      comparablesEmptyMessage: t(
        "estimation.report.toneIndicative.comparablesEmptyMessage",
        "Le rapport s'appuie surtout sur des signaux de référence. Gardez une stratégie de prix prudente.",
      ),
      ctaFootnote: t(
        "estimation.report.toneIndicative.ctaFootnote",
        "Conseil AutoNex : en mode indicatif, privilégiez un positionnement prudent et réévaluez après premiers retours.",
      ),
    };
  }
  return {
    confidenceInterpretation: t(
      "estimation.report.toneCautious.confidenceInterpretation",
      "Le résultat reste utile comme repère initial, mais nécessite une lecture prudente avant décision.",
    ),
    evidenceHeadline: t("estimation.report.toneCautious.evidenceHeadline", "Évidence marché insuffisante"),
    actionHeadline: t("estimation.report.toneCautious.actionHeadline", "Publiez prudemment ou affinez d'abord les données"),
    actionDescription: t(
      "estimation.report.toneCautious.actionDescription",
      "Le rapport est indicatif : privilégiez une approche prudente et vérifiez vos hypothèses avant publication.",
    ),
    comparablesIntro: t(
      "estimation.report.toneCautious.comparablesIntro",
      "Comparables encore limités : utilisez-les comme repères, pas comme preuve forte.",
    ),
    comparablesEmptyTitle: t("estimation.report.toneCautious.comparablesEmptyTitle", "Comparables encore insuffisants"),
    comparablesEmptyMessage: t(
      "estimation.report.toneCautious.comparablesEmptyMessage",
      "Le rapport s'appuie surtout sur des signaux de référence. Gardez une stratégie de prix prudente.",
    ),
    ctaFootnote: t(
      "estimation.report.toneCautious.ctaFootnote",
      "Conseil AutoNex : en contexte d'évidence faible, privilégiez une stratégie prudente avant de figer le prix.",
    ),
  };
}

export function buildEstimationPresentation(
  result: EstimationRunResult,
  t: EstimationTFn = passthroughT,
): EstimationPresentation {
  const v2 = result.outputV2;
  const claimLabel = claimModeLabel(v2.modeGovernance.claimMode, t);
  const claimMessage = claimModeMessage(v2.modeGovernance.claimMode, t);
  const confidenceBand = v2.confidence.confidenceBand;
  const showExactConfidence = !v2.uiGovernance.shouldHideExactConfidenceScore;
  const confidenceDisplayValue = showExactConfidence ? v2.confidence.confidenceScore : null;
  const indicativeRequired = v2.uiGovernance.mustShowIndicativeLabel;
  const rangeToneLabel =
    v2.modeGovernance.rangeWidthMode === "tight"
      ? t("estimation.report.rangeTight", "resserrée")
      : v2.modeGovernance.rangeWidthMode === "standard"
        ? t("estimation.report.rangeStandard", "équilibrée")
        : t("estimation.report.rangeWide", "prudente");
  const summaryLevelKey: EstimationPresentation["summaryLevelKey"] =
    v2.tierDecision.tier === "A_STRONG_MARKET"
      ? "Robuste"
      : v2.tierDecision.tier === "B_MODERATE_MARKET"
        ? "Qualifié"
        : v2.tierDecision.tier === "C_REFERENCE_ASSISTED"
          ? "Indicatif"
          : "Prudent";
  const summaryLevel =
    summaryLevelKey === "Robuste"
      ? t("estimation.report.summaryRobust", "Robuste")
      : summaryLevelKey === "Qualifié"
        ? t("estimation.report.summaryQualified", "Qualifié")
        : summaryLevelKey === "Indicatif"
          ? t("estimation.report.summaryIndicative", "Indicatif")
          : t("estimation.report.summaryCautious", "Prudent");
  const profile = toneProfile(summaryLevelKey, t);
  const marketSupportLabelKey: EstimationPresentation["marketSupportLabelKey"] =
    v2.evidence.comparableCountStrong >= 6 && v2.evidence.comparableSimilarityMedian >= 68
      ? "Fort"
      : v2.evidence.comparableCountStrong >= 3 && v2.evidence.comparableSimilarityMedian >= 55
        ? "Modéré"
        : v2.evidence.comparableCountUsed >= 1
          ? "Limité"
          : "Faible";
  const marketSupportLabel =
    marketSupportLabelKey === "Fort"
      ? t("estimation.report.supportStrong", "Fort")
      : marketSupportLabelKey === "Modéré"
        ? t("estimation.report.supportModerate", "Modéré")
        : marketSupportLabelKey === "Limité"
          ? t("estimation.report.supportLimited", "Limité")
          : t("estimation.report.supportWeak", "Faible");
  const localityPhrase =
    v2.evidence.comparableLocationStrength === "same_city"
      ? t("estimation.report.localitySameCity", "majoritairement dans la même ville")
      : v2.evidence.comparableLocationStrength === "same_region"
        ? t("estimation.report.localitySameRegion", "principalement dans la même région")
        : v2.evidence.comparableLocationStrength === "mixed"
          ? t("estimation.report.localityMixed", "avec une couverture géographique mixte")
          : t("estimation.report.localityWeak", "avec une couverture géographique limitée");
  const marketSupportHeadline =
    marketSupportLabelKey === "Fort"
      ? t("estimation.report.supportHeadlineStrong", "Appui marché solide")
      : marketSupportLabelKey === "Modéré"
        ? t("estimation.report.supportHeadlineModerate", "Appui marché exploitable")
        : marketSupportLabelKey === "Limité"
          ? t("estimation.report.supportHeadlineLimited", "Appui marché partiel")
          : t("estimation.report.supportHeadlineWeak", "Appui marché faible");
  const marketSupportSummary = t(
    "estimation.report.supportSummary",
    "{{used}} comparables retenus ({{strong}} solides), similarité médiane {{similarity}} / 100, {{locality}}.",
    {
      used: v2.evidence.comparableCountUsed,
      strong: v2.evidence.comparableCountStrong,
      similarity: Math.round(v2.evidence.comparableSimilarityMedian),
      locality: localityPhrase,
    },
  );
  const marketSupportCaution =
    marketSupportLabelKey === "Fort"
      ? null
      : marketSupportLabelKey === "Modéré"
        ? t(
            "estimation.report.supportCautionModerate",
            "Le signal marché soutient l'estimation, mais une marge de prudence reste recommandée.",
          )
        : t(
            "estimation.report.supportCautionWeak",
            "Le signal marché reste partiel : utilisez ce rapport comme repère de décision, pas comme preuve forte.",
          );
  const comparableSelectionHint = t(
    "estimation.report.comparableSelectionHint",
    "Comparables sélectionnés sur proximité modèle/année/kilométrage, qualité d'annonce et cohérence prix.",
  );
  const evidenceSummaryLine = t(
    "estimation.report.evidenceSummaryLine",
    "Niveau {{level}} : {{evidence}}.",
    {
      level: summaryLevel.toLowerCase(),
      evidence: profile.evidenceHeadline.toLowerCase(),
    },
  );

  return {
    claimLabel,
    claimMessage,
    confidenceBand,
    showExactConfidence,
    confidenceDisplayValue,
    indicativeRequired,
    rangeToneLabel,
    summaryLevel,
    summaryLevelKey,
    precisionCaution: v2.uiGovernance.shouldDeEmphasizePrecision,
    confidenceInterpretation: profile.confidenceInterpretation,
    evidenceHeadline: profile.evidenceHeadline,
    actionHeadline: profile.actionHeadline,
    actionDescription: profile.actionDescription,
    comparablesIntro: profile.comparablesIntro,
    comparablesEmptyTitle: profile.comparablesEmptyTitle,
    comparablesEmptyMessage: profile.comparablesEmptyMessage,
    marketSupportLabel,
    marketSupportLabelKey,
    marketSupportHeadline,
    marketSupportSummary,
    marketSupportCaution,
    comparableSelectionHint,
    evidenceSummaryLine,
    ctaFootnote: profile.ctaFootnote,
  };
}
