/**
 * Hydratation tolérante des filtres recherche : objet applicatif canonique (`SearchFilters`)
 * peut être reconstruit depuis d’anciennes formes encore nommées comme l’immobilier.
 * Utile pour migrations progressives / JSON tiers ; l’URL est déjà canonique via `searchUrl.ts`.
 *
 * Priorité : **clés canoniques** présentes dans l’entrée ; sinon **legacy** (`surfaceMin`, etc.).
 */
import { EMPTY_SEARCH_FILTERS, type SearchFilters } from "@/types/search";

/** Ancienne forme encore rencontrée hors URL (sessions, payloads de tests, données sérialisées). */
export type LegacySearchFiltersShape = {
  surfaceMin?: number;
  surfaceMax?: number;
  rooms?: number[];
  bathrooms?: number[];
};

export type SearchFiltersHydrateInput = Partial<SearchFilters> & LegacySearchFiltersShape;

/** Fusion vers l’état canonique véhicule (`mileage*Km`, `trimVersionIndices`, `doorCounts`). */
export function hydrateSearchFilters(input: SearchFiltersHydrateInput): SearchFilters {
  const merged = { ...EMPTY_SEARCH_FILTERS, ...input };
  const {
    surfaceMin: _legacySm,
    surfaceMax: _legacySx,
    rooms: _legacyRooms,
    bathrooms: _legacyBath,
    ...rest
  } = merged as SearchFiltersHydrateInput & Record<string, unknown>;

  const mileageMinKm =
    input.mileageMinKm ??
    input.surfaceMin ??
    EMPTY_SEARCH_FILTERS.mileageMinKm;
  const mileageMaxKm =
    input.mileageMaxKm ??
    input.surfaceMax ??
    EMPTY_SEARCH_FILTERS.mileageMaxKm;
  const trimVersionIndices =
    input.trimVersionIndices ??
    input.rooms ??
    EMPTY_SEARCH_FILTERS.trimVersionIndices;
  const doorCounts =
    input.doorCounts ??
    input.bathrooms ??
    EMPTY_SEARCH_FILTERS.doorCounts;

  return {
    ...(rest as SearchFilters),
    mileageMinKm,
    mileageMaxKm,
    trimVersionIndices,
    doorCounts,
  };
}
