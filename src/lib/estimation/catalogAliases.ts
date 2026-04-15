import { supabase } from "@/integrations/supabase/client";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export type CatalogAliasMaps = {
  makeAliasToCanonical: Map<string, string>;
  modelAliasToCanonicalByMake: Map<string, Map<string, string>>;
};

export async function loadCatalogAliases(): Promise<CatalogAliasMaps> {
  const [makesRes, modelsRes, aliasesRes] = await Promise.all([
    supabase.from("vehicle_catalog_makes").select("id,name"),
    supabase.from("vehicle_catalog_models").select("id,make_id,name"),
    supabase.from("vehicle_catalog_aliases").select("entity_type,canonical_id,alias,alias_normalized"),
  ]);

  const makeById = new Map<string, string>();
  const modelById = new Map<string, { name: string; makeId: string }>();
  ((makesRes.data ?? []) as Array<{ id: string; name: string }>).forEach((m) => makeById.set(m.id, m.name));
  ((modelsRes.data ?? []) as Array<{ id: string; make_id: string; name: string }>).forEach((m) =>
    modelById.set(m.id, { name: m.name, makeId: m.make_id }),
  );

  const makeAliasToCanonical = new Map<string, string>();
  const modelAliasToCanonicalByMake = new Map<string, Map<string, string>>();

  ((aliasesRes.data ?? []) as Array<{ entity_type: "make" | "model"; canonical_id: string; alias: string; alias_normalized: string }>).forEach(
    (alias) => {
      if (alias.entity_type === "make") {
        const canonical = makeById.get(alias.canonical_id);
        if (canonical) makeAliasToCanonical.set(normalize(alias.alias_normalized || alias.alias), canonical);
        return;
      }
      const canonicalModel = modelById.get(alias.canonical_id);
      if (!canonicalModel) return;
      const canonicalMake = makeById.get(canonicalModel.makeId);
      if (!canonicalMake) return;
      const makeKey = normalize(canonicalMake);
      if (!modelAliasToCanonicalByMake.has(makeKey)) modelAliasToCanonicalByMake.set(makeKey, new Map<string, string>());
      modelAliasToCanonicalByMake
        .get(makeKey)
        ?.set(normalize(alias.alias_normalized || alias.alias), canonicalModel.name);
    },
  );

  return { makeAliasToCanonical, modelAliasToCanonicalByMake };
}

export function resolveMakeAlias(makeName: string, maps: CatalogAliasMaps): string {
  const key = normalize(makeName);
  return maps.makeAliasToCanonical.get(key) ?? makeName.trim();
}

export function resolveModelAlias(makeName: string, modelName: string, maps: CatalogAliasMaps): string {
  const makeKey = normalize(makeName);
  const aliasMap = maps.modelAliasToCanonicalByMake.get(makeKey);
  if (!aliasMap) return modelName.trim();
  return aliasMap.get(normalize(modelName)) ?? modelName.trim();
}
