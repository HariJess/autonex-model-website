import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Hoisted so vi.mock factories (evaluated before imports) can read them, and
// individual tests can mutate via beforeEach.
const { mockInvokeResponse, mockGetQueue } = vi.hoisted(() => ({
  mockInvokeResponse: {
    data: null as unknown,
    error: null as { message: string } | null,
  },
  mockGetQueue: {
    queue: [] as Array<{ data: unknown; error: Error | null }>,
    fallback: { data: null as unknown, error: null as Error | null },
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
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "mock-jwt" } },
        error: null,
      })),
    },
  },
}));

vi.mock("@/lib/supabase/invokeEdgeFunctionGet", () => ({
  invokeEdgeFunctionGet: vi.fn(async () => {
    if (mockGetQueue.queue.length > 0) {
      return mockGetQueue.queue.shift()!;
    }
    return mockGetQueue.fallback;
  }),
}));

vi.mock("@/lib/monitoring", () => ({
  captureVpiError: vi.fn(),
  captureVpiMessage: vi.fn(),
}));

import { invokeEdgeFunctionGet } from "@/lib/supabase/invokeEdgeFunctionGet";
import {
  mapVpiCheckoutErrorToI18nKey,
  useVpiCheckout,
} from "@/hooks/payments/useVpiCheckout";
import { useVpiCheckStatus } from "@/hooks/payments/useVpiCheckStatus";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

describe("mapVpiCheckoutErrorToI18nKey", () => {
  it("maps known error reasons to payment.vanilla.* keys, falls back on unknown", () => {
    expect(mapVpiCheckoutErrorToI18nKey("unauthorized")).toBe(
      "payment.vanilla.sessionExpired",
    );
    expect(mapVpiCheckoutErrorToI18nKey("session expired")).toBe(
      "payment.vanilla.sessionExpired",
    );
    expect(mapVpiCheckoutErrorToI18nKey("amount_cap_exceeded")).toBe(
      "payment.vanilla.amountCapExceeded",
    );
    expect(mapVpiCheckoutErrorToI18nKey("totally_unknown_error")).toBe(
      "payment.vanilla.initiateFailed",
    );
    expect(mapVpiCheckoutErrorToI18nKey("")).toBe(
      "payment.vanilla.initiateFailed",
    );
  });
});

describe("useVpiCheckout", () => {
  beforeEach(() => {
    mockInvokeResponse.data = null;
    mockInvokeResponse.error = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves with checkout_url + transaction_id on success", async () => {
    mockInvokeResponse.data = {
      ok: true,
      checkout_url: "https://vpi.mock/checkout/abc",
      transaction_id: "tx-uuid",
      amount_mga: 25000,
      bonus_credits: 0,
      pack_credits: 200,
      total_credits_expected: 200,
      dry_run: true,
    };

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useVpiCheckout(), { wrapper: Wrapper });

    // Capture the mutation return directly: avoids relying on React state
    // propagation to result.current.data within the same synchronous tick.
    let returned: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      returned = await result.current.mutateAsync({
        creditPackId: "cp_200",
        paymentMode: "mobile_money",
      });
    });

    expect(returned?.checkout_url).toBe("https://vpi.mock/checkout/abc");
    expect(returned?.transaction_id).toBe("tx-uuid");
  });

  it("rejects with the VPI error message whose mapping yields amountCapExceeded", async () => {
    mockInvokeResponse.error = { message: "amount_cap_exceeded" };

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useVpiCheckout(), { wrapper: Wrapper });

    let caughtMessage = "";
    await act(async () => {
      await result.current
        .mutateAsync({
          creditPackId: "cp_200",
          paymentMode: "mobile_money",
        })
        .catch((e: Error) => {
          caughtMessage = e.message;
        });
    });

    expect(caughtMessage).toBe("amount_cap_exceeded");
    expect(mapVpiCheckoutErrorToI18nKey(caughtMessage)).toBe(
      "payment.vanilla.amountCapExceeded",
    );
  });
});

describe("useVpiCheckStatus", () => {
  beforeEach(() => {
    mockGetQueue.queue = [];
    mockGetQueue.fallback = { data: null, error: null };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("stops polling once a terminal response arrives", async () => {
    const pendingResp = {
      data: {
        ok: true,
        transaction_id: "tx-1",
        status: "pending" as const,
        terminal: false,
        dry_run: true,
      },
      error: null,
    };
    const terminalResp = {
      data: {
        ok: true,
        transaction_id: "tx-1",
        status: "approved" as const,
        terminal: true,
        dry_run: true,
      },
      error: null,
    };
    // 1st call -> pending, 2nd call -> terminal, any subsequent -> terminal (safe default)
    mockGetQueue.queue = [pendingResp, terminalResp];
    mockGetQueue.fallback = terminalResp;

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useVpiCheckStatus("tx-1"), {
      wrapper: Wrapper,
    });

    // Advance past the initial fetch + one poll cycle (3s). The terminal
    // response from the 2nd call should be in state by the end of this window.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(result.current.isTerminal).toBe(true);

    const invokeGetMock = vi.mocked(invokeEdgeFunctionGet);
    const callsAtTerminal = invokeGetMock.mock.calls.length;
    expect(callsAtTerminal).toBeGreaterThanOrEqual(2);

    // Advance well past another poll cycle — no further calls expected
    // because refetchInterval returns false once data.terminal is true.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(invokeGetMock.mock.calls.length).toBe(callsAtTerminal);
  });

  it("flips isTimedOut when the timeout elapses without a terminal state", async () => {
    mockGetQueue.fallback = {
      data: {
        ok: true,
        transaction_id: "tx-1",
        status: "pending",
        terminal: false,
        dry_run: true,
      },
      error: null,
    };

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useVpiCheckStatus("tx-1", { timeoutMs: 100 }),
      { wrapper: Wrapper },
    );

    // Advance past the 100ms timeout + a poll boundary.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(result.current.isTimedOut).toBe(true);
  });
});
