import type { DisplayListing } from "@/types/listing";
import { getVehicleMakeLabel } from "@/data/automotiveCatalog";
import { getVehicleModelLabel } from "@/data/vehicleModelsCatalog";

export function formatVehicleMileage(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `${value.toLocaleString("fr-FR")} km`;
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

export function getVehicleMileageValue(listing: DisplayListing): number | null {
  return listing.vehicle?.mileageKm ?? null;
}

export function getVehicleDoorsValue(listing: DisplayListing): number | null {
  return listing.vehicle?.doors ?? null;
}
