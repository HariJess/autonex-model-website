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
  | "other";
export type ConditionLabel = "excellent" | "good" | "fair" | "needs_work";
export type MaintenanceLevel = "full" | "partial" | "unknown";
export type OwnerCountLabel = "1" | "2" | "3_plus";
export type UsageType = "personal" | "professional" | "rental" | "fleet";
export type ConfidenceLabel = "high" | "medium" | "low";

export interface EstimationInput {
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

export interface EstimationOutput {
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

export interface EstimationRunResult {
  requestId: string;
  resultId: string;
  output: EstimationOutput;
}
