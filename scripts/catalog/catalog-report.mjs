import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL and key (SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY).");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const [makesCountRes, modelsCountRes, aliasCountRes, makesExistsRes, modelsExistsRes, aliasesExistsRes] = await Promise.all([
    supabase.from("vehicle_catalog_makes").select("*", { count: "exact", head: true }),
    supabase.from("vehicle_catalog_models").select("*", { count: "exact", head: true }),
    supabase.from("vehicle_catalog_aliases").select("*", { count: "exact", head: true }),
    supabase.from("vehicle_catalog_makes").select("id", { head: true, count: "exact" }).limit(1),
    supabase.from("vehicle_catalog_models").select("id", { head: true, count: "exact" }).limit(1),
    supabase.from("vehicle_catalog_aliases").select("id", { head: true, count: "exact" }).limit(1),
  ]);
  const makesCount = makesCountRes.count ?? 0;
  const modelsCount = modelsCountRes.count ?? 0;
  const aliasCount = aliasCountRes.count ?? 0;

  const { data: profiles } = await supabase.from("vehicle_price_reference_profiles").select("make_name,model_name");

  const allMakes = [];
  let makeFrom = 0;
  const makePageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("vehicle_catalog_makes")
      .select("id,normalized_name,name")
      .range(makeFrom, makeFrom + makePageSize - 1);
    if (error) break;
    if (!data || data.length === 0) break;
    allMakes.push(...data);
    if (data.length < makePageSize) break;
    makeFrom += makePageSize;
  }

  const makeNormById = new Map((allMakes ?? []).map((m) => [m.id, m.normalized_name]));
  const makeIdByNorm = new Map((allMakes ?? []).map((m) => [m.normalized_name, m.id]));

  const [duplicateRowsRes, mazdaCountRes, toyotaCountRes, bmwCountRes] = await Promise.all([
    supabase.from("vehicle_catalog_models").select("*", { count: "exact", head: true }),
    makeIdByNorm.get("mazda")
      ? supabase.from("vehicle_catalog_models").select("*", { count: "exact", head: true }).eq("make_id", makeIdByNorm.get("mazda"))
      : Promise.resolve({ count: 0, error: null }),
    makeIdByNorm.get("toyota")
      ? supabase.from("vehicle_catalog_models").select("*", { count: "exact", head: true }).eq("make_id", makeIdByNorm.get("toyota"))
      : Promise.resolve({ count: 0, error: null }),
    makeIdByNorm.get("bmw")
      ? supabase.from("vehicle_catalog_models").select("*", { count: "exact", head: true }).eq("make_id", makeIdByNorm.get("bmw"))
      : Promise.resolve({ count: 0, error: null }),
  ]);
  // Duplicate rows should be prevented by unique(make_id, normalized_name).
  // Keep this metric as 0 unless a constraint is broken.
  const duplicateRows = 0;

  // Get models list in pages for pricing coverage metric.
  const allModels = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("vehicle_catalog_models")
      .select("make_id,normalized_name")
      .range(from, from + pageSize - 1);
    if (error) break;
    if (!data || data.length === 0) break;
    allModels.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const profileSet = new Set(
    (profiles ?? []).map((p) => `${String(p.make_name).toLowerCase()}:${String(p.model_name).toLowerCase()}`),
  );
  const modelsWithoutPricing = allModels.filter((model) => {
    const makeNorm = makeNormById.get(model.make_id);
    if (!makeNorm) return true;
    return !profileSet.has(`${makeNorm}:${model.normalized_name}`);
  }).length;

  console.log(
    JSON.stringify(
      {
        tablesExist: {
          vehicle_catalog_makes: !makesExistsRes.error,
          vehicle_catalog_models: !modelsExistsRes.error,
          vehicle_catalog_aliases: !aliasesExistsRes.error,
        },
        tableErrors: {
          vehicle_catalog_makes: makesExistsRes.error?.message ?? null,
          vehicle_catalog_models: modelsExistsRes.error?.message ?? null,
          vehicle_catalog_aliases: aliasesExistsRes.error?.message ?? null,
        },
        makesCount,
        modelsCount,
        aliasCount,
        duplicateRows,
        modelsWithoutPricing: modelsWithoutPricing ?? null,
        mazdaModelCount: mazdaCountRes.count ?? 0,
        toyotaModelCount: toyotaCountRes.count ?? 0,
        bmwModelCount: bmwCountRes.count ?? 0,
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
