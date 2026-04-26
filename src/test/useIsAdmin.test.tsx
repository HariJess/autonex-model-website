import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const { mockUser, mockRpcState } = vi.hoisted(() => ({
  mockUser: { current: null as { id: string } | null },
  mockRpcState: {
    response: null as boolean | null,
    error: null as string | null,
    callCount: 0,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (name: string) => {
      mockRpcState.callCount += 1;
      if (name !== "immonex_is_admin") {
        throw new Error(`unexpected rpc ${name}`);
      }
      if (mockRpcState.error) {
        return { data: null, error: { message: mockRpcState.error } };
      }
      return { data: mockRpcState.response, error: null };
    },
  },
}));

import { useIsAdmin } from "@/hooks/useIsAdmin";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

beforeEach(() => {
  mockUser.current = null;
  mockRpcState.response = null;
  mockRpcState.error = null;
  mockRpcState.callCount = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useIsAdmin (M4)", () => {
  it("returns data=true when the RPC returns true for the current user", async () => {
    mockUser.current = { id: "user-admin" };
    mockRpcState.response = true;
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useIsAdmin(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
    expect(mockRpcState.callCount).toBe(1);
  });

  it("returns data=false when the RPC returns false", async () => {
    mockUser.current = { id: "user-non-admin" };
    mockRpcState.response = false;
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useIsAdmin(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
    expect(mockRpcState.callCount).toBe(1);
  });

  it("surfaces isError=true when the RPC returns an error (fail-closed)", async () => {
    mockUser.current = { id: "user-rpc-fail" };
    mockRpcState.error = "permission denied for function immonex_is_admin";
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useIsAdmin(), { wrapper: Wrapper });

    // Hook config is `retry: 1` so the production query waits ~1s between
    // attempts. Bump waitFor timeout to cover both attempts comfortably.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 4000 });
    expect(result.current.data).toBeUndefined();
    expect(mockRpcState.callCount).toBe(2); // initial + 1 retry
  });

  it("does not call the RPC when no user is authenticated (enabled: !!user)", async () => {
    mockUser.current = null;
    mockRpcState.response = true; // would resolve true if it were called
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useIsAdmin(), { wrapper: Wrapper });

    // Give React Query a tick to (not) fire the query.
    await new Promise((r) => setTimeout(r, 50));

    expect(mockRpcState.callCount).toBe(0);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });
});
