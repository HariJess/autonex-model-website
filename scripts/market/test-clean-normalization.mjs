/**
 * Manual dev script only.
 * Reads raw market listings, normalizes them, and upserts into market_listings_clean.
 *
 * Usage:
 *   node ./scripts/market/test-clean-normalization.mjs
 */

import { loadLocalEnv } from "../catalog/load-env.mjs";
import {
  createMarketAdminClientFromEnv,
  processMarketRawBatchToClean,
} from "./clean-listing-repository.mjs";

async function run() {
  loadLocalEnv();
  const client = createMarketAdminClientFromEnv(process.env);

  const { data, error } = await client
    .from("market_listings_raw")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Unable to read market_listings_raw: ${error.message}`);
  }

  const raws = data ?? [];
  if (raws.length === 0) {
    console.log("No raw listings found in market_listings_raw.");
    return;
  }

  const result = await processMarketRawBatchToClean(client, raws);
  console.log("Market clean normalization summary:");
  console.log(
    JSON.stringify(
      {
        total: result.total,
        processed: result.processed,
        failed: result.failed,
        success: result.success,
      },
      null,
      2,
    ),
  );

  console.log("\nClean records preview (first 3):");
  console.log(JSON.stringify(result.records.slice(0, 3), null, 2));

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    console.log(JSON.stringify(result.errors, null, 2));
  }
}

run().catch((error) => {
  console.error("Manual market clean normalization test failed:");
  console.error(error);
  process.exitCode = 1;
});

