/**
 * Search / filter state for the listings search flow.
 * Serialized to URL query params (see `src/lib/searchUrl.ts`).
 */
export interface SearchFilters {
  transaction: string;
  types: string[];
  ville: string;
  arrondissement: string;
  quartiers: string[];
  quartierLibre: string;
  priceMin: number;
  priceMax: number;
  surfaceMin: number;
  surfaceMax: number;
  rooms: number[];
  bathrooms: number[];
  equipments: string[];
}

export const EMPTY_SEARCH_FILTERS: SearchFilters = {
  transaction: "",
  types: [],
  ville: "",
  arrondissement: "",
  quartiers: [],
  quartierLibre: "",
  priceMin: 0,
  priceMax: 0,
  surfaceMin: 0,
  surfaceMax: 0,
  rooms: [],
  bathrooms: [],
  equipments: [],
};

export type SearchSortMode = "recent" | "priceAsc" | "priceDesc";
export type SearchViewMode = "grid" | "list" | "map";
