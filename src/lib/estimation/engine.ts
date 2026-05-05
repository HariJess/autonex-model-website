import { supabase } from "@/integrations/supabase/client";
import { computeFallbackBaseline, findReferenceProfile } from "@/lib/estimation/referenceProfiles";
import {
  FALLBACK_TRANSACTION_FACTORS,
  fetchTransactionFactors,
  resolveFactorKey,
  type AppConfigSupabaseClient,
  type ComparableSourceOrigin,
  type TransactionFactorKey,
  type TransactionFactorsConfig,
} from "@/lib/estimation/transactionFactors";
// PROMPT 10E — Couche 2 (proximity) + Couche 4 (sanity bounds)
import {
  findProxyModels,
  proximityFactorMid,
  PROXIMITY_SIMILARITY_CEILING,
} from "@/lib/estimation/modelProximity";
import { applySanityCheck } from "@/lib/estimation/sanityBounds";
import type {
  ClaimMode,
  ConfidenceBand,
  ConfidenceDriver,
  EstimationAuditV2,
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
  /** PROMPT 10A — prix avant application transaction factor (audit). */
  raw_price_mga?: number | null;
  /** PROMPT 10A — factor appliqué (1.0 si aucun). */
  factor_applied?: number;
  /** PROMPT 10A — clé de factor utilisée (audit). */
  factor_key?: TransactionFactorKey;
  /** PROMPT 10A — origine du comparable (UNION 2 sources). */
  source_origin?: ComparableSourceOrigin;
  /** PROMPT 10A — trim/version pour filtrage cascade. */
  trim?: string | null;
  /** PROMPT 10A — seller_type depuis market_listings_clean (factor key). */
  seller_type?: string | null;
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
  /** PROMPT 10E — Couche 2 : type de proximité (undefined si exact, "segment_proche" sinon). */
  proximityType?: "segment_proche";
  /** PROMPT 10E — Couche 2 : facteur correctif appliqué au price_mga proxy → cible. */
  proximityFactor?: number;
  /** PROMPT 10E — Couche 2 : label humain pour audit. */
  proximityLabel?: string;
  /** PROMPT 10E — Couche 2 : "Make|Model" du proxy effectivement utilisé. */
  proximitySourceModel?: string;
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
  /** PROMPT 10A — ventilation des comparables retenus par origine. */
  sourceBreakdown: { marketClean: number; autonexActive: number };
  /** PROMPT 10A — moyenne des factors appliqués sur la sélection finale. */
  transactionFactorAvg: number;
  /** PROMPT 10A — moyenne des prix BRUTS pour audit. */
  rawPrices: number[];
  /** PROMPT 10A — état du filtrage trim. */
  trimFiltering: EstimationAuditV2["trimFiltering"];
  /** PROMPT 10E — Couche 2 : ventilation par couche de raisonnement. */
  layerBreakdown: { exact: number; segmentProche: number };
  /** PROMPT 10E — Couche 2 : modèles proxy effectivement utilisés. */
  proximityModelsUsed: Array<{ make: string; model: string; n: number }>;
  /** PROMPT 10E — Couche 2 : moyenne des proximityFactor appliqués (1 = aucun). */
  proximityFactorAvg: number;
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

/**
 * PROMPT 10A — Helper percentile (linéaire, sans dépendance externe).
 *
 * Cas spéciaux :
 *   - Liste vide → 0
 *   - Liste singleton → la valeur
 *   - Sinon : interpolation linéaire entre les voisins, arrondi entier
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower));
}

/**
 * PROMPT 10A — Range Argus-grade : P10/P90 réels quand assez de comps,
 * P25/P75 quand modeste, sinon fallback synthétique ±%.
 *
 * Décision :
 *   - n ≥ 8  → P10/P90 (range "large" honnête)
 *   - n ≥ 5  → P25/P75 (range resserré, on n'extrapole pas)
 *   - n < 5  → synthetic ±fallbackSpread sur fallbackCenter
 */
export function computeRangeFromPercentiles(
  prices: number[],
  fallbackCenter: number,
  fallbackSpread: number,
): {
  low: number;
  high: number;
  method: "percentile_p10_p90" | "percentile_p25_p75" | "synthetic_spread";
} {
  if (prices.length >= 8) {
    return {
      low: percentile(prices, 0.1),
      high: percentile(prices, 0.9),
      method: "percentile_p10_p90",
    };
  }
  if (prices.length >= 5) {
    return {
      low: percentile(prices, 0.25),
      high: percentile(prices, 0.75),
      method: "percentile_p25_p75",
    };
  }
  return {
    low: Math.round(fallbackCenter * (1 - fallbackSpread)),
    high: Math.round(fallbackCenter * (1 + fallbackSpread)),
    method: "synthetic_spread",
  };
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
  // PROMPT 10A — tag chaque row avec son origine (autonex listings = active)
  return (data ?? []).map((row) => ({
    ...(row as ComparableListingRow),
    source_origin: "autonex_active" as ComparableSourceOrigin,
    trim: null,
    raw_price_mga: (row as ComparableListingRow).price_mga,
    factor_applied: 1.0,
    factor_key: "autonex_active" as TransactionFactorKey,
  })) as ComparableListingRow[];
}

/**
 * PROMPT 10A — Fetch des comparables depuis `market_listings_clean`
 * (CSV scrap FB / partner / dealer official, ingéré par PROMPT 11.b).
 *
 * Mappe les colonnes natives `market_listings_clean.*` vers le shape canonique
 * `ComparableListingRow` consommé par la pipeline existante (scoring/median/
 * outliers). On synthétise un `title` lisible à partir de make+model+year.
 *
 * Filtrage minimal côté SQL :
 *   - normalized_make ILIKE input.makeName
 *   - normalized_model ILIKE input.modelName
 *   - year ∈ [input.year - yearWindow, input.year + yearWindow]
 *   - include_in_estimation=true ET outlier_flag=false (RLS filtre déjà mais on belt-and-suspenders)
 *
 * Le filtrage trim est fait en TS post-fetch dans `fetchComparables` (cascade).
 */
type MarketCleanRow = {
  id: string;
  normalized_make: string | null;
  normalized_model: string | null;
  normalized_trim: string | null;
  year: number | null;
  mileage_km: number | null;
  price_mga: number | null;
  fuel_type: string | null;
  transmission: string | null;
  drivetrain: string | null;
  body_style: string | null;
  city: string | null;
  seller_type: string | null;
  source: string | null;
  posted_at: string | null;
  data_confidence: string | null;
  include_in_estimation: boolean | null;
  outlier_flag: boolean | null;
  fingerprint: string | null;
};

function mapCleanRowToComparable(row: MarketCleanRow): ComparableListingRow {
  const make = row.normalized_make ?? "";
  const model = row.normalized_model ?? "";
  const trim = row.normalized_trim ?? "";
  const titleParts = [make, model, trim, row.year ? String(row.year) : ""].filter(Boolean);
  const title = titleParts.join(" ").trim() || `${make} ${model}`.trim() || "comparable";
  return {
    id: `mkt:${row.id}`,
    title,
    price_mga: row.price_mga,
    raw_price_mga: row.price_mga,
    factor_applied: 1.0,
    factor_key: undefined,
    source_origin: "market_clean",
    trim: row.normalized_trim,
    seller_type: row.seller_type,
    year: row.year,
    mileage_km: row.mileage_km,
    ville: row.city,
    region: null,
    body_style: row.body_style,
    fuel: row.fuel_type,
    transmission_gearbox: row.transmission,
    description: row.normalized_trim ? `Trim: ${row.normalized_trim}` : null,
    created_at: row.posted_at,
    updated_at: row.posted_at,
    status: "active",
    make,
    model,
  };
}

async function fetchMarketCleanRows(
  input: EstimationInput,
  params: { yearWindow: number; limit: number },
): Promise<ComparableListingRow[]> {
  try {
    const { data, error } = await supabase
      .from("market_listings_clean")
      .select(
        "id,normalized_make,normalized_model,normalized_trim,year,mileage_km,price_mga,fuel_type,transmission,drivetrain,body_style,city,seller_type,source,posted_at,data_confidence,include_in_estimation,outlier_flag,fingerprint",
      )
      .eq("include_in_estimation", true)
      .eq("outlier_flag", false)
      .ilike("normalized_make", input.makeName)
      .ilike("normalized_model", input.modelName)
      .gte("year", input.year - params.yearWindow)
      .lte("year", input.year + params.yearWindow)
      .limit(params.limit);
    if (error) {
      // Best-effort : on ne casse pas la pipeline si market_listings_clean indispo
      return [];
    }
    const rows = (data ?? []) as unknown as MarketCleanRow[];
    return rows.map(mapCleanRowToComparable).map((r) => ({
      ...r,
      // tag seller_type depuis le row clean d'origine pour le factor key
      // (on doit retrouver ce champ — le mapper ne l'a pas inclus dans le shape Comparable)
    }));
  } catch (_err) {
    return [];
  }
}

/**
 * PROMPT 10A — Filtrage trim cascade.
 *
 * Si `input.trim` non null :
 *   1. Strict : `comparable.trim ILIKE input.trim` OR `title contains input.trim`
 *   2. Si < 3 comps après strict → relâcher : ajoute aussi les comps sans trim renseigné
 *   3. Si toujours < 3 → fallback all_trims_warning (tous les comps du modèle)
 *
 * Si `input.trim` null/undefined :
 *   - Pas de filtre, audit flag `unspecified` (matching imprécis, pénalité confidence -0.05 plus tard)
 */
function applyTrimFilter(
  rows: ComparableListingRow[],
  inputTrim: string | null | undefined,
): { filtered: ComparableListingRow[]; mode: EstimationAuditV2["trimFiltering"] } {
  if (!inputTrim || inputTrim.trim() === "") {
    return { filtered: rows, mode: "unspecified" };
  }
  const target = inputTrim.toLowerCase().trim();
  const matchTrim = (r: ComparableListingRow): boolean => {
    const trim = (r.trim ?? "").toLowerCase().trim();
    if (trim && trim.includes(target)) return true;
    const title = (r.title ?? "").toLowerCase();
    return title.includes(target);
  };
  const strict = rows.filter(matchTrim);
  if (strict.length >= 3) {
    return { filtered: strict, mode: "strict" };
  }
  // Relâcher : ajouter aussi les comps sans trim renseigné
  const relaxed = rows.filter((r) => {
    if (matchTrim(r)) return true;
    const trim = (r.trim ?? "").trim();
    return trim === "";
  });
  if (relaxed.length >= 3) {
    return { filtered: relaxed, mode: "relaxed" };
  }
  // Fallback : tous les trims du modèle, mais flagger
  return { filtered: rows, mode: "all_trims_warning" };
}

async function fetchComparables(
  input: EstimationInput,
  config: TransactionFactorsConfig,
): Promise<ComparableFetchResult> {
  // PROMPT 10A — UNION 2 sources : market_listings_clean (scrap/partner) + listings (autonex active)
  const [marketCleanRows, strictRows] = await Promise.all([
    fetchMarketCleanRows(input, { yearWindow: 4, limit: 160 }),
    fetchComparableRows(input, { yearWindow: 3, strictAttributes: true, limit: 160 }),
  ]);
  const needsBackup = strictRows.length + marketCleanRows.length < 10;
  const backupRows = needsBackup
    ? await fetchComparableRows(input, { yearWindow: 6, strictAttributes: false, limit: 160 })
    : [];

  const allById = new Map<string, { row: ComparableListingRow; source: "strict" | "backup" }>();
  // Market_clean en premier (priorité tier B/C — données externes calibrées)
  marketCleanRows.forEach((row) => allById.set(row.id, { row, source: "strict" }));
  strictRows.forEach((row) => {
    if (!allById.has(row.id)) allById.set(row.id, { row, source: "strict" });
  });
  backupRows.forEach((row) => {
    if (!allById.has(row.id)) allById.set(row.id, { row, source: "backup" });
  });

  const exactRowCount = allById.size;

  // PROMPT 10E — Couche 2 : si la Couche 1 (exacts) est insuffisante, on élargit
  // aux modèles de la même famille via MODEL_PROXIMITY. Les rows ainsi récupérées
  // sont taggées proximityType="segment_proche" et leur price_mga est multiplié
  // par le proximityFactor (moyenne du range défini dans la config).
  const proxyConfig = exactRowCount < 5 ? findProxyModels(input.makeName, input.modelName) : null;
  const proxyHits: Array<{ row: ComparableListingRow; source: "strict" | "backup" }> = [];
  if (proxyConfig) {
    const proximityFactor = proximityFactorMid(proxyConfig);
    for (const proxyKey of proxyConfig.proxyModels) {
      const [proxyMake, proxyModel] = proxyKey.split("|");
      if (!proxyMake || !proxyModel) continue;
      const proxyInput: EstimationInput = { ...input, makeName: proxyMake, modelName: proxyModel };
      const [proxyMkt, proxyStrict] = await Promise.all([
        fetchMarketCleanRows(proxyInput, { yearWindow: 5, limit: 80 }),
        fetchComparableRows(proxyInput, { yearWindow: 4, strictAttributes: false, limit: 80 }),
      ]);
      const tag = (row: ComparableListingRow): ComparableListingRow => ({
        ...row,
        proximityType: "segment_proche",
        proximityFactor,
        proximityLabel: proxyConfig.proximityLabel,
        proximitySourceModel: proxyKey,
      });
      proxyMkt.forEach((row) => {
        if (!allById.has(row.id)) {
          const tagged = tag(row);
          allById.set(tagged.id, { row: tagged, source: "strict" });
          proxyHits.push({ row: tagged, source: "strict" });
        }
      });
      proxyStrict.forEach((row) => {
        if (!allById.has(row.id)) {
          const tagged = tag(row);
          allById.set(tagged.id, { row: tagged, source: "strict" });
          proxyHits.push({ row: tagged, source: "strict" });
        }
      });
    }
  }

  // PROMPT 10A — Filtrage trim cascade (avant scoring qualité)
  const rowsArray = Array.from(allById.values()).map((c) => c.row);
  const trimResult = applyTrimFilter(rowsArray, input.trim);
  const filteredById = new Map<string, { row: ComparableListingRow; source: "strict" | "backup" }>();
  for (const r of trimResult.filtered) {
    const entry = allById.get(r.id);
    if (entry) filteredById.set(r.id, entry);
  }

  const rejectedByReason: Record<string, number> = {};
  const accepted: QualityAcceptedCandidate[] = [];
  for (const candidate of filteredById.values()) {
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

  // PROMPT 10A — Application transaction factor par row.
  // PROMPT 10E — Couche 2 : si row.proximityType="segment_proche", on applique
  // ÉGALEMENT le proximityFactor au prix (pour convertir le prix proxy en
  // équivalent du modèle cible).
  const factoredAccepted = accepted.map((c) => {
    const factorKey = resolveFactorKey(
      c.row.seller_type ?? null,
      c.row.source_origin ?? "unknown",
    );
    const factor = config.factors[factorKey] ?? config.factors.unknown;
    const rawPrice = c.row.raw_price_mga ?? c.row.price_mga ?? 0;
    const proximityFactor = c.row.proximityFactor ?? 1;
    return {
      ...c,
      row: {
        ...c.row,
        raw_price_mga: rawPrice,
        factor_applied: factor,
        factor_key: factorKey,
        price_mga: Math.round(rawPrice * factor * proximityFactor),
      },
    };
  });

  // PROMPT 10E — Couche 2 : pour les rows segment_proche, on plafonne le score de
  // similarité à PROXIMITY_SIMILARITY_CEILING (75) : les proxy restent utiles
  // mais ne peuvent pas dominer la médiane comme un match exact.
  const scored: ScoredComparableCandidate[] = factoredAccepted
    .map((candidate) => {
      const baseScore = computeSimilarityScore(input, candidate);
      const cappedScore =
        candidate.row.proximityType === "segment_proche"
          ? Math.min(baseScore, PROXIMITY_SIMILARITY_CEILING)
          : baseScore;
      return { ...candidate, similarityScore: cappedScore };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);

  const selected = scored.slice(0, 24);
  const selectedPrices = selected.map((s) => s.row.price_mga ?? 0);
  const outlierCleanPrices = removeOutliers(selectedPrices);
  const outlierPriceSet = new Set(outlierCleanPrices);
  const selectedWithoutOutliers = selected.filter((s) => outlierPriceSet.has(s.row.price_mga ?? 0)).slice(0, 12);
  const finalSelected = selectedWithoutOutliers.length >= 4 ? selectedWithoutOutliers : selected.slice(0, 12);

  // Photos — uniquement pour les rows autonex (les ids préfixés "mkt:" n'existent pas en listings)
  const autonexIds = finalSelected
    .filter((s) => s.row.source_origin === "autonex_active")
    .map((s) => s.row.id);
  const firstPhoto = new Map<string, string>();
  if (autonexIds.length > 0) {
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("listing_id,url,position")
      .in("listing_id", autonexIds)
      .order("position", { ascending: true });
    (photos ?? []).forEach((p) => {
      if (!firstPhoto.has(p.listing_id)) firstPhoto.set(p.listing_id, p.url);
    });
  }

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

  // PROMPT 10A — Audit metadata
  const sourceBreakdown = {
    marketClean: finalSelected.filter((s) => s.row.source_origin === "market_clean").length,
    autonexActive: finalSelected.filter((s) => s.row.source_origin === "autonex_active").length,
  };
  const factorAvg = finalSelected.length
    ? finalSelected.reduce((sum, s) => sum + (s.row.factor_applied ?? 1), 0) / finalSelected.length
    : 1;
  const rawPrices = finalSelected.map((s) => s.row.raw_price_mga ?? s.row.price_mga ?? 0);

  // PROMPT 10E — Couche 2 : breakdown by layer + proximity audit
  const proximityRowsFinal = finalSelected.filter((s) => s.row.proximityType === "segment_proche");
  const exactCount = finalSelected.length - proximityRowsFinal.length;
  const layerBreakdown = { exact: exactCount, segmentProche: proximityRowsFinal.length };
  const proximityModelsCount = new Map<string, number>();
  proximityRowsFinal.forEach((s) => {
    const key = s.row.proximitySourceModel ?? `${s.row.make ?? ""}|${s.row.model ?? ""}`;
    proximityModelsCount.set(key, (proximityModelsCount.get(key) ?? 0) + 1);
  });
  const proximityModelsUsed = Array.from(proximityModelsCount.entries()).map(([key, n]) => {
    const [m, mo] = key.split("|");
    return { make: m ?? "", model: mo ?? "", n };
  });
  const proximityFactorAvg = proximityRowsFinal.length
    ? proximityRowsFinal.reduce((sum, s) => sum + (s.row.proximityFactor ?? 1), 0) / proximityRowsFinal.length
    : 1;

  return {
    comparables,
    candidateCount: allById.size,
    qualityFilteredCount: accepted.length,
    strictCandidateCount: strictRows.length + marketCleanRows.length,
    backupCandidateCount: backupRows.length,
    rejectedCount: filteredById.size - accepted.length,
    rejectedByReason,
    selectedFreshnessAvg: finalSelected.length
      ? Math.round(finalSelected.reduce((sum, item) => sum + item.freshnessScore, 0) / finalSelected.length)
      : 0,
    selectedSameCityCount: finalSelected.filter((item) => toNormalized(item.row.ville) === toNormalized(input.city)).length,
    selectedWithRegionCount: finalSelected.filter((item) => Boolean(toNormalized(item.row.region))).length,
    sourceBreakdown,
    transactionFactorAvg: Math.round(factorAvg * 1000) / 1000,
    rawPrices,
    trimFiltering: trimResult.mode,
    layerBreakdown,
    proximityModelsUsed,
    proximityFactorAvg: Math.round(proximityFactorAvg * 1000) / 1000,
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

function emptyComparableFetchResult(): ComparableFetchResult {
  return {
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
    sourceBreakdown: { marketClean: 0, autonexActive: 0 },
    transactionFactorAvg: 1,
    rawPrices: [],
    trimFiltering: "unspecified",
    layerBreakdown: { exact: 0, segmentProche: 0 },
    proximityModelsUsed: [],
    proximityFactorAvg: 1,
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

  // PROMPT 10A — config transaction factors (best-effort, fallback hardcoded)
  const factorConfig: TransactionFactorsConfig = await fetchTransactionFactors(
    supabase as unknown as AppConfigSupabaseClient,
  ).catch(() => FALLBACK_TRANSACTION_FACTORS);

  let comparableFetch: ComparableFetchResult = emptyComparableFetchResult();
  try {
    comparableFetch = await fetchComparables(normalized, factorConfig);
  } catch {
    comparableFetch = emptyComparableFetchResult();
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
  const adjustedPriceRaw = Math.round(marketBasePrice * adjustments.multiplier);

  // PROMPT 10A — Fix cap +12% : safety net post-blend.
  // Le clamp additif `clamp(adjustment, -0.20, 0.12)` est déjà appliqué dans
  // buildAdjustmentFactors mais on belt-and-suspenders ici au cas où une
  // future modification du blend introduirait du delta non-cappé.
  const ratioBeforeCap = marketBasePrice > 0 ? adjustedPriceRaw / marketBasePrice : 1;
  const ratioCapped = clamp(ratioBeforeCap, 0.8, 1.12);
  const capApplied = ratioCapped !== ratioBeforeCap;
  const adjustedPrice = capApplied ? Math.round(marketBasePrice * ratioCapped) : adjustedPriceRaw;

  // PROMPT 10A — Pénalité confidence si trim non spécifié (matching imprécis)
  const trimUnspecifiedPenalty = comparableFetch.trimFiltering === "unspecified" ? -5 : 0;
  const trimMixedWarningPenalty = comparableFetch.trimFiltering === "all_trims_warning" ? -5 : 0;

  const { beforeCeiling, drivers } = computeConfidenceFromEvidence(evidence, evidence.canonicalModelCertainty);
  const beforeCeilingPenalized = clamp(
    beforeCeiling + trimUnspecifiedPenalty + trimMixedWarningPenalty,
    18,
    96,
  );
  const cappedConfidence = Math.min(beforeCeilingPenalized, policy.confidenceCeiling);
  const confidenceBand = confidenceBandFromScore(cappedConfidence);

  const roundingStep = roundingStepFor(policy.precisionMode);
  const rangeSpread = getRangeSpreadFromPolicy(policy.rangeWidthMode, fallbackSeverity);

  // PROMPT 10A — Range Argus-grade : P10/P90 réels quand assez de comps.
  // Utilise les prix factor-adjusted (déjà dans comparables[].price).
  const comparablePrices = comparables.map((c) => c.price);
  const rangeFromComps = computeRangeFromPercentiles(
    comparablePrices,
    adjustedPrice,
    rangeSpread,
  );
  const lowRangePrice = rangeFromComps.low;
  const highRangePrice = rangeFromComps.high;
  const rangeMethod = rangeFromComps.method;

  const quickDiscount = confidenceBand === "high" ? 0.04 : confidenceBand === "medium" ? 0.065 : 0.085;
  const quickSalePrice = Math.round(adjustedPrice * (1 - quickDiscount));
  const recommendedListingPrice = Math.min(
    Math.round(adjustedPrice * (confidenceBand === "high" ? 1.03 : confidenceBand === "medium" ? 1.02 : 1.01)),
    Math.round(highRangePrice * 0.995),
  );

  // PROMPT 10A — 3 valeurs Argus-grade depuis la centrale (=privateMarket=adjustedPrice)
  const formatMultipliers = factorConfig.price_format_multipliers;
  const tradeInProRaw = Math.round(adjustedPrice * formatMultipliers.trade_in_pro);
  const privateMarketRaw = adjustedPrice;
  const dealerRetailRaw = Math.round(adjustedPrice * formatMultipliers.dealer_retail);

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

  // PROMPT 10E — Couche 4 : sanity check par segment + année.
  // Si l'estimation centrale tombe hors des bornes raisonnables du segment,
  // on l'ajuste vers le plancher/plafond, on rééchelonne low/high autour du
  // nouveau central, on rabaisse le tier vers C et on réduit la confiance.
  const sanityResult = applySanityCheck(adjustedPrice, normalized.makeName, normalized.modelName, normalized.year);
  let finalAdjustedPrice = adjustedPrice;
  let finalLowRange = lowRangePrice;
  let finalHighRange = highRangePrice;
  let finalQuickSale = quickSalePrice;
  let finalRecommended = recommendedListingPrice;
  let finalTradeInPro = tradeInProRaw;
  let finalPrivateMarket = privateMarketRaw;
  let finalDealerRetail = dealerRetailRaw;
  let sanityConfidencePenalty = 0;
  if (!sanityResult.inBounds) {
    finalAdjustedPrice = sanityResult.adjustedEstimate;
    const sanityRatio = adjustedPrice > 0 ? finalAdjustedPrice / adjustedPrice : 1;
    finalLowRange = Math.round(lowRangePrice * sanityRatio);
    finalHighRange = Math.round(highRangePrice * sanityRatio);
    finalQuickSale = Math.round(quickSalePrice * sanityRatio);
    finalRecommended = Math.round(recommendedListingPrice * sanityRatio);
    finalTradeInPro = Math.round(tradeInProRaw * sanityRatio);
    finalPrivateMarket = finalAdjustedPrice;
    finalDealerRetail = Math.round(dealerRetailRaw * sanityRatio);
    sanityConfidencePenalty = 15;
    // Rabaisser le tier si plus haut que C
    if (tierDecision.tier === "A_STRONG_MARKET" || tierDecision.tier === "B_MODERATE_MARKET") {
      tierDecision.tier = "C_REFERENCE_ASSISTED";
      tierDecision.tierReasonCode = "SANITY_BOUND_APPLIED";
      tierDecision.tierReasonSummary = "Estimation hors plage attendue, recalibrée par segment.";
    }
  }
  const cappedConfidenceFinal = clamp(cappedConfidence - sanityConfidencePenalty, 18, 96);
  const confidenceBandFinal = confidenceBandFromScore(cappedConfidenceFinal);

  const outputValues = {
    estimatedValue: roundToStep(finalAdjustedPrice, roundingStep),
    lowEstimate: roundToStep(finalLowRange, roundingStep),
    highEstimate: roundToStep(finalHighRange, roundingStep),
    quickSalePrice: roundToStep(finalQuickSale, roundingStep),
    recommendedListingPrice: roundToStep(finalRecommended, roundingStep),
    roundingStepApplied: roundingStep,
    // PROMPT 10A — 3 valeurs Argus-grade (additives pour rétro-compat)
    tradeInPro: roundToStep(finalTradeInPro, roundingStep),
    privateMarket: roundToStep(finalPrivateMarket, roundingStep),
    dealerRetail: roundToStep(finalDealerRetail, roundingStep),
    internalUnrounded: {
      estimatedValueRaw: finalAdjustedPrice,
      lowEstimateRaw: finalLowRange,
      highEstimateRaw: finalHighRange,
      quickSaleRaw: finalQuickSale,
      recommendedRaw: finalRecommended,
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
      confidenceScore: cappedConfidenceFinal,
      confidenceBand: confidenceBandFinal,
      confidenceCeiling: policy.confidenceCeiling,
      confidenceBeforeCeiling: beforeCeiling,
      confidenceCapped: cappedConfidenceFinal !== beforeCeiling,
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
    audit: {
      rangeMethod,
      capApplied,
      trimFiltering: comparableFetch.trimFiltering,
      comparableSourceBreakdown: comparableFetch.sourceBreakdown,
      transactionFactorAvg: comparableFetch.transactionFactorAvg,
      transactionFactorVersion: factorConfig.version,
      // PROMPT 10E — Couche 2
      comparablesBreakdownByLayer: {
        exact: comparableFetch.layerBreakdown.exact,
        segmentProche: comparableFetch.layerBreakdown.segmentProche,
        fallbackCanonical: comparables.length === 0 && Boolean(profile) ? 1 : 0,
      },
      proximityModelsUsed: comparableFetch.proximityModelsUsed,
      proximityFactorAvg: comparableFetch.proximityFactorAvg,
      reasoningLayer:
        comparableFetch.layerBreakdown.exact >= 5
          ? "couche_1_exact"
          : comparableFetch.layerBreakdown.segmentProche > 0
            ? "couche_2_segment_proche"
            : sanityResult.action !== "no_bound" && sanityResult.action !== "kept"
              ? "couche_4_sanity_only"
              : "fallback_canonical",
      // PROMPT 10E — Couche 4
      sanityCheck: {
        applied: !sanityResult.inBounds,
        action: sanityResult.action,
        segmentKey: sanityResult.bound?.segmentKey ?? null,
        segmentLabel: sanityResult.bound?.segmentLabel ?? null,
        originalEstimate: sanityResult.originalEstimate,
        adjustedEstimate: sanityResult.adjustedEstimate,
        warning: sanityResult.warning,
      },
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
