import { createClient } from "@supabase/supabase-js";
import { buildRawListingPayload } from "./raw-listing-validation.mjs";

function pickIncomingString(incoming, existing) {
  if (typeof incoming === "string" && incoming.trim().length > 0) return incoming.trim();
  if (typeof existing === "string" && existing.trim().length > 0) return existing.trim();
  return null;
}

function parseIsoTimestamp(value) {
  if (!value) return null;
  const ts = Date.parse(String(value));
  if (Number.isNaN(ts)) return null;
  return ts;
}

function pickLatestTimestamp(incoming, existing) {
  const nowIso = new Date().toISOString();
  const incomingTs = parseIsoTimestamp(incoming);
  const existingTs = parseIsoTimestamp(existing);
  if (incomingTs == null && existingTs == null) return nowIso;
  if (incomingTs == null) return new Date(existingTs).toISOString();
  if (existingTs == null) return new Date(incomingTs).toISOString();
  return new Date(Math.max(incomingTs, existingTs)).toISOString();
}

function mergePayload(existing, incoming) {
  const base = existing && typeof existing === "object" ? { ...existing } : {};
  if (!incoming || typeof incoming !== "object") return base;
  const output = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== null && value !== undefined) output[key] = value;
  }
  return output;
}

function mergeRawPayloadNonDestructive(existing, incoming) {
  if (!existing) return incoming;
  return {
    ...incoming,
    source_listing_id: pickIncomingString(incoming.source_listing_id, existing.source_listing_id),
    title: pickIncomingString(incoming.title, existing.title),
    description_raw: pickIncomingString(incoming.description_raw, existing.description_raw),
    price_raw: pickIncomingString(incoming.price_raw, existing.price_raw),
    currency_raw: pickIncomingString(incoming.currency_raw, existing.currency_raw),
    city_raw: pickIncomingString(incoming.city_raw, existing.city_raw),
    posted_at_raw: pickIncomingString(incoming.posted_at_raw, existing.posted_at_raw),
    year_raw: pickIncomingString(incoming.year_raw, existing.year_raw),
    mileage_raw: pickIncomingString(incoming.mileage_raw, existing.mileage_raw),
    fuel_type_raw: pickIncomingString(incoming.fuel_type_raw, existing.fuel_type_raw),
    transmission_raw: pickIncomingString(incoming.transmission_raw, existing.transmission_raw),
    body_style_raw: pickIncomingString(incoming.body_style_raw, existing.body_style_raw),
    seller_name_raw: pickIncomingString(incoming.seller_name_raw, existing.seller_name_raw),
    seller_type_raw: pickIncomingString(incoming.seller_type_raw, existing.seller_type_raw),
    phone_raw: pickIncomingString(incoming.phone_raw, existing.phone_raw),
    html_snapshot: pickIncomingString(incoming.html_snapshot, existing.html_snapshot),
    payload: mergePayload(existing.payload, incoming.payload),
    last_seen_at: pickLatestTimestamp(incoming.last_seen_at, existing.last_seen_at),
    scraped_at: pickLatestTimestamp(incoming.scraped_at, existing.scraped_at),
  };
}

async function getRawBySourceAndUrl(client, source, sourceUrl) {
  const { data, error } = await client
    .from("market_listings_raw")
    .select("*")
    .eq("source", source)
    .eq("source_url", sourceUrl)
    .maybeSingle();
  if (error) throw new Error(`Market ingestion read failed: ${error.message}`);
  return data ?? null;
}

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

export async function upsertMarketRawListing(client, input) {
  const payload = buildRawListingPayload(input);
  const existing = await getRawBySourceAndUrl(client, payload.source, payload.source_url);
  const mergedPayload = mergeRawPayloadNonDestructive(existing, payload);
  const { data, error } = await client
    .from("market_listings_raw")
    .upsert(mergedPayload, {
      onConflict: "source,source_url",
      ignoreDuplicates: false,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Market ingestion upsert failed: ${error.message}`);
  return data;
}

export async function insertManyMarketRawListings(client, inputs) {
  if (inputs.length === 0) {
    return { success: true, total: 0, upserted: 0, failed: 0, records: [], errors: [] };
  }

  const records = [];
  const errors = [];

  for (const input of inputs) {
    try {
      const upserted = await upsertMarketRawListing(client, input);
      records.push(upserted);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown market ingestion error");
    }
  }

  return {
    success: errors.length === 0,
    total: inputs.length,
    upserted: records.length,
    failed: errors.length,
    records,
    errors,
  };
}

