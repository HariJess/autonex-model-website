/**
 * Manual dev script only.
 * Inserts/upserts fake market raw listings into public.market_listings_raw.
 *
 * Usage:
 *   node ./scripts/market/test-raw-ingestion.mjs
 */

import { loadLocalEnv } from "../catalog/load-env.mjs";
import {
  createMarketAdminClientFromEnv,
  insertManyMarketRawListings,
  upsertMarketRawListing,
} from "./raw-listing-repository.mjs";

function logSelectedFields(record, label) {
  if (!record) {
    console.log(`${label}: <no record>`);
    return;
  }
  const selected = {
    source: record.source,
    source_listing_id: record.source_listing_id,
    source_url: record.source_url,
    title: record.title,
    description_raw: record.description_raw,
    price_raw: record.price_raw,
    city_raw: record.city_raw,
    year_raw: record.year_raw,
    mileage_raw: record.mileage_raw,
    html_snapshot: record.html_snapshot,
    payload: record.payload,
    scraped_at: record.scraped_at,
    last_seen_at: record.last_seen_at,
  };
  console.log(`${label}:`);
  console.log(JSON.stringify(selected, null, 2));
}

async function fetchBySourceAndUrl(client, source, sourceUrl) {
  const { data, error } = await client
    .from("market_listings_raw")
    .select("*")
    .eq("source", source)
    .eq("source_url", sourceUrl)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function run() {
  loadLocalEnv();
  const client = createMarketAdminClientFromEnv(process.env);

  const now = new Date().toISOString();
  const fakeListings = [
    {
      source: "manual",
      sourceListingId: "manual-test-001",
      sourceUrl: "https://example.local/listing/manual-test-001",
      title: "Toyota RAV4 2020 AWD - Test Market Raw",
      descriptionRaw: "Annonce fictive de test ingestion marché.",
      priceRaw: "95 000 000 Ar",
      currencyRaw: "MGA",
      cityRaw: "Antananarivo",
      yearRaw: "2020",
      mileageRaw: "68000",
      fuelTypeRaw: "Essence",
      transmissionRaw: "Automatique",
      bodyStyleRaw: "SUV",
      sellerTypeRaw: "particulier",
      payload: { test: true, note: "manual-seed-1" },
      scrapedAt: now,
      lastSeenAt: now,
    },
    {
      source: "partner",
      sourceListingId: "partner-test-002",
      sourceUrl: "https://partner.example/listing/partner-test-002",
      title: "Ford Ranger 2019 - Test Market Raw",
      descriptionRaw: "Deuxième annonce factice pour valider l'upsert batch.",
      priceRaw: "112000000",
      currencyRaw: "MGA",
      cityRaw: "Toamasina",
      yearRaw: "2019",
      mileageRaw: "120500",
      fuelTypeRaw: "Diesel",
      transmissionRaw: "Manuelle",
      bodyStyleRaw: "Pick-up",
      sellerTypeRaw: "dealer",
      payload: { test: true, note: "manual-seed-2" },
      scrapedAt: now,
      lastSeenAt: now,
    },
  ];

  const batchResult = await insertManyMarketRawListings(client, fakeListings);
  console.log("Batch ingestion result:");
  console.log(JSON.stringify(batchResult, null, 2));

  const targetSource = "manual";
  const targetUrl = "https://example.local/listing/manual-test-001";
  const beforePartialUpsert = await fetchBySourceAndUrl(client, targetSource, targetUrl);
  logSelectedFields(beforePartialUpsert, "\nBefore partial upsert");

  // Re-upsert one row with partial data to validate non-destructive conflict handling.
  const singleResult = await upsertMarketRawListing(client, {
    source: targetSource,
    sourceListingId: "manual-test-001-v2",
    sourceUrl: targetUrl,
    title: "Toyota RAV4 2020 AWD - Test Market Raw (Updated)",
    payload: { test: true, note: "manual-single-upsert" },
  });

  logSelectedFields(singleResult, "\nSingle upsert result (conflict path)");

  const afterPartialUpsert = await fetchBySourceAndUrl(client, targetSource, targetUrl);
  logSelectedFields(afterPartialUpsert, "\nAfter partial upsert");

  const nonDestructiveChecks = {
    kept_description_raw: Boolean(afterPartialUpsert?.description_raw),
    kept_price_raw: Boolean(afterPartialUpsert?.price_raw),
    kept_city_raw: Boolean(afterPartialUpsert?.city_raw),
    kept_year_raw: Boolean(afterPartialUpsert?.year_raw),
    kept_mileage_raw: Boolean(afterPartialUpsert?.mileage_raw),
    updated_title: afterPartialUpsert?.title === "Toyota RAV4 2020 AWD - Test Market Raw (Updated)",
    updated_source_listing_id: afterPartialUpsert?.source_listing_id === "manual-test-001-v2",
    payload_preserved_and_merged:
      Boolean(afterPartialUpsert?.payload?.test) && afterPartialUpsert?.payload?.note === "manual-single-upsert",
  };
  console.log("\nNon-destructive upsert checks:");
  console.log(JSON.stringify(nonDestructiveChecks, null, 2));
}

run().catch((error) => {
  console.error("Manual market raw ingestion test failed:");
  console.error(error);
  process.exitCode = 1;
});

