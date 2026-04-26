import { describe, expect, it } from "vitest";
import {
  mileageKmCanonicalFromDisplayListing,
  mileageKmFormStringFromListingRow,
  mileageKmLooseFromDisplayListing,
  doorsCanonicalFromDisplayListing,
  doorsLooseFromDisplayListing,
  parseMileageKmFromPublishSurfaceField,
  seatsCanonicalFromDisplayListing,
} from "@/lib/legacyListingVehicleMapping";
import type { DisplayListing } from "@/types/listing";

function baseListing(partial: Partial<DisplayListing>): DisplayListing {
  return {
    id: "x",
    title: "Test",
    description: null,
    type: "appartement",
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

describe("legacyListingVehicleMapping", () => {
  it("mileageKmLoose prefers vehicle JSON over legacy surface", () => {
    expect(
      mileageKmLooseFromDisplayListing(baseListing({ surface: 999, vehicle: { mileageKm: 120_000 } as DisplayListing["vehicle"] })),
    ).toBe(120_000);
    expect(mileageKmLooseFromDisplayListing(baseListing({ surface: 50_000 }))).toBe(50_000);
  });

  it("mileageKmCanonical clamps negatives and merges vehicle + legacy surface", () => {
    expect(mileageKmCanonicalFromDisplayListing(baseListing({ surface: -1 }))).toBe(null);
    expect(mileageKmCanonicalFromDisplayListing(baseListing({ surface: 80_000 }))).toBe(80_000);
    expect(
      mileageKmCanonicalFromDisplayListing(baseListing({ surface: 10, vehicle: { mileageKm: 90_000 } as NonNullable<DisplayListing["vehicle"]> })),
    ).toBe(90_000);
  });

  it("doorsCanonical falls back from vehicle.doors to legacy bathrooms", () => {
    expect(doorsCanonicalFromDisplayListing(baseListing({ bathrooms: 5 }))).toBe(5);
    expect(
      doorsCanonicalFromDisplayListing(
        baseListing({
          bathrooms: 5,
          vehicle: { doors: 4 } as NonNullable<DisplayListing["vehicle"]>,
        }),
      ),
    ).toBe(4);
  });

  it("doorsLoose matches canonical merge semantics for typical rows", () => {
    expect(doorsLooseFromDisplayListing(baseListing({ bathrooms: 5 }))).toBe(5);
    expect(doorsLooseFromDisplayListing(baseListing({ vehicle: { doors: 4 } as NonNullable<DisplayListing["vehicle"]>, bathrooms: 5 }))).toBe(4);
  });

  it("seatsCanonical merges vehicle seats and legacy toilets", () => {
    expect(seatsCanonicalFromDisplayListing(baseListing({ toilets: 7 }))).toBe(7);
    expect(seatsCanonicalFromDisplayListing(baseListing({ toilets: 7, vehicle: { seats: 5 } as NonNullable<DisplayListing["vehicle"]> }))).toBe(5);
  });

  it("mileageKmFormStringFromListingRow prefers mileage_km", () => {
    expect(mileageKmFormStringFromListingRow({ mileage_km: 120, surface: 999 })).toBe("120");
    expect(mileageKmFormStringFromListingRow({ mileage_km: null, surface: 999 })).toBe("999");
    expect(mileageKmFormStringFromListingRow({ mileage_km: null, surface: null })).toBe("");
  });

  it("parseMileageKmFromPublishSurfaceField delegates to normalizeInt", () => {
    const normalizeInt = (value: string, min: number, max?: number) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      const intVal = Math.floor(n);
      if (intVal < min) return null;
      if (typeof max === "number" && intVal > max) return null;
      return intVal;
    };
    expect(parseMileageKmFromPublishSurfaceField("45000", normalizeInt)).toBe(45000);
    // Aligné sur `Number("")` → 0 avec min 0 (champ vide = 0 km acceptable pour le parseur).
    expect(parseMileageKmFromPublishSurfaceField("", normalizeInt)).toBe(0);
  });
});
