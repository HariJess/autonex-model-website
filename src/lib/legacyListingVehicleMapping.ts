/**
 * Couche unique legacy → sémantique véhicule pour les colonnes/table `listings` héritées d’Immonex.
 *
 * - Les **noms SQL** (`surface`, `rooms`, `bathrooms`, `toilets`) restent inchangés côté DB.
 * - Ce module concentre la **lecture** et les **formules** pour que le reste du code préfère
 *   les intitulés véhicule (kilométrage, portes, finition…) via des fonctions nommées.
 *
 * @see `docs/AUTONEX_LEGACY_SCHEMA.md`
 * @see `LEGACY_LISTINGS_COLUMN_SEMANTICS` dans `legacyListingsDbColumns.ts`
 */
import type { Tables } from "@/integrations/supabase/types";
import type { DisplayListing } from "@/types/listing";

function nonNegativeNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Lecture affichage carte / liste — alignée sur l’ancien comportement `vehiclePresentation` (pas de clamp). */
export function mileageKmLooseFromDisplayListing(listing: Pick<DisplayListing, "surface" | "vehicle">): number | null {
  return listing.vehicle?.mileageKm ?? listing.surface ?? null;
}

export function doorsLooseFromDisplayListing(listing: Pick<DisplayListing, "bathrooms" | "vehicle">): number | null {
  return listing.vehicle?.doors ?? listing.bathrooms ?? null;
}

/** Indice finition/version numérique stocké dans la colonne legacy `rooms`. */
export function trimVersionNumericLooseFromDisplayListing(listing: Pick<DisplayListing, "rooms">): number | null {
  return listing.rooms ?? null;
}

/**
 * Kilométrage pour attributs canoniques / estimation : JSON véhicule d’abord, sinon colonne `surface` (km).
 */
export function mileageKmCanonicalFromDisplayListing(listing: DisplayListing): number | null {
  const fromVehicle = nonNegativeNumberOrNull(listing.vehicle?.mileageKm);
  const legacySurfaceKm = nonNegativeNumberOrNull(listing.surface);
  return fromVehicle ?? legacySurfaceKm;
}

/**
 * Portes : `vehicle.doors` puis repli colonne legacy `bathrooms`.
 */
export function doorsCanonicalFromDisplayListing(listing: DisplayListing): number | null {
  const fromVehicle = nonNegativeNumberOrNull(listing.vehicle?.doors);
  return fromVehicle ?? nonNegativeNumberOrNull(listing.bathrooms);
}

/**
 * Places / sièges : JSON véhicule puis colonne legacy `toilets`.
 */
export function seatsCanonicalFromDisplayListing(listing: DisplayListing): number | null {
  const fromVehicle = nonNegativeNumberOrNull(listing.vehicle?.seats);
  return fromVehicle ?? nonNegativeNumberOrNull(listing.toilets);
}

/**
 * Chaîne formulaire publication : préfère `mileage_km` si présent, sinon repli `surface` (legacy).
 */
export function mileageKmFormStringFromListingRow(row: Pick<Tables<"listings">, "mileage_km" | "surface">): string {
  if (row.mileage_km != null) return String(row.mileage_km);
  if (row.surface != null) return String(row.surface);
  return "";
}

/**
 * Parse kilométrage depuis le champ publication encore nommé **`surface`** dans les types formulaire / payload
 * (héritage colonne DB `surface` = km).
 *
 * @param normalizeInt — même stratégie que dans `formToListingUpdate` (bornes kilomètres).
 */
export function parseMileageKmFromPublishSurfaceField(
  surfaceFormValue: string,
  normalizeInt: (value: string, min: number, max?: number) => number | null,
): number | null {
  return normalizeInt(surfaceFormValue, 0);
}
