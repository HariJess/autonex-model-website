/**
 * Affichage carte annonce — préfère `listing.vehicle` lorsque présent ; sinon repli vers les colonnes DB
 * encore nommées comme à l’époque immobilière (`surface`, `rooms`, `bathrooms`).
 * La lecture détaillée est centralisée dans `legacyListingVehicleMapping.ts`.
 */
import {
  doorsLooseFromDisplayListing,
  mileageKmLooseFromDisplayListing,
  trimVersionNumericLooseFromDisplayListing,
} from "@/lib/legacyListingVehicleMapping";
import type { DisplayListing } from "@/types/listing";
import { getVehicleMakeLabel } from "@/data/automotiveCatalog";
import { getVehicleModelLabel } from "@/data/vehicleModelsCatalog";

export function formatVehicleMileage(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `${value.toLocaleString("fr-FR")} km`;
}

export function formatVehicleVersion(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `Version ${value}`;
}

export function formatVehicleDoors(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `${value}${value >= 4 ? "+" : ""} portes`;
}

export function formatVehicleEngineDisplacement(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1)} L`;
}

export function getVehicleDisplayTitle(listing: DisplayListing): string {
  // Lot 9.3 — Capitalisation officielle via catalogues marque + modèle.
  const make = listing.vehicle?.make;
  const model = listing.vehicle?.model;
  const vehicleHeadline = [
    getVehicleMakeLabel(make),
    getVehicleModelLabel(make, model),
    listing.vehicle?.year,
  ]
    .filter(Boolean)
    .join(" ");
  return vehicleHeadline || listing.title;
}

export function getVehicleHeadline(listing: DisplayListing): string {
  const make = listing.vehicle?.make;
  const model = listing.vehicle?.model;
  return [
    getVehicleMakeLabel(make),
    getVehicleModelLabel(make, model),
    listing.vehicle?.year,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Kilométrage : JSON `vehicle` puis colonne legacy `surface` (= km). */
export function getVehicleMileageValue(listing: DisplayListing): number | null {
  return mileageKmLooseFromDisplayListing(listing);
}

/** Portes : JSON `vehicle` puis colonne legacy `bathrooms`. */
export function getVehicleDoorsValue(listing: DisplayListing): number | null {
  return doorsLooseFromDisplayListing(listing);
}

/** Version / finition : colonne legacy `rooms` (numérique). */
export function getVehicleVersionValue(listing: DisplayListing): number | null {
  return trimVersionNumericLooseFromDisplayListing(listing);
}
