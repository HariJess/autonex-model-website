import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockUser, mockState } = vi.hoisted(() => ({
  mockUser: { id: "user-1", email: "alice@example.com" },
  mockState: {
    rpcResponse: null as unknown[] | null,
    rpcError: null as string | null,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, session: { user: mockUser } }),
}));

vi.mock("@/contexts/CurrencyContext", async () => {
  const actual = await vi.importActual<typeof import("@/contexts/CurrencyContext")>("@/contexts/CurrencyContext");
  return actual;
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: async () => ({ data: [], error: null }) }),
    }),
    rpc: async (name: string) => {
      if (name === "list_my_favorites") {
        if (mockState.rpcError) return { data: null, error: { message: mockState.rpcError } };
        return { data: mockState.rpcResponse ?? [], error: null };
      }
      return { data: null, error: null };
    },
  },
}));

vi.mock("@/components/Header", () => ({
  default: () => <header data-testid="mock-header" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer data-testid="mock-footer" />,
}));

// ListingCard is shallow-mocked so we don't pull its own sub-deps.
vi.mock("@/components/ListingCard", () => ({
  default: ({ listing }: { listing: { id: string; title: string } }) => (
    <div data-testid="listing-card">{listing.title}</div>
  ),
}));

import FavoritesPage from "@/pages/FavoritesPage";

function renderPage(): { unmount: () => void } {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/favoris"]}>{children}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
  return render(
    <Wrapper>
      <FavoritesPage />
    </Wrapper>,
  );
}

function makeFavRow(overrides: Record<string, unknown> = {}) {
  return {
    fav_listing_id: "lst-1",
    fav_created_at: new Date().toISOString(),
    lst_id: "lst-1",
    lst_title: "Ma belle voiture",
    lst_description: null,
    lst_type: "maison",
    lst_transaction: "vente",
    lst_price_mga: 25_000_000,
    lst_price_eur: null,
    lst_negotiable: false,
    lst_surface: 45000,
    lst_rooms: null,
    lst_bathrooms: null,
    lst_toilets: null,
    lst_ville: "Antananarivo",
    lst_availability_status: null,
    lst_body_style: null,
    lst_doors: null,
    lst_drivetrain: null,
    lst_exterior_color: null,
    lst_engine_displacement_l: null,
    lst_fuel: null,
    lst_interior_color: null,
    lst_is_electric: null,
    lst_is_hybrid: null,
    lst_make: "Toyota",
    lst_mileage_km: 45000,
    lst_model: "Yaris",
    lst_rental_mode: null,
    lst_seats: null,
    lst_seller_type: null,
    lst_transmission_gearbox: null,
    lst_vehicle_condition: null,
    lst_whatsapp_phone: null,
    lst_year: 2018,
    lst_region: null,
    lst_arrondissement: null,
    lst_quartier: null,
    lst_quartier_libre: null,
    lst_lat: null,
    lst_lng: null,
    lst_features: null,
    lst_status: "active",
    lst_views_count: null,
    lst_created_at: new Date().toISOString(),
    lst_owner_id: "owner-1",
    lst_original_price_mga: null,
    lst_video_url: null,
    lst_virtual_tour_url: null,
    lst_internal_ref: null,
    lst_is_new_program: null,
    lst_rejection_reason: null,
    lst_pending_boost_types: null,
    lst_photos_urls: [],
    lst_active_boost_types: [],
    agency_name: null,
    agency_slug: null,
    agency_logo_url: null,
    agency_verified: null,
    owner_full_name: null,
    ...overrides,
  };
}

describe("FavoritesPage", () => {
  beforeEach(() => {
    mockState.rpcResponse = null;
    mockState.rpcError = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the empty state when the user has no favorites", async () => {
    mockState.rpcResponse = [];
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("favorites.empty.title")).toBeInTheDocument(),
    );
    expect(screen.getByText("favorites.empty.cta")).toBeInTheDocument();
    expect(screen.queryByTestId("listing-card")).not.toBeInTheDocument();
  });

  it("renders a card per favorited listing", async () => {
    mockState.rpcResponse = [
      makeFavRow({ lst_id: "a", lst_title: "Première voiture" }),
      makeFavRow({ lst_id: "b", lst_title: "Deuxième voiture", fav_listing_id: "b" }),
    ];
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("listing-card")).toHaveLength(2),
    );
    expect(screen.getByText("Première voiture")).toBeInTheDocument();
    expect(screen.getByText("Deuxième voiture")).toBeInTheDocument();
  });

  it("renders the error state + retry button when the RPC fails", async () => {
    mockState.rpcError = "boom";
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("favorites.loadError")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "favorites.retry" })).toBeInTheDocument();
  });
});
