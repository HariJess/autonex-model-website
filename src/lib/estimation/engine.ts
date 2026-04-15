import { supabase } from "@/integrations/supabase/client";
import { computeFallbackBaseline, findReferenceProfile } from "@/lib/estimation/referenceProfiles";
import type {
  ConfidenceLabel,
  EstimationComparable,
  EstimationInput,
  EstimationOutput,
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
  fuel: string | null;
  transmission_gearbox: string | null;
  status: string | null;
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

function scoreComparable(input: EstimationInput, row: ComparableListingRow): number {
  let score = 0;
  const yearGap = Math.abs((row.year ?? input.year) - input.year);
  if (yearGap === 0) score += 32;
  else if (yearGap <= 1) score += 24;
  else if (yearGap <= 2) score += 16;
  else score += 8;

  const expectedKm = Math.max(10_000, (new Date().getFullYear() - input.year + 1) * 15_000);
  const kmGap = Math.abs((row.mileage_km ?? input.mileage) - input.mileage);
  const kmRatio = kmGap / expectedKm;
  if (kmRatio <= 0.12) score += 15;
  else if (kmRatio <= 0.25) score += 9;
  else if (kmRatio <= 0.4) score += 5;

  if ((row.ville ?? "").toLowerCase() === input.city.toLowerCase()) score += 8;

  const fuel = normalizeFuelForDb(input.fuelType);
  if (fuel && row.fuel === fuel) score += 8;

  const transmission = normalizeTransmissionForDb(input.transmissionType);
  if (transmission && row.transmission_gearbox === transmission) score += 6;

  return score;
}

async function fetchComparables(input: EstimationInput): Promise<EstimationComparable[]> {
  const fuel = normalizeFuelForDb(input.fuelType);
  const transmission = normalizeTransmissionForDb(input.transmissionType);
  let query = supabase
    .from("listings")
    .select("id,title,price_mga,year,mileage_km,ville,fuel,transmission_gearbox,status")
    .eq("status", "active")
    .ilike("make", input.makeName)
    .ilike("model", input.modelName)
    .gte("year", input.year - 2)
    .lte("year", input.year + 2)
    .limit(120);
  if (fuel) query = query.eq("fuel", fuel);
  if (transmission) query = query.eq("transmission_gearbox", transmission);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ComparableListingRow[];
  const coherent = rows.filter(
    (row) =>
      row.price_mga != null &&
      row.price_mga > 2_000_000 &&
      row.price_mga < 4_000_000_000 &&
      row.year != null &&
      row.mileage_km != null &&
      row.title.trim().length > 2,
  );
  if (coherent.length === 0) return [];

  const sorted = coherent
    .map((row) => ({
      row,
      score: scoreComparable(input, row),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);

  const ids = sorted.map((s) => s.row.id);
  const { data: photos } = await supabase
    .from("listing_photos")
    .select("listing_id,url,position")
    .in("listing_id", ids)
    .order("position", { ascending: true });
  const firstPhoto = new Map<string, string>();
  (photos ?? []).forEach((p) => {
    if (!firstPhoto.has(p.listing_id)) firstPhoto.set(p.listing_id, p.url);
  });

  return sorted.map(({ row, score }) => ({
    listingId: row.id,
    title: row.title,
    price: row.price_mga ?? 0,
    year: row.year ?? input.year,
    mileage: row.mileage_km ?? input.mileage,
    city: row.ville ?? "",
    score,
    imageUrl: firstPhoto.get(row.id),
  }));
}

function buildConfidence(
  input: EstimationInput,
  comparables: EstimationComparable[],
  usedReferenceProfile: boolean,
): { score: number; label: ConfidenceLabel } {
  let score = 78;
  if (usedReferenceProfile) score += 10;
  else score -= 10;
  if (comparables.length >= 10) score += 12;
  else if (comparables.length >= 5) score += 6;
  else if (comparables.length === 0) score -= 14;
  if (!input.city.trim()) score -= 6;
  if (input.maintenanceLevel === "unknown") score -= 6;
  if (input.makeName.trim().length < 2 || input.modelName.trim().length < 2) score -= 12;

  const prices = comparables.map((c) => c.price);
  if (prices.length > 2) {
    const med = median(prices);
    const avgAbsPct = prices.reduce((acc, p) => acc + Math.abs(p - med) / med, 0) / prices.length;
    if (avgAbsPct > 0.19) score -= 10;
  }

  const finalScore = clamp(Math.round(score), 18, 97);
  if (finalScore >= 80) return { score: finalScore, label: "high" };
  if (finalScore >= 55) return { score: finalScore, label: "medium" };
  return { score: finalScore, label: "low" };
}

function buildAdjustmentFactors(input: EstimationInput): { multiplier: number; positive: string[]; negative: string[] } {
  let adjustment = 0;
  const positive: string[] = [];
  const negative: string[] = [];

  const vehicleAge = Math.max(1, new Date().getFullYear() - input.year);
  const expectedKm = vehicleAge * 15_000;
  const kmDeltaRatio = expectedKm > 0 ? (input.mileage - expectedKm) / expectedKm : 0;
  if (kmDeltaRatio <= -0.2) {
    adjustment += 0.035;
    positive.push("Kilometrage inferieur a la moyenne");
  } else if (kmDeltaRatio <= -0.08) {
    adjustment += 0.015;
    positive.push("Kilometrage contenu pour l'age du vehicule");
  } else if (kmDeltaRatio >= 0.3) {
    adjustment -= 0.06;
    negative.push("Kilometrage superieur a la moyenne");
  } else if (kmDeltaRatio >= 0.12) {
    adjustment -= 0.025;
    negative.push("Kilometrage legerement eleve");
  }

  const conditionAdj = {
    excellent: 0.04,
    good: 0,
    fair: -0.04,
    needs_work: -0.1,
  }[input.conditionLabel];
  adjustment += conditionAdj;
  if (conditionAdj > 0) positive.push("Etat general excellent");
  if (conditionAdj < 0) negative.push("Etat general perfectible");

  const maintenanceAdj = { full: 0.03, partial: 0.01, unknown: 0 }[input.maintenanceLevel];
  adjustment += maintenanceAdj;
  if (maintenanceAdj > 0) positive.push("Entretien suivi");

  if (input.accidentDeclared) {
    adjustment -= 0.06;
    negative.push("Historique d'accident declare");
  }

  const ownerAdj = { "1": 0.02, "2": 0, "3_plus": -0.03 }[input.ownerCountLabel];
  adjustment += ownerAdj;
  if (ownerAdj > 0) positive.push("Un seul proprietaire");
  if (ownerAdj < 0) negative.push("Plusieurs proprietaires");

  const usageAdj = { personal: 0, professional: -0.02, rental: -0.07, fleet: -0.08 }[input.usageType];
  adjustment += usageAdj;
  if (usageAdj < 0) negative.push("Usage intensif (pro/location/flotte)");

  const clamped = clamp(adjustment, -0.2, 0.12);
  return {
    multiplier: 1 + clamped,
    positive: positive.slice(0, 4),
    negative: negative.slice(0, 4),
  };
}

export async function computeVehicleEstimation(input: EstimationInput): Promise<EstimationOutput> {
  const normalized = normalizeInput(input);
  const profile = await findReferenceProfile(normalized);
  const fallback = computeFallbackBaseline(normalized);
  const yearsDeltaFromBaseline = Math.max(0, (profile?.baseline_year ?? normalized.year) - normalized.year);
  const depreciationRate = profile?.annual_depreciation_rate ?? fallback.annualDepreciationRate;
  const profileBase = profile?.baseline_price_mga ?? fallback.basePrice;
  const projectedBase = Math.max(3_500_000, Math.round(profileBase * Math.pow(1 - depreciationRate, yearsDeltaFromBaseline)));

  let comparables: EstimationComparable[] = [];
  try {
    comparables = await fetchComparables(normalized);
  } catch {
    comparables = [];
  }
  const prices = comparables.map((c) => c.price);
  const filteredPrices = removeOutliers(prices);
  const comparableMedian = filteredPrices.length > 0 ? Math.round(median(filteredPrices)) : null;

  // Fallback-first: base estimate always exists. Comparables only enrich.
  const marketBasePrice =
    comparableMedian == null
      ? projectedBase
      : Math.round(projectedBase * 0.7 + comparableMedian * 0.3);

  const adjustments = buildAdjustmentFactors(normalized);
  const adjustedPrice = Math.round(marketBasePrice * adjustments.multiplier);

  const confidence = buildConfidence(normalized, comparables, Boolean(profile));
  let rangeSpread = confidence.label === "high" ? 0.04 : confidence.label === "medium" ? 0.07 : 0.12;
  if (!profile) rangeSpread += 0.015;
  if (comparables.length === 0) rangeSpread += 0.02;
  rangeSpread = clamp(rangeSpread, 0.04, 0.16);
  const lowRangePrice = Math.round(adjustedPrice * (1 - rangeSpread));
  const highRangePrice = Math.round(adjustedPrice * (1 + rangeSpread));
  const quickDiscount = confidence.label === "high" ? 0.04 : confidence.label === "medium" ? 0.06 : 0.08;
  const quickSalePrice = Math.round(adjustedPrice * (1 - quickDiscount));
  const recommendedListingPrice = Math.min(Math.round(adjustedPrice * 1.03), Math.round(highRangePrice * 0.995));

  const negativeFactors = [...adjustments.negative];
  if (!profile) negativeFactors.push("Modele hors base de reference principale");
  if (comparables.length < 5) negativeFactors.push("Peu de comparables AutoNex disponibles");
  if (confidence.label === "low") negativeFactors.push("Estimation indicative a faible confiance");
  const estimationNote =
    comparables.length === 0
      ? "Nous n'avons pas encore assez d'annonces similaires sur AutoNex pour ce modele, mais voici une estimation indicative basee sur les caracteristiques de votre vehicule."
      : undefined;

  return {
    marketBasePrice,
    adjustedPrice,
    lowRangePrice,
    highRangePrice,
    recommendedListingPrice,
    quickSalePrice,
    confidenceScore: confidence.score,
    confidenceLabel: confidence.label,
    positiveFactors: adjustments.positive,
    negativeFactors: negativeFactors.slice(0, 4),
    comparables: comparables.slice(0, 12),
    hasComparables: comparables.length > 0,
    usedReferenceProfile: Boolean(profile),
    estimationNote,
  };
}
