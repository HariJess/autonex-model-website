import { describe, expect, it } from "vitest";
import type { DisplayListing } from "@/types/listing";
import { getVehicleDoorsValue, getVehicleMileageValue } from "@/lib/vehiclePresentation";

function minimalListing(partial: Partial<DisplayListing>): DisplayListing {
  return {
    id: "x",
    title: "t",
    description: null,
    type: "terrain",
    transaction: "vente",
    price_mga: 1,
    price_eur: null,
    surface: null,
    bathrooms: null,
    ville: null,
    region: null,
    arrondissement: null,
    quartier: null,
    quartier_libre: null,
    lat: null,
    lng: null,
    features: [],
    images: [],
    status: null,
    views_count: null,
    created_at: null,
    owner_id: "u",
    ...partial,
  };
}

describe("vehiclePresentation legacy fallbacks", () => {
  it("prefers vehicle JSON over legacy columns", () => {
    const listing = minimalListing({
      surface: 99999,
      vehicle: { mileageKm: 12000 } as DisplayListing["vehicle"],
    });
    expect(getVehicleMileageValue(listing)).toBe(12000);
  });

  it("falls back surface → mileage when vehicle absent", () => {
    const listing = minimalListing({ surface: 45000 });
    expect(getVehicleMileageValue(listing)).toBe(45000);
  });

  it("falls back bathrooms → doors when vehicle absent", () => {
    const listing = minimalListing({ bathrooms: 5 });
    expect(getVehicleDoorsValue(listing)).toBe(5);
  });

});
