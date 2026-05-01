/**
 * Entry point Sprint 2 — extraction LLM des annonces FB.
 *
 * Lance:
 *   npm run data:llm-extract
 *   (équivalent: tsx scripts/data/run-llm-extraction.ts)
 *
 * Pré-requis:
 *   - .env.local renseigné avec ANTHROPIC_API_KEY
 *   - CSV FB scrap déposés dans scripts/data/inputs/
 *
 * Sortie:
 *   - scripts/data/output/llm_extractions.csv
 *   - scripts/data/output/llm_cache.json (cache disque, gitignored)
 *   - scripts/data/output/llm_budget_log.json (suivi tokens/coûts, gitignored)
 */

import { config as loadDotenv } from "dotenv";

// Charge .env.local en priorité (clé API Anthropic), puis .env en fallback.
// dotenv ne réécrase JAMAIS une variable déjà définie : .env.local gagne.
loadDotenv({ path: ".env.local" });
loadDotenv();

import { runBatch } from "./lib/llm-batch";

runBatch()
  .then((summary) => {
    console.log("=== llm batch summary ===");
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("[run-llm-extraction] erreur fatale:", err);
    process.exit(1);
  });
