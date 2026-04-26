/**
 * Paramètres d’URL recherche : clés **véhicule** (mileage, doors) et **legacy** (surface_*, sdb).
 * Lecture : alias véhicule prioritaires s’ils sont présents ; sinon repli legacy (rétrocompatibilité).
 * Écriture : voir `filtersToSearchParams` dans `searchUrl.ts` — émet les clés véhicule uniquement.
 */
import type { SearchFilters } from "@/types/search";

export const VEHICLE_SEARCH_QUERY_KEYS = {
  mileageMin: "mileage_min",
  mileageMax: "mileage_max",
  doors: "doors",
  legacySurfaceMin: "surface_min",
  legacySurfaceMax: "surface_max",
  legacySdb: "sdb",
} as const;

function parseFiniteNumber(raw: string | null): number {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parsePositiveInt(s: string): number | undefined {
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/** Aligné sur `parseMultiValueParam` de `searchUrl.ts` — réutilisable sans cycle d’import. */
export function parseMultiValueSearchParam(sp: URLSearchParams, key: string): string[] {
  const values = sp.getAll(key);
  if (values.length === 0) return [];
  const expanded = values.flatMap((value) => value.split(","));
  const normalized = expanded.map((value) => value.trim()).filter(Boolean);
  return Array.from(new Set(normalized));
}

/** Kilométrage min/max : `mileage_*` si présents, sinon `surface_*` (historique). */
export function parseMileageKmBoundsFromSearchParams(sp: URLSearchParams): { min: number; max: number } {
  const min = sp.has(VEHICLE_SEARCH_QUERY_KEYS.mileageMin)
    ? parseFiniteNumber(sp.get(VEHICLE_SEARCH_QUERY_KEYS.mileageMin))
    : parseFiniteNumber(sp.get(VEHICLE_SEARCH_QUERY_KEYS.legacySurfaceMin));
  const max = sp.has(VEHICLE_SEARCH_QUERY_KEYS.mileageMax)
    ? parseFiniteNumber(sp.get(VEHICLE_SEARCH_QUERY_KEYS.mileageMax))
    : parseFiniteNumber(sp.get(VEHICLE_SEARCH_QUERY_KEYS.legacySurfaceMax));
  return { min, max };
}

/** Portes (`bathrooms` en DB) : param `doors` si présent, sinon `sdb`. */
export function parseDoorCountsFromSearchParams(sp: URLSearchParams): number[] {
  const doorTags = parseMultiValueSearchParam(sp, VEHICLE_SEARCH_QUERY_KEYS.doors);
  const legacyTags = parseMultiValueSearchParam(sp, VEHICLE_SEARCH_QUERY_KEYS.legacySdb);
  const csv = doorTags.length > 0 ? doorTags.join(",") : legacyTags.join(",");
  // Comptes portes (colonnes DB `bathrooms` après persistance).
  const doorCountsParsed: number[] = [];
  if (!csv) return doorCountsParsed;
  for (const part of csv.split(",")) {
    const n = parsePositiveInt(part.trim());
    if (n !== undefined && n >= 1 && n <= 99) doorCountsParsed.push(n);
  }
  return doorCountsParsed;
}

/** Sérialisation des champs véhicule vers des clés URL explicites (kilométrage, trim, portes). */
export function appendVehicleSemanticQueryParams(p: URLSearchParams, f: SearchFilters): void {
  if (f.mileageMinKm) p.set(VEHICLE_SEARCH_QUERY_KEYS.mileageMin, String(f.mileageMinKm));
  if (f.mileageMaxKm) p.set(VEHICLE_SEARCH_QUERY_KEYS.mileageMax, String(f.mileageMaxKm));
  if (f.doorCounts.length) p.set(VEHICLE_SEARCH_QUERY_KEYS.doors, f.doorCounts.join(","));
}
