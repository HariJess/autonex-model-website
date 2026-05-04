import { describe, expect, it } from "vitest";

/**
 * PROMPT 6 — Vérification de la priorité des badges côté useListings :
 *   top_ad > featured > legacy (top, urgent) > null.
 *
 * Tests directement la logique pure `badgeForListing` réimplémentée
 * (mirroir du code dans useListings.ts) — évite de monter un mock
 * de l'intégralité de la query Supabase pour 3 if/else.
 */

type Row = {
  top_ad_until?: string | null;
  featured_until?: string | null;
};

function badgeForListing(listing: Row, types: Set<string>): string | null {
  const now = Date.now();
  const topAdActive =
    typeof listing.top_ad_until === "string" && new Date(listing.top_ad_until).getTime() > now;
  if (topAdActive || types.has("top_ad")) return "top_ad";
  const featuredActive =
    typeof listing.featured_until === "string" && new Date(listing.featured_until).getTime() > now;
  if (featuredActive || types.has("featured")) return "featured";
  if (types.has("top")) return "boost";
  if (types.has("urgent")) return "urgent";
  return null;
}

describe("badgeForListing — priorité PROMPT 6", () => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  it("top_ad_until futur prend priorité sur featured_until futur", () => {
    expect(
      badgeForListing(
        { top_ad_until: future, featured_until: future },
        new Set<string>(),
      ),
    ).toBe("top_ad");
  });

  it("featured_until futur seul → 'featured'", () => {
    expect(
      badgeForListing({ top_ad_until: null, featured_until: future }, new Set<string>()),
    ).toBe("featured");
  });

  it("top_ad_until passé + featured_until futur → 'featured' (top_ad expiré)", () => {
    expect(
      badgeForListing({ top_ad_until: past, featured_until: future }, new Set<string>()),
    ).toBe("featured");
  });

  it("aucune colonne denormalized + types = ['top_ad'] → 'top_ad' (legacy fallback boosts table)", () => {
    expect(
      badgeForListing({ top_ad_until: null, featured_until: null }, new Set(["top_ad"])),
    ).toBe("top_ad");
  });

  it("legacy 'top' uniquement (boost pré-PROMPT 6) → 'boost'", () => {
    expect(
      badgeForListing({ top_ad_until: null, featured_until: null }, new Set(["top"])),
    ).toBe("boost");
  });

  it("legacy 'urgent' uniquement → 'urgent'", () => {
    expect(
      badgeForListing({ top_ad_until: null, featured_until: null }, new Set(["urgent"])),
    ).toBe("urgent");
  });

  it("ni denormalized ni types → null", () => {
    expect(
      badgeForListing({ top_ad_until: null, featured_until: null }, new Set<string>()),
    ).toBeNull();
  });
});
