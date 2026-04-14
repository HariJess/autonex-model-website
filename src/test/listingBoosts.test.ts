import { describe, it, expect } from "vitest";
import {
  partitionBoostRowsByListing,
  isListingEligibleForPostPublishBoost,
  purchasableBoostTypesForListing,
  purchaseListingBoostsErrorMessage,
  type ListingBoostPartition,
} from "@/lib/listingBoosts";
import { BOOST_CREDIT_COSTS, BOOST_ORDER, totalBoostCredits } from "@/config/monetization";

describe("partitionBoostRowsByListing", () => {
  const now = new Date("2026-04-14T12:00:00.000Z");

  it("sépare actifs et expirés par annonce", () => {
    const rows = [
      { listing_id: "a", type: "urgent" as const, ends_at: "2026-05-01T00:00:00.000Z" },
      { listing_id: "a", type: "top" as const, ends_at: "2026-03-01T00:00:00.000Z" },
      { listing_id: "b", type: "featured" as const, ends_at: "2026-03-15T00:00:00.000Z" },
    ];
    const m = partitionBoostRowsByListing(rows, now);
    const a = m.get("a");
    expect(a?.active.map((x) => x.type)).toEqual(["urgent"]);
    expect(a?.expired.map((x) => x.type)).toEqual(["top"]);
    expect(m.get("b")?.active).toEqual([]);
    expect(m.get("b")?.expired.map((x) => x.type)).toEqual(["featured"]);
  });
});

describe("isListingEligibleForPostPublishBoost", () => {
  it("accepte active et paused seulement", () => {
    expect(isListingEligibleForPostPublishBoost("active")).toBe(true);
    expect(isListingEligibleForPostPublishBoost("paused")).toBe(true);
    expect(isListingEligibleForPostPublishBoost("pending_review")).toBe(false);
    expect(isListingEligibleForPostPublishBoost("draft")).toBe(false);
    expect(isListingEligibleForPostPublishBoost(null)).toBe(false);
  });
});

describe("purchasableBoostTypesForListing", () => {
  it("exclut les types déjà actifs", () => {
    const p: ListingBoostPartition = {
      active: [{ type: "urgent", ends_at: "2026-12-01T00:00:00.000Z" }],
      expired: [],
    };
    const avail = purchasableBoostTypesForListing(p);
    expect(avail).toEqual(BOOST_ORDER.filter((k) => k !== "urgent"));
  });

  it("retourne tout le catalogue si aucun actif", () => {
    expect(purchasableBoostTypesForListing(undefined)).toEqual([...BOOST_ORDER]);
  });
});

describe("totalBoostCredits (panier boosts seuls)", () => {
  it("somme cohérente avec BOOST_CREDIT_COSTS", () => {
    const sel = ["urgent", "featured"] as const;
    expect(totalBoostCredits([...sel])).toBe(BOOST_CREDIT_COSTS.urgent + BOOST_CREDIT_COSTS.featured);
  });
});

describe("purchaseListingBoostsErrorMessage", () => {
  it("mappe insufficient_credits", () => {
    const msg = purchaseListingBoostsErrorMessage('P0001: insufficient_credits');
    expect(msg).toMatch(/crédits/i);
  });
});
