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

export interface EstimationRunResult {
  requestId: string;
  resultId: string;
  output: EstimationLegacyOutput;
  outputV2: EstimationOutputV2;
}
