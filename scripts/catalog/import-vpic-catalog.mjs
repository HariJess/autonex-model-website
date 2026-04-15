import { createClient } from "@supabase/supabase-js";
import { MADAGASCAR_MODEL_ALIASES, normalizeCatalogName, slugify, titleCasePreserveAcronyms } from "./catalog-utils.mjs";
import { loadLocalEnv } from "./load-env.mjs";
import fs from "node:fs";
import path from "node:path";

loadLocalEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const REPORT_DIR = path.resolve(process.cwd(), "scripts/catalog/reports");
const REPORT_PATH = path.join(REPORT_DIR, "vpic-import-last.json");
const PROGRESS_PATH = path.join(REPORT_DIR, "vpic-import-progress.json");
const MAX_FETCH_RETRIES = 4;
const MAX_DB_RETRIES = 3;
const RESUME = process.env.CATALOG_RESUME !== "0";
const MAX_MAKES = Number(process.env.CATALOG_MAX_MAKES ?? "5000");
const FETCH_CONCURRENCY = Number(process.env.CATALOG_FETCH_CONCURRENCY ?? "10");
const MAKE_UPSERT_CHUNK_SIZE = Number(process.env.CATALOG_MAKE_CHUNK_SIZE ?? "120");
const MODEL_UPSERT_CHUNK_SIZE = Number(process.env.CATALOG_MODEL_CHUNK_SIZE ?? "500");
const QUICK_TEST = process.env.CATALOG_QUICK_TEST === "1";

const QUICK_TEST_MAKES = [
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
  "honda",
  "subaru",
  "volkswagen",
  "isuzu",
  "land rover",
  "chevrolet",
  "audi",
  "lexus",
];

const NON_PASSENGER_KEYWORDS = [
  "trailer",
  "trailers",
  "motorcycle",
  "moped",
  "scooter",
  "atv",
  "snowmobile",
  "boat",
  "marine",
  "rv ",
  "recreational vehicle",
  "bus",
  "school bus",
  "incomplete",
  "off-road",
  "off road",
  "forklift",
  "fire apparatus",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readProgress() {
  try {
    if (!fs.existsSync(PROGRESS_PATH)) return null;
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeProgress(progress) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf8");
}

function shouldSkipEntry(makeName, modelName = "") {
  const haystack = `${makeName} ${modelName}`.toLowerCase();
  return NON_PASSENGER_KEYWORDS.some((kw) => haystack.includes(kw));
}

async function fetchJson(url, context) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_FETCH_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn("[vpic-import] non-200 response", {
          context,
          url,
          status: res.status,
          attempt,
          bodyPreview: body.slice(0, 240),
        });
        if (res.status >= 500 && attempt < MAX_FETCH_RETRIES) {
          await sleep(300 * attempt);
          continue;
        }
        throw new Error(`Fetch failed ${res.status} for ${url}`);
      }
      return await res.json();
    } catch (error) {
      lastError = error;
      console.warn("[vpic-import] fetch exception", {
        context,
        url,
        attempt,
        message: error instanceof Error ? error.message : String(error),
      });
      if (attempt < MAX_FETCH_RETRIES) {
        await sleep(300 * attempt);
      }
    }
  }
  throw lastError ?? new Error(`Fetch failed for ${url}`);
}

async function upsertWithRetry(table, payload, onConflict, context, selectColumns = null) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt += 1) {
    try {
      let query = supabase.from(table).upsert(payload, { onConflict });
      if (selectColumns) query = query.select(selectColumns).single();
      const { data, error } = await query;
      if (!error) return { data, error: null };
      lastError = error;
      console.warn("[vpic-import] db upsert error", {
        table,
        context,
        attempt,
        code: error.code ?? null,
        message: error.message,
        details: error.details ?? null,
      });
      if (attempt < MAX_DB_RETRIES) {
        await sleep(350 * attempt);
      }
    } catch (error) {
      lastError = error;
      console.warn("[vpic-import] db upsert exception", {
        table,
        context,
        attempt,
        message: error instanceof Error ? error.message : String(error),
      });
      if (attempt < MAX_DB_RETRIES) {
        await sleep(350 * attempt);
      }
    }
  }
  return {
    data: null,
    error: lastError instanceof Error ? lastError : new Error(String(lastError)),
  };
}

async function upsertMake(make) {
  const displayName = titleCasePreserveAcronyms(make.Make_Name);
  if (!displayName) {
    return { data: null, error: new Error("Empty make name") };
  }
  const payload = {
    external_source: "vpic",
    external_make_id: String(make.Make_ID),
    name: displayName,
    normalized_name: normalizeCatalogName(make.Make_Name),
    slug: slugify(make.Make_Name),
    is_active: true,
  };
  return await upsertWithRetry("vehicle_catalog_makes", payload, "normalized_name", `make:${displayName}`, "id,name");
}

async function upsertModel(makeId, model, makeName) {
  const displayName = titleCasePreserveAcronyms(model.Model_Name);
  if (!displayName) {
    return { error: new Error("Empty model name"), skipped: true };
  }
  const payload = {
    make_id: makeId,
    external_source: "vpic",
    external_model_id: String(model.Model_ID),
    name: displayName,
    normalized_name: normalizeCatalogName(displayName),
    slug: slugify(displayName),
    is_active: true,
  };
  const result = await upsertWithRetry(
    "vehicle_catalog_models",
    payload,
    "make_id,normalized_name",
    `make:${makeName}|model:${displayName}`,
  );
  return { error: result.error, skipped: false };
}

async function upsertManyWithRetry(table, rows, onConflict, context) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt += 1) {
    try {
      const { error } = await supabase.from(table).upsert(rows, { onConflict });
      if (!error) return { error: null };
      lastError = error;
      console.warn("[vpic-import] db bulk upsert error", {
        table,
        context,
        attempt,
        code: error.code ?? null,
        message: error.message,
      });
      if (attempt < MAX_DB_RETRIES) await sleep(220 * attempt);
    } catch (error) {
      lastError = error;
      console.warn("[vpic-import] db bulk upsert exception", {
        table,
        context,
        attempt,
        message: error instanceof Error ? error.message : String(error),
      });
      if (attempt < MAX_DB_RETRIES) await sleep(220 * attempt);
    }
  }
  return { error: lastError instanceof Error ? lastError : new Error(String(lastError)) };
}

async function fetchModelsForMake(make) {
  const makeDisplayName = titleCasePreserveAcronyms(make.Make_Name);
  const makeId = String(make.Make_ID);
  const modelsRes = await fetchJson(
    `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/${makeId}?format=json`,
    `GetModelsForMakeId:${makeId}:${makeDisplayName}`,
  );
  return { makeId, makeDisplayName, models: modelsRes.Results ?? [] };
}

async function runConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) break;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function upsertAliases() {
  const { data: makes, error: makesError } = await supabase
    .from("vehicle_catalog_makes")
    .select("id, normalized_name");
  if (makesError) throw makesError;
  const makeByNorm = new Map((makes ?? []).map((m) => [m.normalized_name, m.id]));

  for (const alias of MADAGASCAR_MODEL_ALIASES) {
    const makeId = makeByNorm.get(normalizeCatalogName(alias.make));
    if (!makeId) continue;
    const { data: model, error: modelError } = await supabase
      .from("vehicle_catalog_models")
      .select("id,name")
      .eq("make_id", makeId)
      .eq("normalized_name", normalizeCatalogName(alias.canonicalModel))
      .maybeSingle();
    if (modelError || !model) continue;
    await supabase.from("vehicle_catalog_aliases").upsert(
      {
        entity_type: "model",
        canonical_id: model.id,
        alias: alias.alias,
        alias_normalized: normalizeCatalogName(alias.alias),
        source: "manual_mg",
      },
      { onConflict: "entity_type,alias_normalized" },
    );
  }
}

async function main() {
  const summary = {
    startedAt: new Date().toISOString(),
    importedMakes: 0,
    importedModels: 0,
    skippedMakes: 0,
    skippedModels: 0,
    failedMakes: [],
    failedModels: [],
  };
  const runProgress = {
    startedAt: summary.startedAt,
    currentIndex: -1,
    totalMakes: 0,
    currentMakeId: null,
    currentMakeName: null,
    lastCompletedIndex: -1,
    lastCompletedMakeId: null,
    lastCompletedMakeName: null,
    importedMakes: 0,
    importedModels: 0,
    skippedMakes: 0,
    skippedModels: 0,
    failedMakes: 0,
    failedModels: 0,
    status: "running",
  };

  const makesRes = await fetchJson("https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json", "GetAllMakes");
  let makes = (makesRes.Results ?? [])
    .filter((m) => m?.Make_ID != null && String(m?.Make_Name ?? "").trim().length > 0)
    .filter((m) => !shouldSkipEntry(titleCasePreserveAcronyms(m.Make_Name)))
    .filter((m) => {
      if (!QUICK_TEST) return true;
      const normalized = normalizeCatalogName(m.Make_Name).replace(/\s+/g, " ");
      return QUICK_TEST_MAKES.some((target) => normalized === target || normalized.includes(target));
    })
    .sort((a, b) => Number(a.Make_ID) - Number(b.Make_ID))
    .slice(0, MAX_MAKES);
  if (QUICK_TEST) {
    // Keep unique normalized make names in quick mode.
    const seen = new Set();
    makes = makes.filter((m) => {
      const key = normalizeCatalogName(m.Make_Name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  runProgress.totalMakes = makes.length;

  const existingProgress = RESUME ? readProgress() : null;
  let startIndex = 0;
  if (existingProgress && existingProgress.status !== "completed") {
    const resumeIdx = Number(existingProgress.lastCompletedIndex ?? -1);
    if (Number.isFinite(resumeIdx) && resumeIdx >= -1 && resumeIdx < makes.length) {
      startIndex = Math.max(0, resumeIdx + 1);
      console.log(
        `[vpic-import] resume enabled from index ${startIndex}/${makes.length} (after make ${existingProgress.lastCompletedMakeName ?? "unknown"})`,
      );
    }
  }
  writeProgress(runProgress);

  for (let chunkStart = startIndex; chunkStart < makes.length; chunkStart += MAKE_UPSERT_CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + MAKE_UPSERT_CHUNK_SIZE, makes.length);
    const makeChunk = makes.slice(chunkStart, chunkEnd);
    const makeRows = [];
    for (let i = 0; i < makeChunk.length; i += 1) {
      const make = makeChunk[i];
      const makeDisplayName = titleCasePreserveAcronyms(make.Make_Name);
      runProgress.currentIndex = chunkStart + i;
      runProgress.currentMakeId = String(make.Make_ID);
      runProgress.currentMakeName = makeDisplayName;
      if ((chunkStart + i) % 25 === 0) {
        console.log(
          `[vpic-import] progress make ${chunkStart + i + 1}/${makes.length}: ${makeDisplayName} | importedModels=${summary.importedModels} skipped=${summary.skippedModels} failed=${summary.failedModels.length}`,
        );
      }
      makeRows.push({
        external_source: "vpic",
        external_make_id: String(make.Make_ID),
        name: makeDisplayName,
        normalized_name: normalizeCatalogName(make.Make_Name),
        slug: slugify(make.Make_Name),
        is_active: true,
      });
    }
    writeProgress(runProgress);
    const makeUpsert = await upsertManyWithRetry(
      "vehicle_catalog_makes",
      makeRows,
      "normalized_name",
      `make-chunk:${chunkStart}-${chunkEnd - 1}`,
    );
    if (makeUpsert.error) {
      for (const make of makeChunk) {
        summary.failedMakes.push({
          makeId: String(make.Make_ID),
          makeName: titleCasePreserveAcronyms(make.Make_Name),
          error: makeUpsert.error.message,
        });
      }
      runProgress.failedMakes = summary.failedMakes.length;
      continue;
    }
    summary.importedMakes += makeChunk.length;
    runProgress.importedMakes = summary.importedMakes;

    const normalizedNames = makeChunk.map((m) => normalizeCatalogName(m.Make_Name));
    const { data: makeMapRows, error: makeMapErr } = await supabase
      .from("vehicle_catalog_makes")
      .select("id,normalized_name,name")
      .in("normalized_name", normalizedNames);
    if (makeMapErr) {
      for (const make of makeChunk) {
        summary.failedMakes.push({
          makeId: String(make.Make_ID),
          makeName: titleCasePreserveAcronyms(make.Make_Name),
          error: makeMapErr.message,
        });
      }
      runProgress.failedMakes = summary.failedMakes.length;
      continue;
    }
    const makeDbByNorm = new Map((makeMapRows ?? []).map((m) => [m.normalized_name, m]));

    const fetchResults = await runConcurrent(makeChunk, FETCH_CONCURRENCY, async (make) => {
      try {
        return { ok: true, value: await fetchModelsForMake(make) };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          makeId: String(make.Make_ID),
          makeName: titleCasePreserveAcronyms(make.Make_Name),
        };
      }
    });

    const modelRows = [];
    for (const result of fetchResults) {
      if (!result.ok) {
        summary.failedMakes.push({
          makeId: result.makeId,
          makeName: result.makeName,
          error: result.error,
        });
        runProgress.failedMakes = summary.failedMakes.length;
        continue;
      }
      const fetched = result.value;
      const makeNorm = normalizeCatalogName(fetched.makeDisplayName);
      const dbMake = makeDbByNorm.get(makeNorm);
      if (!dbMake) {
        summary.failedMakes.push({
          makeId: fetched.makeId,
          makeName: fetched.makeDisplayName,
          error: "make-id-map-missing-after-upsert",
        });
        runProgress.failedMakes = summary.failedMakes.length;
        continue;
      }
      for (const model of fetched.models) {
        const modelDisplayName = titleCasePreserveAcronyms(model.Model_Name);
        if (!modelDisplayName || shouldSkipEntry(fetched.makeDisplayName, modelDisplayName)) {
          summary.skippedModels += 1;
          runProgress.skippedModels = summary.skippedModels;
          continue;
        }
        modelRows.push({
          make_id: dbMake.id,
          external_source: "vpic",
          external_model_id: String(model.Model_ID),
          name: modelDisplayName,
          normalized_name: normalizeCatalogName(modelDisplayName),
          slug: slugify(modelDisplayName),
          is_active: true,
        });
      }
    }

    for (let i = 0; i < modelRows.length; i += MODEL_UPSERT_CHUNK_SIZE) {
      const modelChunk = modelRows.slice(i, i + MODEL_UPSERT_CHUNK_SIZE);
      const upsertModels = await upsertManyWithRetry(
        "vehicle_catalog_models",
        modelChunk,
        "make_id,normalized_name",
        `model-chunk:${chunkStart}-${chunkEnd - 1}:${i}-${i + modelChunk.length - 1}`,
      );
      if (upsertModels.error) {
        summary.failedModels.push({
          makeName: "bulk",
          modelName: `${modelChunk.length} rows`,
          error: upsertModels.error.message,
        });
        runProgress.failedModels = summary.failedModels.length;
        continue;
      }
      summary.importedModels += modelChunk.length;
      runProgress.importedModels = summary.importedModels;
    }

    runProgress.lastCompletedIndex = chunkEnd - 1;
    runProgress.lastCompletedMakeId = String(makeChunk[makeChunk.length - 1].Make_ID);
    runProgress.lastCompletedMakeName = titleCasePreserveAcronyms(makeChunk[makeChunk.length - 1].Make_Name);
    writeProgress(runProgress);
  }

  try {
    await upsertAliases();
  } catch (error) {
    console.warn("[vpic-import] alias upsert warning", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  summary.finishedAt = new Date().toISOString();
  summary.failedMakesCount = summary.failedMakes.length;
  summary.failedModelsCount = summary.failedModels.length;
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), "utf8");
  runProgress.status = "completed";
  runProgress.finishedAt = summary.finishedAt;
  runProgress.failedMakes = summary.failedMakesCount;
  runProgress.failedModels = summary.failedModelsCount;
  writeProgress(runProgress);

  console.log(
    JSON.stringify(
      {
        importedMakes: summary.importedMakes,
        importedModels: summary.importedModels,
        skippedMakes: summary.skippedMakes,
        skippedModels: summary.skippedModels,
        failedMakes: summary.failedMakesCount,
        failedModels: summary.failedModelsCount,
        reportPath: REPORT_PATH,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
