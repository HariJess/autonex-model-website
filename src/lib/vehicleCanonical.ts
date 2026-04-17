import type { TablesUpdate } from "@/integrations/supabase/types";
import type { DisplayListing } from "@/types/listing";

export type CanonicalVehicleAttributes = {
  make: string | null;
  model: string | null;
  trimOrVersion: string | null;
  year: number | null;
  mileageKm: number | null;
  fuel: string | null;
  transmission: string | null;
  bodyStyle: string | null;
  drivetrain: string | null;
  doors: number | null;
  seats: number | null;
  engineDisplacementL: number | null;
  condition: "neuf" | "occasion" | null;
  sellerType: "concessionnaire" | "particulier" | null;
  city: string | null;
  locality: string | null;
};

export type LegacyVehicleMirrorFields = Pick<TablesUpdate<"listings">, "surface" | "rooms" | "bathrooms" | "toilets">;

function nonNegativeNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function textOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getCanonicalVehicleAttributes(listing: DisplayListing): CanonicalVehicleAttributes {
  const mileageKmFromVehicle = nonNegativeNumberOrNull(listing.vehicle?.mileageKm);
  const legacySurfaceFallbackKm = nonNegativeNumberOrNull(listing.surface);
  const canonicalMileageKm = mileageKmFromVehicle ?? legacySurfaceFallbackKm;

  return {
    make: textOrNull(listing.vehicle?.make),
    model: textOrNull(listing.vehicle?.model),
    trimOrVersion: listing.rooms != null ? String(listing.rooms) : null,
    year: nonNegativeNumberOrNull(listing.vehicle?.year),
    mileageKm: canonicalMileageKm,
    fuel: textOrNull(listing.vehicle?.fuel),
    transmission: textOrNull(listing.vehicle?.transmission),
    bodyStyle: textOrNull(listing.vehicle?.bodyStyle),
    drivetrain: textOrNull(listing.vehicle?.drivetrain),
    doors: nonNegativeNumberOrNull(listing.vehicle?.doors),
    seats: nonNegativeNumberOrNull(listing.vehicle?.seats),
    engineDisplacementL: nonNegativeNumberOrNull(listing.vehicle?.engineDisplacementL),
    condition: listing.vehicle?.condition ?? null,
    sellerType: listing.vehicle?.sellerType ?? null,
    city: textOrNull(listing.ville),
    locality: textOrNull(listing.quartier ?? listing.quartier_libre ?? null),
  };
}

export function buildLegacyMirrorFieldsFromVehicle(params: {
  mileageKm: number | null;
  trimOrVersion: number | null;
  doors: number | null;
  seats: number | null;
}): LegacyVehicleMirrorFields {
  return {
    // Legacy mirrors kept for compatibility with current schema/query paths.
    surface: params.mileageKm,
    rooms: params.trimOrVersion,
    bathrooms: params.doors,
    toilets: params.seats,
  };
}
