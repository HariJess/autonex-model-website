import { VEHICLE_UI_CATALOG } from "@/data/vehicleUiCatalog";
import {
  ESTIMATION_UI_CATALOG_RUNTIME_SOURCE,
  ESTIMATION_UI_CATALOG_SOURCE,
} from "@/lib/estimation/catalogArchitecture";

export type VehicleCatalogEntry = {
  make: string;
  models: string[];
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

export const VEHICLE_CATALOG_RUNTIME_NOTES = {
  visibleSource: ESTIMATION_UI_CATALOG_SOURCE,
  dbRole: "supporting-tooling-only",
} as const;
