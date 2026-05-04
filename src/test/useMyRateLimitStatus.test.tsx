import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * PROMPT 8 — useMyRateLimitStatus hook : query la RPC can_publish_listing
 * et expose les compteurs au front (RateLimitStatusCard).
 */

const rpcMock = vi.hoisted(() => vi.fn());
const userMock = vi.hoisted(() => ({ value: null as { id: string } | null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: userMock.value }),
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useMyRateLimitStatus (PROMPT 8)", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    userMock.value = null;
  });

  it("user non loggé → query disabled (pas d'appel RPC)", async () => {
    userMock.value = null;
    const { useMyRateLimitStatus } = await import("@/hooks/useMyRateLimitStatus");
    const Wrapper = makeWrapper();
    renderHook(() => useMyRateLimitStatus(), { wrapper: Wrapper });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("user loggé → RPC appelée + premier row retourné", async () => {
    userMock.value = { id: "user-1" };
    rpcMock.mockResolvedValue({
      data: [
        {
          allowed: true,
          reason: null,
          active_listings_count: 1,
          active_listings_limit: 3,
          publishes_24h_count: 1,
          publishes_24h_limit: 3,
          cooldown_remaining_seconds: 0,
        },
      ],
      error: null,
    });

    const { useMyRateLimitStatus } = await import("@/hooks/useMyRateLimitStatus");
    const Wrapper = makeWrapper();
    const { result } = renderHook(() => useMyRateLimitStatus(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(rpcMock).toHaveBeenCalledWith("can_publish_listing", { p_user_id: "user-1" });
    expect(result.current.data?.allowed).toBe(true);
    expect(result.current.data?.active_listings_limit).toBe(3);
  });

  it("data null si RPC retourne tableau vide", async () => {
    userMock.value = { id: "user-1" };
    rpcMock.mockResolvedValue({ data: [], error: null });

    const { useMyRateLimitStatus } = await import("@/hooks/useMyRateLimitStatus");
    const Wrapper = makeWrapper();
    const { result } = renderHook(() => useMyRateLimitStatus(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it("propage l'erreur RPC", async () => {
    userMock.value = { id: "user-1" };
    rpcMock.mockResolvedValue({ data: null, error: { message: "rpc fail" } });

    const { useMyRateLimitStatus } = await import("@/hooks/useMyRateLimitStatus");
    const Wrapper = makeWrapper();
    const { result } = renderHook(() => useMyRateLimitStatus(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
