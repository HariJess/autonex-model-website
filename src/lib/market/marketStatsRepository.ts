import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MarketPriceStatsComputed,
  MarketStatsBatchResult,
  MarketStatsCleanInput,
} from "@/types/market";
import { computeMarketPriceStatsBatch } from "@/lib/market/marketStatsCalculator";

type MarketSupabaseClient = SupabaseClient;

export function createMarketAdminClientFromEnv(): MarketSupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Market stats requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function readCleanListingsForStats(
  client: MarketSupabaseClient,
  limit = 5000,
): Promise<MarketStatsCleanInput[]> {
  const { data, error } = await client
    .from("market_listings_clean")
    .select(
      "id, comparable_cluster_key, normalized_make, normalized_model, body_style, fuel_type, transmission, city, year, mileage_km, price_mga, listing_status, outlier_flag",
    )
    .limit(limit);

  if (error) throw new Error(`Market stats read failed: ${error.message}`);
  return (data ?? []) as MarketStatsCleanInput[];
}

export async function upsertMarketPriceStat(
  client: MarketSupabaseClient,
  stat: MarketPriceStatsComputed,
): Promise<MarketPriceStatsComputed> {
  const { error } = await client
    .from("market_price_stats")
    .upsert(stat, {
      onConflict: "comparable_cluster_key",
      ignoreDuplicates: false,
    });
  if (error) throw new Error(`Market stats upsert failed for ${stat.comparable_cluster_key}: ${error.message}`);
  return stat;
}

export async function upsertManyMarketPriceStats(
  client: MarketSupabaseClient,
  stats: MarketPriceStatsComputed[],
): Promise<MarketStatsBatchResult> {
  if (stats.length === 0) {
    return {
      success: true,
      total_clean_read: 0,
      groups_computed: 0,
      upserted: 0,
      failed: 0,
      records: [],
      errors: [],
    };
  }

  const records: MarketPriceStatsComputed[] = [];
  const errors: string[] = [];

  for (const stat of stats) {
    try {
      const result = await upsertMarketPriceStat(client, stat);
      records.push(result);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown market stats upsert error");
    }
  }

  return {
    success: errors.length === 0,
    total_clean_read: 0,
    groups_computed: stats.length,
    upserted: records.length,
    failed: errors.length,
    records,
    errors,
  };
}

export async function computeAndUpsertMarketPriceStats(
  client: MarketSupabaseClient,
  limit = 5000,
): Promise<MarketStatsBatchResult> {
  const cleanListings = await readCleanListingsForStats(client, limit);
  const computed = computeMarketPriceStatsBatch(cleanListings);
  const upsertResult = await upsertManyMarketPriceStats(client, computed);
  return {
    ...upsertResult,
    total_clean_read: cleanListings.length,
    groups_computed: computed.length,
  };
}

