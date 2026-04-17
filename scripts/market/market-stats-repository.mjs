import { createClient } from "@supabase/supabase-js";
import { computeMarketPriceStatsBatch } from "./market-stats-calculator.mjs";

export function createMarketAdminClientFromEnv(env = process.env) {
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing env: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function readCleanListingsForStats(client, limit = 5000) {
  const { data, error } = await client
    .from("market_listings_clean")
    .select(
      "id, comparable_cluster_key, normalized_make, normalized_model, body_style, fuel_type, transmission, city, year, mileage_km, price_mga, listing_status, outlier_flag",
    )
    .limit(limit);
  if (error) throw new Error(`Market stats read failed: ${error.message}`);
  return data ?? [];
}

export async function upsertMarketPriceStat(client, stat) {
  const { error } = await client
    .from("market_price_stats")
    .upsert(stat, { onConflict: "comparable_cluster_key", ignoreDuplicates: false });
  if (error) throw new Error(`Market stats upsert failed for ${stat.comparable_cluster_key}: ${error.message}`);
  return stat;
}

export async function upsertManyMarketPriceStats(client, stats) {
  if (stats.length === 0) {
    return { success: true, total_clean_read: 0, groups_computed: 0, upserted: 0, failed: 0, records: [], errors: [] };
  }
  const records = [];
  const errors = [];
  for (const stat of stats) {
    try {
      records.push(await upsertMarketPriceStat(client, stat));
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

export async function computeAndUpsertMarketPriceStats(client, limit = 5000) {
  const cleanListings = await readCleanListingsForStats(client, limit);
  const computed = computeMarketPriceStatsBatch(cleanListings);
  const upsertResult = await upsertManyMarketPriceStats(client, computed);
  return {
    ...upsertResult,
    total_clean_read: cleanListings.length,
    groups_computed: computed.length,
  };
}

