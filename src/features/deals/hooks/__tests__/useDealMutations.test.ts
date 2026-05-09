import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

const { mockInvokeResponse, mockToast } = vi.hoisted(() => ({
  mockInvokeResponse: {
    data: null as unknown,
    error: null as { message: string; code?: string } | null,
  },
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async () => ({
        data: mockInvokeResponse.data,
        error: mockInvokeResponse.error,
      })),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToast.success,
    error: mockToast.error,
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

import { supabase } from "@/integrations/supabase/client";
import { useActivateDeal, useCancelDeal } from "@/features/deals/hooks/useDealMutations";

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

const mockedInvoke = vi.mocked(supabase.functions.invoke);

describe("useActivateDeal", () => {
  beforeEach(() => {
    mockInvokeResponse.data = null;
    mockInvokeResponse.error = null;
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls supabase.functions.invoke('activate-deal') with the right body", async () => {
    mockInvokeResponse.data = {
      success: true,
      listing_id: "abc",
      history_id: "hist",
      deal_started_at: "2026-04-30T10:00:00Z",
      deal_ends_at: "2026-05-07T10:00:00Z",
      deal_price_lock_until: "2026-06-06T10:00:00Z",
      discount_percent: 10,
      original_price_mga: 100,
      new_price_mga: 90,
    };

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useActivateDeal(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        listingId: "abc",
        discountPercent: 10,
        durationDays: 7,
      });
    });

    expect(mockedInvoke).toHaveBeenCalledWith("activate-deal", {
      body: { listingId: "abc", discountPercent: 10, durationDays: 7 },
    });
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("invalidates my-listings + db-listings + listing on success", async () => {
    mockInvokeResponse.data = {
      success: true,
      listing_id: "abc",
      history_id: "hist",
      deal_started_at: "x",
      deal_ends_at: "x",
      deal_price_lock_until: "x",
      discount_percent: 5,
      original_price_mga: 100,
      new_price_mga: 95,
    };

    const { qc, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useActivateDeal(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        listingId: "abc",
        discountPercent: 5,
        durationDays: 7,
      });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey[0]);
    expect(invalidatedKeys).toEqual(expect.arrayContaining(["my-listings", "db-listings", "listing"]));
  });

  it("propagates the error message from the Edge Function and fires toast.error", async () => {
    mockInvokeResponse.error = { message: "Un deal est déjà actif sur cette annonce." };

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useActivateDeal(), { wrapper: Wrapper });

    let caught: string | null = null;
    await act(async () => {
      await result.current
        .mutateAsync({ listingId: "abc", discountPercent: 5, durationDays: 7 })
        .catch((e: Error) => {
          caught = e.message;
        });
    });

    expect(caught).toBe("Un deal est déjà actif sur cette annonce.");
    expect(mockToast.error).toHaveBeenCalledWith("Un deal est déjà actif sur cette annonce.");
    expect(mockToast.success).not.toHaveBeenCalled();
  });
});

describe("useCancelDeal", () => {
  beforeEach(() => {
    mockInvokeResponse.data = null;
    mockInvokeResponse.error = null;
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls supabase.functions.invoke('cancel-deal') with the listingId", async () => {
    mockInvokeResponse.data = {
      success: true,
      listing_id: "abc",
      cancelled_at: "2026-04-30T10:00:00Z",
      price_lock_until: "2026-06-06T10:00:00Z",
    };

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCancelDeal(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync("abc");
    });

    expect(mockedInvoke).toHaveBeenCalledWith("cancel-deal", {
      body: { listingId: "abc" },
    });
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("propagates the error message and fires toast.error", async () => {
    mockInvokeResponse.error = { message: "Aucun deal actif sur cette annonce." };

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCancelDeal(), { wrapper: Wrapper });

    let caught: string | null = null;
    await act(async () => {
      await result.current.mutateAsync("abc").catch((e: Error) => {
        caught = e.message;
      });
    });

    expect(caught).toBe("Aucun deal actif sur cette annonce.");
    expect(mockToast.error).toHaveBeenCalledWith("Aucun deal actif sur cette annonce.");
  });
});
