import { supabase } from "@/integrations/supabase/client";
import { computeFallbackBaseline, findReferenceProfile } from "@/lib/estimation/referenceProfiles";
import type {
  ClaimMode,
  ConfidenceBand,
  ConfidenceDriver,
  EvidenceMetrics,
  EvidenceTier,
  EvidenceTierDecision,
  EstimationComparable,
  EstimationInput,
  EstimationLegacyOutput,
  EstimationOutputV2,
  InsightItem,
  ModeGovernance,
  PrecisionMode,
  RangeWidthMode,
  FuelType,
  TransmissionType,
} from "@/types/estimation";

type ComparableListingRow = {
  id: string;
  title: string;
  price_mga: number | null;
  year: number | null;
  mileage_km: number | null;
  ville: string | null;
  region: string | null;
  body_style: string | null;
  fuel: string | null;
  transmission_gearbox: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  status: string | null;
  make: string | null;
  model: string | null;
};

type ComparableFetchResult = {
  comparables: EstimationComparable[];
  candidateCount: number;
  qualityFilteredCount: number;
  strictCandidateCount: number;
  backupCandidateCount: number;
  rejectedCount: number;
  rejectedByReason: Record<string, number>;
  selectedFreshnessAvg: number;
  selectedSameCityCount: number;
  selectedWithRegionCount: number;
};

type QualityAcceptedCandidate = {
  row: ComparableListingRow;
  source: "strict" | "backup";
  qualityScore: number;
  freshnessScore: number;
};

type ScoredComparableCandidate = QualityAcceptedCandidate & {
  similarityScore: number;
};

function normalizeFuelForDb(value: FuelType): string | null {
  if (value === "petrol") return "Essence";
  if (value === "diesel") return "Diesel";
  if (value === "hybrid") return "Hybride";
  if (value === "electric") return "Électrique";
  return null;
}

function normalizeTransmissionForDb(value: TransmissionType): string | null {
  if (value === "manual") return "Boîte manuelle";
  if (value === "automatic") return "Boîte automatique";
  if (value === "cvt") return "CVT";
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function normalizeInput(input: EstimationInput): EstimationInput {
  return {
    ...input,
    makeName: input.makeName.trim(),
    modelName: input.modelName.trim(),
    city: input.city.trim(),
    year: Math.max(1950, Math.min(new Date().getFullYear(), Math.round(input.year))),
    mileage: Math.max(0, Math.min(1_500_000, Math.round(input.mileage))),
  };
}

function removeOutliers(prices: number[]): number[] {
  if (prices.length < 5) return prices;
  const med = median(prices);
  const deviations = prices.map((p) => Math.abs(p - med));
  const mad = median(deviations);
  if (mad === 0) return prices;
  const threshold = 2.8 * mad;
  return prices.filter((p) => Math.abs(p - med) <= threshold);
}

function toNormalized(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeBodyForDb(value: EstimationInput["bodyType"]): string[] {
  const map: Record<EstimationInput["bodyType"], string[]> = {
    sedan: ["berline", "sedan"],
    suv: ["suv", "4x4", "crossover"],
    hatchback: ["citadine", "hatchback", "compacte"],
    pickup: ["pickup", "pick-up", "pick up"],
    van: ["van", "minibus", "fourgon"],
    wagon: ["break", "wagon"],
    coupe: ["coupé", "coupe"],
    convertible: ["cabriolet", "roadster", "convertible", "spyder"],
    other: [],
  };
  return map[value] ?? [];
}

function daysBetweenNow(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const ts = Date.parse(isoDate);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000)));
}

function computeFreshnessScore(row: ComparableListingRow): number {
  const ageDays = daysBetweenNow(row.updated_at ?? row.created_at);
  if (ageDays == null) return 30;
  if (ageDays <= 14) return 100;
  if (ageDays <= 45) return 85;
  if (ageDays <= 90) return 70;
  if (ageDays <= 180) return 55;
  if (ageDays <= 365) return 35;
  return 15;
}

function evaluateCandidateQuality(
  input: EstimationInput,
  row: ComparableListingRow,
): { accepted: boolean; reason?: string; qualityScore: number; freshnessScore: number } {
  const nowYear = new Date().getFullYear();
  if (row.status !== "active") return { accepted: false, reason: "inactive", qualityScore: 0, freshnessScore: 0 };
  if (row.price_mga == null || row.price_mga < 2_000_000 || row.price_mga > 4_000_000_000) {
    return { accepted: false, reason: "invalid_price", qualityScore: 0, freshnessScore: 0 };
  }
  if (row.year == null || row.year < 1950 || row.year > nowYear + 1) {
    return { accepted: false, reason: "invalid_year", qualityScore: 0, freshnessScore: 0 };
  }
  if (row.mileage_km == null || row.mileage_km < 0 || row.mileage_km > 1_500_000) {
    return { accepted: false, reason: "invalid_mileage", qualityScore: 0, freshnessScore: 0 };
  }
  if (toNormalized(row.title).length < 8) {
    return { accepted: false, reason: "weak_title", qualityScore: 0, freshnessScore: 0 };
  }
  if (Math.abs(row.year - input.year) > 8) {
    return { accepted: false, reason: "year_too_far", qualityScore: 0, freshnessScore: 0 };
  }
  const freshnessScore = computeFreshnessScore(row);
  if (freshnessScore < 20) {
    return { accepted: false, reason: "stale_listing", qualityScore: 0, freshnessScore };
  }

  let qualityScore = 55;
  if (toNormalized(row.description).length >= 60) qualityScore += 15;
  if (row.mileage_km != null) qualityScore += 10;
  if (row.fuel) qualityScore += 5;
  if (row.transmission_gearbox) qualityScore += 5;
  if (row.ville) qualityScore += 5;
  if (row.region) qualityScore += 5;

  return {
    accepted: true,
    qualityScore: clamp(Math.round(qualityScore), 0, 100),
    freshnessScore,
  };
}

function computeSimilarityScore(input: EstimationInput, candidate: QualityAcceptedCandidate): number {
  const row = candidate.row;
  const expectedKm = Math.max(10_000, (new Date().getFullYear() - input.year + 1) * 15_000);
  const yearGap = Math.abs((row.year ?? input.year) - input.year);
  const kmGap = Math.abs((row.mileage_km ?? input.mileage) - input.mileage);
  const kmRatio = kmGap / expectedKm;

  const makeMatch = toNormalized(rowMake(row)) === toNormalized(input.makeName);
  const modelMatch = toNormalized(rowModel(row)) === toNormalized(input.modelName);

  let yearScore = 0;
  if (yearGap === 0) yearScore = 24;
  else if (yearGap <= 1) yearScore = 20;
  else if (yearGap <= 2) yearScore = 15;
  else if (yearGap <= 4) yearScore = 9;
  else yearScore = 4;

  let mileageScore = 0;
  if (kmRatio <= 0.1) mileageScore = 22;
  else if (kmRatio <= 0.2) mileageScore = 17;
  else if (kmRatio <= 0.35) mileageScore = 12;
  else if (kmRatio <= 0.5) mileageScore = 7;
  else mileageScore = 2;

  const fuel = normalizeFuelForDb(input.fuelType);
  const transmission = normalizeTransmissionForDb(input.transmissionType);
  const bodyHints = normalizeBodyForDb(input.bodyType);
  const rowBody = toNormalized(row.body_style);
  const cityMatch = toNormalized(row.ville) === toNormalized(input.city) && Boolean(input.city.trim());
  const regionMatch = !input.city.trim() && Boolean(toNormalized(row.region));

  let score = 0;
  score += makeMatch ? 15 : 0;
  score += modelMatch ? 15 : 0;
  score += yearScore;
  score += mileageScore;
  score += fuel && row.fuel === fuel ? 6 : 0;
  score += transmission && row.transmission_gearbox === transmission ? 5 : 0;
  score += bodyHints.length > 0 && bodyHints.some((hint) => rowBody.includes(hint)) ? 8 : 0;
  score += cityMatch ? 7 : regionMatch ? 3 : 0;
  score += Math.round((candidate.freshnessScore / 100) * 5);
  score += Math.round((candidate.qualityScore / 100) * 5);
  if (candidate.source === "backup") score -= 6;

  return clamp(Math.round(score), 0, 100);
}

function rowMake(row: ComparableListingRow): string {
  // Some datasets can have sparse/messy fields; centralizing keeps scoring logic cleaner.
  return row.make ?? "";
}

function rowModel(row: ComparableListingRow): string {
  return row.model ?? "";
}

function weightedMedian(values: number[], weights: number[]): number {
  if (values.length === 0 || weights.length !== values.length) return 0;
  const pairs = values
    .map((value, idx) => ({ value, weight: Math.max(0.0001, weights[idx]) }))
    .sort((a, b) => a.value - b.value);
  const totalWeight = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  let cumulative = 0;
  for (const pair of pairs) {
    cumulative += pair.weight;
    if (cumulative >= totalWeight / 2) return pair.value;
  }
  return pairs[pairs.length - 1]?.value ?? 0;
}

async function fetchComparableRows(
  input: EstimationInput,
  params: { yearWindow: number; strictAttributes: boolean; limit: number },
): Promise<ComparableListingRow[]> {
  const fuel = normalizeFuelForDb(input.fuelType);
  const transmission = normalizeTransmissionForDb(input.transmissionType);
  let query = supabase
    .from("listings")
    .select("id,title,price_mga,year,mileage_km,ville,region,body_style,fuel,transmission_gearbox,description,created_at,updated_at,status,make,model")
    .eq("status", "active")
    .ilike("make", input.makeName)
    .ilike("model", input.modelName)
    .gte("year", input.year - params.yearWindow)
    .lte("year", input.year + params.yearWindow)
    .limit(params.limit);
  if (params.strictAttributes) {
    if (fuel) query = query.eq("fuel", fuel);
    if (transmission) query = query.eq("transmission_gearbox", transmission);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ComparableListingRow[];
}

async function fetchComparables(input: EstimationInput): Promise<ComparableFetchResult> {
  const strictRows = await fetchComparableRows(input, { yearWindow: 3, strictAttributes: true, limit: 160 });
  const needsBackup = strictRows.length < 10;
  const backupRows = needsBackup
    ? await fetchComparableRows(input, { yearWindow: 6, strictAttributes: false, limit: 160 })
    : [];

  const allById = new Map<string, { row: ComparableListingRow; source: "strict" | "backup" }>();
  strictRows.forEach((row) => allById.set(row.id, { row, source: "strict" }));
  backupRows.forEach((row) => {
    if (!allById.has(row.id)) allById.set(row.id, { row, source: "backup" });
  });

  const rejectedByReason: Record<string, number> = {};
  const accepted: QualityAcceptedCandidate[] = [];
  for (const candidate of allById.values()) {
    const quality = evaluateCandidateQuality(input, candidate.row);
    if (!quality.accepted) {
      const reason = quality.reason ?? "unknown_rejection";
      rejectedByReason[reason] = (rejectedByReason[reason] ?? 0) + 1;
      continue;
    }
    accepted.push({
      row: candidate.row,
      source: candidate.source,
      qualityScore: quality.qualityScore,
      freshnessScore: quality.freshnessScore,
    });
  }

  const scored: ScoredComparableCandidate[] = accepted
    .map((candidate) => ({
      ...candidate,
      similarityScore: computeSimilarityScore(input, candidate),
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);

  const selected = scored.slice(0, 24);
  const selectedPrices = selected.map((s) => s.row.price_mga ?? 0);
  const outlierCleanPrices = removeOutliers(selectedPrices);
  const outlierPriceSet = new Set(outlierCleanPrices);
  const selectedWithoutOutliers = selected.filter((s) => outlierPriceSet.has(s.row.price_mga ?? 0)).slice(0, 12);
  const finalSelected = selectedWithoutOutliers.length >= 4 ? selectedWithoutOutliers : selected.slice(0, 12);

  const ids = finalSelected.map((s) => s.row.id);
  const { data: photos } = await supabase
    .from("listing_photos")
    .select("listing_id,url,position")
    .in("listing_id", ids)
    .order("position", { ascending: true });
  const firstPhoto = new Map<string, string>();
  (photos ?? []).forEach((p) => {
    if (!firstPhoto.has(p.listing_id)) firstPhoto.set(p.listing_id, p.url);
  });

  const comparables = finalSelected.map((candidate) => ({
    row: candidate.row,
    score: candidate.similarityScore,
  })).map(({ row, score }) => ({
    listingId: row.id,
    title: row.title,
    price: row.price_mga ?? 0,
    year: row.year ?? input.year,
    mileage: row.mileage_km ?? input.mileage,
    city: row.ville ?? "",
    score,
    imageUrl: firstPhoto.get(row.id),
  }));
  return {
    comparables,
    candidateCount: allById.size,
    qualityFilteredCount: accepted.length,
    strictCandidateCount: strictRows.length,
    backupCandidateCount: backupRows.length,
    rejectedCount: allById.size - accepted.length,
    rejectedByReason,
    selectedFreshnessAvg: finalSelected.length
      ? Math.round(finalSelected.reduce((sum, item) => sum + item.freshnessScore, 0) / finalSelected.length)
      : 0,
    selectedSameCityCount: finalSelected.filter((item) => toNormalized(item.row.ville) === toNormalized(input.city)).length,
    selectedWithRegionCount: finalSelected.filter((item) => Boolean(toNormalized(item.row.region))).length,
  };
}

type FallbackSeverity = "none" | "light" | "medium" | "high";

function buildAdjustmentFactors(input: EstimationInput): {
  multiplier: number;
  positive: string[];
  negative: string[];
  components: {
    mileage: number;
    condition: number;
    maintenance: number;
    accident: number;
    ownership: number;
    usage: number;
  };
} {
  let adjustment = 0;
  const positive: string[] = [];
  const negative: string[] = [];
  const components = {
    mileage: 0,
    condition: 0,
    maintenance: 0,
    accident: 0,
    ownership: 0,
    usage: 0,
  };

  const vehicleAge = Math.max(1, new Date().getFullYear() - input.year);
  const expectedKm = vehicleAge * 15_000;
  const kmDeltaRatio = expectedKm > 0 ? (input.mileage - expectedKm) / expectedKm : 0;
  if (kmDeltaRatio <= -0.2) {
    components.mileage = 0.035;
    adjustment += components.mileage;
    positive.push("Kilométrage inférieur à la moyenne");
  } else if (kmDeltaRatio <= -0.08) {
    components.mileage = 0.015;
    adjustment += components.mileage;
    positive.push("Kilométrage contenu pour l'âge du véhicule");
  } else if (kmDeltaRatio >= 0.3) {
    components.mileage = -0.06;
    adjustment += components.mileage;
    negative.push("Kilométrage supérieur à la moyenne");
  } else if (kmDeltaRatio >= 0.12) {
    components.mileage = -0.025;
    adjustment += components.mileage;
    negative.push("Kilométrage légèrement élevé");
  }

  const conditionAdj = {
    excellent: 0.04,
    good: 0,
    fair: -0.04,
    needs_work: -0.1,
  }[input.conditionLabel];
  components.condition = conditionAdj;
  adjustment += components.condition;
  if (conditionAdj > 0) positive.push("État général excellent");
  if (conditionAdj < 0) negative.push("État général perfectible");

  const maintenanceAdj = { full: 0.03, partial: 0.01, unknown: 0 }[input.maintenanceLevel];
  components.maintenance = maintenanceAdj;
  adjustment += components.maintenance;
  if (maintenanceAdj > 0) positive.push("Entretien suivi");

  if (input.accidentDeclared) {
    components.accident = -0.06;
    adjustment += components.accident;
    negative.push("Historique d'accident déclaré");
  }

  const ownerAdj = { "1": 0.02, "2": 0, "3_plus": -0.03 }[input.ownerCountLabel];
  components.ownership = ownerAdj;
  adjustment += components.ownership;
  if (ownerAdj > 0) positive.push("Un seul propriétaire");
  if (ownerAdj < 0) negative.push("Plusieurs propriétaires");

  const usageAdj = { personal: 0, professional: -0.02, rental: -0.07, fleet: -0.08 }[input.usageType];
  components.usage = usageAdj;
  adjustment += components.usage;
  if (usageAdj < 0) negative.push("Usage intensif (pro/location/flotte)");

  const clamped = clamp(adjustment, -0.2, 0.12);
  return {
    multiplier: 1 + clamped,
    positive: positive.slice(0, 4),
    negative: negative.slice(0, 4),
    components,
  };
}

type TierPolicy = {
  pricingMode: ModeGovernance["pricingMode"];
  claimMode: ClaimMode;
  precisionMode: PrecisionMode;
  rangeWidthMode: RangeWidthMode;
  confidenceCeiling: number;
};

type AnchorBlendPolicy = {
  comparableWeight: number;
  referenceWeight: number;
  heuristicWeight: number;
  blendMode: EstimationOutputV2["anchors"]["anchorBlendMode"];
};

function confidenceBandFromScore(score: number): ConfidenceBand {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function calculateFallbackSeverity(evidence: EvidenceMetrics): FallbackSeverity {
  if (!evidence.fallbackUsed) return "none";
  if (evidence.comparableCountUsed >= 6 && evidence.comparableSimilarityMedian >= 58) return "light";
  if (evidence.comparableCountUsed >= 3 && evidence.comparableSimilarityMedian >= 45) return "medium";
  return "high";
}

function determineTier(
  comparableEvidence: {
    usedCount: number;
    strongCount: number;
    similarityMedian: number;
    dispersionScore: number;
  },
  referenceProfileUsed: boolean,
): EvidenceTierDecision {
  if (
    comparableEvidence.usedCount >= 8 &&
    comparableEvidence.strongCount >= 5 &&
    comparableEvidence.similarityMedian >= 70 &&
    comparableEvidence.dispersionScore >= 55
  ) {
    return {
      tier: "A_STRONG_MARKET",
      tierReasonCode: "STRONG_COMPARABLE_SET",
      tierReasonSummary: "Comparable set strong and dense.",
    };
  }
  if (
    comparableEvidence.usedCount >= 5 &&
    comparableEvidence.similarityMedian >= 55
  ) {
    return {
      tier: "B_MODERATE_MARKET",
      tierReasonCode: "MODERATE_COMPARABLE_SET",
      tierReasonSummary: "Comparable set moderate.",
    };
  }
  if (referenceProfileUsed) {
    return {
      tier: "C_REFERENCE_ASSISTED",
      tierReasonCode: "WEAK_COMPARABLES_REFERENCE_USED",
      tierReasonSummary: "Weak comparables; reference profile assists valuation.",
    };
  }
  return {
    tier: "D_HEURISTIC_ONLY",
    tierReasonCode: "NO_RELIABLE_COMPARABLES",
    tierReasonSummary: "No reliable comparable evidence.",
  };
}

function tierPolicyFor(tier: EvidenceTier): TierPolicy {
  if (tier === "A_STRONG_MARKET") {
    return {
      pricingMode: "market_backed",
      claimMode: "ALLOW_STRONG_MARKET_CLAIM",
      precisionMode: "tight",
      rangeWidthMode: "tight",
      confidenceCeiling: 95,
    };
  }
  if (tier === "B_MODERATE_MARKET") {
    return {
      pricingMode: "partially_market_backed",
      claimMode: "ALLOW_LIMITED_MARKET_CLAIM",
      precisionMode: "medium",
      rangeWidthMode: "standard",
      confidenceCeiling: 82,
    };
  }
  if (tier === "C_REFERENCE_ASSISTED") {
    return {
      pricingMode: "reference_assisted",
      claimMode: "INDICATIVE_REFERENCE_CLAIM_ONLY",
      precisionMode: "coarse",
      rangeWidthMode: "wide",
      confidenceCeiling: 68,
    };
  }
  return {
    pricingMode: "heuristic_only",
    claimMode: "INDICATIVE_HEURISTIC_CLAIM_ONLY",
    precisionMode: "very_coarse",
    rangeWidthMode: "very_wide",
    confidenceCeiling: 45,
  };
}

function resolveTierPolicy(tier: EvidenceTier, fallbackSeverity: FallbackSeverity): TierPolicy {
  const base = tierPolicyFor(tier);
  if (fallbackSeverity === "none") return base;
  if (fallbackSeverity === "light") {
    return {
      ...base,
      confidenceCeiling: Math.max(40, base.confidenceCeiling - 4),
      rangeWidthMode: base.rangeWidthMode === "tight" ? "standard" : base.rangeWidthMode,
      precisionMode: base.precisionMode === "tight" ? "medium" : base.precisionMode,
    };
  }
  if (fallbackSeverity === "medium") {
    return {
      ...base,
      pricingMode: base.pricingMode === "market_backed" ? "partially_market_backed" : base.pricingMode,
      claimMode:
        base.claimMode === "ALLOW_STRONG_MARKET_CLAIM"
          ? "ALLOW_LIMITED_MARKET_CLAIM"
          : base.claimMode,
      confidenceCeiling: Math.max(35, base.confidenceCeiling - 10),
      rangeWidthMode:
        base.rangeWidthMode === "tight"
          ? "standard"
          : base.rangeWidthMode === "standard"
            ? "wide"
            : base.rangeWidthMode,
      precisionMode:
        base.precisionMode === "tight"
          ? "medium"
          : base.precisionMode === "medium"
            ? "coarse"
            : base.precisionMode,
    };
  }
  return {
    pricingMode: tier === "D_HEURISTIC_ONLY" ? "heuristic_only" : "reference_assisted",
    claimMode:
      tier === "D_HEURISTIC_ONLY"
        ? "INDICATIVE_HEURISTIC_CLAIM_ONLY"
        : "INDICATIVE_REFERENCE_CLAIM_ONLY",
    precisionMode: "very_coarse",
    rangeWidthMode: "very_wide",
    confidenceCeiling: Math.min(base.confidenceCeiling, 50),
  };
}

function getRangeSpreadFromPolicy(
  rangeWidthMode: RangeWidthMode,
  fallbackSeverity: FallbackSeverity,
): number {
  const base = {
    tight: 0.055,
    standard: 0.085,
    wide: 0.12,
    very_wide: 0.16,
  }[rangeWidthMode];
  const fallbackExtra = {
    none: 0,
    light: 0.0075,
    medium: 0.015,
    high: 0.03,
  }[fallbackSeverity];
  return clamp(base + fallbackExtra, 0.05, 0.2);
}

function computeAnchorBlendPolicy(
  tier: EvidenceTier,
  available: { hasComparable: boolean; hasReference: boolean },
): AnchorBlendPolicy {
  if (tier === "A_STRONG_MARKET") {
    if (available.hasComparable && available.hasReference) {
      return { comparableWeight: 0.88, referenceWeight: 0.12, heuristicWeight: 0, blendMode: "comparables_primary" };
    }
    if (available.hasComparable) {
      return { comparableWeight: 1, referenceWeight: 0, heuristicWeight: 0, blendMode: "comparables_primary" };
    }
  }
  if (tier === "B_MODERATE_MARKET") {
    if (available.hasComparable && available.hasReference) {
      return { comparableWeight: 0.68, referenceWeight: 0.32, heuristicWeight: 0, blendMode: "comparables_plus_reference" };
    }
    if (available.hasComparable) {
      return { comparableWeight: 0.82, referenceWeight: 0, heuristicWeight: 0.18, blendMode: "comparables_plus_reference" };
    }
  }
  if (tier === "C_REFERENCE_ASSISTED") {
    if (available.hasReference && available.hasComparable) {
      return { comparableWeight: 0.25, referenceWeight: 0.75, heuristicWeight: 0, blendMode: "reference_primary" };
    }
    if (available.hasReference) {
      return { comparableWeight: 0, referenceWeight: 0.85, heuristicWeight: 0.15, blendMode: "reference_primary" };
    }
  }
  if (available.hasReference) {
    return { comparableWeight: 0, referenceWeight: 0.55, heuristicWeight: 0.45, blendMode: "heuristic_primary" };
  }
  return { comparableWeight: 0, referenceWeight: 0, heuristicWeight: 1, blendMode: "heuristic_primary" };
}

function blendAnchors(
  policy: AnchorBlendPolicy,
  anchors: { comparable: number | null; reference: number | null; heuristic: number | null },
): number {
  const entries = [
    { value: anchors.comparable, weight: policy.comparableWeight },
    { value: anchors.reference, weight: policy.referenceWeight },
    { value: anchors.heuristic, weight: policy.heuristicWeight },
  ].filter((entry): entry is { value: number; weight: number } => entry.value != null && entry.weight > 0);
  if (entries.length === 0) return Math.max(3_500_000, anchors.heuristic ?? anchors.reference ?? anchors.comparable ?? 0);
  const sumWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const weighted = entries.reduce((sum, e) => sum + e.value * e.weight, 0) / Math.max(0.0001, sumWeight);
  return Math.max(3_500_000, Math.round(weighted));
}

function computeConfidenceFromEvidence(
  evidence: EvidenceMetrics,
  canonicalCertainty: number,
): { beforeCeiling: number; drivers: ConfidenceDriver[] } {
  const countScore = clamp((evidence.comparableCountUsed / 12) * 100, 0, 100);
  const strongScore = evidence.comparableCountUsed
    ? clamp((evidence.comparableCountStrong / evidence.comparableCountUsed) * 100, 0, 100)
    : 0;
  const locationScore = {
    same_city: 100,
    same_region: 75,
    mixed: 60,
    weak: 35,
  }[evidence.comparableLocationStrength];
  const fallbackPenalty = evidence.fallbackUsed ? -18 : 0;
  const referenceSignal = evidence.referenceProfileUsed ? Math.max(20, evidence.referenceProfileStrength ?? 45) : 20;
  const raw =
    10 +
    countScore * 0.2 +
    strongScore * 0.17 +
    evidence.comparableSimilarityMedian * 0.2 +
    evidence.comparableRecencyScore * 0.08 +
    evidence.comparableDispersionScore * 0.14 +
    locationScore * 0.07 +
    canonicalCertainty * 0.08 +
    referenceSignal * 0.06 +
    fallbackPenalty;
  const beforeCeiling = clamp(Math.round(raw), 18, 96);
  const drivers: ConfidenceDriver[] = [
    { key: "comparable_count", impact: countScore >= 55 ? "positive" : "negative", weight: 0.2 },
    { key: "similarity", impact: evidence.comparableSimilarityMedian >= 55 ? "positive" : "negative", weight: 0.2 },
    { key: "recency", impact: evidence.comparableRecencyScore >= 50 ? "positive" : "negative", weight: 0.08 },
    { key: "dispersion", impact: evidence.comparableDispersionScore >= 50 ? "positive" : "negative", weight: 0.14 },
    { key: "canonical_certainty", impact: canonicalCertainty >= 70 ? "positive" : "negative", weight: 0.08 },
    { key: "reference_strength", impact: evidence.referenceProfileUsed ? "positive" : "negative", weight: 0.06 },
    { key: "fallback_penalty", impact: evidence.fallbackUsed ? "negative" : "positive", weight: 0.24 },
  ];
  return { beforeCeiling, drivers };
}

function roundingStepFor(precisionMode: PrecisionMode): number {
  if (precisionMode === "tight") return 100_000;
  if (precisionMode === "medium") return 250_000;
  if (precisionMode === "coarse") return 500_000;
  return 1_000_000;
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function toInsightItems(
  factors: string[],
  polarity: "positive" | "negative",
): InsightItem[] {
  return factors.map((label, idx) => ({
    id: `${polarity}-${idx + 1}`,
    category: "pricing_factor",
    polarity,
    code: `${polarity.toUpperCase()}_FACTOR_${idx + 1}`,
    label,
    severity: polarity === "negative" ? "warning" : "info",
  }));
}

function toLegacyEstimationOutput(v2: EstimationOutputV2): EstimationLegacyOutput {
  return {
    marketBasePrice: v2.anchors.finalBaseAnchor,
    adjustedPrice: v2.values.estimatedValue,
    lowRangePrice: v2.values.lowEstimate,
    highRangePrice: v2.values.highEstimate,
    recommendedListingPrice: v2.values.recommendedListingPrice,
    quickSalePrice: v2.values.quickSalePrice,
    confidenceScore: v2.confidence.confidenceScore,
    confidenceLabel: v2.confidence.confidenceBand,
    positiveFactors: v2.insights.pricingFactorsPositive.map((item) => item.label),
    negativeFactors: v2.insights.pricingFactorsNegative.map((item) => item.label),
    comparables: v2.comparables,
    hasComparables: v2.comparables.length > 0,
    usedReferenceProfile: v2.evidence.referenceProfileUsed,
    estimationNote: v2.insights.disclaimers[0]?.label,
  };
}

export async function computeVehicleEstimationV2(input: EstimationInput): Promise<EstimationOutputV2> {
  const normalized = normalizeInput(input);
  const profile = await findReferenceProfile(normalized);
  const fallback = computeFallbackBaseline(normalized);
  const currentYear = new Date().getFullYear();
  const yearsDeltaFromBaseline = Math.max(0, (profile?.baseline_year ?? normalized.year) - normalized.year);
  const depreciationRate = profile?.annual_depreciation_rate ?? fallback.annualDepreciationRate;
  const profileBase = profile?.baseline_price_mga ?? fallback.basePrice;
  const projectedBase = Math.max(3_500_000, Math.round(profileBase * Math.pow(1 - depreciationRate, yearsDeltaFromBaseline)));
  const heuristicYearsDelta = Math.max(0, currentYear - normalized.year);
  const heuristicProjected = Math.max(
    3_500_000,
    Math.round(fallback.basePrice * Math.pow(1 - fallback.annualDepreciationRate, heuristicYearsDelta)),
  );

  let comparableFetch: ComparableFetchResult = {
    comparables: [],
    candidateCount: 0,
    qualityFilteredCount: 0,
    strictCandidateCount: 0,
    backupCandidateCount: 0,
    rejectedCount: 0,
    rejectedByReason: {},
    selectedFreshnessAvg: 0,
    selectedSameCityCount: 0,
    selectedWithRegionCount: 0,
  };
  try {
    comparableFetch = await fetchComparables(normalized);
  } catch {
    comparableFetch = {
      comparables: [],
      candidateCount: 0,
      qualityFilteredCount: 0,
      strictCandidateCount: 0,
      backupCandidateCount: 0,
      rejectedCount: 0,
      rejectedByReason: {},
      selectedFreshnessAvg: 0,
      selectedSameCityCount: 0,
      selectedWithRegionCount: 0,
    };
  }
  const comparables = comparableFetch.comparables;
  const prices = comparables.map((c) => c.price);
  const filteredPrices = removeOutliers(prices);
  const filteredPriceBudget = new Map<number, number>();
  filteredPrices.forEach((price) => {
    filteredPriceBudget.set(price, (filteredPriceBudget.get(price) ?? 0) + 1);
  });
  const comparableAfterOutlier = comparables.filter((comparable) => {
    const remaining = filteredPriceBudget.get(comparable.price) ?? 0;
    if (remaining <= 0) return false;
    filteredPriceBudget.set(comparable.price, remaining - 1);
    return true;
  });
  const comparableMedian =
    comparableAfterOutlier.length > 0
      ? Math.round(
          weightedMedian(
            comparableAfterOutlier.map((c) => c.price),
            comparableAfterOutlier.map((c) => Math.max(0.1, c.score / 100)),
          ),
        )
      : null;

  const avgSimilarity = comparables.length
    ? comparables.reduce((sum, c) => sum + c.score, 0) / comparables.length
    : 0;
  const medianSimilarity = comparables.length ? median(comparables.map((c) => c.score)) : 0;
  const recencyScore = comparableFetch.selectedFreshnessAvg;
  const dispersionScore =
    filteredPrices.length > 2
      ? clamp(
          Math.round(
            100 -
              (filteredPrices.reduce((acc, p) => acc + Math.abs(p - (comparableMedian ?? p)) / Math.max(comparableMedian ?? 1, 1), 0) /
                filteredPrices.length) *
                100,
          ),
          0,
          100,
        )
      : 0;
  const strongComparableCount = comparables.filter((c) => c.score >= 55).length;
  const locationStrength: EvidenceMetrics["comparableLocationStrength"] =
    comparables.length === 0
      ? "weak"
      : comparableFetch.selectedSameCityCount === comparables.length && comparables.length > 0
        ? "same_city"
        : comparableFetch.selectedSameCityCount > 0
          ? "mixed"
          : comparableFetch.selectedWithRegionCount > 0
            ? "same_region"
          : "weak";

  const evidence: EvidenceMetrics = {
    comparableCountCandidate: comparableFetch.candidateCount,
    comparableCountAfterQualityFilter: comparableFetch.qualityFilteredCount,
    comparableCountUsed: comparables.length,
    comparableCountStrong: strongComparableCount,
    comparableSimilarityAvg: Math.round(avgSimilarity * 10) / 10,
    comparableSimilarityMedian: Math.round(medianSimilarity * 10) / 10,
    comparableRecencyScore: recencyScore,
    comparableDispersionScore: dispersionScore,
    comparableLocationStrength: locationStrength,
    canonicalModelCertainty: profile ? 90 : normalized.makeName && normalized.modelName ? 62 : 30,
    referenceProfileUsed: Boolean(profile),
    referenceProfileStrength: profile ? clamp(Math.round(55 + (profile.popularity_score ?? 0) * 0.45), 55, 92) : null,
    fallbackUsed: comparableMedian == null || comparables.length < 5,
    fallbackType: comparableMedian == null || comparables.length < 5 ? (profile ? "profile_seeded" : "generic_heuristic") : null,
  };
  const fallbackSeverity = calculateFallbackSeverity(evidence);
  const tierDecision = determineTier(
    {
      usedCount: comparables.length,
      strongCount: strongComparableCount,
      similarityMedian: medianSimilarity,
      dispersionScore,
    },
    Boolean(profile),
  );
  const policy = resolveTierPolicy(tierDecision.tier, fallbackSeverity);
  const anchorPolicy = computeAnchorBlendPolicy(tierDecision.tier, {
    hasComparable: comparableMedian != null && comparables.length >= 3,
    hasReference: Boolean(profile),
  });
  const comparableAnchorValue = comparableMedian != null && comparables.length >= 3 ? comparableMedian : null;
  const referenceAnchorValue = profile ? projectedBase : null;
  const heuristicAnchorValue =
    fallbackSeverity === "none" && tierDecision.tier !== "D_HEURISTIC_ONLY" ? null : heuristicProjected;
  const marketBasePrice = blendAnchors(anchorPolicy, {
    comparable: comparableAnchorValue,
    reference: referenceAnchorValue,
    heuristic: heuristicAnchorValue ?? heuristicProjected,
  });

  const adjustments = buildAdjustmentFactors(normalized);
  const adjustedPrice = Math.round(marketBasePrice * adjustments.multiplier);

  const { beforeCeiling, drivers } = computeConfidenceFromEvidence(evidence, evidence.canonicalModelCertainty);
  const cappedConfidence = Math.min(beforeCeiling, policy.confidenceCeiling);
  const confidenceBand = confidenceBandFromScore(cappedConfidence);

  const roundingStep = roundingStepFor(policy.precisionMode);
  const rangeSpread = getRangeSpreadFromPolicy(policy.rangeWidthMode, fallbackSeverity);
  const lowRangePrice = Math.round(adjustedPrice * (1 - rangeSpread));
  const highRangePrice = Math.round(adjustedPrice * (1 + rangeSpread));
  const quickDiscount = confidenceBand === "high" ? 0.04 : confidenceBand === "medium" ? 0.065 : 0.085;
  const quickSalePrice = Math.round(adjustedPrice * (1 - quickDiscount));
  const recommendedListingPrice = Math.min(
    Math.round(adjustedPrice * (confidenceBand === "high" ? 1.03 : confidenceBand === "medium" ? 1.02 : 1.01)),
    Math.round(highRangePrice * 0.995),
  );

  const negativeFactors = [...adjustments.negative];
  if (!profile) negativeFactors.push("Modèle hors base de référence principale");
  if (comparables.length < 5) negativeFactors.push("Peu de comparables AutoNex disponibles");
  if (fallbackSeverity === "high") negativeFactors.push("Ancrage marché faible : estimation surtout indicative");
  if (confidenceBand === "low") negativeFactors.push("Estimation indicative à faible confiance");
  const estimationNote =
    fallbackSeverity === "high"
      ? "Nous n'avons pas encore assez d'annonces comparables solides sur AutoNex pour ce modèle. Cette estimation reste indicative et s'appuie davantage sur des références générales."
      : comparables.length === 0
        ? "Nous n'avons pas encore assez d'annonces similaires sur AutoNex pour ce modèle, mais voici une estimation indicative basée sur les caractéristiques de votre véhicule."
        : undefined;

  const outputValues = {
    estimatedValue: roundToStep(adjustedPrice, roundingStep),
    lowEstimate: roundToStep(lowRangePrice, roundingStep),
    highEstimate: roundToStep(highRangePrice, roundingStep),
    quickSalePrice: roundToStep(quickSalePrice, roundingStep),
    recommendedListingPrice: roundToStep(recommendedListingPrice, roundingStep),
    roundingStepApplied: roundingStep,
    internalUnrounded: {
      estimatedValueRaw: adjustedPrice,
      lowEstimateRaw: lowRangePrice,
      highEstimateRaw: highRangePrice,
      quickSaleRaw: quickSalePrice,
      recommendedRaw: recommendedListingPrice,
    },
  };

  const v2: EstimationOutputV2 = {
    tierDecision,
    modeGovernance: {
      pricingMode: policy.pricingMode,
      claimMode: policy.claimMode,
      precisionMode: policy.precisionMode,
      rangeWidthMode: policy.rangeWidthMode,
    },
    evidence,
    anchors: {
      comparableMarketAnchor: comparableAnchorValue,
      referenceAnchor: referenceAnchorValue,
      heuristicAnchor: heuristicAnchorValue,
      finalBaseAnchor: marketBasePrice,
      adjustedMarketEstimate: outputValues.estimatedValue,
      anchorBlendMode: anchorPolicy.blendMode,
    },
    adjustments: {
      mileageAdjustment: {
        factor: 1 + adjustments.components.mileage,
        deltaPct: Math.round(adjustments.components.mileage * 1000) / 10,
        bounded: true,
      },
      conditionAdjustment: {
        factor: 1 + adjustments.components.condition,
        deltaPct: Math.round(adjustments.components.condition * 1000) / 10,
        bounded: true,
      },
      maintenanceAdjustment: {
        factor: 1 + adjustments.components.maintenance,
        deltaPct: Math.round(adjustments.components.maintenance * 1000) / 10,
        bounded: true,
      },
      accidentAdjustment: {
        factor: 1 + adjustments.components.accident,
        deltaPct: Math.round(adjustments.components.accident * 1000) / 10,
        bounded: true,
      },
      ownershipAdjustment: {
        factor: 1 + adjustments.components.ownership,
        deltaPct: Math.round(adjustments.components.ownership * 1000) / 10,
        bounded: true,
      },
      usageAdjustment: {
        factor: 1 + adjustments.components.usage,
        deltaPct: Math.round(adjustments.components.usage * 1000) / 10,
        bounded: true,
      },
      totalAdjustmentFactor: Math.round(adjustments.multiplier * 1000) / 1000,
      totalDeltaPct: Math.round((adjustments.multiplier - 1) * 1000) / 10,
      adjustmentCapApplied: adjustments.multiplier <= 0.8 || adjustments.multiplier >= 1.12,
    },
    confidence: {
      confidenceScore: cappedConfidence,
      confidenceBand,
      confidenceCeiling: policy.confidenceCeiling,
      confidenceBeforeCeiling: beforeCeiling,
      confidenceCapped: cappedConfidence !== beforeCeiling,
      drivers,
      explanationMode: "summary_only",
    },
    values: outputValues,
    comparables: comparables.slice(0, 12),
    insights: {
      pricingFactorsPositive: toInsightItems(adjustments.positive, "positive"),
      pricingFactorsNegative: toInsightItems(negativeFactors.slice(0, 4), "negative"),
      evidenceNotes: [
        {
          id: "evidence-tier",
          category: "evidence_note",
          polarity: "neutral",
          code: tierDecision.tierReasonCode,
          label: tierDecision.tierReasonSummary,
          severity: "info",
        },
      ],
      disclaimers: estimationNote
        ? [
            {
              id: "disclaimer-indicative",
              category: "disclaimer",
              polarity: "neutral",
              code: "INDICATIVE_OUTPUT",
              label: estimationNote,
              severity: "warning",
            },
          ]
        : [],
    },
    uiGovernance: {
      allowedMarketClaim: policy.claimMode === "ALLOW_STRONG_MARKET_CLAIM",
      mustShowIndicativeLabel: policy.claimMode !== "ALLOW_STRONG_MARKET_CLAIM",
      shouldDeEmphasizePrecision:
        policy.precisionMode === "coarse" || policy.precisionMode === "very_coarse" || fallbackSeverity !== "none",
      shouldHideExactConfidenceScore: tierDecision.tier === "D_HEURISTIC_ONLY" || fallbackSeverity === "high",
      allowedRangeTightness: policy.rangeWidthMode,
      recommendedPrimaryCTAStyle:
        policy.claimMode === "ALLOW_STRONG_MARKET_CLAIM"
          ? "strong"
          : policy.claimMode === "INDICATIVE_HEURISTIC_CLAIM_ONLY"
            ? "cautious"
            : "normal",
      requiredBadges: [policy.pricingMode],
    },
  };
  return v2;
}

export function toLegacyEstimationFromV2(v2: EstimationOutputV2): EstimationLegacyOutput {
  return toLegacyEstimationOutput(v2);
}

export async function computeVehicleEstimation(input: EstimationInput): Promise<EstimationLegacyOutput> {
  const v2 = await computeVehicleEstimationV2(input);
  return toLegacyEstimationOutput(v2);
}
