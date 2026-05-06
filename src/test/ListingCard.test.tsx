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
    renderCard(
      makeListing({
        vehicle: {
          make: null,
          model: null,
          year: null,
          mileageKm: 200,
          fuel: null,
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
          condition: null,
          sellerType: null,
        },
      }),
    );
    // Sprint 6 — l'overlay year+km a été retiré ; le mileage n'apparaît
    // plus que dans la zone texte sous l'image.
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

  // Sprint 6 + PROMPT 6 V1 fusion : les badges boost (top_ad / featured /
  // boost / coup_de_coeur / nouveau / urgent) sont rendus dans la zone
  // top-left de la photo SI et seulement si :
  //   - pas de dealMeta actif (sinon le badge -X% prime)
  //   - feedContext !== "mixed" (sinon le badge transaction prime)
  // Le label rendu est la clé i18n brute (`listing.badge.urgent`) car ce
  // test ne monte pas i18next (cf. warning jsdom).
  it("rend le badge boost sur la photo quand listing.badge est défini (sans deal, hors feed mixte)", () => {
    renderCard(makeListing({ badge: "urgent" }));
    expect(screen.getByText("listing.badge.urgent")).toBeInTheDocument();
  });

  it("lien vers la page détail de l'annonce", () => {
    renderCard(makeListing({ id: "xyz-789" }));
    const links = screen.getAllByRole("link");
    const detailLink = links.find((l) => l.getAttribute("href") === "/annonce/xyz-789");
    expect(detailLink).toBeDefined();
  });

  // Sprint 4 redesign : on a retiré le badge "Acheter / Location /
  // Location courte durée" et le badge "neuf / occasion" de la photo.
  // Ces infos restent disponibles dans la zone texte (titre / fuel / etc.)
  // mais on ne pollue plus l'image avec des pills.
  it("ne rend plus le badge transaction ni le badge condition sur la photo", () => {
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
    expect(screen.queryByText(/Location longue durée/i)).not.toBeInTheDocument();
    // Le mot "neuf" ne doit plus apparaître via le badge condition (peut
    // toutefois apparaître dans le titre du véhicule — mais avec le
    // fixture ci-dessus le titre est "Belle villa avec piscine").
    expect(screen.queryByText(/neuf/i)).not.toBeInTheDocument();
  });

  // Sprint 6 — top-left simplifié : -X% seul si deal (pas de Vérifié),
  // badge transaction si feed mixte sans deal, sinon top-left vide.
  it("affiche -X% seul (sans badge Vérifié) quand un deal officiel est actif", () => {
    const queryClient = new QueryClient();
    const listing = makeListing({
      deal_active: true,
      deal_discount_percent: 10,
      deal_ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      deal_original_price_mga: 100_000_000,
    });
    render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CurrencyProvider>
              <ListingCard
                listing={listing}
                dealMeta={{ originalPriceMga: 100_000_000, discountPercent: 10, isVerified: true, endsAt: listing.deal_ends_at! }}
              />
            </CurrencyProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    );
    expect(screen.getByText("-10%")).toBeInTheDocument();
    expect(screen.queryByText(/Vérifié/i)).not.toBeInTheDocument();
  });

  it("affiche le badge transaction sur feedContext='mixed' quand pas de deal", () => {
    const queryClient = new QueryClient();
    const listing = makeListing({ transaction: "vente" });
    const { container } = render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CurrencyProvider>
              <ListingCard listing={listing} feedContext="mixed" />
            </CurrencyProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    );
    // Recherche le badge "Acheter" / "transaction.sale" — i18n peut retourner
    // soit le label fr soit la clé selon l'env.
    const text = container.textContent ?? "";
    expect(text.includes("Acheter") || text.includes("transaction.sale")).toBe(true);
  });

  it("ne rend rien en top-left sur feedContext='filtered' sans deal (overlay year+km retiré)", () => {
    const queryClient = new QueryClient();
    const listing = makeListing({
      vehicle: {
        make: "Toyota",
        model: "Yaris",
        year: 2020,
        mileageKm: 45_000,
        fuel: null,
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
        condition: null,
        sellerType: null,
      },
    } as unknown as Partial<DisplayListing>);
    render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <CurrencyProvider>
              <ListingCard listing={listing} feedContext="filtered" />
            </CurrencyProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    );
    // L'overlay "2020 · 45k km" n'existe plus en top-left.
    expect(screen.queryByText(/45k km/)).not.toBeInTheDocument();
    expect(screen.queryByText(/2020 · /)).not.toBeInTheDocument();
  });

  // Sprint 4 redesign : le compteur photos n'apparaît qu'à partir de 2
  // photos (cohérent avec UX leboncoin/vinted — pas de "1 photo" badge).
  it("affiche le compteur photos uniquement à partir de 2 images", () => {
    const multi = renderCard(
      makeListing({ images: ["a.jpg", "b.jpg", "c.jpg"] }),
    );
    // Le span aria-label est résolu par i18next (ou pas) — on cible
    // l'élément directement par sélecteur sur la classe Camera (icon lucide).
    const cameraIcons = multi.container.querySelectorAll(".lucide-camera");
    expect(cameraIcons.length).toBeGreaterThanOrEqual(1);
    multi.unmount();

    const single = renderCard(makeListing({ images: ["a.jpg"] }));
    expect(single.container.querySelectorAll(".lucide-camera").length).toBe(0);
  });
});
