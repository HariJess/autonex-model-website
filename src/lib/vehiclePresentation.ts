import type { DisplayListing } from "@/types/listing";

export function formatVehicleMileage(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `${value.toLocaleString("fr-FR")} km`;
}

export function formatVehicleVersion(value: number | null | undefined): string | null {
  if (value == null || value < 0) return null;
  if (value === 0) return "Base";
  return `Version ${value}`;
}

export function formatVehicleDoors(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `${value}${value >= 4 ? "+" : ""} portes`;
}

export function getVehicleDisplayTitle(listing: DisplayListing): string {
  const vehicleHeadline = [listing.vehicle?.make, listing.vehicle?.model, listing.vehicle?.year]
    .filter(Boolean)
    .join(" ");
  return vehicleHeadline || listing.title;
}

export function getVehicleHeadline(listing: DisplayListing): string {
  return [listing.vehicle?.make, listing.vehicle?.model, listing.vehicle?.year].filter(Boolean).join(" ");
}

export function getVehicleMileageValue(listing: DisplayListing): number | null {
  return listing.vehicle?.mileageKm ?? listing.surface ?? null;
}

export function getVehicleDoorsValue(listing: DisplayListing): number | null {
  return listing.vehicle?.doors ?? listing.bathrooms ?? null;
}

export function getVehicleVersionValue(listing: DisplayListing): number | null {
  return listing.rooms ?? null;
}
