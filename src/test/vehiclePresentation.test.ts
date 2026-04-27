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

describe("vehiclePresentation", () => {
  it("returns vehicle.mileageKm when present", () => {
    const listing = minimalListing({
      vehicle: { mileageKm: 12000 } as DisplayListing["vehicle"],
    });
    expect(getVehicleMileageValue(listing)).toBe(12000);
  });

  it("returns null when vehicle is absent", () => {
    const listing = minimalListing({});
    expect(getVehicleMileageValue(listing)).toBe(null);
  });

  it("returns vehicle.doors when present", () => {
    const listing = minimalListing({
      vehicle: { doors: 5 } as DisplayListing["vehicle"],
    });
    expect(getVehicleDoorsValue(listing)).toBe(5);
  });
});
