/**
 * Correspondances **strictes** pour le raffinage client (après fetch SQL).
 * Les filtres utilisateur viennent de `SearchFilters` (mileage km, portes). Les helpers
 * comparent des **nombres** : les valeurs proviennent du JSON véhicule canonique côté annonce.
 */
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

/**
 * Nombre de portes : même logique que les puces (dont « 4+ »).
 * `listingDoorCount` provient typiquement de `vehicle.doors` (résolu via canonicalVehicleAttributes).
 */
export function matchesDoorCountFilterStrict(
  listingDoorCount: number | null,
  selectedDoorCounts: number[],
): boolean {
  if (selectedDoorCounts.length === 0) return true;
  const b = listingDoorCount ?? -1;
  return selectedDoorCounts.some((fb) => {
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

/** Kilométrage max : `listingMileageKm` provient du JSON véhicule canonique. */
export function matchesMileageKmMaxStrict(listingMileageKm: number | null, maxKm: number): boolean {
  if (!maxKm || maxKm <= 0) return true;
  if (listingMileageKm == null || listingMileageKm <= 0) return true;
  return listingMileageKm <= maxKm;
}

/** Kilométrage min. Si l’annonce n’a pas de km connu, un filtre min actif exclut. */
export function matchesMileageKmMinStrict(listingMileageKm: number | null, minKm: number): boolean {
  if (!minKm || minKm <= 0) return true;
  if (listingMileageKm == null || listingMileageKm <= 0) return false;
  return listingMileageKm >= minKm;
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
