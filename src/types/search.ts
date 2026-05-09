/**
 * État filtres recherche — **sémantique véhicule** côté frontend.
 *
 * Sérialisation URL : `mileage_min` / `mileage_max` / `doors` (`searchUrl.ts`).
 * Pont SQL PostgREST : `ListingsFilters` garde encore les noms colonnes legacy (`surface`, `bathrooms`) dans `listingQueryFilters.ts`.
 * Événements analytics : colonnes table `surface_min` inchangées ; mapping dans `searchAnalytics.ts`.
 *
 * Hydratation depuis ancienne forme objet : `hydrateSearchFilters` dans `searchFiltersCompat.ts`.
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
  mileageMinKm: number;
  mileageMaxKm: number;
  /** Sélection nombre de portes (colonne DB `bathrooms` / `doors`). */
  doorCounts: number[];
  equipments: string[];
  fuels: string[];
  transmissions: string[];
  drivetrains: string[];
  conditions: string[];
  sellerTypes: string[];
  exteriorColor: string;
  engineDisplacementMin: number;
  engineDisplacementMax: number;
  brands: string[];
  modelQuery: string;
  yearMin: number;
  yearMax: number;
  /**
   * `true` quand l'acheteur a activé la chip « Bonnes affaires » dans
   * `/recherche`. Filtre `deal_active = true AND deal_ends_at > now()`.
   */
  hasDeal: boolean;
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
  mileageMinKm: 0,
  mileageMaxKm: 0,
  doorCounts: [],
  equipments: [],
  fuels: [],
  transmissions: [],
  drivetrains: [],
  conditions: [],
  sellerTypes: [],
  exteriorColor: "",
  engineDisplacementMin: 0,
  engineDisplacementMax: 0,
  brands: [],
  modelQuery: "",
  yearMin: 0,
  yearMax: 0,
  hasDeal: false,
};

export type SearchSortMode = "recent" | "priceAsc" | "priceDesc";
export type SearchViewMode = "grid" | "list" | "map";
