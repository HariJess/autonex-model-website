import { createClient } from "@supabase/supabase-js";
import { normalizeCatalogName, slugify, titleCasePreserveAcronyms } from "./catalog-utils.mjs";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const parseValues = (xml, tag) => {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "g");
  const out = [];
  let match;
  while ((match = regex.exec(xml)) !== null) out.push(match[1]);
  return out;
};

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

async function ensureMake(makeName) {
  const normalized = normalizeCatalogName(makeName);
  const { data, error } = await supabase
    .from("vehicle_catalog_makes")
    .upsert(
      {
        external_source: "fueleconomy",
        external_make_id: normalized,
        name: titleCasePreserveAcronyms(makeName),
        normalized_name: normalized,
        slug: slugify(makeName),
        is_active: true,
      },
      { onConflict: "normalized_name" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const yearsXml = await fetchText("https://www.fueleconomy.gov/ws/rest/vehicle/menu/year");
  const years = parseValues(yearsXml, "text").slice(-12);
  let count = 0;

  for (const year of years) {
    const makesXml = await fetchText(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/make?year=${year}`);
    const makes = parseValues(makesXml, "text");
    for (const make of makes) {
      const makeId = await ensureMake(make);
      const modelsXml = await fetchText(
        `https://www.fueleconomy.gov/ws/rest/vehicle/menu/model?year=${year}&make=${encodeURIComponent(make)}`,
      );
      const models = parseValues(modelsXml, "text");
      for (const model of models) {
        const normalized = normalizeCatalogName(model);
        const { error } = await supabase.from("vehicle_catalog_models").upsert(
          {
            make_id: makeId,
            external_source: "fueleconomy",
            external_model_id: `${year}:${normalized}`,
            name: titleCasePreserveAcronyms(model),
            normalized_name: normalized,
            slug: slugify(model),
            year_start: Number(year),
            is_active: true,
          },
          { onConflict: "make_id,normalized_name" },
        );
        if (error) throw error;
        count += 1;
      }
    }
  }
  console.log(`FuelEconomy enrichment complete. Model rows processed: ${count}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
