/**
 * Search / filter state for the listings search flow.
 * Serialized to URL query params (see `src/lib/searchUrl.ts`).
 */
export interface SearchFilters {
  transaction: string;
  vehicleTypes: string[];
  types: string[];
  ville: string;
  /** Full arrondissement labels (e.g. "1er arrondissement"); multi-select; OR with quartiers */
  arrondissements: string[];
  quartiers: string[];
  quartierLibre: string;
  priceMin: number;
  priceMax: number;
  surfaceMin: number;
  surfaceMax: number;
  rooms: number[];
  bathrooms: number[];
  equipments: string[];
  fuels: string[];
  transmissions: string[];
  drivetrains: string[];
  conditions: string[];
  sellerTypes: string[];
  brands: string[];
  modelQuery: string;
  yearMin: number;
  yearMax: number;
}

export const EMPTY_SEARCH_FILTERS: SearchFilters = {
  transaction: "",
  vehicleTypes: [],
  types: [],
  ville: "",
  arrondissements: [],
  quartiers: [],
  quartierLibre: "",
  priceMin: 0,
  priceMax: 0,
  surfaceMin: 0,
  surfaceMax: 0,
  rooms: [],
  bathrooms: [],
  equipments: [],
  fuels: [],
  transmissions: [],
  drivetrains: [],
  conditions: [],
  sellerTypes: [],
  brands: [],
  modelQuery: "",
  yearMin: 0,
  yearMax: 0,
};

export type SearchSortMode = "recent" | "priceAsc" | "priceDesc";
export type SearchViewMode = "grid" | "list" | "map";
