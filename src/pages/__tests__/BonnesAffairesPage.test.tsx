import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { DisplayListing } from "@/types/listing";

// Mocks i18n / currency / yas / header / footer / listing card to keep the
// test focused on the page's structural behavior (loading / empty / list).
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallbackOrOpts?: unknown) => {
      if (typeof fallbackOrOpts === "string") return fallbackOrOpts;
      if (fallbackOrOpts && typeof fallbackOrOpts === "object") {
        const opts = fallbackOrOpts as Record<string, unknown> & { defaultValue?: string };
        let str = typeof opts.defaultValue === "string" ? opts.defaultValue : _key;
        for (const k of Object.keys(opts)) {
          if (k === "defaultValue") continue;
          str = str.split(`{{${k}}}`).join(String(opts[k]));
        }
        return str;
      }
      return _key;
    },
  }),
}));

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/features/yas-app/components/YasBackButton", () => ({ YasBackButton: () => null }));
vi.mock("@/components/ListingCard", () => ({
  default: ({ listing }: { listing: DisplayListing }) => (
    <div data-testid="listing-card">{listing.title}</div>
  ),
}));

const { mockUseActiveDeals } = vi.hoisted(() => ({
  mockUseActiveDeals: vi.fn(),
}));

vi.mock("@/hooks/useDeals", () => ({
  useActiveDeals: (...args: unknown[]) => mockUseActiveDeals(...args),
}));

import BonnesAffairesPage from "@/pages/BonnesAffairesPage";

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <BonnesAffairesPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("BonnesAffairesPage", () => {
  beforeEach(() => {
    mockUseActiveDeals.mockReset();
  });

  it("renders the H1 and subtitle", () => {
    mockUseActiveDeals.mockReturnValue({
      data: { listings: [], count: 0 },
      isLoading: false,
      isError: false,
    });
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Bonnes affaires/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/réellement réduits/i)).toBeInTheDocument();
  });

  it("shows the empty state when listings is empty", () => {
    mockUseActiveDeals.mockReturnValue({
      data: { listings: [], count: 0 },
      isLoading: false,
      isError: false,
    });
    renderPage();
    expect(screen.getByText(/Aucune bonne affaire/i)).toBeInTheDocument();
  });

  it("renders one ListingCard per listing returned", () => {
    const listings: DisplayListing[] = [
      {
        id: "1",
        title: "Mazda MX-5",
        description: null,
        type: "voiture",
        transaction: "vente",
        price_mga: 90_000_000,
        price_eur: null,
        original_price_mga: null,
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
        created_at: null,
        owner_id: "owner-1",
        deal_active: true,
        deal_started_at: new Date().toISOString(),
        deal_ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        deal_duration_days: 7,
        deal_discount_percent: 10,
        deal_original_price_mga: 100_000_000,
        deal_price_lock_until: new Date(Date.now() + 37 * 86_400_000).toISOString(),
      },
      {
        id: "2",
        title: "Toyota Hilux",
        description: null,
        type: "pickup",
        transaction: "vente",
        price_mga: 70_000_000,
        price_eur: null,
        original_price_mga: null,
        negotiable: false,
        ville: "Toamasina",
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
        created_at: null,
        owner_id: "owner-2",
        deal_active: true,
        deal_started_at: new Date().toISOString(),
        deal_ends_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        deal_duration_days: 14,
        deal_discount_percent: 20,
        deal_original_price_mga: 87_500_000,
        deal_price_lock_until: new Date(Date.now() + 44 * 86_400_000).toISOString(),
      },
    ];
    mockUseActiveDeals.mockReturnValue({
      data: { listings, count: 2 },
      isLoading: false,
      isError: false,
    });
    renderPage();
    const cards = screen.getAllByTestId("listing-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Mazda MX-5");
    expect(cards[1]).toHaveTextContent("Toyota Hilux");
  });
});
