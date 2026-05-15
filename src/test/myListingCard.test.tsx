import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MyListingCard } from "@/features/listings/components/MyListingCard";
import type { MyListingRow } from "@/features/listings/hooks/useMyListings";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | { defaultValue?: string }, opts?: Record<string, unknown>) => {
      const dv = typeof fallback === "string" ? fallback : fallback?.defaultValue ?? "";
      if (!opts) return dv;
      return Object.entries(opts).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        dv,
      );
    },
  }),
}));

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

function makeListing(overrides: Partial<MyListingRow>): MyListingRow {
  return {
    id: "test-id",
    title: "Test Listing",
    price_mga: 10_000_000,
    cover_url: null,
    ville: "Antananarivo",
    type: null,
    status: "active",
    expires_at: new Date(NOW + 30 * DAY_MS).toISOString(),
    published_at: new Date(NOW - 5 * DAY_MS).toISOString(),
    sold_at: null,
    sold_price: null,
    views_count: 10,
    contact_count: 2,
    favorite_count: 3,
    renewal_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    transaction: "vente",
    last_bumped_at: null,
    featured_until: null,
    top_ad_until: null,
    deal_active: null,
    deal_discount_percent: null,
    deal_ends_at: null,
    deal_original_price_mga: null,
    ...overrides,
  };
}

function renderCard(listing: MyListingRow) {
  return render(
    <MemoryRouter>
      <MyListingCard listing={listing} onRenew={vi.fn()} onMarkSold={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("MyListingCard variants", () => {
  it("Active : countdown + boutons Booster/Modifier/Marquer vendue", () => {
    const listing = makeListing({ status: "active" });
    renderCard(listing);
    expect(screen.getByTestId(`my-listing-${listing.id}-badge`).textContent).toMatch(/Active/);
    expect(screen.getByTestId(`my-listing-${listing.id}-countdown`)).toBeTruthy();
    expect(screen.getByTestId(`my-listing-${listing.id}-boost`)).toBeTruthy();
    expect(screen.getByTestId(`my-listing-${listing.id}-edit`)).toBeTruthy();
    expect(screen.getByTestId(`my-listing-${listing.id}-mark-sold`)).toBeTruthy();
    // Pas de bouton renouveler sur active classique
    expect(screen.queryByTestId(`my-listing-${listing.id}-renew`)).toBeNull();
  });

  it("Expiring soon (J-2) : countdown rouge urgent + Renouveler visible", () => {
    const listing = makeListing({
      status: "active",
      expires_at: new Date(NOW + 2 * DAY_MS).toISOString(),
    });
    renderCard(listing);
    const countdown = screen.getByTestId(`my-listing-${listing.id}-countdown`);
    expect(countdown.textContent).toMatch(/2/);
    expect(countdown.className).toMatch(/text-red-600/);
    expect(screen.getByTestId(`my-listing-${listing.id}-renew`)).toBeTruthy();
    expect(screen.getByTestId(`my-listing-${listing.id}-mark-sold`)).toBeTruthy();
  });

  it("Expired : Renouveler visible avec coût, pas de Marquer vendue", () => {
    const listing = makeListing({
      status: "expired",
      expires_at: new Date(NOW - 1 * DAY_MS).toISOString(),
    });
    renderCard(listing);
    expect(screen.getByTestId(`my-listing-${listing.id}-badge`).textContent).toMatch(/Expirée/);
    const renewBtn = screen.getByTestId(`my-listing-${listing.id}-renew`);
    expect(renewBtn.textContent).toMatch(/Renouveler/);
    expect(renewBtn.textContent).toMatch(/15/);
    expect(screen.queryByTestId(`my-listing-${listing.id}-mark-sold`)).toBeNull();
    expect(screen.queryByTestId(`my-listing-${listing.id}-boost`)).toBeNull();
  });

  it("Sold : badge bleu + 'Vendue le X' + juste 'Voir détails'", () => {
    const listing = makeListing({
      status: "sold",
      sold_at: new Date(NOW - 1 * DAY_MS).toISOString(),
      sold_price: 9_500_000,
      expires_at: null,
    });
    renderCard(listing);
    expect(screen.getByTestId(`my-listing-${listing.id}-badge`).textContent).toMatch(/Vendue/);
    expect(screen.getByTestId(`my-listing-${listing.id}-countdown`).textContent).toMatch(/Vendue le/);
    expect(screen.getByTestId(`my-listing-${listing.id}-view`)).toBeTruthy();
    // Aucune action propriétaire
    expect(screen.queryByTestId(`my-listing-${listing.id}-renew`)).toBeNull();
    expect(screen.queryByTestId(`my-listing-${listing.id}-mark-sold`)).toBeNull();
    expect(screen.queryByTestId(`my-listing-${listing.id}-edit`)).toBeNull();
  });

  it("Draft : 'Continuer la rédaction' + pas de countdown/metrics", () => {
    const listing = makeListing({
      status: "draft",
      expires_at: null,
      published_at: null,
    });
    renderCard(listing);
    expect(screen.getByTestId(`my-listing-${listing.id}-badge`).textContent).toMatch(/Brouillon/);
    expect(screen.getByTestId(`my-listing-${listing.id}-continue-draft`)).toBeTruthy();
    // Pas de countdown ni metrics sur draft
    expect(screen.queryByTestId(`my-listing-${listing.id}-countdown`)).toBeNull();
    expect(screen.queryByTestId(`my-listing-${listing.id}-metrics`)).toBeNull();
  });

  it("placeholder photo si cover_image_url null", () => {
    const listing = makeListing({ cover_url: null });
    renderCard(listing);
    expect(screen.getByTestId(`my-listing-${listing.id}-cover-placeholder`)).toBeTruthy();
    expect(screen.queryByTestId(`my-listing-${listing.id}-cover`)).toBeNull();
  });
});
