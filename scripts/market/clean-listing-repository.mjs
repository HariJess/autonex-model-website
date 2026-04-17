import { createClient } from "@supabase/supabase-js";
import { normalizeRawListingToClean } from "./clean-listing-normalizer.mjs";

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

export async function upsertMarketCleanFromRaw(client, raw) {
  const normalized = normalizeRawListingToClean(raw);
  const { error } = await client
    .from("market_listings_clean")
    .upsert(normalized, {
      onConflict: "raw_listing_id",
      ignoreDuplicates: false,
    });

  if (error) throw new Error(`Market clean upsert failed for raw ${raw.id}: ${error.message}`);
  return normalized;
}

export async function processMarketRawBatchToClean(client, raws) {
  const records = [];
  const errors = [];

  for (const raw of raws) {
    try {
      const normalized = await upsertMarketCleanFromRaw(client, raw);
      records.push(normalized);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown clean processing error");
    }
  }

  return {
    success: errors.length === 0,
    total: raws.length,
    processed: records.length,
    failed: errors.length,
    records,
    errors,
  };
}

