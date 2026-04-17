/**
 * Manual dev script only.
 * Fetches a few Fiarakodia listing pages, parses ad details, and upserts into market_listings_raw.
 *
 * Usage:
 *   node ./scripts/market/test-fiarakodia-ingestion.mjs
 *   node ./scripts/market/test-fiarakodia-ingestion.mjs "https://www.fiarakodia.mg/voitures-occasion"
 */

import { loadLocalEnv } from "../catalog/load-env.mjs";
import {
  createMarketAdminClientFromEnv,
  insertManyMarketRawListings,
} from "./raw-listing-repository.mjs";
import {
  fetchFiarakodiaListingUrls,
  fetchFiarakodiaDetail,
  sleep,
} from "./fiarakodia-source.mjs";

const DEFAULT_LISTING_PAGES = [
  "https://www.fiarakodia.mg/voitures-occasion",
];

const DETAIL_DELAY_MS = 350;
const MAX_DETAIL_URLS = 12;

async function run() {
  loadLocalEnv();
  const client = createMarketAdminClientFromEnv(process.env);
  const listingPages = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_LISTING_PAGES;

  const allLinks = new Set();
  const errors = [];
  let pagesRead = 0;

  for (const pageUrl of listingPages) {
    try {
      const urls = await fetchFiarakodiaListingUrls(pageUrl, {
        timeoutMs: 15000,
      });
      pagesRead += 1;
      for (const url of urls) allLinks.add(url);
    } catch (error) {
      errors.push(
        `Listing page failed (${pageUrl}): ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  const detailUrls = [...allLinks].slice(0, MAX_DETAIL_URLS);
  const parsedListings = [];
  let detailParsedCount = 0;

  for (const detailUrl of detailUrls) {
    try {
      const detail = await fetchFiarakodiaDetail(detailUrl, { timeoutMs: 15000 });
      parsedListings.push(detail);
      detailParsedCount += 1;
    } catch (error) {
      errors.push(
        `Detail page failed (${detailUrl}): ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
    await sleep(DETAIL_DELAY_MS);
  }

  const upsertResult = await insertManyMarketRawListings(client, parsedListings);

  const summary = {
    pages_read: pagesRead,
    listing_links_found: allLinks.size,
    detail_urls_attempted: detailUrls.length,
    annonces_parsees: detailParsedCount,
    annonces_upsertees: upsertResult.upserted,
    erreurs_total: errors.length + upsertResult.errors.length,
  };

  console.log("Fiarakodia manual ingestion summary:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nUpsert result:");
  console.log(
    JSON.stringify(
      {
        success: upsertResult.success,
        total: upsertResult.total,
        upserted: upsertResult.upserted,
        failed: upsertResult.failed,
        sample_records: upsertResult.records.slice(0, 3).map((record) => ({
          id: record.id,
          source: record.source,
          source_url: record.source_url,
          title: record.title,
          price_raw: record.price_raw,
          city_raw: record.city_raw,
        })),
      },
      null,
      2,
    ),
  );

  if (errors.length > 0 || upsertResult.errors.length > 0) {
    console.log("\nErrors:");
    console.log(JSON.stringify([...errors, ...upsertResult.errors], null, 2));
  }
}

run().catch((error) => {
  console.error("Manual Fiarakodia ingestion failed:");
  console.error(error);
  process.exitCode = 1;
});

