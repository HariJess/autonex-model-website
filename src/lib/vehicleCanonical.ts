import type { TablesUpdate } from "@/integrations/supabase/types";
import type { CanonicalVehicleInfo, DisplayListing } from "@/types/listing";

export type CanonicalVehicleAttributes = CanonicalVehicleInfo & {
  /** Legacy trim/version mirror (historical schema used `rooms` as string holder). */
  trimOrVersion: string | null;
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
  const v = listing.vehicle;
  const mileageKmFromVehicle = nonNegativeNumberOrNull(v?.mileageKm);
  const legacySurfaceFallbackKm = nonNegativeNumberOrNull(listing.surface);
  const canonicalMileageKm = mileageKmFromVehicle ?? legacySurfaceFallbackKm;

  return {
    make: textOrNull(v?.make),
    model: textOrNull(v?.model),
    trimOrVersion: listing.rooms != null ? String(listing.rooms) : null,
    year: nonNegativeNumberOrNull(v?.year),
    mileageKm: canonicalMileageKm,
    fuel: textOrNull(v?.fuel),
    transmission: textOrNull(v?.transmission),
    bodyStyle: textOrNull(v?.bodyStyle),
    drivetrain: textOrNull(v?.drivetrain),
    doors: nonNegativeNumberOrNull(v?.doors),
    seats: nonNegativeNumberOrNull(v?.seats),
    engineDisplacementL: nonNegativeNumberOrNull(v?.engineDisplacementL),
    exteriorColor: textOrNull(v?.exteriorColor),
    interiorColor: textOrNull(v?.interiorColor),
    availabilityStatus: textOrNull(v?.availabilityStatus),
    rentalMode: textOrNull(v?.rentalMode),
    isElectric: v?.isElectric ?? false,
    isHybrid: v?.isHybrid ?? false,
    condition: v?.condition ?? null,
    sellerType: v?.sellerType ?? null,
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
    surface: params.mileageKm,
    rooms: params.trimOrVersion,
    bathrooms: params.doors,
    toilets: params.seats,
  };
}
