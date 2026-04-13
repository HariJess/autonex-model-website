import type { DisplayListing } from "@/types/listing";
import type { SearchFilters } from "@/types/search";

/** User selected sub-areas (arrondissements and/or quartiers). Whole city = none selected. */
export function matchesLocationSubareas(l: DisplayListing, f: SearchFilters): boolean {
  if (!f.ville) return true;
  if (l.ville !== f.ville) return false;
  if (f.arrondissements.length === 0 && f.quartiers.length === 0) return true;

  const arrOk = f.arrondissements.some((an) => {
    const ln = (l.arrondissement ?? "").toLowerCase().trim();
    const anl = an.toLowerCase().trim();
    if (!ln || !anl) return false;
    return ln.includes(anl) || anl.includes(ln);
  });

  const qOk = f.quartiers.some((q) => {
    const ql = q.toLowerCase().trim();
    if (!ql) return false;
    return (
      (l.quartier?.toLowerCase() ?? "").includes(ql) || (l.quartier_libre?.toLowerCase() ?? "").includes(ql)
    );
  });

  return arrOk || qOk;
}

/** Strict room chips: Studio=0, 1…4, 5+=5 */
export function matchesRoomsStrict(listingRooms: number | null, filterRooms: number[]): boolean {
  if (filterRooms.length === 0) return true;
  const r = listingRooms ?? -1;
  return filterRooms.some((fr) => {
    if (fr === 5) return r >= 5;
    return r === fr;
  });
}

export function matchesBathroomsStrict(listingBath: number | null, filterBath: number[]): boolean {
  if (filterBath.length === 0) return true;
  const b = listingBath ?? -1;
  return filterBath.some((fb) => {
    if (fb === 4) return b >= 4;
    return b === fb;
  });
}

export function matchesPriceMaxStrict(priceMga: number, priceMax: number): boolean {
  if (!priceMax || priceMax <= 0) return true;
  return priceMga <= priceMax;
}

export function matchesPriceMinStrict(priceMga: number, priceMin: number): boolean {
  if (!priceMin || priceMin <= 0) return true;
  return priceMga >= priceMin;
}

export function matchesSurfaceMaxStrict(surface: number | null, surfaceMax: number): boolean {
  if (!surfaceMax || surfaceMax <= 0) return true;
  if (surface == null || surface <= 0) return true;
  return surface <= surfaceMax;
}

export function matchesSurfaceMinStrict(surface: number | null, surfaceMin: number): boolean {
  if (!surfaceMin || surfaceMin <= 0) return true;
  if (surface == null || surface <= 0) return false;
  return surface >= surfaceMin;
}

/** Short label for « résultat proche » cards (caller passes i18n strings if needed). */
export function describeCloseMatchKind(
  listing: DisplayListing,
  filters: SearchFilters,
): "budget" | "location" | "approx" {
  if (filters.priceMax > 0 && listing.price_mga > filters.priceMax) return "budget";
  if (
    filters.ville &&
    (filters.arrondissements.length > 0 || filters.quartiers.length > 0) &&
    !matchesLocationSubareas(listing, filters)
  ) {
    return "location";
  }
  return "approx";
}
