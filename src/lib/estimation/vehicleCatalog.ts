import { VEHICLE_UI_CATALOG } from "@/data/vehicleUiCatalog";
import {
  ESTIMATION_UI_CATALOG_RUNTIME_SOURCE,
  ESTIMATION_UI_CATALOG_SOURCE,
} from "@/lib/estimation/catalogArchitecture";
import { normalizeCatalogSearchToken } from "@/lib/estimation/catalogSearch";
import type { BodyType } from "@/types/estimation";

export type VehicleCatalogEntry = {
  make: string;
  models: string[];
  modelBodyTypes: Record<string, BodyType[]>;
};

export type VehicleCatalogLoadResult = {
  entries: VehicleCatalogEntry[];
  source: typeof ESTIMATION_UI_CATALOG_RUNTIME_SOURCE;
  makesCount: number;
  modelsCount: number;
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export async function loadVehicleCatalog(): Promise<VehicleCatalogLoadResult> {
  // Runtime contract: estimation UI reads only from curated UI catalog source.
  // Raw DB/import catalogs are intentionally excluded from visible selection.
  const entries = VEHICLE_UI_CATALOG
    .map((entry) => ({
      make: normalizeName(entry.make),
      models: Array.from(new Set(entry.models.map((model) => normalizeName(model)).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
      modelBodyTypes: Object.fromEntries(
        Object.entries(entry.modelBodyTypes ?? {})
          .map(([modelName, bodyTypes]) => [
            normalizeName(modelName),
            Array.from(new Set(bodyTypes)).filter(Boolean),
          ])
          .filter((item) => item[0] && item[1].length > 0),
      ),
    }))
    .filter((entry) => entry.make && entry.models.length > 0)
    .sort((a, b) => a.make.localeCompare(b.make));
  const modelsCount = entries.reduce((acc, entry) => acc + entry.models.length, 0);
  return {
    entries,
    source: ESTIMATION_UI_CATALOG_RUNTIME_SOURCE,
    makesCount: entries.length,
    modelsCount,
  };
}

export function resolveModelBodyTypes(
  entries: VehicleCatalogEntry[],
  makeName: string,
  modelName: string,
): BodyType[] {
  const makeToken = normalizeCatalogSearchToken(makeName);
  const modelToken = normalizeCatalogSearchToken(modelName);
  if (!makeToken || !modelToken) return [];

  const makeEntry = entries.find((entry) => normalizeCatalogSearchToken(entry.make) === makeToken);
  if (!makeEntry) return [];

  const matchedModelName = Object.keys(makeEntry.modelBodyTypes).find(
    (candidate) => normalizeCatalogSearchToken(candidate) === modelToken,
  );
  if (!matchedModelName) return [];

  return Array.from(new Set(makeEntry.modelBodyTypes[matchedModelName] ?? []));
}

export const VEHICLE_CATALOG_RUNTIME_NOTES = {
  visibleSource: ESTIMATION_UI_CATALOG_SOURCE,
  dbRole: "supporting-tooling-only",
} as const;
