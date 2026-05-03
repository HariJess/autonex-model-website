import { describe, it, expect } from "vitest";
import {
  LISTING_PUBLISH_CREDIT_COST,
  BOOST_CREDIT_COSTS,
  AGENCY_SPOTLIGHT_CREDIT_COST,
  totalBoostCredits,
  totalPublicationCredits,
  formatAriary,
  CREDIT_PACKS_CANONICAL,
  MONETIZATION_PLACEMENTS,
  MONETIZATION_SLOT_META,
} from "@/config/monetization";

describe("totalBoostCredits", () => {
  it("retourne 0 si aucun boost sélectionné", () => {
    expect(totalBoostCredits([])).toBe(0);
  });

  it("calcule le coût d'un seul boost", () => {
    expect(totalBoostCredits(["urgent"])).toBe(BOOST_CREDIT_COSTS.urgent);
  });

  it("calcule le coût de plusieurs boosts", () => {
    const total = totalBoostCredits(["urgent", "featured", "top"]);
    expect(total).toBe(
      BOOST_CREDIT_COSTS.urgent + BOOST_CREDIT_COSTS.featured + BOOST_CREDIT_COSTS.top
    );
  });

  it("somme correctement les 4 boosts", () => {
    const total = totalBoostCredits(["urgent", "daily_bump", "featured", "top"]);
    const expected =
      BOOST_CREDIT_COSTS.urgent +
      BOOST_CREDIT_COSTS.daily_bump +
      BOOST_CREDIT_COSTS.featured +
      BOOST_CREDIT_COSTS.top;
    expect(total).toBe(expected);
  });
});

describe("totalPublicationCredits", () => {
  it("sans boost, sans spotlight = coût de publication seul", () => {
    expect(totalPublicationCredits([])).toBe(LISTING_PUBLISH_CREDIT_COST);
  });

  it("avec un boost urgent, sans spotlight", () => {
    const total = totalPublicationCredits(["urgent"]);
    expect(total).toBe(LISTING_PUBLISH_CREDIT_COST + BOOST_CREDIT_COSTS.urgent);
  });

  it("avec tous les boosts et spotlight agence", () => {
    const total = totalPublicationCredits(
      ["urgent", "daily_bump", "featured", "top"],
      { agencySpotlight: true }
    );
    const expected =
      LISTING_PUBLISH_CREDIT_COST +
      BOOST_CREDIT_COSTS.urgent +
      BOOST_CREDIT_COSTS.daily_bump +
      BOOST_CREDIT_COSTS.featured +
      BOOST_CREDIT_COSTS.top +
      AGENCY_SPOTLIGHT_CREDIT_COST;
    expect(total).toBe(expected);
  });

  it("spotlight sans boost", () => {
    const total = totalPublicationCredits([], { agencySpotlight: true });
    expect(total).toBe(LISTING_PUBLISH_CREDIT_COST + AGENCY_SPOTLIGHT_CREDIT_COST);
  });

  it("agencySpotlight: false retourne pas le supplément", () => {
    const total = totalPublicationCredits([], { agencySpotlight: false });
    expect(total).toBe(LISTING_PUBLISH_CREDIT_COST);
  });
});

describe("formatAriary", () => {
  it("formate un montant simple", () => {
    const formatted = formatAriary(25000);
    expect(formatted).toContain("Ar");
    expect(formatted).toMatch(/25[\s\u202F\u00A0]?000/); // espaces possibles
  });

  it("gère le montant zéro", () => {
    expect(formatAriary(0)).toContain("0");
    expect(formatAriary(0)).toContain("Ar");
  });

  it("formate un grand montant", () => {
    const formatted = formatAriary(1_000_000);
    expect(formatted).toContain("Ar");
  });
});

describe("CREDIT_PACKS_CANONICAL", () => {
  it("contient 4 packs (post-PROMPT 1 : discover/standard/pro/power)", () => {
    expect(CREDIT_PACKS_CANONICAL).toHaveLength(4);
  });

  it("a des sort_order uniques et croissants", () => {
    const orders = CREDIT_PACKS_CANONICAL.map((p) => p.sort_order);
    expect(new Set(orders).size).toBe(orders.length); // unicité
    expect([...orders].sort((a, b) => a - b)).toEqual(orders); // déjà croissant
  });

  it("a des crédits croissants", () => {
    const credits = CREDIT_PACKS_CANONICAL.map((p) => p.credits_amount);
    expect([...credits].sort((a, b) => a - b)).toEqual(credits);
  });

  it("tous les packs ont des prix positifs", () => {
    for (const pack of CREDIT_PACKS_CANONICAL) {
      expect(pack.price_mga).toBeGreaterThan(0);
      expect(pack.credits_amount).toBeGreaterThan(0);
    }
  });

  it("les IDs sont uniques", () => {
    const ids = CREDIT_PACKS_CANONICAL.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("MONETIZATION_SLOT_META", () => {
  it("couvre toutes les clés de MONETIZATION_PLACEMENTS", () => {
    const placementKeys = Object.keys(MONETIZATION_PLACEMENTS).sort();
    const metaKeys = Object.keys(MONETIZATION_SLOT_META).sort();
    expect(metaKeys).toEqual(placementKeys);
  });

  it("sépare bien les familles agence/listing et partenaires externes", () => {
    expect(MONETIZATION_SLOT_META.searchSidebar.family).toBe("agency_listing");
    expect(MONETIZATION_SLOT_META.homeBillboard.family).toBe("partner_advertising");
    expect(MONETIZATION_SLOT_META.listingRelatedPromoted.family).toBe("neutral");
  });
});
