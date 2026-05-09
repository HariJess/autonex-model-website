// Supabase Edge Function — compute-estimation / types.ts
// -----------------------------------------------------------------------------
// Duplication minimale des types nécessaires côté Edge Function.
//
// Pourquoi dupliquer plutôt qu'importer `src/types/estimation` ?
//   1. Deno ne résout pas les alias `@/...` du `tsconfig.app.json`.
//   2. Le bundle Edge Function doit être autonome (pas de dépendance vers le
//      code app side).
//   3. Garder les contrats stables ici fournit une frontière explicite : si
//      le type front change, on est forcé de mettre à jour les deux côtés en
//      conscience (parfait pour un sprint de portage).
//
// Si une divergence apparaît, les tests de parité legacy vs v2 la détecteront
// immédiatement (on compare les outputs typés sur les deux moteurs).
// -----------------------------------------------------------------------------

export type FuelType = "petrol" | "diesel" | "hybrid" | "electric" | "other";
export type TransmissionType = "manual" | "automatic" | "cvt" | "other";
export type BodyType =
  | "sedan"
  | "suv"
  | "hatchback"
  | "pickup"
  | "van"
  | "wagon"
  | "coupe"
  | "convertible"
  | "other";
export type ConditionLabel = "excellent" | "good" | "fair" | "needs_work";
export type MaintenanceLevel = "full" | "partial" | "unknown";
export type OwnerCountLabel = "1" | "2" | "3_plus";
export type UsageType = "personal" | "professional" | "rental" | "fleet";
export type ConfidenceBand = "high" | "medium" | "low";

export interface EstimationInput {
  makeId?: string;
  modelId?: string;
  makeName: string;
  modelName: string;
  /** PROMPT 10A — Trim/version optionnel pour matching strict cascade. */
  trim?: string | null;
  year: number;
  city: string;
  mileage: number;
  fuelType: FuelType;
  transmissionType: TransmissionType;
  bodyType: BodyType;
  conditionLabel: ConditionLabel;
  accidentDeclared: boolean;
  maintenanceLevel: MaintenanceLevel;
  ownerCountLabel: OwnerCountLabel;
  usageType: UsageType;
}

export interface EstimationComparable {
  listingId: string;
  title: string;
  price: number;
  year: number;
  mileage: number;
  city: string;
  score: number;
  imageUrl?: string;
}

export type EvidenceTier =
  | "A_STRONG_MARKET"
  | "B_MODERATE_MARKET"
  | "C_REFERENCE_ASSISTED"
  | "D_HEURISTIC_ONLY";

export interface EvidenceTierDecision {
  tier: EvidenceTier;
  tierReasonCode:
    | "STRONG_COMPARABLE_SET"
    | "MODERATE_COMPARABLE_SET"
    | "WEAK_COMPARABLES_REFERENCE_USED"
    | "NO_RELIABLE_COMPARABLES"
    | "SANITY_BOUND_APPLIED";
  tierReasonSummary: string;
}

export type PricingMode =
  | "market_backed"
  | "partially_market_backed"
  | "reference_assisted"
  | "heuristic_only";

export type ClaimMode =
  | "ALLOW_STRONG_MARKET_CLAIM"
  | "ALLOW_LIMITED_MARKET_CLAIM"
  | "INDICATIVE_REFERENCE_CLAIM_ONLY"
  | "INDICATIVE_HEURISTIC_CLAIM_ONLY";

export type PrecisionMode = "tight" | "medium" | "coarse" | "very_coarse";
export type RangeWidthMode = "tight" | "standard" | "wide" | "very_wide";

export interface ModeGovernance {
  pricingMode: PricingMode;
  claimMode: ClaimMode;
  precisionMode: PrecisionMode;
  rangeWidthMode: RangeWidthMode;
}

export interface EvidenceMetrics {
  comparableCountCandidate: number;
  comparableCountAfterQualityFilter: number;
  comparableCountUsed: number;
  comparableCountStrong: number;
  comparableSimilarityAvg: number;
  comparableSimilarityMedian: number;
  comparableRecencyScore: number;
  comparableDispersionScore: number;
  comparableLocationStrength: "same_city" | "same_region" | "mixed" | "weak";
  canonicalModelCertainty: number;
  referenceProfileUsed: boolean;
  referenceProfileStrength: number | null;
  fallbackUsed: boolean;
  fallbackType: "profile_seeded" | "generic_heuristic" | null;
}

export interface AnchorBreakdown {
  comparableMarketAnchor: number | null;
  referenceAnchor: number | null;
  heuristicAnchor: number | null;
  finalBaseAnchor: number;
  adjustedMarketEstimate: number;
  anchorBlendMode:
    | "comparables_primary"
    | "comparables_plus_reference"
    | "reference_primary"
    | "heuristic_primary";
}

export interface AdjustmentComponent {
  factor: number;
  deltaPct: number;
  bounded: boolean;
}

export interface AdjustmentBreakdown {
  mileageAdjustment: AdjustmentComponent;
  conditionAdjustment: AdjustmentComponent;
  maintenanceAdjustment: AdjustmentComponent;
  accidentAdjustment: AdjustmentComponent;
  ownershipAdjustment: AdjustmentComponent;
  usageAdjustment: AdjustmentComponent;
  totalAdjustmentFactor: number;
  totalDeltaPct: number;
  adjustmentCapApplied: boolean;
}

export interface OutputValues {
  estimatedValue: number;
  lowEstimate: number;
  highEstimate: number;
  quickSalePrice: number;
  recommendedListingPrice: number;
  roundingStepApplied: number;
  /** PROMPT 10A — 3 valeurs Argus-grade (additives). */
  tradeInPro: number;
  privateMarket: number;
  dealerRetail: number;
  internalUnrounded?: {
    estimatedValueRaw: number;
    lowEstimateRaw: number;
    highEstimateRaw: number;
    quickSaleRaw: number;
    recommendedRaw: number;
  };
}

export interface ConfidenceDriver {
  key:
    | "comparable_count"
    | "similarity"
    | "recency"
    | "dispersion"
    | "canonical_certainty"
    | "input_completeness"
    | "reference_strength"
    | "fallback_penalty";
  impact: "positive" | "negative";
  weight: number;
}

export interface ConfidencePayload {
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  confidenceCeiling: number;
  confidenceBeforeCeiling: number;
  confidenceCapped: boolean;
  drivers: ConfidenceDriver[];
  explanationMode: "detailed" | "summary_only";
}

export type FactorCategory = "pricing_factor" | "evidence_note" | "disclaimer";

export interface InsightItem {
  id: string;
  category: FactorCategory;
  polarity?: "positive" | "negative" | "neutral";
  code: string;
  label: string;
  severity?: "info" | "warning" | "critical";
}

export interface InsightsPayload {
  pricingFactorsPositive: InsightItem[];
  pricingFactorsNegative: InsightItem[];
  evidenceNotes: InsightItem[];
  disclaimers: InsightItem[];
}

export interface UiGovernance {
  allowedMarketClaim: boolean;
  mustShowIndicativeLabel: boolean;
  shouldDeEmphasizePrecision: boolean;
  shouldHideExactConfidenceScore: boolean;
  allowedRangeTightness: "tight" | "standard" | "wide" | "very_wide";
  recommendedPrimaryCTAStyle: "strong" | "normal" | "cautious";
  requiredBadges: Array<
    "market_backed" | "partially_market_backed" | "reference_assisted" | "heuristic_only"
  >;
}

/** PROMPT 10A — Audit fields V2 (mirror du type côté src/types/estimation.ts). */
export interface EstimationAuditV2 {
  rangeMethod: "percentile_p10_p90" | "percentile_p25_p75" | "synthetic_spread";
  capApplied: boolean;
  trimFiltering: "strict" | "relaxed" | "all_trims_warning" | "unspecified";
  comparableSourceBreakdown: {
    marketClean: number;
    autonexActive: number;
  };
  transactionFactorAvg: number;
  transactionFactorVersion: string;
  /** PROMPT 10E — Couche 2 */
  comparablesBreakdownByLayer?: {
    exact: number;
    segmentProche: number;
    fallbackCanonical: number;
  };
  proximityModelsUsed?: Array<{ make: string; model: string; n: number }>;
  proximityFactorAvg?: number;
  reasoningLayer?:
    | "couche_1_exact"
    | "couche_2_segment_proche"
    | "couche_4_sanity_only"
    | "fallback_canonical";
  /** PROMPT 10E — Couche 4 */
  sanityCheck?: {
    applied: boolean;
    action: "kept" | "raised_to_floor" | "lowered_to_ceiling" | "no_bound";
    segmentKey: string | null;
    segmentLabel: string | null;
    originalEstimate: number;
    adjustedEstimate: number;
    warning: string | null;
  };
}

export interface EstimationOutputV2 {
  tierDecision: EvidenceTierDecision;
  modeGovernance: ModeGovernance;
  evidence: EvidenceMetrics;
  anchors: AnchorBreakdown;
  adjustments: AdjustmentBreakdown;
  confidence: ConfidencePayload;
  values: OutputValues;
  comparables: EstimationComparable[];
  insights: InsightsPayload;
  uiGovernance: UiGovernance;
  audit?: EstimationAuditV2;
}
