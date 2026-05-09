import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * PROMPT 6 — useApplyBoost mutation hook.
 * Verify : success path invalidates expected caches + toast localized.
 *          error path maps message → i18n key + toast.error.
 */

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

vi.mock("@/lib/monitoring", () => ({
  wrapRpc: async (_name: string, fn: () => Promise<{ data: unknown; error: unknown }>) => fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function makeWrapper(): {
  Wrapper: ({ children }: { children: ReactNode }) => JSX.Element;
  client: QueryClient;
} {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { Wrapper, client };
}

describe("useApplyBoost (PROMPT 6)", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it("success path → invalidates queries + toast.success avec key i18n bump", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        boost_id: "boost-123",
        boost_type: "bump",
        credits_charged: 5_000,
        last_bumped_at: "2026-05-06T12:00:00Z",
        featured_until: null,
        top_ad_until: null,
        notification_id: "notif-123",
      },
      error: null,
    });

    const { useApplyBoost } = await import("@/hooks/boosts/useApplyBoost");
    const { Wrapper, client } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useApplyBoost(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ listingId: "listing-1", boostType: "bump" });
    });

    expect(rpcMock).toHaveBeenCalledWith("apply_boost", {
      p_listing_id: "listing-1",
      p_boost_type: "bump",
    });
    expect(toastMock.success).toHaveBeenCalledWith("boost.success.bumpToast");
    // 5 invalidations attendues
    const calledKeys = invalidateSpy.mock.calls.map((c) => c[0]);
    expect(calledKeys.some((k) => JSON.stringify(k).includes("my-listings-dashboard"))).toBe(true);
    expect(calledKeys.some((k) => JSON.stringify(k).includes("credits-balance"))).toBe(true);
    expect(calledKeys.some((k) => JSON.stringify(k).includes("featured-boost-listing-ids"))).toBe(true);
  });

  it("error path → toast.error avec key mappée (insufficient_credits)", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "insufficient_credits" },
    });

    const { useApplyBoost } = await import("@/hooks/boosts/useApplyBoost");
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useApplyBoost(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ listingId: "listing-1", boostType: "featured" });
      } catch {
        /* expected */
      }
    });

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("boost.errors.insufficientCredits");
    });
  });
});
