/**
 * Correspondances **strictes** pour le raffinage client (après fetch SQL).
 *
 * **Canonique véhicule** : les filtres utilisateur viennent de `SearchFilters` (mileage km, indices finition, portes).
 *
 * **Legacy DB** : les annonces exposent encore `DisplayListing.surface` (= km), `rooms` (= indice finition/version),
 * `bathrooms` (= portes). Ces helpers comparent des **nombres**, pas les colonnes SQL ; les noms de paramètres
 * le signalent quand la valeur provient d’une colonne historique.
 *
 * @see `docs/AUTONEX_LEGACY_SCHEMA.md`
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
 * Indice finition/version : même logique que les puces recherche (base 0 … luxe 5+).
 * `listingTrimIndex` lit typiquement `listing.rooms` (nom de colonne DB historique).
 */
export function matchesTrimVersionFilterStrict(
  listingTrimIndex: number | null,
  selectedTrimIndices: number[],
): boolean {
  if (selectedTrimIndices.length === 0) return true;
  const r = listingTrimIndex ?? -1;
  return selectedTrimIndices.some((fr) => {
    if (fr === 5) return r >= 5;
    return r === fr;
  });
}

/**
 * Nombre de portes : même logique que les puces (dont « 4+ »).
 * `listingDoorCount` lit typiquement `listing.bathrooms` ou `vehicle.doors` selon le contexte appelant.
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

/**
 * Kilométrage max : `listingMileageKm` est en pratique `listing.surface` ou JSON véhicule résolu en amont.
 */
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
