/**
 * PROMPT 11 — Ingestion CSV scrap → market_listings_clean (+ market_listings_raw)
 *
 * Source CSV attendu : data/seed/market_listings_v1_2026.csv (105 lignes, 27 colonnes).
 *
 * Run :
 *   npx tsx scripts/data/ingest-market-listings-csv.ts --dry-run
 *   npx tsx scripts/data/ingest-market-listings-csv.ts --csv data/seed/market_listings_v1_2026.csv
 *
 * Idempotence stricte : sans `--force`, un re-run après ingestion réussie
 * détecte les fingerprints existants et skip silencieusement (0 INSERT).
 *
 * Garde-fous :
 *   - RGPD : la colonne `contact` du CSV n'est JAMAIS stockée en clear dans
 *     market_listings_clean. Elle est hashée (SHA-256, 16 chars) et stockée
 *     uniquement dans market_listings_raw.payload.contact_hash.
 *   - FMG → MGA : conversion auto si currency_original='FMG' OU prix > 1.5e9.
 *     Lignes hors bande [5M, 800M] → include_in_estimation=false + log dans
 *     extraction_notes.
 *   - Migration delta requise (20260509120000_market_listings_clean_extension)
 *     doit être appliquée avant de pouvoir lancer en mode write.
 *   - Pas d'écriture sur l'engine ni l'UI : ce script alimente la table, c'est
 *     PROMPT 10A qui branchera l'engine sur cette source.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { parseCsv } from "./lib/parse";

// =============================================================================
// Types
// =============================================================================

type RawCsvRow = Record<string, string>;

export type PriceSuspicion =
  | "fmg_converted"
  | "fmg_conversion_out_of_band"
  | "out_of_band"
  | "no_price"
  | null;

export type PriceNormalization = {
  price: number;
  suspicion: PriceSuspicion;
};

export type NormalizedRow = {
  csvListingId: string;
  sourceTag: string;
  sellerSource: string | null;
  sellerType: string | null;
  normalizedMake: string;
  normalizedModel: string;
  normalizedTrim: string | null;
  year: number | null;
  priceMga: number;
  priceType: string | null;
  negotiable: boolean | null;
  mileageKm: number | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  engineText: string | null;
  seats: number | null;
  optionsSummary: string | null;
  conditionNotes: string | null;
  city: string | null;
  contactHash: string | null;
  includeInEstimation: boolean;
  duplicateGroup: string | null;
  dataConfidence: string | null;
  extractionNotes: string;
  fingerprint: string;
  rawPayload: Record<string, unknown>;
};

export type IngestionStats = {
  totalParsed: number;
  validCount: number;
  skippedCount: number;
  fmgConverted: number;
  outOfBand: number;
  duplicateExisting: number;
  duplicateInBatch: number;
  includeInEstimationTrue: number;
  includeInEstimationFalse: number;
  perDataConfidence: Record<string, number>;
  perMake: Record<string, number>;
  errors: string[];
};

// =============================================================================
// CSV expected columns (27)
// =============================================================================

export const EXPECTED_CSV_COLUMNS = [
  "listing_id",
  "seller_source",
  "seller_type",
  "make",
  "model",
  "trim_generation",
  "year",
  "price_mga",
  "price_raw",
  "currency_original",
  "price_type",
  "negotiable",
  "mileage_km",
  "mileage_raw",
  "fuel",
  "transmission",
  "drivetrain",
  "engine",
  "seats",
  "options_summary",
  "condition_notes",
  "location",
  "contact",
  "include_in_estimation",
  "duplicate_group",
  "data_confidence",
  "extraction_notes",
] as const;

// =============================================================================
// Pure normalization helpers — testable in isolation, no DB/network
// =============================================================================

const PRICE_MGA_MIN = 5_000_000;
const PRICE_MGA_MAX = 800_000_000;
const FMG_DETECTION_THRESHOLD = 1_500_000_000;

/**
 * Convertit FMG → MGA (1 MGA = 5 FMG) si le prix dépasse le seuil de détection
 * OU si currency_original='FMG'. Flag les valeurs hors plage [5M, 800M] MGA.
 */
export function normalizePrice(
  rawPriceMga: number | null,
  currency: string | null,
): PriceNormalization {
  if (rawPriceMga === null || !Number.isFinite(rawPriceMga) || rawPriceMga <= 0) {
    return { price: 0, suspicion: "no_price" };
  }
  const isFmg = (currency ?? "").toUpperCase() === "FMG"
    || rawPriceMga > FMG_DETECTION_THRESHOLD;
  if (isFmg) {
    const converted = Math.round(rawPriceMga / 5);
    if (converted < PRICE_MGA_MIN || converted > PRICE_MGA_MAX) {
      return { price: converted, suspicion: "fmg_conversion_out_of_band" };
    }
    return { price: converted, suspicion: "fmg_converted" };
  }
  if (rawPriceMga < PRICE_MGA_MIN || rawPriceMga > PRICE_MGA_MAX) {
    return { price: rawPriceMga, suspicion: "out_of_band" };
  }
  return { price: rawPriceMga, suspicion: null };
}

/**
 * Hash SHA-256 (16 chars) du contact normalisé (whitespace stripped, prefix
 * malagasy 0XX → +261XX). Stocké UNIQUEMENT dans raw.payload.contact_hash —
 * jamais le contact en clear.
 */
export function hashContact(contact: string | null | undefined): string | null {
  if (!contact || !contact.trim()) return null;
  let normalized = contact.replace(/\s+/g, "");
  if (/^0\d/.test(normalized)) {
    normalized = "+261" + normalized.slice(1);
  }
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/**
 * Normalise make/model. Casing canonical (Title Case sur chaque mot), strip
 * whitespace. Heuristique trim split simple : si la colonne `model` contient
 * un espace + un suffixe court (≤ 6 chars) après un mot connu, on garde dans
 * normalizedTrim. La logique fine de catalog matching vit déjà dans
 * `src/lib/estimation/catalogAliases.ts` (V2 reuse).
 */
export function normalizeMakeModel(
  rawMake: string | null,
  rawModel: string | null,
  rawTrim: string | null,
): { make: string; model: string; trim: string | null } {
  const make = titleCase((rawMake ?? "").trim());
  const model = titleCase((rawModel ?? "").trim());
  const trim = (rawTrim ?? "").trim() || null;
  return { make, model, trim };
}

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/(\s+|-)/)
    .map((token) => {
      if (/^\s+$/.test(token) || token === "-") return token;
      if (token.length === 0) return token;
      // Acronymes 2-3 lettres : preserver UPPER (ex "BMW", "VW", "GMC")
      if (token.length <= 3 && /^[A-Z]+$/.test(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Normalise drivetrain → enum DB ('4x2','4x4','awd','rwd','fwd','other').
 */
export function normalizeDrivetrain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase().replace(/\s+/g, "");
  if (v === "4x4" || v.includes("4wd")) return "4x4";
  if (v === "4x2") return "4x2";
  if (v === "awd") return "awd";
  if (v === "rwd" || v.includes("rear")) return "rwd";
  if (v === "fwd" || v.includes("front")) return "fwd";
  return "other";
}

/**
 * Normalise data_confidence → enum DB ('high','medium','low').
 */
export function normalizeDataConfidence(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (v === "high" || v === "medium" || v === "low") return v;
  return null;
}

/**
 * Normalise price_type → enum DB ('asking','firm','negotiable','quote').
 */
export function normalizePriceType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (v === "asking" || v === "firm" || v === "negotiable" || v === "quote") return v;
  return null;
}

/**
 * Boolean parser tolérant : "True"/"true"/"1"/"oui" → true ; "False"/"0"/"non" → false ; sinon null.
 */
export function parseBool(raw: string | null | undefined): boolean | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (v === "" ) return null;
  if (v === "true" || v === "1" || v === "oui" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "non" || v === "no") return false;
  return null;
}

/**
 * Int parser tolérant : strip spaces, return null si pas un int positif.
 */
export function parseIntSafe(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s,]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Math.round(Number(cleaned));
  return Number.isFinite(n) ? n : null;
}

/**
 * Fingerprint déterministe pour dedup (24 chars hex de SHA-256).
 * Bandes mileage par 20k km, prix par 5M Ar — deux annonces ~identiques mais
 * avec un km arrondi différent partagent quand même le fingerprint.
 */
export function computeFingerprint(row: {
  normalizedMake: string;
  normalizedModel: string;
  year: number | null;
  mileageKm: number | null;
  priceMga: number;
  city: string | null;
}): string {
  const mileageBand = row.mileageKm != null
    ? Math.floor(row.mileageKm / 20_000) * 20_000
    : "unknown";
  const priceBand = Math.floor(row.priceMga / 5_000_000) * 5_000_000;
  const key = [
    row.normalizedMake.toLowerCase(),
    row.normalizedModel.toLowerCase(),
    row.year ?? "unknown",
    String(mileageBand),
    String(priceBand),
    (row.city ?? "unknown").toLowerCase(),
  ].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
}

// =============================================================================
// Row normalization
// =============================================================================

/**
 * Transforme une ligne CSV brute (Record<string,string>) en NormalizedRow
 * prête à être insérée. Ne touche pas la DB. Renvoie aussi la liste de
 * suspicions à concat dans extraction_notes.
 */
export function normalizeCsvRow(
  csvRow: RawCsvRow,
  sourceTag: string,
): NormalizedRow {
  const csvListingId = (csvRow.listing_id ?? "").trim() || `unknown-${randomUUID().slice(0, 8)}`;
  const sellerSource = (csvRow.seller_source ?? "").trim() || null;
  const sellerType = (csvRow.seller_type ?? "").trim() || null;
  const { make, model, trim } = normalizeMakeModel(
    csvRow.make,
    csvRow.model,
    csvRow.trim_generation,
  );
  const year = parseIntSafe(csvRow.year);
  const yearValid = year != null && year >= 1950 && year <= new Date().getFullYear() + 1;

  const rawPriceParsed = parseIntSafe(csvRow.price_mga);
  const currency = (csvRow.currency_original ?? "").trim() || null;
  const priceNorm = normalizePrice(rawPriceParsed, currency);

  const priceType = normalizePriceType(csvRow.price_type);
  const negotiable = parseBool(csvRow.negotiable);
  const mileageKm = parseIntSafe(csvRow.mileage_km);
  const fuelType = (csvRow.fuel ?? "").trim() || null;
  const transmission = (csvRow.transmission ?? "").trim() || null;
  const drivetrain = normalizeDrivetrain(csvRow.drivetrain);
  const engineText = (csvRow.engine ?? "").trim() || null;
  const seats = parseIntSafe(csvRow.seats);
  const optionsSummary = (csvRow.options_summary ?? "").trim() || null;
  const conditionNotes = (csvRow.condition_notes ?? "").trim() || null;
  const city = (csvRow.location ?? "").trim() || null;
  const contactHash = hashContact(csvRow.contact);
  const csvIncludeFlag = parseBool(csvRow.include_in_estimation);
  const duplicateGroup = (csvRow.duplicate_group ?? "").trim() || null;
  const dataConfidence = normalizeDataConfidence(csvRow.data_confidence);
  const csvExtractionNotes = (csvRow.extraction_notes ?? "").trim();

  // Suspicion accumulator → drives include_in_estimation gate + extraction_notes
  const suspicions: string[] = [];
  if (priceNorm.suspicion) suspicions.push(priceNorm.suspicion);
  if (!yearValid) suspicions.push("year_invalid_or_missing");
  if (mileageKm == null) suspicions.push("mileage_missing");
  if (!make || !model) suspicions.push("make_or_model_missing");

  // Gate include_in_estimation : si le CSV explicite false, respecter ; sinon
  // calculer en fonction des suspicions critiques
  const hasCriticalSuspicion =
    priceNorm.suspicion === "out_of_band"
    || priceNorm.suspicion === "fmg_conversion_out_of_band"
    || priceNorm.suspicion === "no_price"
    || !make
    || !model;
  let includeInEstimation: boolean;
  if (csvIncludeFlag === false) {
    includeInEstimation = false;
  } else if (hasCriticalSuspicion) {
    includeInEstimation = false;
  } else {
    includeInEstimation = true;
  }

  const noteParts: string[] = [];
  if (csvExtractionNotes) noteParts.push(csvExtractionNotes);
  if (suspicions.length > 0) noteParts.push(`pipeline:${suspicions.join(",")}`);
  const extractionNotes = noteParts.join(" | ");

  const fingerprint = computeFingerprint({
    normalizedMake: make,
    normalizedModel: model,
    year: yearValid ? year : null,
    mileageKm,
    priceMga: priceNorm.price,
    city,
  });

  // Raw payload : toute la row CSV originale, MOINS le contact en clair.
  // contact_hash stocké séparément pour dedup futur (sans PII).
  const rawPayload: Record<string, unknown> = {};
  for (const col of EXPECTED_CSV_COLUMNS) {
    if (col === "contact") continue;
    rawPayload[col] = csvRow[col] ?? null;
  }
  if (contactHash) rawPayload.contact_hash = contactHash;
  rawPayload._pipeline_version = "v1_2026_05_09";

  return {
    csvListingId,
    sourceTag,
    sellerSource,
    sellerType,
    normalizedMake: make,
    normalizedModel: model,
    normalizedTrim: trim,
    year: yearValid ? year : null,
    priceMga: priceNorm.price,
    priceType,
    negotiable,
    mileageKm,
    fuelType,
    transmission,
    drivetrain,
    engineText,
    seats,
    optionsSummary,
    conditionNotes,
    city,
    contactHash,
    includeInEstimation,
    duplicateGroup,
    dataConfidence,
    extractionNotes,
    fingerprint,
    rawPayload,
  };
}

// =============================================================================
// CSV header validation
// =============================================================================

export function validateCsvHeaders(parsed: RawCsvRow[]): { ok: boolean; missing: string[]; extras: string[] } {
  if (parsed.length === 0) return { ok: false, missing: [...EXPECTED_CSV_COLUMNS], extras: [] };
  const headers = Object.keys(parsed[0]);
  const headerSet = new Set(headers.map((h) => h.toLowerCase()));
  const missing = EXPECTED_CSV_COLUMNS.filter((c) => !headerSet.has(c.toLowerCase()));
  const extras = headers.filter((h) => !EXPECTED_CSV_COLUMNS.includes(h.toLowerCase() as typeof EXPECTED_CSV_COLUMNS[number]));
  return { ok: missing.length === 0, missing, extras };
}

// =============================================================================
// Batch chunking helper
// =============================================================================

export function chunk<T>(rows: T[], size: number): T[][] {
  if (size <= 0) return [rows];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size));
  }
  return out;
}

// =============================================================================
// Stats accumulator
// =============================================================================

export function buildIngestionStats(rows: NormalizedRow[]): IngestionStats {
  const stats: IngestionStats = {
    totalParsed: rows.length,
    validCount: 0,
    skippedCount: 0,
    fmgConverted: 0,
    outOfBand: 0,
    duplicateExisting: 0,
    duplicateInBatch: 0,
    includeInEstimationTrue: 0,
    includeInEstimationFalse: 0,
    perDataConfidence: {},
    perMake: {},
    errors: [],
  };
  const seenFingerprints = new Set<string>();
  for (const row of rows) {
    if (row.includeInEstimation) {
      stats.validCount += 1;
      stats.includeInEstimationTrue += 1;
    } else {
      stats.skippedCount += 1;
      stats.includeInEstimationFalse += 1;
    }
    if (row.extractionNotes.includes("fmg_converted")) stats.fmgConverted += 1;
    if (row.extractionNotes.includes("out_of_band")) stats.outOfBand += 1;
    if (seenFingerprints.has(row.fingerprint)) {
      stats.duplicateInBatch += 1;
    } else {
      seenFingerprints.add(row.fingerprint);
    }
    const conf = row.dataConfidence ?? "unknown";
    stats.perDataConfidence[conf] = (stats.perDataConfidence[conf] ?? 0) + 1;
    const make = row.normalizedMake || "unknown";
    stats.perMake[make] = (stats.perMake[make] ?? 0) + 1;
  }
  return stats;
}

// =============================================================================
// Insert payload builders (RGPD-aware)
// =============================================================================

/**
 * Construit le payload destiné à `market_listings_raw.payload` (jsonb).
 * Contient TOUTES les colonnes CSV originales SAUF `contact` (en clear),
 * remplacé par `contact_hash`. La colonne `seller_source` reste car la
 * table raw est admin-only via service_role.
 */
export function buildRawPayload(
  csvRow: RawCsvRow,
  contactHash: string | null,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const col of EXPECTED_CSV_COLUMNS) {
    if (col === "contact") continue;
    payload[col] = csvRow[col] ?? null;
  }
  if (contactHash) payload.contact_hash = contactHash;
  payload._pipeline_version = "v1_2026_05_09";
  return payload;
}

/**
 * Construit la row à INSERT dans `market_listings_clean`.
 *
 * RGPD strict : la colonne `seller_source` (nom réel vendeur) N'EST JAMAIS
 * incluse dans cette row. Elle reste confinée à `market_listings_raw.payload`.
 *
 * Conformément à la migration `20260509120000` (PROMPT 11) qui définit le
 * schéma cible. Champs alignés avec les colonnes existantes + nouvelles.
 *
 * Note : `raw_listing_id` est ajouté par `insertMarketListingsBatch` après
 * INSERT dans raw, pas dans cette fonction (pure).
 */
export function buildCleanInsertPayload(row: NormalizedRow): Record<string, unknown> {
  return {
    source: row.sourceTag,
    source_listing_id: row.csvListingId,
    source_url: `csv://${row.sourceTag}/${row.csvListingId}`,
    // ⚠️ RGPD : seller_source EXCLU. seller_type uniquement (catégorie, pas identité)
    seller_type: row.sellerType,
    normalized_make: row.normalizedMake,
    normalized_model: row.normalizedModel,
    normalized_trim: row.normalizedTrim,
    year: row.year,
    mileage_km: row.mileageKm,
    price_mga: row.priceMga,
    fuel_type: row.fuelType,
    transmission: row.transmission,
    body_style: null, // pas dans le CSV V1, sera normalisé V2
    city: row.city,
    listing_status: "active",
    fingerprint: row.fingerprint,
    // Colonnes ajoutées par migration 20260509120000
    price_type: row.priceType,
    negotiable: row.negotiable,
    drivetrain: row.drivetrain,
    engine_text: row.engineText,
    seats: row.seats,
    options_summary: row.optionsSummary,
    condition_notes: row.conditionNotes,
    include_in_estimation: row.includeInEstimation,
    data_confidence: row.dataConfidence,
    extraction_notes: row.extractionNotes || null,
    duplicate_group: row.duplicateGroup,
  };
}

// =============================================================================
// Supabase client (write mode)
// =============================================================================

/**
 * Crée un client Supabase avec service_role key pour les inserts. Bypasse RLS.
 * Lit les credentials depuis .env.local. JAMAIS commit le service-role key.
 *
 * Le type retour est `unknown` pour éviter une dep circulaire de typing avec
 * `@supabase/supabase-js` côté script Node (les helpers utilisent un duck-type).
 */
export type SupabaseLikeClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => Promise<{
        data: Array<{ fingerprint: string }> | null;
        error: { message: string } | null;
      }>;
    };
    insert: (row: Record<string, unknown> | Array<Record<string, unknown>>) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string; code?: string } | null;
        }>;
      };
    };
  };
};

/**
 * Initialise un client Supabase service-role depuis .env.local.
 * Throws clair si les credentials sont absents.
 *
 * NOTE : la lecture .env.local utilise process.env (déjà loadé par tsx via
 * `--env-file=.env.local` OU par dotenv si appelé en main). Pour éviter
 * d'ajouter une dep `dotenv`, on read manuellement le fichier.
 */
export async function initSupabaseServiceClient(): Promise<SupabaseLikeClient> {
  // Read .env.local manually (no dotenv dep)
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Mode write requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. "
      + "Use --dry-run to skip DB writes.",
    );
  }
  const mod = (await import("@supabase/supabase-js")) as unknown as {
    createClient: (url: string, key: string, opts: unknown) => SupabaseLikeClient;
  };
  return mod.createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// =============================================================================
// Idempotence pre-check : fetch existing fingerprints for sourceTag
// =============================================================================

export async function fetchExistingFingerprints(
  supabase: SupabaseLikeClient,
  sourceTag: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("market_listings_clean")
    .select("fingerprint")
    .eq("source", sourceTag);
  if (error) throw new Error(`fetchExistingFingerprints failed: ${error.message}`);
  const set = new Set<string>();
  (data ?? []).forEach((row) => {
    if (row.fingerprint) set.add(row.fingerprint);
  });
  return set;
}

// =============================================================================
// Insert with retry/backoff
// =============================================================================

const RETRYABLE_CODES = new Set(["503", "PGRST503", "ECONNRESET", "ETIMEDOUT"]);

function shouldRetry(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  if (err.code && RETRYABLE_CODES.has(err.code)) return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("503") || msg.includes("timeout") || msg.includes("service unavailable");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Insert un row avec retry exponential backoff sur erreurs transient (503).
 * Max 3 retries (1s → 2s → 4s).
 *
 * Conflict (UNIQUE fingerprint) → propagé tel quel pour que le caller skip
 * silencieusement (idempotence layer 2 — la layer 1 est le pre-check).
 */
async function insertWithRetry(
  insertFn: () => Promise<{ data: { id: string } | null; error: { message: string; code?: string } | null }>,
  maxRetries = 3,
): Promise<{ data: { id: string } | null; error: { message: string; code?: string } | null }> {
  let lastResult: { data: { id: string } | null; error: { message: string; code?: string } | null } = { data: null, error: { message: "no_attempt" } };
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await insertFn();
    if (!lastResult.error) return lastResult;
    if (!shouldRetry(lastResult.error) || attempt === maxRetries) return lastResult;
    const backoff = 1000 * Math.pow(2, attempt);
    await sleep(backoff);
  }
  return lastResult;
}

// =============================================================================
// Batch ingestion (write mode)
// =============================================================================

export type WriteStats = {
  totalToProcess: number;
  alreadyInDb: number;
  newlyInserted: number;
  skippedNotIncluded: number;
  errors: Array<{ csvListingId: string; reason: string }>;
};

export async function insertMarketListingsBatch(
  supabase: SupabaseLikeClient,
  rows: NormalizedRow[],
  options: { force: boolean },
): Promise<WriteStats> {
  const stats: WriteStats = {
    totalToProcess: rows.length,
    alreadyInDb: 0,
    newlyInserted: 0,
    skippedNotIncluded: 0,
    errors: [],
  };

  // Idempotence pre-check (layer 1) : fetch fingerprints existants
  const existingFingerprints = options.force
    ? new Set<string>()
    : await fetchExistingFingerprints(supabase, rows[0]?.sourceTag ?? "csv_seed_v1_2026");

  for (const row of rows) {
    if (!row.includeInEstimation) {
      // On insère quand même (audit trail), mais le compteur est tenu séparé
      stats.skippedNotIncluded += 1;
    }
    if (existingFingerprints.has(row.fingerprint)) {
      stats.alreadyInDb += 1;
      continue;
    }

    // 1. INSERT raw — réutilise row.rawPayload déjà construit dans normalizeCsvRow
    //    (qui a déjà strippé contact en clear et ajouté contact_hash).
    const rawInsert = await insertWithRetry(async () => {
      const res = await supabase
        .from("market_listings_raw")
        .insert({
          source: row.sourceTag,
          source_listing_id: row.csvListingId,
          source_url: `csv://${row.sourceTag}/${row.csvListingId}`,
          payload: row.rawPayload,
          scraped_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      return res;
    });

    if (rawInsert.error || !rawInsert.data?.id) {
      stats.errors.push({
        csvListingId: row.csvListingId,
        reason: `raw_insert_failed: ${rawInsert.error?.message ?? "no_id"}`,
      });
      continue;
    }

    // 2. INSERT clean (RGPD : sans seller_source)
    const cleanRow = buildCleanInsertPayload(row);
    cleanRow.raw_listing_id = rawInsert.data.id;

    const cleanInsert = await insertWithRetry(async () => {
      const res = await supabase
        .from("market_listings_clean")
        .insert(cleanRow)
        .select("id")
        .single();
      return res;
    });

    if (cleanInsert.error) {
      const msg = cleanInsert.error.message ?? "";
      const code = cleanInsert.error.code ?? "";
      // Conflict UNIQUE fingerprint → skip silencieux (idempotence layer 2)
      if (msg.toLowerCase().includes("duplicate") || code === "23505") {
        stats.alreadyInDb += 1;
        continue;
      }
      stats.errors.push({
        csvListingId: row.csvListingId,
        reason: `clean_insert_failed: ${msg.slice(0, 200)}`,
      });
      continue;
    }

    stats.newlyInserted += 1;
    existingFingerprints.add(row.fingerprint);
  }

  return stats;
}

// =============================================================================
// CLI orchestrator
// =============================================================================

type CliOptions = {
  csvPath: string;
  dryRun: boolean;
  sourceTag: string;
  batchSize: number;
  reuseEnv: boolean;
  force: boolean;
};

function parseArgv(argv: string[]): CliOptions {
  // Default safe : dry-run = true ; require explicit --dry-run=false to write
  const opts: CliOptions = {
    csvPath: "data/seed/market_listings_v1_2026.csv",
    dryRun: true,
    sourceTag: "csv_seed_v1_2026",
    batchSize: 50,
    reuseEnv: false,
    force: false,
  };

  // Supports both `--key value` and `--key=value`
  function readArg(arg: string, idx: number): { key: string; value: string | null; consumed: number } {
    if (arg.includes("=")) {
      const eq = arg.indexOf("=");
      return { key: arg.slice(0, eq), value: arg.slice(eq + 1), consumed: 1 };
    }
    return { key: arg, value: argv[idx + 1] ?? null, consumed: 2 };
  }
  function asBool(v: string | null, fallback: boolean): boolean {
    if (v == null) return fallback;
    return v.toLowerCase() !== "false" && v !== "0";
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    if (a === "--dry-run") {
      // Bare toggle = true ; --dry-run=false = false
      opts.dryRun = true;
      continue;
    }
    const r = readArg(a, i);
    switch (r.key) {
      case "--csv":
      case "--in":
        if (r.value) opts.csvPath = r.value;
        if (r.consumed === 2) i++;
        break;
      case "--dry-run":
        opts.dryRun = asBool(r.value, true);
        if (r.consumed === 2 && r.value && (r.value === "true" || r.value === "false")) i++;
        break;
      case "--source":
      case "--source-tag":
        if (r.value) opts.sourceTag = r.value;
        if (r.consumed === 2) i++;
        break;
      case "--batch-size":
        if (r.value) opts.batchSize = Math.max(1, parseInt(r.value, 10) || 50);
        if (r.consumed === 2) i++;
        break;
      case "--reuse-supabase-env":
        opts.reuseEnv = asBool(r.value, true);
        if (r.consumed === 2 && r.value && (r.value === "true" || r.value === "false")) i++;
        break;
      case "--force":
        opts.force = asBool(r.value, true);
        if (r.consumed === 2 && r.value && (r.value === "true" || r.value === "false")) i++;
        break;
    }
  }
  return opts;
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

async function main(): Promise<number> {
  const opts = parseArgv(process.argv.slice(2));
  const csvPath = resolve(process.cwd(), opts.csvPath);

  if (!existsSync(csvPath)) {
    console.error(`[ingest] CSV introuvable : ${csvPath}`);
    console.error(`[ingest] Le fichier doit être déposé manuellement par Ali.`);
    return 2;
  }

  const raw = stripBom(readFileSync(csvPath, "utf8"));
  const parsed = parseCsv(raw);

  const headerCheck = validateCsvHeaders(parsed);
  if (!headerCheck.ok) {
    console.error(`[ingest] CSV header invalide. Colonnes manquantes : ${headerCheck.missing.join(", ")}`);
    return 3;
  }
  if (headerCheck.extras.length > 0) {
    console.warn(`[ingest] Colonnes extras ignorées : ${headerCheck.extras.join(", ")}`);
  }

  const normalized = parsed.map((r) => normalizeCsvRow(r, opts.sourceTag));
  const stats = buildIngestionStats(normalized);

  console.log("\n[ingest] === Statistics ===");
  console.log(`[ingest] Total CSV rows parsed     : ${stats.totalParsed}`);
  console.log(`[ingest] include_in_estimation=true : ${stats.includeInEstimationTrue}`);
  console.log(`[ingest] include_in_estimation=false: ${stats.includeInEstimationFalse}`);
  console.log(`[ingest] FMG converted              : ${stats.fmgConverted}`);
  console.log(`[ingest] Price out_of_band          : ${stats.outOfBand}`);
  console.log(`[ingest] Duplicates within batch    : ${stats.duplicateInBatch}`);
  console.log(`[ingest] data_confidence breakdown  : ${JSON.stringify(stats.perDataConfidence)}`);
  console.log(`[ingest] Top 10 makes               :`);
  Object.entries(stats.perMake)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([m, n]) => console.log(`  - ${m}: ${n}`));

  // Visual RGPD check : sample first cleanPayload, confirm seller_source absent
  if (normalized.length > 0) {
    const sampleClean = buildCleanInsertPayload(normalized[0]);
    const cleanKeys = Object.keys(sampleClean);
    const hasSellerSource = cleanKeys.includes("seller_source");
    console.log(`\n[ingest] Sample cleanPayload keys (first row) : ${cleanKeys.length} keys`);
    console.log(`[ingest] RGPD : seller_source present in clean ? ${hasSellerSource ? "❌ YES (BUG)" : "✅ NO (OK)"}`);
  }

  if (opts.dryRun) {
    console.log(`\n[ingest] --dry-run : aucune écriture DB. Sortie OK.`);
    return 0;
  }

  // ─── Mode write effectif (PROMPT 11.b) ─────────────────────────────────
  console.log(`\n[ingest] === Mode WRITE ===`);
  console.log(`[ingest] Init Supabase service-role client...`);
  let supabase: SupabaseLikeClient;
  try {
    supabase = await initSupabaseServiceClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ingest] ${msg}`);
    return 4;
  }

  const startMs = Date.now();
  const batches = chunk(normalized, opts.batchSize);
  console.log(`[ingest] Batches préparés : ${batches.length} (taille ${opts.batchSize})`);

  const aggregated: WriteStats = {
    totalToProcess: 0,
    alreadyInDb: 0,
    newlyInserted: 0,
    skippedNotIncluded: 0,
    errors: [],
  };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchStart = Date.now();
    const batchStats = await insertMarketListingsBatch(supabase, batch, { force: opts.force });
    const batchDur = Date.now() - batchStart;
    aggregated.totalToProcess += batchStats.totalToProcess;
    aggregated.alreadyInDb += batchStats.alreadyInDb;
    aggregated.newlyInserted += batchStats.newlyInserted;
    aggregated.skippedNotIncluded += batchStats.skippedNotIncluded;
    aggregated.errors.push(...batchStats.errors);
    console.log(
      `[ingest] Batch ${i + 1}/${batches.length} : `
      + `${batchStats.newlyInserted} inserted, `
      + `${batchStats.alreadyInDb} skipped (already in DB), `
      + `${batchStats.errors.length} errors `
      + `in ${(batchDur / 1000).toFixed(1)}s`,
    );
  }

  const totalDur = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`\n[ingest] === Ingestion mode WRITE complete ===`);
  console.log(`[ingest] Total CSV rows                : ${aggregated.totalToProcess}`);
  console.log(`[ingest] Already in DB (skipped)        : ${aggregated.alreadyInDb}`);
  console.log(`[ingest] Newly inserted (raw + clean)   : ${aggregated.newlyInserted}`);
  console.log(`[ingest] include_in_estimation=false    : ${aggregated.skippedNotIncluded}`);
  console.log(`[ingest] Errors                         : ${aggregated.errors.length}`);
  console.log(`[ingest] Duration                       : ${totalDur}s`);

  if (aggregated.errors.length > 0) {
    console.log(`\n[ingest] Erreurs détaillées :`);
    aggregated.errors.slice(0, 10).forEach((e) => {
      console.log(`  - ${e.csvListingId}: ${e.reason}`);
    });
    if (aggregated.errors.length > 10) {
      console.log(`  ... et ${aggregated.errors.length - 10} autres`);
    }
  }

  console.log(`\n[ingest] Validation : runner les queries de`);
  console.log(`         scripts/data/validate-market-listings-ingestion.sql`);
  console.log(`         dans Supabase SQL Editor.`);

  return aggregated.errors.length > 0 ? 5 : 0;
}

// Run only when invoked directly (pas en import depuis tests)
const isDirectRun = (() => {
  if (typeof process === "undefined" || !process.argv?.[1]) return false;
  try {
    // import.meta.url n'est pas dispo en CJS, on tombe sur le check argv
    return process.argv[1].endsWith("ingest-market-listings-csv.ts")
      || process.argv[1].endsWith("ingest-market-listings-csv.js");
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error("[ingest] Erreur fatale :", err);
      process.exit(1);
    });
}
