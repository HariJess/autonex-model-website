import { rankSimilarListings } from "@/lib/searchSimilar";
import {
  matchesBathroomsStrict,
  matchesLocationSubareas,
  matchesPriceMaxStrict,
  matchesPriceMinStrict,
  matchesRoomsStrict,
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

function normalizeSearchToken(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

  let equippedListings = [...dbListings];
  if (filters.equipments.length > 0) {
    equippedListings = equippedListings.filter((l) =>
      listingMatchesEquipments(l.features, filters.equipments),
    );
  }
  if (filters.fuels.length > 0) {
    const wanted = new Set(filters.fuels.map((v) => normalizeSearchToken(v)));
    equippedListings = equippedListings.filter((l) =>
      wanted.has(normalizeSearchToken(l.vehicle?.fuel)),
    );
  }
  if (filters.transmissions.length > 0) {
    const wanted = new Set(filters.transmissions.map((v) => normalizeSearchToken(v)));
    equippedListings = equippedListings.filter((l) =>
      wanted.has(normalizeSearchToken(l.vehicle?.transmission)),
    );
  }
  if (filters.drivetrains.length > 0) {
    const wanted = new Set(filters.drivetrains.map((v) => normalizeSearchToken(v)));
    equippedListings = equippedListings.filter((l) =>
      wanted.has(normalizeSearchToken(l.vehicle?.drivetrain)),
    );
  }
  if (filters.conditions.length > 0) {
    const wanted = new Set(filters.conditions.map((v) => normalizeSearchToken(v)));
    equippedListings = equippedListings.filter((l) =>
      wanted.has(normalizeSearchToken(l.vehicle?.condition)),
    );
  }
  if (filters.sellerTypes.length > 0) {
    const wanted = new Set(filters.sellerTypes.map((v) => normalizeSearchToken(v)));
    equippedListings = equippedListings.filter((l) =>
      wanted.has(normalizeSearchToken(l.vehicle?.sellerType)),
    );
  }
  if (filters.brands.length > 0) {
    const wanted = new Set(filters.brands.map((v) => normalizeSearchToken(v)));
    equippedListings = equippedListings.filter((l) =>
      wanted.has(normalizeSearchToken(l.vehicle?.make)),
    );
  }
  if (filters.modelQuery.trim()) {
    const q = normalizeSearchToken(filters.modelQuery);
    equippedListings = equippedListings.filter((l) =>
      normalizeSearchToken(l.vehicle?.model).includes(q),
    );
  }
  if (filters.yearMin > 0) {
    equippedListings = equippedListings.filter((l) => (l.vehicle?.year ?? 0) >= filters.yearMin);
  }
  if (filters.yearMax > 0) {
    equippedListings = equippedListings.filter((l) => (l.vehicle?.year ?? 0) <= filters.yearMax);
  }
  if (filters.exteriorColor) {
    const wantedColor = normalizeSearchToken(filters.exteriorColor);
    equippedListings = equippedListings.filter((l) =>
      normalizeSearchToken(l.vehicle?.exteriorColor) === wantedColor,
    );
  }
  if (filters.engineDisplacementMin > 0) {
    equippedListings = equippedListings.filter(
      (l) => (l.vehicle?.engineDisplacementL ?? 0) >= filters.engineDisplacementMin,
    );
  }
  if (filters.engineDisplacementMax > 0) {
    equippedListings = equippedListings.filter(
      (l) => (l.vehicle?.engineDisplacementL ?? 0) <= filters.engineDisplacementMax,
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
  if (filters.surfaceMin > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesVehicleMileageMinStrict(l, filters.surfaceMin),
    );
  }
  if (filters.surfaceMax > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesVehicleMileageMaxStrict(l, filters.surfaceMax),
    );
  }
  if (filters.rooms.length > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesRoomsStrict(l.rooms, filters.rooms),
    );
  }
  if (filters.bathrooms.length > 0) {
    exactMatchListings = exactMatchListings.filter((l) =>
      matchesBathroomsStrict(l.bathrooms, filters.bathrooms),
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
