import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import {
  useMonetizationBreakdowns,
  useMonetizationOverview,
  useMonetizationSummary,
} from "@/hooks/useMonetizationDashboard";

type RpcMock = ReturnType<typeof vi.fn>;

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useMonetizationOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates totals across the timeseries", async () => {
    (supabase.rpc as RpcMock).mockResolvedValueOnce({
      data: [
        { day: "2026-04-26", net_revenue_mga: 25000, gross_revenue_mga: 25000, promo_discount_mga: 0, approved_count: 1, rejected_count: 0, pending_count: 0 },
        { day: "2026-04-27", net_revenue_mga: 50000, gross_revenue_mga: 60000, promo_discount_mga: 10000, approved_count: 2, rejected_count: 1, pending_count: 0 },
      ],
      error: null,
    });

    const { result } = renderHook(() => useMonetizationOverview(30), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totalsForPeriod.net_revenue_mga).toBe(75000);
    expect(result.current.data?.totalsForPeriod.promo_discount_mga).toBe(10000);
    expect(result.current.data?.totalsForPeriod.approved_count).toBe(3);
    expect(result.current.data?.totalsForPeriod.rejected_count).toBe(1);
    expect(result.current.data?.timeseries).toHaveLength(2);
  });

  it("returns zero totals when the timeseries is empty", async () => {
    (supabase.rpc as RpcMock).mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => useMonetizationOverview(7), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.timeseries).toHaveLength(0);
    expect(result.current.data?.totalsForPeriod.net_revenue_mga).toBe(0);
    expect(result.current.data?.totalsForPeriod.approved_count).toBe(0);
  });
});

describe("useMonetizationSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes mom_delta_pct when last_month > 0", async () => {
    (supabase.rpc as RpcMock).mockResolvedValueOnce({
      data: [{
        net_revenue_alltime: 1000000,
        net_revenue_this_month: 200000,
        net_revenue_last_month: 100000,
        approved_count_alltime: 50,
        approved_count_this_month: 10,
        approved_count_last_month: 5,
        rejected_count_alltime: 5,
        pending_count_alltime: 2,
        approval_rate_pct: 87.5,
        avg_basket_mga: 20000,
        total_promo_discount_mga: 50000,
        total_promo_bonus_credits: 100,
        credits_purchased_alltime: 5000,
        credits_spent_alltime: 3000,
        credits_in_circulation: 2000,
      }],
      error: null,
    });

    const { result } = renderHook(() => useMonetizationSummary(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.mom_delta_pct).toBe(100);
    expect(result.current.data?.approval_rate_pct).toBe(87.5);
    expect(result.current.data?.credits_in_circulation).toBe(2000);
  });

  it("returns mom_delta_pct = 0 when last_month is 0", async () => {
    (supabase.rpc as RpcMock).mockResolvedValueOnce({
      data: [{
        net_revenue_alltime: 200000, net_revenue_this_month: 200000, net_revenue_last_month: 0,
        approved_count_alltime: 10, approved_count_this_month: 10, approved_count_last_month: 0,
        rejected_count_alltime: 0, pending_count_alltime: 0,
        approval_rate_pct: 100, avg_basket_mga: 20000,
        total_promo_discount_mga: 0, total_promo_bonus_credits: 0,
        credits_purchased_alltime: 1000, credits_spent_alltime: 0, credits_in_circulation: 1000,
      }],
      error: null,
    });

    const { result } = renderHook(() => useMonetizationSummary(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.mom_delta_pct).toBe(0);
  });
});

describe("useMonetizationBreakdowns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("splits rows by dimension into packs and methods", async () => {
    (supabase.rpc as RpcMock).mockResolvedValueOnce({
      data: [
        { dimension: "pack", label: "Pack 200", approved_count: 5, total_net_revenue_mga: 100000 },
        { dimension: "pack", label: "Pack 500", approved_count: 2, total_net_revenue_mga: 50000 },
        { dimension: "method", label: "vanilla_pay", approved_count: 7, total_net_revenue_mga: 150000 },
      ],
      error: null,
    });

    const { result } = renderHook(() => useMonetizationBreakdowns(30), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.packs).toHaveLength(2);
    expect(result.current.data?.methods).toHaveLength(1);
    expect(result.current.data?.methods[0].label).toBe("vanilla_pay");
    expect(result.current.data?.packs[0].total_net_revenue_mga).toBe(100000);
  });
});
