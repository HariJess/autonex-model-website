import { getCookieConsent } from "@/lib/analytics/cookieConsentStorage";
import type { ShareChannel } from "./shareChannels";

export interface ShareEventParams {
  channel: ShareChannel;
  listingId: string;
  success: boolean;
  error?: string;
}

export function trackShareEvent({ channel, listingId, success, error }: ShareEventParams): void {
  if (typeof window === "undefined") return;
  const consent = getCookieConsent();
  if (!consent?.analytics) return;
  if (!Array.isArray(window.dataLayer)) return;

  window.dataLayer.push([
    "event",
    "listing_share_clicked",
    {
      channel,
      listing_id: listingId,
      success,
      error: error ?? undefined,
      page_url: window.location.href,
    },
  ]);
}
