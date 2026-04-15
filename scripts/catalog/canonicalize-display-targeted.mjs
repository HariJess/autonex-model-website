import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env.mjs";

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

function transformDisplay(name, normalized, makeNorm) {
  let next = String(name ?? "").trim();
  const norm = String(normalized ?? "").trim();
  if (!next) return next;

  if (norm === "1m" && makeNorm === "bmw") next = "1M";
  if (norm === "4runner" && makeNorm === "toyota") next = "4Runner";
  if (norm === "c-hr" && makeNorm === "toyota") next = "C-HR";
  if (norm === "gr86" && makeNorm === "toyota") next = "GR86";
  if (norm === "gr corolla" && makeNorm === "toyota") next = "GR Corolla";

  if (norm.startsWith("cx-")) next = next.replace(/^cx-/i, "CX-");
  if (norm.startsWith("mx-")) next = next.replace(/^mx-/i, "MX-");
  if (norm.startsWith("rx-")) next = next.replace(/^rx-/i, "RX-");
  if (norm === "mpv") next = "MPV";

  // Mercedes class style and AMG tokens
  if (makeNorm === "mercedes-benz") {
    next = next.replace(/\b([A-Za-z]{1,4})-class\b/gi, (_, p1) => `${p1.toUpperCase()}-Class`);
    next = next.replace(/\bamg\b/gi, "AMG");
    next = next.replace(/\bsuv\b/gi, "SUV");
    next = next.replace(/\beqe\b/gi, "EQE");
    next = next.replace(/\beqs\b/gi, "EQS");
    next = next.replace(/\beqb\b/gi, "EQB");
    next = next.replace(/\beqc\b/gi, "EQC");
    next = next.replace(/\bglc\b/gi, "GLC");
    next = next.replace(/\bgle\b/gi, "GLE");
    next = next.replace(/\bgla\b/gi, "GLA");
    next = next.replace(/\bgls\b/gi, "GLS");
    next = next.replace(/\bslr\b/gi, "SLR");
  }

  return next;
}

async function main() {
  const { data: makes, error: makesErr } = await supabase
    .from("vehicle_catalog_makes")
    .select("id,normalized_name")
    .in("normalized_name", TARGET_MAKES);
  if (makesErr) throw makesErr;
  const makeNormById = new Map((makes ?? []).map((m) => [m.id, m.normalized_name]));
  const makeIds = Array.from(makeNormById.keys());
  if (makeIds.length === 0) throw new Error("No target makes found");

  const { data: models, error: modelsErr } = await supabase
    .from("vehicle_catalog_models")
    .select("id,make_id,name,normalized_name")
    .in("make_id", makeIds)
    .eq("is_active", true);
  if (modelsErr) throw modelsErr;

  let updated = 0;
  const preview = [];
  for (const model of models ?? []) {
    const makeNorm = makeNormById.get(model.make_id);
    if (!makeNorm) continue;
    const next = transformDisplay(model.name, model.normalized_name, makeNorm);
    if (!next || next === model.name) continue;
    const { error } = await supabase.from("vehicle_catalog_models").update({ name: next }).eq("id", model.id);
    if (error) throw error;
    updated += 1;
    if (preview.length < 120) {
      preview.push({ make: makeNorm, from: model.name, to: next });
    }
  }

  console.log(JSON.stringify({ updated, preview }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
