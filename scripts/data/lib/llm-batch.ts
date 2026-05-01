/**
 * Orchestrateur batch de l'extraction LLM.
 *
 * 1. Lit les CSV FB scrap (input)
 * 2. Filtre + dédoublonne par texte trimé
 * 3. Pour chaque post unique :
 *      - cache hit  → reuse, coût $0
 *      - cache miss → appel LLM, met à jour cache (sauf si budget atteint)
 * 4. Écrit `llm_extractions.csv` (uniquement is_vehicle_listing && !is_buyer_post)
 *    et `llm_budget_log.json` (suivi tokens/coût/erreurs).
 *
 * Le batch est rejouable : un re-run sur les mêmes inputs ne ré-appelle pas
 * le LLM tant que le cache n'est pas effacé.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCsv } from "./parse";
import { extractFromText, type ExtractionResult } from "./llm-extract";
import {
  getFromCache,
  persistCache,
  setInCache,
} from "./llm-extract-cache";

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/data/lib → repo root
const ROOT = resolve(__dirname, "..", "..", "..");
const INPUTS_DIR = resolve(ROOT, "scripts", "data", "inputs");
const OUTPUT_DIR = resolve(ROOT, "scripts", "data", "output");

const DEFAULT_INPUTS = [
  resolve(INPUTS_DIR, "fb_scrap_v1_varotra_apr2026.csv"),
  resolve(INPUTS_DIR, "fb_scrap_v2_coinautomoto_jul2025_apr2026.csv"),
];

export type BatchOptions = {
  /** Chemins absolus vers les CSV FB scrap (override pour tests). */
  inputs?: string[];
  /** Plafond budget USD — défaut: env LLM_BUDGET_USD_MAX, sinon 5. */
  budgetMaxUsd?: number;
  /** Sortie CSV résultats (défaut: scripts/data/output/llm_extractions.csv). */
  outputCsvPath?: string;
  /** Sortie log budget JSON (défaut: scripts/data/output/llm_budget_log.json). */
  budgetLogPath?: string;
  /** Longueur min du texte (sous ce seuil → skip). Défaut: 30. */
  minTextLength?: number;
  /** Tronquer le texte avant envoi LLM (limite tokens input). Défaut: 3000. */
  truncateChars?: number;
  /** Persiste le cache + log progression toutes les N itérations. Défaut: 50. */
  progressEvery?: number;
  /** Hook injecté pour les tests (override extractFromText). */
  extractFn?: typeof extractFromText;
};

export type BatchSummary = {
  totalCostUsd: number;
  llmCalls: number;
  cacheHits: number;
  uniquePosts: number;
  totalRows: number;
  vehicleListingsExtracted: number;
  buyersSkipped: number;
  nonVehicleSkipped: number;
  errors: number;
  budgetReached: boolean;
};

const CSV_HEADERS = [
  "facebookUrl",
  "time",
  "sellerName",
  "brand",
  "model",
  "year",
  "mileage_km",
  "price_ar",
  "currency_original",
  "fuel_type",
  "transmission",
  "body_style",
  "condition",
  "city",
  "confidence",
];

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvLine(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvField).join(",");
}

export async function runBatch(opts: BatchOptions = {}): Promise<BatchSummary> {
  const budgetMax = opts.budgetMaxUsd ?? Number(process.env.LLM_BUDGET_USD_MAX ?? 5);
  const inputs = opts.inputs ?? DEFAULT_INPUTS;
  const outputCsvPath = opts.outputCsvPath ?? resolve(OUTPUT_DIR, "llm_extractions.csv");
  const budgetLogPath = opts.budgetLogPath ?? resolve(OUTPUT_DIR, "llm_budget_log.json");
  const minTextLen = opts.minTextLength ?? 30;
  const truncateChars = opts.truncateChars ?? 3000;
  const progressEvery = opts.progressEvery ?? 50;
  const extractFn = opts.extractFn ?? extractFromText;

  // 1. Charger les CSV
  const allRows: Array<Record<string, string>> = [];
  for (const path of inputs) {
    if (!existsSync(path)) {
      console.warn(`[llm-batch] fichier absent (skip): ${path}`);
      continue;
    }
    const raw = stripBom(readFileSync(path, "utf-8"));
    const rows = parseCsv(raw);
    console.log(`[llm-batch] ${path}: ${rows.length} lignes`);
    allRows.push(...rows);
  }

  // 2. Dédupliquer par texte trimé
  const seenTexts = new Set<string>();
  const uniqueRows = allRows.filter((r) => {
    const t = (r.text ?? "").trim();
    if (!t || t.length < minTextLen) return false;
    if (seenTexts.has(t)) return false;
    seenTexts.add(t);
    return true;
  });

  console.log(
    `[llm-batch] posts uniques à analyser: ${uniqueRows.length} (sur ${allRows.length} total, budget max: $${budgetMax})`,
  );

  // 3. Itérer + cache + budget guard
  type EnrichedResult = ExtractionResult & {
    facebookUrl: string;
    time: string;
    sellerName: string;
  };

  const results: EnrichedResult[] = [];
  let totalCost = 0;
  let cacheHits = 0;
  let llmCalls = 0;
  let budgetReached = false;

  for (let i = 0; i < uniqueRows.length; i++) {
    const row = uniqueRows[i];
    const text = (row.text ?? "").trim();
    const facebookUrl = row.facebookUrl ?? "";
    const time = row.time ?? "";
    const sellerName = row["user/name"] ?? "";

    const cached = getFromCache(text);
    if (cached !== undefined) {
      cacheHits += 1;
      results.push({
        postId: facebookUrl,
        extracted: cached,
        error: null,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        facebookUrl,
        time,
        sellerName,
      });
      continue;
    }

    if (totalCost >= budgetMax) {
      console.warn(
        `[llm-batch] BUDGET DÉPASSÉ ($${totalCost.toFixed(3)} ≥ $${budgetMax}) — arrêt à ${i}/${uniqueRows.length}`,
      );
      budgetReached = true;
      break;
    }

    const result = await extractFn(facebookUrl, text.slice(0, truncateChars));
    llmCalls += 1;
    totalCost += result.costUsd;
    setInCache(text, result.extracted);
    results.push({ ...result, facebookUrl, time, sellerName });

    if (i > 0 && i % progressEvery === 0) {
      persistCache();
      console.log(
        `[llm-batch] progress ${i}/${uniqueRows.length} — coût $${totalCost.toFixed(3)} — appels: ${llmCalls} — cache hits: ${cacheHits}`,
      );
    }
  }

  persistCache();

  // 4. Filtrer + écrire le CSV de sortie
  const csvRows = results.filter(
    (r) => r.extracted !== null && r.extracted.is_vehicle_listing && !r.extracted.is_buyer_post,
  );

  const lines = [csvLine(CSV_HEADERS)];
  for (const r of csvRows) {
    const e = r.extracted!;
    lines.push(
      csvLine([
        r.facebookUrl,
        r.time,
        r.sellerName,
        e.brand,
        e.model,
        e.year,
        e.mileage_km,
        e.price_ar,
        e.currency_original,
        e.fuel_type,
        e.transmission,
        e.body_style,
        e.condition,
        e.city,
        e.confidence,
      ]),
    );
  }
  mkdirSync(dirname(outputCsvPath), { recursive: true });
  writeFileSync(outputCsvPath, lines.join("\n") + "\n", "utf-8");

  // 5. Log budget
  const buyersSkipped = results.filter((r) => r.extracted?.is_buyer_post).length;
  const nonVehicleSkipped = results.filter(
    (r) => r.extracted !== null && !r.extracted.is_vehicle_listing,
  ).length;
  const errors = results.filter((r) => r.error !== null).length;

  const summary: BatchSummary = {
    totalCostUsd: Number(totalCost.toFixed(4)),
    llmCalls,
    cacheHits,
    uniquePosts: uniqueRows.length,
    totalRows: allRows.length,
    vehicleListingsExtracted: csvRows.length,
    buyersSkipped,
    nonVehicleSkipped,
    errors,
    budgetReached,
  };

  mkdirSync(dirname(budgetLogPath), { recursive: true });
  writeFileSync(
    budgetLogPath,
    JSON.stringify(
      {
        ...summary,
        run_date: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf-8",
  );

  console.log(
    `[llm-batch] terminé. Annonces véhicules extraites: ${csvRows.length}. Coût: $${totalCost.toFixed(3)}.`,
  );
  return summary;
}
