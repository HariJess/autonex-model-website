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
export type ConfidenceLabel = "high" | "medium" | "low";
export type ConfidenceBand = ConfidenceLabel;

export interface EstimationInputV2 {
  makeId?: string;
  modelId?: string;
  makeName: string;
  modelName: string;
  /**
   * PROMPT 10A — Trim/version optionnel pour matching strict (ex "LC79", "Vigo").
   * Si null/undefined : pas de filtre trim → flag `trim_unspecified` dans audit
   * + pénalité confidence -0.05 (matching imprécis).
   */
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

// Backward-compatible alias during migration.
export type EstimationInput = EstimationInputV2;

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
    | "NO_RELIABLE_COMPARABLES";
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
  /**
   * PROMPT 10A — 3 valeurs Argus-grade distinctes (additives, retro-compat).
   * - tradeInPro     : Reprise pro (centrale × 0.78)
   * - privateMarket  : Entre particuliers (centrale × 1.00) ≡ estimatedValue
   * - dealerRetail   : En concession (centrale × 1.15)
   *
   * `estimatedValue` reste populé avec privateMarket pour rétro-compat UI
   * legacy en attendant PROMPT 10B (cards 3 valeurs).
   */
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

/**
 * PROMPT 10A — Audit fields V2 (trace de pipeline pour debug + transparency UI).
 *
 * Ajouté en additif sur `EstimationOutputV2.audit` pour pouvoir consommer
 * dans la page méthodologie (PROMPT 10B) sans casser les contrats existants.
 */
export interface EstimationAuditV2 {
  /** Méthode de calcul du range (low/high). */
  rangeMethod: "percentile_p10_p90" | "percentile_p25_p75" | "synthetic_spread";
  /** True si le clamp post-blend [0.80, 1.12] est intervenu. */
  capApplied: boolean;
  /** État du filtrage trim après cascade. */
  trimFiltering: "strict" | "relaxed" | "all_trims_warning" | "unspecified";
  /** Ventilation des comparables par origine. */
  comparableSourceBreakdown: {
    marketClean: number;
    autonexActive: number;
  };
  /** Moyenne des transaction factors appliqués (1.0 = aucun gap asking↔transaction). */
  transactionFactorAvg: number;
  /** Version de la config transaction_factors_v2 utilisée. */
  transactionFactorVersion: string;
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
  /** PROMPT 10A — additif, optionnel pour rétro-compat des consumers. */
  audit?: EstimationAuditV2;
}

// Legacy shape preserved for existing UI consumers.
export interface EstimationLegacyOutput {
  marketBasePrice: number;
  adjustedPrice: number;
  lowRangePrice: number;
  highRangePrice: number;
  recommendedListingPrice: number;
  quickSalePrice: number;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  positiveFactors: string[];
  negativeFactors: string[];
  comparables: EstimationComparable[];
  hasComparables: boolean;
  usedReferenceProfile: boolean;
  estimationNote?: string;
}

// Backward-compatible alias during migration.
export type EstimationOutput = EstimationLegacyOutput;

/** Telemetry event names persisted via `record_vehicle_estimation_event` RPC. */
export type VehicleEstimationTelemetryEventType =
  | "estimation_started"
  | "estimation_completed"
  | "estimation_result_viewed"
  | "clicked_publish_after_estimation"
  | "clicked_refine_estimation"
  | "clicked_compare_after_estimation"
  | "viewed_similar_listings";

/** Row identity after inserting an estimation request (submissionSecret proves ownership for anonymous RPC writes). */
export interface VehicleEstimationRequestCreated {
  requestId: string;
  submissionSecret: string;
}

export interface EstimationRunResult {
  requestId: string;
  /** Returned to the client after request creation; required for RPC writes when user_id is null (anonymous). */
  submissionSecret: string;
  resultId: string;
  output: EstimationLegacyOutput;
  outputV2: EstimationOutputV2;
}
