import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { trackPartnerAdEvent } from "@/lib/trackPartnerAdEvent";

describe("trackPartnerAdEvent", () => {
  const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("fires impression RPC on first call", async () => {
    await trackPartnerAdEvent({
      campaignId: "c1",
      placementKey: "homeBillboard",
      eventType: "impression",
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "track_partner_ad_event",
      expect.objectContaining({
        p_campaign_id: "c1",
        p_event_type: "impression",
        p_placement_key: "homeBillboard",
      }),
    );
  });

  it("dedupes second impression for the same campaign in the same session", async () => {
    await trackPartnerAdEvent({ campaignId: "c1", placementKey: "homeBillboard", eventType: "impression" });
    await trackPartnerAdEvent({ campaignId: "c1", placementKey: "homeBillboard", eventType: "impression" });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("does not dedupe impressions across different campaigns", async () => {
    await trackPartnerAdEvent({ campaignId: "c1", placementKey: "homeBillboard", eventType: "impression" });
    await trackPartnerAdEvent({ campaignId: "c2", placementKey: "homeBillboard", eventType: "impression" });
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  it("does not dedupe clicks (every click matters)", async () => {
    await trackPartnerAdEvent({ campaignId: "c1", placementKey: "homeBillboard", eventType: "click" });
    await trackPartnerAdEvent({ campaignId: "c1", placementKey: "homeBillboard", eventType: "click" });
    // Clicks go through the keepalive fetch path when supabase URL/key are set in env.
    // Either way: the helper must have attempted to send twice (no client-side dedup for clicks).
    const totalAttempts = fetchMock.mock.calls.length + (supabase.rpc as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(totalAttempts).toBeGreaterThanOrEqual(2);
  });

  it("silently swallows RPC errors", async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network down"));
    await expect(
      trackPartnerAdEvent({ campaignId: "c1", placementKey: "homeBillboard", eventType: "impression" }),
    ).resolves.toBeUndefined();
  });

  it("noops when campaignId is missing", async () => {
    await trackPartnerAdEvent({ campaignId: "", placementKey: "homeBillboard", eventType: "impression" });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
