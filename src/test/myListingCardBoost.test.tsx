import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MyListingRow } from "@/features/listings/hooks/useMyListings";

/**
 * PROMPT 6 — MyListingCard wire boost button + active boost badges.
 *  - Click sur "Booster" ouvre BoostModal
 *  - Badge ⭐ rendu si featured_until futur
 *  - Badge 👑 rendu si top_ad_until futur
 *  - Aucun badge si timestamps NULL ou passés
 */

vi.mock("@/hooks/useCreditsBalance", () => ({
  useCreditsBalance: () => ({ data: 100_000, isPending: false }),
}));

vi.mock("@/hooks/boosts/useApplyBoost", () => ({
  useApplyBoost: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      fallback?: string | { defaultValue?: string },
      opts?: Record<string, unknown>,
    ) => {
      const dv = typeof fallback === "string" ? fallback : fallback?.defaultValue ?? "";
      if (!opts) return dv;
      return Object.entries(opts).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        dv,
      );
    },
  }),
}));

const baseListing: MyListingRow = {
  id: "listing-1",
  title: "Mon test annonce",
  price_mga: 50_000,
  ville: "Antananarivo",
  type: "voiture",
  status: "active",
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  sold_at: null,
  views_count: 10,
  contact_count: 2,
  favorite_count: 1,
  renewal_count: 0,
  created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
  cover_url: null,
  sold_price: null,
  last_bumped_at: null,
  featured_until: null,
  top_ad_until: null,
  transaction: "vente",
  deal_active: null,
  deal_discount_percent: null,
  deal_ends_at: null,
  deal_original_price_mga: null,
};

async function renderCard(listing: MyListingRow) {
  const { MyListingCard } = await import("@/features/listings/components/MyListingCard");
  return render(
    <MemoryRouter>
      <MyListingCard
        listing={listing}
        onRenew={() => {}}
        onMarkSold={() => {}}
        onDeleteDraft={() => {}}
      />
    </MemoryRouter>,
  );
}

describe("MyListingCard boost wiring (PROMPT 6)", () => {
  it("click sur 'Booster' ouvre BoostModal (boost-card-bump visible)", async () => {
    await renderCard(baseListing);
    const boostButton = screen.getByTestId(`my-listing-${baseListing.id}-boost`) as HTMLButtonElement;
    expect(boostButton.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(boostButton);
    });
    expect(screen.getByTestId("boost-card-bump")).toBeTruthy();
  });

  it("featured_until futur → badge featured rendu", async () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    await renderCard({ ...baseListing, featured_until: future });
    expect(screen.getByTestId(`my-listing-${baseListing.id}-featured-badge`)).toBeTruthy();
    expect(screen.queryByTestId(`my-listing-${baseListing.id}-top-ad-badge`)).toBeNull();
  });

  it("top_ad_until futur → badge top_ad rendu", async () => {
    const future = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString();
    await renderCard({ ...baseListing, top_ad_until: future });
    expect(screen.getByTestId(`my-listing-${baseListing.id}-top-ad-badge`)).toBeTruthy();
  });

  it("featured_until passé → pas de badge featured", async () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await renderCard({ ...baseListing, featured_until: past });
    expect(screen.queryByTestId(`my-listing-${baseListing.id}-featured-badge`)).toBeNull();
  });
});
