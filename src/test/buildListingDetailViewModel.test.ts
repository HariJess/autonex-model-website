import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { buildListingDetailViewModel } from "@/pages/listing-detail/buildListingDetailViewModel";
import type { DisplayListing } from "@/types/listing";

function minimalDisplayListing(overrides: Partial<DisplayListing>): DisplayListing {
  return {
    id: overrides.id ?? "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee",
    title: overrides.title ?? "Toyota Yaris",
    description: overrides.description ?? "Desc",
    type: overrides.type ?? "appartement",
    transaction: overrides.transaction ?? "vente",
    price_mga: overrides.price_mga ?? 10_000_000,
    price_eur: null,
    surface: null,
    bathrooms: null,
    toilets: null,
    ville: overrides.ville ?? "Antananarivo",
    region: overrides.region ?? null,
    arrondissement: overrides.arrondissement ?? null,
    quartier: overrides.quartier ?? null,
    quartier_libre: overrides.quartier_libre ?? null,
    lat: overrides.lat ?? null,
    lng: overrides.lng ?? null,
    features: overrides.features ?? [],
    images: overrides.images ?? ["/photo.jpg"],
    status: overrides.status ?? "active",
    views_count: overrides.views_count ?? 0,
    created_at: overrides.created_at ?? "2025-01-01T00:00:00.000Z",
    owner_id: overrides.owner_id ?? "ffffffff-ffff-4fff-ffff-ffffffffffff",
    original_price_mga: null,
    owner_name: overrides.owner_name ?? null,
    owner_phone: overrides.owner_phone ?? null,
    has_whatsapp_contact: overrides.has_whatsapp_contact ?? false,
    agency_name: overrides.agency_name ?? null,
    agency_slug: overrides.agency_slug ?? null,
    agency_logo: overrides.agency_logo ?? null,
    agency_verified: overrides.agency_verified ?? false,
    badge: overrides.badge ?? null,
    video_url: overrides.video_url ?? null,
    virtual_tour_url: overrides.virtual_tour_url ?? null,
    internal_ref: overrides.internal_ref ?? null,
    is_new_program: overrides.is_new_program ?? false,
    rejection_reason: overrides.rejection_reason ?? null,
    vehicle: overrides.vehicle ?? {
      make: "Toyota",
      model: "Yaris",
      year: 2018,
      mileageKm: 80_000,
      fuel: "Essence",
      transmission: "Boîte manuelle",
      drivetrain: null,
      doors: null,
      bodyStyle: null,
      rentalMode: null,
      seats: 5,
      exteriorColor: null,
      engineDisplacementL: 1.3,
      interiorColor: null,
      availabilityStatus: null,
      isElectric: false,
      isHybrid: false,
      condition: "occasion",
      sellerType: "particulier",
    },
    ...overrides,
  };
}

describe("buildListingDetailViewModel", () => {
  const t = ((key: string, defaultValue?: string) => defaultValue ?? key) as TFunction;

  it("falls back image list to placeholder when empty", () => {
    const vm = buildListingDetailViewModel({
      listing: minimalDisplayListing({ images: [] }),
      t,
      isOwner: false,
      showAllSpecsMobile: false,
      showAllFeaturesMobile: false,
    });
    expect(vm.images).toEqual(["/placeholder.svg"]);
    expect(vm.canonical).toContain("/annonce/");
  });

  it("includes Product JSON-LD with price and locality", () => {
    const vm = buildListingDetailViewModel({
      listing: minimalDisplayListing({ ville: "Antsirabe" }),
      t,
      isOwner: false,
      showAllSpecsMobile: false,
      showAllFeaturesMobile: false,
    });
    expect(vm.listingJsonLd["@type"]).toBe("Product");
    expect(vm.listingJsonLd.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "MGA",
    });
    expect(vm.listingDescription.length).toBeGreaterThan(0);
  });

  it("slices spec rows on mobile when collapsed vs expanded", () => {
    const listing = minimalDisplayListing({});
    const collapsed = buildListingDetailViewModel({
      listing,
      t,
      isOwner: false,
      showAllSpecsMobile: false,
      showAllFeaturesMobile: false,
    });
    const expanded = buildListingDetailViewModel({
      listing,
      t,
      isOwner: false,
      showAllSpecsMobile: true,
      showAllFeaturesMobile: false,
    });
    expect(expanded.visibleSpecRowsMobile.length).toBe(expanded.vehicleSpecRows.length);
    expect(collapsed.visibleSpecRowsMobile.length).toBe(Math.min(8, collapsed.vehicleSpecRows.length));
  });
});
