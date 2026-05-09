import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// Capture chained calls on `from("listings")`. Each filter method records
// its (column, value) and returns the same chain. The terminal call is
// awaiting the chain (Promise resolution) — we make the chain thenable so
// `await query` resolves with our fixture.
const { calls, fixtureResponse } = vi.hoisted(() => ({
  calls: {
    eq: [] as Array<[string, unknown]>,
    gt: [] as Array<[string, unknown]>,
    order: [] as Array<[string, { ascending?: boolean } | undefined]>,
    range: [] as Array<[number, number]>,
    select: [] as Array<[string, { count?: string } | undefined]>,
    gte: [] as Array<[string, unknown]>,
    lte: [] as Array<[string, unknown]>,
  },
  fixtureResponse: {
    data: [] as Array<Record<string, unknown>>,
    error: null as null | { message: string },
    count: 0 as number | null,
  },
}));

function makeChain() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = (cols: string, opts?: { count?: string }) => {
    calls.select.push([cols, opts]);
    return chain;
  };
  chain.eq = (col: string, val: unknown) => {
    calls.eq.push([col, val]);
    return chain;
  };
  chain.gt = (col: string, val: unknown) => {
    calls.gt.push([col, val]);
    return chain;
  };
  chain.gte = (col: string, val: unknown) => {
    calls.gte.push([col, val]);
    return chain;
  };
  chain.lte = (col: string, val: unknown) => {
    calls.lte.push([col, val]);
    return chain;
  };
  chain.order = (col: string, opts?: { ascending?: boolean }) => {
    calls.order.push([col, opts]);
    return chain;
  };
  chain.range = (start: number, end: number) => {
    calls.range.push([start, end]);
    return chain;
  };
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({
      data: fixtureResponse.data,
      error: fixtureResponse.error,
      count: fixtureResponse.count,
    }).then(resolve);
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeChain()),
  },
}));

// Mock enrichment to be passthrough — no photos/boosts fetch in unit test.
vi.mock("@/hooks/useListings", () => ({
  LISTING_SELECT_COLUMN_NAMES: ["id", "title", "price_mga", "deal_active"],
  enrichListingsWithRelatedData: async (rows: unknown[]) =>
    rows.map((r) => ({ ...(r as Record<string, unknown>), images: [], features: [] })),
  isListingRowLite: (r: unknown) =>
    typeof r === "object" && r !== null && typeof (r as { id?: unknown }).id === "string",
}));

import { useActiveDeals } from "@/hooks/useDeals";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

describe("useActiveDeals", () => {
  beforeEach(() => {
    calls.eq = [];
    calls.gt = [];
    calls.order = [];
    calls.range = [];
    calls.select = [];
    calls.gte = [];
    calls.lte = [];
    fixtureResponse.data = [];
    fixtureResponse.error = null;
    fixtureResponse.count = 0;
  });

  it("filters strictly on deal_active=true, status=active and deal_ends_at>now()", async () => {
    fixtureResponse.data = [
      { id: "abc", title: "Mazda MX-5", price_mga: 90_000_000, deal_active: true },
    ];
    fixtureResponse.count = 1;

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useActiveDeals(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(calls.eq).toContainEqual(["deal_active", true]);
    expect(calls.eq).toContainEqual(["status", "active"]);
    const gtCall = calls.gt.find(([col]) => col === "deal_ends_at");
    expect(gtCall).toBeDefined();
  });

  it("orders by deal_discount_percent DESC then deal_started_at DESC", async () => {
    const { Wrapper } = makeWrapper();
    renderHook(() => useActiveDeals(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(calls.order.length).toBeGreaterThanOrEqual(2);
    });

    expect(calls.order[0][0]).toBe("deal_discount_percent");
    expect(calls.order[0][1]?.ascending).toBe(false);
    expect(calls.order[1][0]).toBe("deal_started_at");
    expect(calls.order[1][1]?.ascending).toBe(false);
  });

  it("applies optional filters when provided (make, ville, minDiscount, maxPriceMga)", async () => {
    const { Wrapper } = makeWrapper();
    renderHook(
      () =>
        useActiveDeals({
          make: "Toyota",
          ville: "Antananarivo",
          minDiscount: 15,
          maxPriceMga: 50_000_000,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(calls.eq.length).toBeGreaterThanOrEqual(4);
    });

    expect(calls.eq).toContainEqual(["make", "Toyota"]);
    expect(calls.eq).toContainEqual(["ville", "Antananarivo"]);
    expect(calls.gte).toContainEqual(["deal_discount_percent", 15]);
    expect(calls.lte).toContainEqual(["price_mga", 50_000_000]);
  });
});
