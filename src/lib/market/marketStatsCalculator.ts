import type {
  MarketComparableGroup,
  MarketPriceStatsComputed,
  MarketStatsCleanInput,
} from "@/types/market";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((acc, value) => acc + value, 0);
  return Number((total / values.length).toFixed(2));
}

function percentileFromSorted(sortedValues: number[], p: number): number | null {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const index = (sortedValues.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sortedValues[low];
  const weight = index - low;
  const interpolated = sortedValues[low] + (sortedValues[high] - sortedValues[low]) * weight;
  return Math.round(interpolated);
}

function stddev(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = average(values);
  if (avg == null) return null;
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / values.length;
  return Number(Math.sqrt(variance).toFixed(2));
}

function modeOrNull(values: Array<string | null>): string | null {
  const filtered = values.filter((value): value is string => Boolean(value));
  if (filtered.length === 0) return null;
  const counts = new Map<string, number>();
  for (const value of filtered) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function computeConfidenceScore(group: MarketStatsCleanInput[]): number {
  const sampleSize = group.length;
  const sampleComponent = Math.min(50, sampleSize * 5);
  const withYear = group.filter((item) => item.year != null).length;
  const withMileage = group.filter((item) => item.mileage_km != null).length;
  const yearCoverage = sampleSize > 0 ? withYear / sampleSize : 0;
  const mileageCoverage = sampleSize > 0 ? withMileage / sampleSize : 0;
  const coverageComponent = Math.round((yearCoverage * 25) + (mileageCoverage * 25));
  return Math.min(100, sampleComponent + coverageComponent);
}

export function groupComparableListings(
  cleanListings: MarketStatsCleanInput[],
): MarketComparableGroup[] {
  const filtered = cleanListings.filter((item) =>
    item.listing_status === "active" &&
    item.outlier_flag === false &&
    item.price_mga != null &&
    item.comparable_cluster_key != null &&
    item.normalized_make != null &&
    item.normalized_model != null,
  );

  const groups = new Map<string, MarketStatsCleanInput[]>();
  for (const listing of filtered) {
    const key = listing.comparable_cluster_key as string;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(listing);
  }

  return [...groups.entries()].map(([comparable_cluster_key, listings]) => ({
    comparable_cluster_key,
    listings,
  }));
}

export function computeStatsForGroup(group: MarketComparableGroup): MarketPriceStatsComputed {
  const nowIso = new Date().toISOString();
  const prices = group.listings
    .map((item) => item.price_mga)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  const years = group.listings
    .map((item) => item.year)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  const mileages = group.listings
    .map((item) => item.mileage_km)
    .filter((value): value is number => typeof value === "number");

  const first = group.listings[0];

  return {
    comparable_cluster_key: group.comparable_cluster_key,
    make: first.normalized_make as string,
    model: first.normalized_model as string,
    body_style: modeOrNull(group.listings.map((item) => item.body_style)),
    fuel_type: modeOrNull(group.listings.map((item) => item.fuel_type)),
    transmission: modeOrNull(group.listings.map((item) => item.transmission)),
    city: modeOrNull(group.listings.map((item) => item.city)),
    year_min: years.length > 0 ? years[0] : null,
    year_max: years.length > 0 ? years[years.length - 1] : null,
    sample_size: prices.length,
    min_price_mga: prices.length > 0 ? prices[0] : null,
    p25_price_mga: percentileFromSorted(prices, 0.25),
    median_price_mga: percentileFromSorted(prices, 0.5),
    p75_price_mga: percentileFromSorted(prices, 0.75),
    max_price_mga: prices.length > 0 ? prices[prices.length - 1] : null,
    avg_price_mga: average(prices),
    avg_year: average(years),
    avg_mileage_km: average(mileages),
    price_stddev: stddev(prices),
    confidence_score: computeConfidenceScore(group.listings),
    last_calculated_at: nowIso,
  };
}

export function computeMarketPriceStatsBatch(
  cleanListings: MarketStatsCleanInput[],
): MarketPriceStatsComputed[] {
  const groups = groupComparableListings(cleanListings);
  return groups.map((group) => computeStatsForGroup(group));
}

