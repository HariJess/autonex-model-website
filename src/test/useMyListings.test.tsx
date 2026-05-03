import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  categorizeListingForTab,
  computeCounts,
  filterListingsForTab,
  type MyListingRow,
} from "@/features/listings/hooks/useMyListings";

/**
 * Tests pour useMyListings (hook + helpers de filtrage).
 *
 * Helpers exportés (categorizeListingForTab, computeCounts, filterListingsForTab)
 * sont testés directement (pure functions). Le hook lui-même est testé via
 * renderHook avec mock supabase + useAuth.
 */

const userOf = (id: string): User =>
  ({ id, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" } as User);

const mockState = vi.hoisted(() => ({
  currentUser: null as User | null,
  listings: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockState.currentUser }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(async () => ({ data: mockState.listings, error: null })),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({})),
    })),
    removeChannel: vi.fn(),
  },
}));

async function importHook() {
  return await import("@/features/listings/hooks/useMyListings");
}

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

const SAMPLE_LISTINGS: MyListingRow[] = [
  // 1× active loin de l'expiration
  {
    id: "l1", title: "Active loin", price_mga: 1000, cover_url: null, ville: "Tana", type: null,
    status: "active", expires_at: new Date(NOW + 30 * DAY_MS).toISOString(),
    published_at: new Date(NOW - 5 * DAY_MS).toISOString(), sold_at: null, sold_price: null,
    views_count: 10, contact_count: 1, favorite_count: 2, renewal_count: 0,
    created_at: new Date(NOW - 5 * DAY_MS).toISOString(), updated_at: new Date(NOW - 1 * DAY_MS).toISOString(),
  },
  // 1× expiring_soon (J+5)
  {
    id: "l2", title: "Expiring", price_mga: 2000, cover_url: null, ville: null, type: null,
    status: "active", expires_at: new Date(NOW + 5 * DAY_MS).toISOString(),
    published_at: new Date(NOW - 25 * DAY_MS).toISOString(), sold_at: null, sold_price: null,
    views_count: 50, contact_count: 3, favorite_count: 5, renewal_count: 1,
    created_at: new Date(NOW - 25 * DAY_MS).toISOString(), updated_at: new Date().toISOString(),
  },
  // 1× expired
  {
    id: "l3", title: "Expired", price_mga: 3000, cover_url: null, ville: null, type: null,
    status: "expired", expires_at: new Date(NOW - 1 * DAY_MS).toISOString(),
    published_at: new Date(NOW - 31 * DAY_MS).toISOString(), sold_at: null, sold_price: null,
    views_count: 100, contact_count: 5, favorite_count: 8, renewal_count: 0,
    created_at: new Date(NOW - 31 * DAY_MS).toISOString(), updated_at: new Date().toISOString(),
  },
  // 1× sold
  {
    id: "l4", title: "Sold", price_mga: 4000, cover_url: null, ville: null, type: null,
    status: "sold", expires_at: null,
    published_at: new Date(NOW - 10 * DAY_MS).toISOString(), sold_at: new Date(NOW - 1 * DAY_MS).toISOString(),
    sold_price: 4500, views_count: 200, contact_count: 10, favorite_count: 15, renewal_count: 0,
    created_at: new Date(NOW - 10 * DAY_MS).toISOString(), updated_at: new Date().toISOString(),
  },
  // 1× draft
  {
    id: "l5", title: "Draft", price_mga: 0, cover_url: null, ville: null, type: null,
    status: "draft", expires_at: null,
    published_at: null, sold_at: null, sold_price: null,
    views_count: 0, contact_count: 0, favorite_count: 0, renewal_count: 0,
    created_at: new Date(NOW - 1 * DAY_MS).toISOString(), updated_at: new Date().toISOString(),
  },
];

describe("categorizeListingForTab", () => {
  it("active loin → ['all', 'active']", () => {
    expect(categorizeListingForTab(SAMPLE_LISTINGS[0], NOW)).toEqual(["all", "active"]);
  });

  it("expiring (J+5) → ['all', 'expiring_soon']", () => {
    expect(categorizeListingForTab(SAMPLE_LISTINGS[1], NOW)).toEqual(["all", "expiring_soon"]);
  });

  it("expired status → ['all', 'expired']", () => {
    expect(categorizeListingForTab(SAMPLE_LISTINGS[2], NOW)).toEqual(["all", "expired"]);
  });

  it("sold → ['all', 'sold']", () => {
    expect(categorizeListingForTab(SAMPLE_LISTINGS[3], NOW)).toEqual(["all", "sold"]);
  });

  it("draft → ['all', 'draft']", () => {
    expect(categorizeListingForTab(SAMPLE_LISTINGS[4], NOW)).toEqual(["all", "draft"]);
  });
});

describe("computeCounts", () => {
  it("compte chaque catégorie correctement sur le sample", () => {
    const counts = computeCounts(SAMPLE_LISTINGS);
    expect(counts.all).toBe(5);
    expect(counts.active).toBe(1);
    expect(counts.expiring_soon).toBe(1);
    expect(counts.expired).toBe(1);
    expect(counts.sold).toBe(1);
    expect(counts.draft).toBe(1);
  });

  it("tous à 0 si liste vide", () => {
    const counts = computeCounts([]);
    expect(counts.all).toBe(0);
    expect(counts.active).toBe(0);
  });
});

describe("filterListingsForTab", () => {
  it("'all' renvoie tous les listings", () => {
    expect(filterListingsForTab(SAMPLE_LISTINGS, "all")).toHaveLength(5);
  });

  it("'active' renvoie seulement le listing l1", () => {
    const r = filterListingsForTab(SAMPLE_LISTINGS, "active");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("l1");
  });

  it("'sold' renvoie seulement le listing l4", () => {
    const r = filterListingsForTab(SAMPLE_LISTINGS, "sold");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("l4");
  });
});

describe("useMyListings (hook)", () => {
  beforeEach(() => {
    mockState.currentUser = null;
    mockState.listings = [];
  });

  it("retourne 0 listings si pas authentifié", async () => {
    const { useMyListings } = await importHook();
    const { result } = renderHook(() => useMyListings("all"), { wrapper: makeWrapper() });
    expect(result.current.listings).toHaveLength(0);
    expect(result.current.counts.all).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("filtre 'sold' renvoie seulement les sold pour user authentifié", async () => {
    mockState.currentUser = userOf("u1");
    mockState.listings = SAMPLE_LISTINGS as unknown as Array<Record<string, unknown>>;
    const { useMyListings } = await importHook();
    const { result } = renderHook(() => useMyListings("sold"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.listings).toHaveLength(1);
    expect(result.current.listings[0].id).toBe("l4");
  });

  it("counts contient les 6 catégories avec les bons totaux", async () => {
    mockState.currentUser = userOf("u2");
    mockState.listings = SAMPLE_LISTINGS as unknown as Array<Record<string, unknown>>;
    const { useMyListings } = await importHook();
    const { result } = renderHook(() => useMyListings("all"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.counts.all).toBe(5);
    expect(result.current.counts.active).toBe(1);
    expect(result.current.counts.expiring_soon).toBe(1);
    expect(result.current.counts.expired).toBe(1);
    expect(result.current.counts.sold).toBe(1);
    expect(result.current.counts.draft).toBe(1);
  });
});
