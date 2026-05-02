import { supabase } from "@/integrations/supabase/client";
import { getOrCreateSessionId } from "./sessionId";
import type { PartnerAdPlacementKey } from "./partnerAds";

type EventType = "impression" | "click";

const IMPRESSION_DEDUP_PREFIX = "autonex.ad.impression.";

function hasLoggedImpression(campaignId: string): boolean {
  if (typeof window === "undefined" || !window.sessionStorage) return false;
  try {
    return window.sessionStorage.getItem(IMPRESSION_DEDUP_PREFIX + campaignId) === "1";
  } catch {
    return false;
  }
}

function markImpressionLogged(campaignId: string): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(IMPRESSION_DEDUP_PREFIX + campaignId, "1");
  } catch {
    // ignore (private mode, quota)
  }
}

/**
 * Fire-and-forget POST to the Supabase RPC endpoint with `keepalive: true` so
 * the request survives page unload (e.g. user clicks an ad, new tab opens,
 * origin tab navigates away). sendBeacon can't set Supabase auth headers
 * (apikey, Authorization), so keepalive fetch is the practical equivalent.
 */
function sendKeepaliveRpc(params: {
  campaignId: string;
  placementKey: string;
  eventType: string;
  sessionId: string;
}): boolean {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || typeof fetch === "undefined") return false;

    const url = `${supabaseUrl}/rest/v1/rpc/track_partner_ad_event`;
    const body = JSON.stringify({
      p_campaign_id: params.campaignId,
      p_placement_key: params.placementKey,
      p_event_type: params.eventType,
      p_session_id: params.sessionId,
    });

    void fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body,
      keepalive: true,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule `fn` outside of the current critical-path frame. Prefers
 * `requestIdleCallback` (with a 5 s safety timeout so trackers always run on
 * heavily loaded mobile pages), falls back to a macrotask via `setTimeout(0)`
 * when unavailable (older Safari, jsdom). Returns a promise that settles once
 * `fn` has run, so callers (and tests) can await the deferred work.
 */
function deferImpressionSend(fn: () => void | Promise<void>): Promise<void> {
  return new Promise<void>((resolve) => {
    const run = () => {
      Promise.resolve(fn())
        .catch(() => {})
        .finally(() => resolve());
    };
    if (typeof window === "undefined") {
      run();
      return;
    }
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => run(), { timeout: 5000 });
      return;
    }
    setTimeout(run, 0);
  });
}

/**
 * Track a partner ad event (impression or click).
 *
 * - Impressions are deduplicated client-side per browser session (sessionStorage).
 *   Dedup runs synchronously BEFORE the request is deferred, so a re-render
 *   storm cannot enqueue multiple deferred sends for the same campaign.
 * - Impressions are deferred out of the first-paint critical path via
 *   `requestIdleCallback`. The deferred callback is fire-and-forget; callers
 *   typically `void trackPartnerAdEvent(...)` so the deferral does not delay
 *   any user-visible work.
 * - Clicks always fire (true dedup happens at reporting via COUNT DISTINCT session_id).
 * - Click events use a keepalive fetch so the POST survives the user opening
 *   the ad's destination in a new tab and immediately closing the origin tab.
 * - All errors are silently swallowed: tracking must never break user experience.
 */
export async function trackPartnerAdEvent(params: {
  campaignId: string;
  placementKey: PartnerAdPlacementKey;
  eventType: EventType;
}): Promise<void> {
  const { campaignId, placementKey, eventType } = params;

  if (!campaignId || !placementKey || !eventType) return;

  if (eventType === "impression") {
    if (hasLoggedImpression(campaignId)) return;
    markImpressionLogged(campaignId);
  }

  const sessionId = getOrCreateSessionId();

  const send = async () => {
    try {
      if (eventType === "click") {
        const sent = sendKeepaliveRpc({ campaignId, placementKey, eventType, sessionId });
        if (sent) return;
      }

      await supabase.rpc("track_partner_ad_event", {
        p_campaign_id: campaignId,
        p_placement_key: placementKey,
        p_event_type: eventType,
        p_session_id: sessionId,
      });
    } catch {
      // Silently swallow: tracking failures must never affect UX
    }
  };

  if (eventType === "impression") {
    await deferImpressionSend(send);
    return;
  }

  await send();
}
