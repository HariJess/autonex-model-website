import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, profile: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
}));

import ListingCard from "@/components/ListingCard";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import type { DisplayListing } from "@/types/listing";

function renderCard(listing: DisplayListing) {
  const queryClient = new QueryClient();
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CurrencyProvider>
            <ListingCard listing={listing} />
          </CurrencyProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function makeListing(overrides: Partial<DisplayListing> = {}): DisplayListing {
  return {
    id: "abc-123",
    title: "Belle villa avec piscine",
    description: "Une description",
    type: "villa",
    transaction: "vente",
    price_mga: 120_000_000,
    price_eur: null,
    surface: 180,
    bathrooms: 2,
    toilets: null,
    ville: "Antananarivo",
    region: "Analamanga",
    arrondissement: null,
    quartier: null,
    quartier_libre: null,
    lat: null,
    lng: null,
    features: [],
    images: ["https://example.com/photo1.jpg"],
    status: "active",
    views_count: 0,
    created_at: new Date().toISOString(),
    owner_id: "owner-1",
    badge: null,
    visibility_rank_score: 0,
    ...overrides,
  } as DisplayListing;
}

describe("ListingCard", () => {
  it("affiche le titre de l'annonce", () => {
    renderCard(makeListing());
    expect(screen.getByText("Belle villa avec piscine")).toBeInTheDocument();
  });

  it("affiche la ville", () => {
    renderCard(makeListing({ ville: "Toamasina" }));
    expect(screen.getByText(/Toamasina/)).toBeInTheDocument();
  });

  it("affiche le kilométrage quand défini", () => {
    renderCard(makeListing({ surface: 200 }));
    expect(screen.getByText(/200 km/)).toBeInTheDocument();
  });

  it("utilise une image placeholder si aucune photo", () => {
    renderCard(makeListing({ images: [] }));
    const img = screen.getByAltText("Belle villa avec piscine") as HTMLImageElement;
    expect(img.src).toContain("/placeholder.svg");
  });

  it("applique loading='lazy' sur l'image principale", () => {
    renderCard(makeListing());
    const img = screen.getByAltText("Belle villa avec piscine") as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("affiche le badge 'Urgent' quand badge === 'urgent'", () => {
    renderCard(makeListing({ badge: "urgent" }));
    expect(screen.getByText(/Urgent/i)).toBeInTheDocument();
  });

  it("lien vers la page détail de l'annonce", () => {
    renderCard(makeListing({ id: "xyz-789" }));
    const links = screen.getAllByRole("link");
    const detailLink = links.find((l) => l.getAttribute("href") === "/annonce/xyz-789");
    expect(detailLink).toBeDefined();
  });

  it("empile les badges transaction + condition en pills côté gauche", () => {
    const vehicle = {
      make: "Toyota",
      model: "Yaris",
      year: 2020,
      mileageKm: 0,
      fuel: "essence",
      transmission: null,
      drivetrain: null,
      doors: null,
      bodyStyle: null,
      rentalMode: null,
      seats: null,
      exteriorColor: null,
      engineDisplacementL: null,
      interiorColor: null,
      availabilityStatus: null,
      isElectric: false,
      isHybrid: false,
      condition: "neuf" as const,
      sellerType: null,
    };
    renderCard(
      makeListing({
        transaction: "location",
        vehicle,
      } as unknown as Partial<DisplayListing>),
    );
    expect(screen.getByText(/Location/i)).toBeInTheDocument();
    expect(screen.getByText(/neuf/i)).toBeInTheDocument();
  });
});
