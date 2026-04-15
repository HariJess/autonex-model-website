import { VEHICLE_UI_CATALOG } from "@/data/vehicleUiCatalog";

export type VehicleCatalogEntry = {
  make: string;
  models: string[];
};

export type VehicleCatalogLoadResult = {
  entries: VehicleCatalogEntry[];
  source: "ui-curated";
  makesCount: number;
  modelsCount: number;
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export async function loadVehicleCatalog(): Promise<VehicleCatalogLoadResult> {
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
    source: "ui-curated",
    makesCount: entries.length,
    modelsCount,
  };
}
