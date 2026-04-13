import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ListingCard from "@/components/ListingCard";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import type { DisplayListing } from "@/types/listing";

function renderCard(listing: DisplayListing) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <CurrencyProvider>
          <ListingCard listing={listing} />
        </CurrencyProvider>
      </MemoryRouter>
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
    rooms: 4,
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

  it("affiche la surface quand définie", () => {
    renderCard(makeListing({ surface: 200 }));
    expect(screen.getByText(/200m²/)).toBeInTheDocument();
  });

  it("affiche 'Studio' pour un appartement 0 chambre", () => {
    renderCard(makeListing({ type: "appartement", rooms: 0 }));
    expect(screen.getByText(/Studio/i)).toBeInTheDocument();
  });

  it("n'affiche pas 'Studio' pour un terrain", () => {
    renderCard(makeListing({ type: "terrain", rooms: 0 }));
    expect(screen.queryByText(/Studio/i)).not.toBeInTheDocument();
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
});
