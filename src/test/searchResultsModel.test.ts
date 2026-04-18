import { describe, expect, it } from "vitest";
import { buildSearchResultsModel } from "@/pages/search/searchResultsModel";
import type { DisplayListing } from "@/types/listing";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";

function minimalListing(over: Partial<DisplayListing>): DisplayListing {
  return {
    id: over.id ?? "00000000-0000-4000-8000-000000000001",
    title: "Test",
    description: "",
    type: "voiture",
    transaction: "vente",
    price_mga: 1,
    price_eur: null,
    surface: null,
    rooms: null,
    bathrooms: null,
    toilets: null,
    ville: "Antananarivo",
    region: null,
    arrondissement: null,
    quartier: null,
    quartier_libre: null,
    lat: null,
    lng: null,
    features: [],
    images: [],
    status: "active",
    views_count: 0,
    created_at: new Date().toISOString(),
    owner_id: "00000000-0000-4000-8000-000000000002",
    original_price_mga: null,
    owner_name: null,
    owner_phone: null,
    has_whatsapp_contact: false,
    agency_name: null,
    agency_slug: null,
    agency_logo: null,
    agency_verified: false,
    badge: null,
    video_url: null,
    virtual_tour_url: null,
    internal_ref: null,
    is_new_program: false,
    rejection_reason: null,
    vehicle: {
      mileageKm: 50_000,
      fuel: "Essence",
      transmission: "Manuelle",
      drivetrain: null,
      condition: "Bon état",
      sellerType: "particulier",
      make: "Toyota",
      model: "Yaris",
      year: 2018,
      exteriorColor: null,
      engineDisplacementL: 1.3,
      bodyStyle: null,
      rentalMode: null,
      seats: null,
      availabilityStatus: null,
      isElectric: false,
      isHybrid: false,
      isNewProgram: false,
    },
    ...over,
  };
}

describe("buildSearchResultsModel", () => {
  it("keeps equipped count equal to db rows when no equipment filter (SQL-backed filters trusted)", () => {
    const listings = [minimalListing({ id: "a" }), minimalListing({ id: "b", price_mga: 2 })];
    const model = buildSearchResultsModel({
      dbListings: listings,
      filters: { ...EMPTY_SEARCH_FILTERS, fuels: ["Essence"] },
      sort: "recent",
    });
    expect(model.equippedListings).toHaveLength(2);
  });

  it("filters equipped when equipments require features", () => {
    const listings = [
      minimalListing({ id: "a", features: ["GPS"] }),
      minimalListing({ id: "b", features: [] }),
    ];
    const model = buildSearchResultsModel({
      dbListings: listings,
      filters: { ...EMPTY_SEARCH_FILTERS, equipments: ["GPS"] },
      sort: "recent",
    });
    expect(model.equippedListings).toHaveLength(1);
    expect(model.equippedListings[0].id).toBe("a");
  });
});
