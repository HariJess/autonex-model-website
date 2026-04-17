import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MarketCleanProcessResult,
  MarketListingCleanInput,
  MarketListingCleanNormalized,
  MarketListingRawRecord,
} from "@/types/market";
import { normalizeRawListingToClean } from "@/lib/market/cleanListingNormalizer";

type MarketSupabaseClient = SupabaseClient;

export function createMarketAdminClientFromEnv(): MarketSupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Market normalization requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function upsertMarketCleanFromRaw(
  client: MarketSupabaseClient,
  raw: MarketListingCleanInput,
): Promise<MarketListingCleanNormalized> {
  const normalized = normalizeRawListingToClean(raw);
  const payload = {
    raw_listing_id: normalized.raw_listing_id,
    source: normalized.source,
    source_listing_id: normalized.source_listing_id,
    source_url: normalized.source_url,
    normalized_make: normalized.normalized_make,
    normalized_model: normalized.normalized_model,
    normalized_trim: normalized.normalized_trim,
    normalized_generation: normalized.normalized_generation,
    year: normalized.year,
    mileage_km: normalized.mileage_km,
    price_mga: normalized.price_mga,
    fuel_type: normalized.fuel_type,
    transmission: normalized.transmission,
    body_style: normalized.body_style,
    city: normalized.city,
    seller_type: normalized.seller_type,
    posted_at: normalized.posted_at,
    listing_status: normalized.listing_status,
    confidence_score: normalized.confidence_score,
    outlier_flag: normalized.outlier_flag,
    duplicate_of: normalized.duplicate_of,
    fingerprint: normalized.fingerprint,
    comparable_cluster_key: normalized.comparable_cluster_key,
    parsing_notes: normalized.parsing_notes,
  };

  const { error } = await client
    .from("market_listings_clean")
    .upsert(payload, {
      onConflict: "raw_listing_id",
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Market clean upsert failed for raw ${raw.id}: ${error.message}`);
  }

  return normalized;
}

export async function processMarketRawBatchToClean(
  client: MarketSupabaseClient,
  raws: MarketListingRawRecord[],
): Promise<MarketCleanProcessResult> {
  const records: MarketListingCleanNormalized[] = [];
  const errors: string[] = [];

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

