import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env.mjs";
import { normalizeCatalogName, slugify } from "./catalog-utils.mjs";

loadLocalEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MANUAL_MODELS = [
  { makeNorm: "mazda", name: "CX-60", normalized_name: "cx-60" },
  { makeNorm: "mazda", name: "CX-80", normalized_name: "cx-80" },
  { makeNorm: "toyota", name: "Hilux", normalized_name: "hilux" },
  { makeNorm: "mercedes-benz", name: "GLC", normalized_name: "glc" },
  { makeNorm: "nissan", name: "Patrol", normalized_name: "patrol" },
  { makeNorm: "nissan", name: "Navara", normalized_name: "navara" },
  { makeNorm: "suzuki", name: "Jimny", normalized_name: "jimny" },
];

const SAFE_ALIASES = [
  { makeNorm: "toyota", canonicalNorm: "hilux", alias: "Toyota Hilux" },
  { makeNorm: "toyota", canonicalNorm: "hilux", alias: "Hilux Revo" },
  { makeNorm: "toyota", canonicalNorm: "hilux", alias: "Hilux Vigo" },
  { makeNorm: "mazda", canonicalNorm: "mazda2", alias: "Demio" },
  { makeNorm: "toyota", canonicalNorm: "yaris", alias: "Vitz" },
];

async function main() {
  const report = {
    insertedModels: [],
    reactivatedModels: [],
    updatedModels: [],
    insertedAliases: [],
    skippedAliases: [],
  };

  const { data: makes, error: makesError } = await supabase
    .from("vehicle_catalog_makes")
    .select("id,name,normalized_name")
    .in("normalized_name", Array.from(new Set([...MANUAL_MODELS.map((m) => m.makeNorm), ...SAFE_ALIASES.map((a) => a.makeNorm)])));
  if (makesError) throw makesError;
  const makeByNorm = new Map((makes ?? []).map((m) => [m.normalized_name, m]));

  for (const model of MANUAL_MODELS) {
    const make = makeByNorm.get(model.makeNorm);
    if (!make) {
      throw new Error(`Missing make for manual model override: ${model.makeNorm}`);
    }
    const { data: existing, error: existingErr } = await supabase
      .from("vehicle_catalog_models")
      .select("id,name,is_active,external_source")
      .eq("make_id", make.id)
      .eq("normalized_name", model.normalized_name)
      .maybeSingle();
    if (existingErr) throw existingErr;

    if (!existing) {
      const { error: insertErr } = await supabase.from("vehicle_catalog_models").insert({
        make_id: make.id,
        external_source: "manual_override",
        external_model_id: `manual:${model.makeNorm}:${model.normalized_name}`,
        name: model.name,
        normalized_name: model.normalized_name,
        slug: slugify(model.name),
        is_active: true,
      });
      if (insertErr) throw insertErr;
      report.insertedModels.push({ make: model.makeNorm, model: model.name });
      continue;
    }

    const patch = {};
    if (existing.name !== model.name) patch.name = model.name;
    if (existing.is_active !== true) patch.is_active = true;
    if (existing.external_source !== "manual_override") patch.external_source = "manual_override";
    if (Object.keys(patch).length > 0) {
      const { error: updateErr } = await supabase.from("vehicle_catalog_models").update(patch).eq("id", existing.id);
      if (updateErr) throw updateErr;
      if (patch.is_active) {
        report.reactivatedModels.push({ make: model.makeNorm, model: model.name });
      } else {
        report.updatedModels.push({ make: model.makeNorm, model: model.name, patch });
      }
    }
  }

  // Keep generic Toyota pick-up inactive, preserving canonical Hilux signal.
  const toyota = makeByNorm.get("toyota");
  if (toyota) {
    await supabase
      .from("vehicle_catalog_models")
      .update({ is_active: false })
      .eq("make_id", toyota.id)
      .eq("normalized_name", "pick-up");
  }

  // Alias layer (safe, explicit, no global generic "pickup" alias).
  for (const item of SAFE_ALIASES) {
    const make = makeByNorm.get(item.makeNorm);
    if (!make) continue;
    const { data: canonical, error: canonicalErr } = await supabase
      .from("vehicle_catalog_models")
      .select("id")
      .eq("make_id", make.id)
      .eq("normalized_name", item.canonicalNorm)
      .maybeSingle();
    if (canonicalErr || !canonical) {
      report.skippedAliases.push({ ...item, reason: "canonical-model-missing" });
      continue;
    }
    const { error: aliasErr } = await supabase.from("vehicle_catalog_aliases").upsert(
      {
        entity_type: "model",
        canonical_id: canonical.id,
        alias: item.alias,
        alias_normalized: normalizeCatalogName(item.alias),
        source: "manual_override",
      },
      { onConflict: "entity_type,alias_normalized" },
    );
    if (aliasErr) throw aliasErr;
    report.insertedAliases.push({ alias: item.alias, canonical: item.canonicalNorm, make: item.makeNorm });
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
