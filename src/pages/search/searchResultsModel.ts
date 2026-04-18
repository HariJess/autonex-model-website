import { rankSimilarListings } from "@/lib/searchSimilar";
import {
  matchesDoorCountFilterStrict,
  matchesLocationSubareas,
  matchesPriceMaxStrict,
  matchesPriceMinStrict,
  matchesTrimVersionFilterStrict,
} from "@/lib/searchLocationMatch";
import { getCanonicalVehicleAttributes } from "@/lib/vehicleCanonical";
import type { DisplayListing } from "@/types/listing";
import type { SearchFilters, SearchSortMode } from "@/types/search";

function listingMatchesEquipments(features: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  const norm = (s: string) => s.toLowerCase().trim();
  const feats = features.map(norm);
  return required.every((eq) => {
    const e = norm(eq);
    return feats.some((f) => f.includes(e) || e.includes(f));
  });
}

function resolveVehicleMileageKm(listing: DisplayListing): number | null {
  return getCanonicalVehicleAttributes(listing).mileageKm;
}

function matchesVehicleMileageMinStrict(listing: DisplayListing, mileageMin: number): boolean {
  if (!mileageMin || mileageMin <= 0) return true;
  const mileageKm = resolveVehicleMileageKm(listing);
  if (mileageKm == null) return false;
  return mileageKm >= mileageMin;
}

function matchesVehicleMileageMaxStrict(listing: DisplayListing, mileageMax: number): boolean {
  if (!mileageMax || mileageMax <= 0) return true;
  const mileageKm = resolveVehicleMileageKm(listing);
  if (mileageKm == null) return true;
  return mileageKm <= mileageMax;
}

function sortExactListings(listings: DisplayListing[], sort: SearchSortMode): DisplayListing[] {
  const results = [...listings];
  if (sort === "priceAsc") {
    results.sort((a, b) => a.price_mga - b.price_mga);
  } else if (sort === "priceDesc") {
    results.sort((a, b) => b.price_mga - a.price_mga);
  } else {
    results.sort((a, b) => {
      const sa = a.visibility_rank_score ?? new Date(a.created_at ?? 0).getTime();
      const sb = b.visibility_rank_score ?? new Date(b.created_at ?? 0).getTime();
      return sb - sa;
    });
  }
  return results;
}

export type SearchResultsModel = {
  equippedListings: DisplayListing[];
  exactMatchListings: DisplayListing[];
  sortedExact: DisplayListing[];
  similarFallbackListings: DisplayListing[];
  alsoLikeListings: DisplayListing[];
  displayListings: DisplayListing[];
  showCloseMatchBadges: boolean;
};

export function buildSearchResultsModel(params: {
  dbListings: DisplayListing[];
  filters: SearchFilters;
  sort: SearchSortMode;
}): SearchResultsModel {
  const { dbListings, filters, sort } = params;

  // Équipements : seul filtre non exprimé proprement en SQL (`features` json) — affinage client.
  // Carburant, marque, année, etc. sont déjà appliqués côté requête (useDbListings).
  let equippedListings = [...dbListings];
  if (filters.equipments.length > 0) {
    equippedListings = equippedListings.filter((l) =>
      listingMatchesEquipments(l.features, filters.equipments),
    );
  }

  let exactMatchListings = equippedListings;
  if (filters.ville && (filters.arrondissements.length > 0 || filters.quartiers.length > 0)) {
    exactMatchListings = exactMatchListings.filter((l) => matchesLocationSubareas(l, filters));
  }
  if (filters.priceMin > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesPriceMinStrict(l.price_mga, filters.priceMin),
    );
  }
  if (filters.priceMax > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesPriceMaxStrict(l.price_mga, filters.priceMax),
    );
  }
  if (filters.mileageMinKm > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesVehicleMileageMinStrict(l, filters.mileageMinKm),
    );
  }
  if (filters.mileageMaxKm > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesVehicleMileageMaxStrict(l, filters.mileageMaxKm),
    );
  }
  if (filters.trimVersionIndices.length > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesTrimVersionFilterStrict(l.rooms, filters.trimVersionIndices),
    );
  }
  if (filters.doorCounts.length > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesDoorCountFilterStrict(l.bathrooms, filters.doorCounts),
    );
  }

  const sortedExact = sortExactListings(exactMatchListings, sort);
  const similarFallbackListings =
    sortedExact.length > 0 ? [] : rankSimilarListings(equippedListings, filters, new Set(), 9);
  const alsoLikeListings =
    sortedExact.length < 1 || sortedExact.length > 3
      ? []
      : rankSimilarListings(
          equippedListings,
          filters,
          new Set(sortedExact.map((l) => l.id)),
          6,
        );
  const displayListings = sortedExact.length > 0 ? sortedExact : similarFallbackListings;
  const showCloseMatchBadges = sortedExact.length === 0 && similarFallbackListings.length > 0;

  return {
    equippedListings,
    exactMatchListings,
    sortedExact,
    similarFallbackListings,
    alsoLikeListings,
    displayListings,
    showCloseMatchBadges,
  };
}
