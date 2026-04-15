import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env.mjs";
import { normalizeCatalogName } from "./catalog-utils.mjs";
import fs from "node:fs";
import path from "node:path";

loadLocalEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TARGET_MAKES = [
  "mazda",
  "toyota",
  "bmw",
  "nissan",
  "suzuki",
  "hyundai",
  "kia",
  "mercedes-benz",
  "ford",
  "peugeot",
  "renault",
  "mitsubishi",
];

const GENERIC_MODEL_BLACKLIST = new Set([
  "cargo van",
  "van",
  "truck",
  "pickup",
  "pick-up",
  "sedan",
  "wagon",
  "coupe",
  "convertible",
  "hatchback",
  "suv",
]);

const BRAND_SPECIFIC_BLACKLIST = new Map([
  ["mazda", new Set(["glc", "gla", "gls", "gle", "cla"])],
]);

const REPORT_DIR = path.resolve(process.cwd(), "scripts/catalog/reports");
const REPORT_PATH = path.join(REPORT_DIR, "catalog-quality-clean-last.json");

function toTitleWord(word) {
  if (!word) return word;
  if (/^\d+$/.test(word)) return word;
  if (/^[a-z]{1,3}\d+$/i.test(word)) return word.toUpperCase();
  if (/^[a-z]{1,3}$/.test(word)) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

const UPPER_TOKENS = new Set([
  "gs",
  "gt",
  "st",
  "rt",
  "rs",
  "rr",
  "xr",
  "cs",
  "ls",
  "xl",
  "mpv",
  "suv",
  "ev",
  "phev",
  "amg",
  "slr",
  "ce",
  "xm",
  "gr",
  "fj",
  "hr",
  "rav4",
  "cx",
  "mx",
  "rx",
  "glc",
  "gle",
  "gla",
  "gls",
]);

function transformToken(token) {
  if (!token) return token;
  const lower = token.toLowerCase();
  if (UPPER_TOKENS.has(lower)) return lower.toUpperCase();
  if (/^\d+[a-z]$/i.test(token)) return `${token.slice(0, -1)}${token.slice(-1).toUpperCase()}`;
  if (/^[a-z]\d+$/i.test(token)) return `${token.charAt(0).toUpperCase()}${token.slice(1)}`;
  if (/^[a-z]{1,4}-class$/i.test(token)) {
    const [head] = token.split("-");
    const prettyHead = UPPER_TOKENS.has(head.toLowerCase()) ? head.toUpperCase() : toTitleWord(head);
    return `${prettyHead}-Class`;
  }
  if (/^[a-z]{1,3}$/i.test(token) && token === token.toUpperCase()) return token;
  return toTitleWord(token);
}

function canonicalDisplayName(rawName, normalizedName) {
  const source = String(rawName ?? "").trim();
  const normalized = String(normalizedName ?? "").trim();
  if (!source) return source;

  // Normalize spacing first.
  const compact = source.replace(/\s+/g, " ").trim();

  if (normalized === "4runner") return "4Runner";
  if (normalized === "gr86") return "GR86";
  if (normalized === "mr2") return "MR2";
  if (normalized.startsWith("cx-")) return compact.replace(/^cx-/i, "CX-");
  if (normalized.startsWith("mx-")) return compact.replace(/^mx-/i, "MX-");
  if (normalized.startsWith("rx-")) return compact.replace(/^rx-/i, "RX-");
  if (normalized === "mpv") return "MPV";

  // Preserve separators while normalizing token casing.
  return compact
    .split(/([\/\-\s]+)/)
    .map((part) => {
      if (/^[\/\-\s]+$/.test(part)) return part;
      return transformToken(part);
    })
    .join("");
}

async function main() {
  const { data: makes, error: makesError } = await supabase
    .from("vehicle_catalog_makes")
    .select("id,name,normalized_name")
    .in("normalized_name", TARGET_MAKES);
  if (makesError) throw makesError;

  const makeIdByNorm = new Map((makes ?? []).map((m) => [m.normalized_name, m.id]));
  const makeNormById = new Map((makes ?? []).map((m) => [m.id, m.normalized_name]));
  const targetMakeIds = Array.from(makeIdByNorm.values());
  if (targetMakeIds.length === 0) {
    throw new Error("No target makes found in vehicle_catalog_makes.");
  }

  const { data: models, error: modelsError } = await supabase
    .from("vehicle_catalog_models")
    .select("id,make_id,name,normalized_name,is_active")
    .in("make_id", targetMakeIds);
  if (modelsError) throw modelsError;

  const deactivateIds = [];
  const renameRows = [];
  const deactivatedPreview = [];
  const renamedPreview = [];

  for (const model of models ?? []) {
    const makeNorm = makeNormById.get(model.make_id);
    if (!makeNorm) continue;
    const norm = normalizeCatalogName(model.normalized_name || model.name);
    const byBrand = BRAND_SPECIFIC_BLACKLIST.get(makeNorm);
    const shouldDeactivate = GENERIC_MODEL_BLACKLIST.has(norm) || Boolean(byBrand?.has(norm));
    if (shouldDeactivate) {
      deactivateIds.push(model.id);
      if (deactivatedPreview.length < 80) {
        deactivatedPreview.push({ make: makeNorm, name: model.name, normalized_name: model.normalized_name });
      }
      continue;
    }

    const nextName = canonicalDisplayName(model.name, model.normalized_name);
    if (nextName && nextName !== model.name) {
      renameRows.push({ id: model.id, name: nextName });
      if (renamedPreview.length < 120) {
        renamedPreview.push({ make: makeNorm, from: model.name, to: nextName });
      }
    }
  }

  if (deactivateIds.length > 0) {
    const { error } = await supabase
      .from("vehicle_catalog_models")
      .update({ is_active: false })
      .in("id", deactivateIds);
    if (error) throw error;
  }

  // Safe targeted updates to avoid partial-row upsert inserts.
  for (const row of renameRows) {
    const { error } = await supabase
      .from("vehicle_catalog_models")
      .update({ name: row.name })
      .eq("id", row.id);
    if (error) throw error;
  }

  const report = {
    cleanedAt: new Date().toISOString(),
    targetMakes: TARGET_MAKES,
    deactivatedCount: deactivateIds.length,
    renamedCount: renameRows.length,
    deactivatedPreview,
    renamedPreview,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ...report, reportPath: REPORT_PATH }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
