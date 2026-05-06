import { describe, it, expect } from "vitest";
import { getDealMeta } from "@/lib/deals";
import type { DisplayListing } from "@/types/listing";

function makeListing(overrides: Partial<DisplayListing> = {}): DisplayListing {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Mazda MX-5 2020",
    description: null,
    type: "voiture",
    transaction: "vente",
    price_mga: 90_000_000,
    original_price_mga: null,
    price_eur: null,
    negotiable: false,
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
    created_at: "2026-04-01T00:00:00Z",
    owner_id: "owner-1",
    deal_active: false,
    deal_started_at: null,
    deal_ends_at: null,
    deal_duration_days: null,
    deal_discount_percent: null,
    deal_original_price_mga: null,
    deal_price_lock_until: null,
    ...overrides,
  };
}

describe("getDealMeta", () => {
  it("returns a verified deal when deal_active=true and deal_ends_at is in the future", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const listing = makeListing({
      price_mga: 90_000_000,
      deal_active: true,
      deal_started_at: new Date().toISOString(),
      deal_ends_at: future,
      deal_duration_days: 7,
      deal_discount_percent: 10,
      deal_original_price_mga: 100_000_000,
      deal_price_lock_until: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const meta = getDealMeta(listing);
    expect(meta).not.toBeNull();
    expect(meta!.isVerified).toBe(true);
    expect(meta!.discountPercent).toBe(10);
    expect(meta!.originalPriceMga).toBe(100_000_000);
    expect(meta!.endsAt).toBe(future);
  });

  it("falls back to legacy meta when deal_active=true but deal_ends_at is in the past", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const listing = makeListing({
      price_mga: 90_000_000,
      // Legacy organic snapshot still present
      original_price_mga: 95_000_000,
      // Deal officially active in DB but expired in time → fallback expected
      deal_active: true,
      deal_ends_at: past,
      deal_discount_percent: 10,
      deal_original_price_mga: 100_000_000,
    });

    const meta = getDealMeta(listing);
    expect(meta).not.toBeNull();
    expect(meta!.isVerified).toBe(false);
    // Fallback uses original_price_mga = 95M, current = 90M → ~5%
    expect(meta!.originalPriceMga).toBe(95_000_000);
    expect(meta!.discountPercent).toBe(5);
    expect(meta!.endsAt).toBeNull();
  });

  it("returns a non-verified meta from legacy original_price_mga when no deal is active", () => {
    const listing = makeListing({
      price_mga: 80_000_000,
      original_price_mga: 100_000_000,
      deal_active: false,
    });

    const meta = getDealMeta(listing);
    expect(meta).not.toBeNull();
    expect(meta!.isVerified).toBe(false);
    expect(meta!.originalPriceMga).toBe(100_000_000);
    expect(meta!.discountPercent).toBe(20);
    expect(meta!.endsAt).toBeNull();
  });

  it("returns null when no deal_* fields and no legacy original_price_mga", () => {
    const listing = makeListing({
      price_mga: 100_000_000,
      original_price_mga: null,
      deal_active: false,
    });

    expect(getDealMeta(listing)).toBeNull();
  });

  it("returns null when original_price_mga is set but <= price_mga (false discount)", () => {
    const listing = makeListing({
      price_mga: 100_000_000,
      original_price_mga: 80_000_000,
      deal_active: false,
    });

    expect(getDealMeta(listing)).toBeNull();
  });
});
