/**
 * Manual dev script only.
 * Reads market_listings_clean, computes grouped stats, and upserts market_price_stats.
 *
 * Usage:
 *   node ./scripts/market/test-market-stats.mjs
 */

import { loadLocalEnv } from "../catalog/load-env.mjs";
import {
  computeAndUpsertMarketPriceStats,
  createMarketAdminClientFromEnv,
} from "./market-stats-repository.mjs";

async function run() {
  loadLocalEnv();
  const client = createMarketAdminClientFromEnv(process.env);
  const result = await computeAndUpsertMarketPriceStats(client, 5000);

  console.log("Market price stats batch summary:");
  console.log(
    JSON.stringify(
      {
        total_clean_read: result.total_clean_read,
        groups_computed: result.groups_computed,
        upserted: result.upserted,
        failed: result.failed,
        success: result.success,
      },
      null,
      2,
    ),
  );

  console.log("\nStats preview (first 3):");
  console.log(JSON.stringify(result.records.slice(0, 3), null, 2));

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    console.log(JSON.stringify(result.errors, null, 2));
  }
}

run().catch((error) => {
  console.error("Manual market stats test failed:");
  console.error(error);
  process.exitCode = 1;
});

