import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: make, error: makeError } = await supabase
  .from("vehicle_catalog_makes")
  .select("id")
  .eq("normalized_name", "bmw")
  .single();
if (makeError) throw makeError;

const { data: rows, error: rowsError } = await supabase
  .from("vehicle_catalog_models")
  .select("id,name,normalized_name")
  .eq("make_id", make.id)
  .eq("is_active", true);
if (rowsError) throw rowsError;

let changed = 0;
const preview = [];
for (const row of rows ?? []) {
  let next = row.name;
  const m1 = row.normalized_name.match(/^(\d{3})(i|d|e)$/);
  const m2 = row.normalized_name.match(/^(\d{3})xi$/);
  if (row.normalized_name === "1m") next = "1M";
  else if (m1) next = `${m1[1]}${m1[2]}`;
  else if (m2) next = `${m2[1]}xi`;

  if (next !== row.name) {
    const { error } = await supabase.from("vehicle_catalog_models").update({ name: next }).eq("id", row.id);
    if (error) throw error;
    changed += 1;
    if (preview.length < 120) preview.push({ from: row.name, to: next, normalized_name: row.normalized_name });
  }
}

console.log(JSON.stringify({ changed, preview }, null, 2));
