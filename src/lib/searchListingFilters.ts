import type { ListingsFilters } from "@/lib/listingQueryFilters";
import { SEARCH_RELAXED_DB_ROW_CAP } from "@/config/searchListings";
import type { SearchFilters } from "@/types/search";

/** Mappe les clés `SearchFilters` vers les noms SQL encore legacy (`surface`, `rooms`, `bathrooms`). */
function coreListingFiltersFromSearch(filters: SearchFilters): Omit<
  ListingsFilters,
  "searchRelaxation" | "limit" | "offset" | "arrondissements" | "quartiers"
> {
  const qTrim = filters.quartierLibre.trim();
  return {
    transaction: filters.transaction || undefined,
    vehicleTypes: filters.vehicleTypes.length > 0 ? filters.vehicleTypes : undefined,
    types: filters.types.length > 0 ? filters.types : undefined,
    ville: filters.ville || undefined,
    freeText: qTrim.length >= 1 ? qTrim : undefined,
    priceMin: filters.priceMin || undefined,
    priceMax: filters.priceMax || undefined,
    rooms: filters.trimVersionIndices.length > 0 ? filters.trimVersionIndices : undefined,
    bathrooms: filters.doorCounts.length > 0 ? filters.doorCounts : undefined,
    surfaceMin: filters.mileageMinKm || undefined,
    surfaceMax: filters.mileageMaxKm || undefined,
    brands: filters.brands.length > 0 ? filters.brands : undefined,
    modelQuery: filters.modelQuery.trim() || undefined,
    yearMin: filters.yearMin || undefined,
    yearMax: filters.yearMax || undefined,
    fuels: filters.fuels.length > 0 ? filters.fuels : undefined,
    transmissions: filters.transmissions.length > 0 ? filters.transmissions : undefined,
    drivetrains: filters.drivetrains.length > 0 ? filters.drivetrains : undefined,
    conditions: filters.conditions.length > 0 ? filters.conditions : undefined,
    sellerTypes: filters.sellerTypes.length > 0 ? filters.sellerTypes : undefined,
    exteriorColor: filters.exteriorColor || undefined,
    engineDisplacementMin: filters.engineDisplacementMin || undefined,
    engineDisplacementMax: filters.engineDisplacementMax || undefined,
  };
}

/**
 * Filtres pour le fetch relaxé de la page recherche : pas d’arr./quart. en SQL (pool élargi pour suggestions).
 * Borne via `SEARCH_RELAXED_DB_ROW_CAP` + `offset` optionnel pour pagination future.
 */
export function buildSearchRelaxedFetchFilters(filters: SearchFilters, opts?: { offset?: number }): ListingsFilters {
  return {
    ...coreListingFiltersFromSearch(filters),
    searchRelaxation: true,
    limit: SEARCH_RELAXED_DB_ROW_CAP,
    offset: opts?.offset != null && opts.offset > 0 ? opts.offset : undefined,
  };
}

/**
 * Comptage strict (RPC head) aligné sur les critères SQL — inclut arrondissements / quartiers quand présents.
 * Les équipements (`features`) restent affinés côté client : ce total peut être une borne supérieure si équipements actifs.
 */
export function buildSearchStrictCountFilters(filters: SearchFilters): ListingsFilters {
  return {
    ...coreListingFiltersFromSearch(filters),
    arrondissements: filters.arrondissements.length > 0 ? filters.arrondissements : undefined,
    quartiers: filters.quartiers.length > 0 ? filters.quartiers : undefined,
    searchRelaxation: false,
  };
}
