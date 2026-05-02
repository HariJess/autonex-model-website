import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import YasAppPage from "@/features/yas-app/YasAppPage";
import { YasProvider } from "@/features/yas-app/hooks/useYasContext";

// Mock du tracking pour éviter d'appeler Supabase pendant les tests + vérifier
// que `yas_autonex_open` fire bien au mount.
vi.mock("@/features/yas-app/lib/yasTracking", () => ({
  trackYasEvent: vi.fn(),
}));

// AuthProvider n'est pas monté dans ce smoke test : ListingCard (rendu via
// YasFeaturedDeals) appelle `useAuth` indirectement via FavoriteButton.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, profile: null, loading: false }),
}));

// Mock useDbListings pour éviter l'appel réseau dans le smoke test.
// Au moins une annonce minimale + dealMeta truthy (cf. mock plus bas) pour que
// la card "Bonnes affaires" reste visible — sinon YasActionGrid la filtre via
// `hasDeals` (Fix UX #4 du Plan 1).
vi.mock("@/hooks/useListings", () => ({
  useDbListings: () => ({
    data: [
      {
        id: "stub-listing-1",
        title: "Stub Listing",
        price_mga: 10_000_000,
        images: [],
      },
    ],
    isLoading: false,
  }),
  prefetchListing: () => undefined,
}));

// `getDealMeta` est appelé par YasActionGrid (filtre `hasDeals`) et par
// YasFeaturedDeals. Forcer un retour truthy garantit que la card "Bonnes
// affaires" est rendue dans le smoke test.
vi.mock("@/lib/deals", () => ({
  getDealMeta: () => ({ discountPercent: 10, originalPriceMga: 11_000_000 }),
}));

// Mock contextes globaux requis par ListingCard (rendu via YasFeaturedDeals).
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    currency: "MGA",
    formatPrice: (n: number) => `${n} Ar`,
    formatPriceSecondary: () => null,
    setCurrency: () => undefined,
  }),
}));

import { trackYasEvent } from "@/features/yas-app/lib/yasTracking";

function renderYasAppPage(initialPath = "/yas-app?source=yas&embedded=true") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <YasProvider>
            <YasAppPage />
          </YasProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("YasAppPage", () => {
  it("rend le hero, les 4 actions principales et le CTA final cross-sell estimation", () => {
    renderYasAppPage();

    // Hero
    expect(screen.getByText(/Acheter, vendre ou estimer une voiture/i)).toBeInTheDocument();

    // 4 actions (ordre : Acheter / Estimer / Bonnes affaires / Vendre)
    expect(screen.getByText("Acheter une voiture")).toBeInTheDocument();
    expect(screen.getByText("Vendre ma voiture")).toBeInTheDocument();
    expect(screen.getByText("Voir les bonnes affaires")).toBeInTheDocument();
    // « Estimer ma voiture » apparaît 2 fois : action card + bouton du CTA
    // final cross-sell estimation.
    expect(screen.getAllByText("Estimer ma voiture").length).toBeGreaterThanOrEqual(2);

    // CTA final — angle réassurance "Hésitant à vendre ?" pointe vers /estimation
    expect(screen.getByText(/Hésitant à vendre/i)).toBeInTheDocument();
  });

  it("émet l'événement yas_autonex_open au mount", () => {
    const mock = vi.mocked(trackYasEvent);
    mock.mockClear();
    renderYasAppPage();
    expect(mock).toHaveBeenCalledWith(
      "yas_autonex_open",
      expect.objectContaining({ isEmbedded: true, source: "yas" }),
    );
  });

  it("préserve les query params YAS dans l'URL des CTA", () => {
    renderYasAppPage("/yas-app?source=yas&embedded=true&platform=android");
    const buyLink = screen.getByText("Acheter une voiture").closest("a");
    expect(buyLink?.getAttribute("href")).toContain("/recherche?transaction=vente");
    expect(buyLink?.getAttribute("href")).toContain("source=yas");
    expect(buyLink?.getAttribute("href")).toContain("embedded=true");
    expect(buyLink?.getAttribute("href")).toContain("platform=android");
  });
});
