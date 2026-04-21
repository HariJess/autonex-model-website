import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockUser, mockState } = vi.hoisted(() => ({
  mockUser: { id: "user-1", email: "alice@example.com" } as { id: string | null; email: string } | null,
  mockState: {
    favoriteRows: [] as Array<{ listing_id: string }>,
    toggleResponse: null as null | { fav_listing_id: string; fav_user_id: string; fav_created_at: string | null; fav_is_favorite: boolean },
    toggleError: null as string | null,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table !== "favorites") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: async () => ({ data: mockState.favoriteRows, error: null }),
        }),
      };
    },
    rpc: async (name: string, _args: unknown) => {
      if (name === "toggle_favorite") {
        if (mockState.toggleError) return { data: null, error: { message: mockState.toggleError } };
        return { data: mockState.toggleResponse ? [mockState.toggleResponse] : null, error: null };
      }
      throw new Error(`unexpected rpc ${name}`);
    },
  },
}));

import { useFavoriteIds, useToggleFavorite, favoriteIdsQueryKey } from "@/hooks/useFavorites";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

describe("useFavoriteIds", () => {
  beforeEach(() => {
    mockState.favoriteRows = [];
  });

  it("returns a Set of favorited listing IDs for the current user", async () => {
    mockState.favoriteRows = [{ listing_id: "a" }, { listing_id: "b" }];
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useFavoriteIds(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeInstanceOf(Set);
    expect(result.current.data?.has("a")).toBe(true);
    expect(result.current.data?.has("b")).toBe(true);
    expect(result.current.data?.size).toBe(2);
  });

  it("stays disabled when there is no authenticated user", async () => {
    const originalId = mockUser!.id;
    (mockUser as unknown as { id: string | null }).id = null;
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useFavoriteIds(), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    (mockUser as unknown as { id: string | null }).id = originalId;
  });
});

describe("useToggleFavorite", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockState.toggleError = null;
  });

  it("optimistically adds the ID to the ids cache and then invalidates list", async () => {
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(favoriteIdsQueryKey("user-1"), new Set<string>());
    mockState.toggleResponse = {
      fav_listing_id: "xyz",
      fav_user_id: "user-1",
      fav_created_at: new Date().toISOString(),
      fav_is_favorite: true,
    };

    const { result } = renderHook(() => useToggleFavorite(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync("xyz");
    });
    const cached = qc.getQueryData<Set<string>>(favoriteIdsQueryKey("user-1"));
    expect(cached?.has("xyz")).toBe(true);
  });

  it("rolls back the optimistic update on RPC error", async () => {
    const { qc, Wrapper } = makeWrapper();
    const initial = new Set<string>(["already-fav"]);
    qc.setQueryData(favoriteIdsQueryKey("user-1"), initial);
    mockState.toggleError = "boom";

    const { result } = renderHook(() => useToggleFavorite(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync("new-one").catch(() => {
        /* expected */
      });
    });
    const cached = qc.getQueryData<Set<string>>(favoriteIdsQueryKey("user-1"));
    expect(cached?.has("new-one")).toBe(false);
    expect(cached?.has("already-fav")).toBe(true);
  });

  it("optimistically removes when the ID is already in the cache", async () => {
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(favoriteIdsQueryKey("user-1"), new Set<string>(["to-remove"]));
    mockState.toggleResponse = {
      fav_listing_id: "to-remove",
      fav_user_id: "user-1",
      fav_created_at: null,
      fav_is_favorite: false,
    };

    const { result } = renderHook(() => useToggleFavorite(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync("to-remove");
    });
    const cached = qc.getQueryData<Set<string>>(favoriteIdsQueryKey("user-1"));
    expect(cached?.has("to-remove")).toBe(false);
  });
});
