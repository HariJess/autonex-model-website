import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { usePartnerCampaignStats } from "@/hooks/usePartnerCampaignStats";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

type RpcMock = ReturnType<typeof vi.fn>;

describe("usePartnerCampaignStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates timeseries totals correctly for a fixed period", async () => {
    (supabase.rpc as RpcMock).mockResolvedValueOnce({
      data: [
        { day: "2026-04-25", total_impressions: 10, unique_impressions: 8, total_clicks: 2, unique_clicks: 2 },
        { day: "2026-04-26", total_impressions: 20, unique_impressions: 15, total_clicks: 3, unique_clicks: 3 },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePartnerCampaignStats("c1", 30), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totals.total_impressions).toBe(30);
    expect(result.current.data?.totals.total_clicks).toBe(5);
    expect(result.current.data?.totals.unique_impressions).toBe(23);
    expect(result.current.data?.totals.unique_clicks).toBe(5);
    expect(result.current.data?.timeseries).toHaveLength(2);
  });

  it("computes CTR as unique_clicks / unique_impressions × 100", async () => {
    (supabase.rpc as RpcMock).mockResolvedValueOnce({
      data: [
        { day: "2026-04-26", total_impressions: 100, unique_impressions: 100, total_clicks: 5, unique_clicks: 5 },
      ],
      error: null,
    });
    const { result } = renderHook(() => usePartnerCampaignStats("c1", 7), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totals.ctr).toBeCloseTo(5.0, 2);
  });

  it("returns CTR=0 when there are no impressions", async () => {
    (supabase.rpc as RpcMock).mockResolvedValueOnce({
      data: [
        { day: "2026-04-26", total_impressions: 0, unique_impressions: 0, total_clicks: 0, unique_clicks: 0 },
      ],
      error: null,
    });
    const { result } = renderHook(() => usePartnerCampaignStats("c1", 7), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totals.ctr).toBe(0);
  });

  it("does not fetch when campaignId is missing", () => {
    renderHook(() => usePartnerCampaignStats(undefined, 30), { wrapper: makeWrapper() });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("uses partner_ad_campaign_stats view for all-time unique counts", async () => {
    (supabase.rpc as RpcMock).mockResolvedValueOnce({
      data: [
        { day: "2026-04-26", total_impressions: 50, unique_impressions: 30, total_clicks: 5, unique_clicks: 4 },
      ],
      error: null,
    });
    const maybeSingleMock = vi.fn().mockResolvedValueOnce({
      data: { total_impressions: 1000, unique_impressions: 750, total_clicks: 80, unique_clicks: 65 },
      error: null,
    });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as RpcMock).mockReturnValueOnce({ select: selectMock });

    const { result } = renderHook(() => usePartnerCampaignStats("c1", "all"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith("partner_ad_campaign_stats");
    expect(result.current.data?.totals.unique_impressions).toBe(750);
    expect(result.current.data?.totals.unique_clicks).toBe(65);
    // total_impressions still summed from the timeseries (cheap and consistent with chart)
    expect(result.current.data?.totals.total_impressions).toBe(50);
  });
});
