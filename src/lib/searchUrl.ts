import {
  LISTING_TYPES,
  TRANSACTION_TYPES,
  type ListingType,
  type TransactionType,
} from "@/types/listing";
import type { SearchFilters, SearchSortMode, SearchViewMode } from "@/types/search";
import { listingTypesForTransaction } from "@/lib/listingRules";

const LISTING_TYPE_SET = new Set<string>(LISTING_TYPES);

function parsePositiveInt(s: string): number | undefined {
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function parseFiniteNumber(raw: string | null): number {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Keep only DB-valid listing types from URL (drops typos / legacy values). */
export function sanitizeListingTypes(types: string[]): string[] {
  return types.filter((t): t is ListingType => LISTING_TYPE_SET.has(t));
}

export function parseTransaction(raw: string | null): string {
  if (!raw) return "";
  return TRANSACTION_TYPES.includes(raw as TransactionType) ? raw : "";
}

export function filtersFromSearchParams(sp: URLSearchParams): SearchFilters {
  const transaction = parseTransaction(sp.get("transaction"));
  const rawTypes = sp.get("type")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const allowed = new Set(listingTypesForTransaction(transaction));
  const types = sanitizeListingTypes(rawTypes).filter((t) => allowed.has(t as ListingType));

  const roomsRaw = sp.get("chambres");
  const rooms: number[] = [];
  if (roomsRaw) {
    for (const part of roomsRaw.split(",")) {
      const n = parsePositiveInt(part.trim());
      if (n !== undefined && n <= 99) rooms.push(n);
    }
  }

  const sdbRaw = sp.get("sdb");
  const bathrooms: number[] = [];
  if (sdbRaw) {
    for (const part of sdbRaw.split(",")) {
      const n = parsePositiveInt(part.trim());
      if (n !== undefined && n >= 1 && n <= 99) bathrooms.push(n);
    }
  }

  const quartiers = sp.get("quartiers")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const arrRaw = sp.get("arr")?.trim() ?? "";
  return {
    transaction,
    types,
    ville: sp.get("ville")?.trim() ?? "",
    /** Quartiers multi-sélection : l’arrondissement URL est ignoré si des quartiers sont déjà choisis (évite conflits legacy). */
    arrondissement: quartiers.length > 0 ? "" : arrRaw,
    quartiers,
    quartierLibre: sp.get("q")?.trim() ?? "",
    priceMin: parseFiniteNumber(sp.get("prix_min")),
    priceMax: parseFiniteNumber(sp.get("prix_max")),
    surfaceMin: parseFiniteNumber(sp.get("surface_min")),
    surfaceMax: parseFiniteNumber(sp.get("surface_max")),
    rooms,
    bathrooms,
    equipments: sp.get("equip")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
  };
}

export function filtersToSearchParams(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.transaction) p.set("transaction", f.transaction);
  if (f.types.length) p.set("type", f.types.join(","));
  if (f.ville) p.set("ville", f.ville);
  if (f.quartiers.length) {
    p.set("quartiers", f.quartiers.join(","));
  } else if (f.arrondissement) {
    p.set("arr", f.arrondissement);
  }
  if (f.quartierLibre) p.set("q", f.quartierLibre);
  if (f.priceMin) p.set("prix_min", String(f.priceMin));
  if (f.priceMax) p.set("prix_max", String(f.priceMax));
  if (f.surfaceMin) p.set("surface_min", String(f.surfaceMin));
  if (f.surfaceMax) p.set("surface_max", String(f.surfaceMax));
  if (f.rooms.length) p.set("chambres", f.rooms.join(","));
  if (f.bathrooms.length) p.set("sdb", f.bathrooms.join(","));
  if (f.equipments.length) p.set("equip", f.equipments.join(","));
  return p;
}

const SORT_VALUES: SearchSortMode[] = ["recent", "priceAsc", "priceDesc"];
const VIEW_VALUES: SearchViewMode[] = ["grid", "list", "map"];

export function sortFromSearchParams(sp: URLSearchParams): SearchSortMode {
  const v = sp.get("sort");
  return v && SORT_VALUES.includes(v as SearchSortMode) ? (v as SearchSortMode) : "recent";
}

export function viewFromSearchParams(sp: URLSearchParams): SearchViewMode {
  const v = sp.get("view");
  return v && VIEW_VALUES.includes(v as SearchViewMode) ? (v as SearchViewMode) : "grid";
}

export function searchStateFromParams(sp: URLSearchParams): {
  filters: SearchFilters;
  sort: SearchSortMode;
  view: SearchViewMode;
} {
  return {
    filters: filtersFromSearchParams(sp),
    sort: sortFromSearchParams(sp),
    view: viewFromSearchParams(sp),
  };
}

export function searchParamsFromState(
  filters: SearchFilters,
  sort: SearchSortMode,
  view: SearchViewMode
): URLSearchParams {
  const p = filtersToSearchParams(filters);
  if (sort !== "recent") p.set("sort", sort);
  if (view !== "grid") p.set("view", view);
  return p;
}

/** Path + query for router navigation from partial filter updates (e.g. hero). */
export function searchPathFromFilters(filters: SearchFilters): string {
  const q = filtersToSearchParams(filters).toString();
  return q ? `/recherche?${q}` : "/recherche";
}
