import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setCookieConsent, clearCookieConsent } from "@/lib/analytics/cookieConsentStorage";
import { trackShareEvent } from "@/components/listing/ShareButton/shareTracking";

function resetDataLayer() {
  window.dataLayer = [];
}

describe("trackShareEvent (GA4 dataLayer wrapper)", () => {
  beforeEach(() => {
    clearCookieConsent();
    resetDataLayer();
  });

  afterEach(() => {
    clearCookieConsent();
    window.dataLayer = undefined;
    vi.unstubAllGlobals();
  });

  it("pushes a 'listing_share_clicked' event when analytics consent is granted", () => {
    setCookieConsent({ analytics: true, functional: true });

    trackShareEvent({ channel: "whatsapp", listingId: "abc-123", success: true });

    expect(window.dataLayer).toHaveLength(1);
    const event = window.dataLayer![0] as [string, string, Record<string, unknown>];
    expect(event[0]).toBe("event");
    expect(event[1]).toBe("listing_share_clicked");
    expect(event[2].channel).toBe("whatsapp");
    expect(event[2].listing_id).toBe("abc-123");
    expect(event[2].success).toBe(true);
    expect(event[2].error).toBeUndefined();
  });

  it("is a silent no-op when no consent has been recorded", () => {
    trackShareEvent({ channel: "copy", listingId: "abc-123", success: true });
    expect(window.dataLayer).toHaveLength(0);
  });

  it("is a silent no-op when analytics consent is explicitly false", () => {
    setCookieConsent({ analytics: false, functional: true });
    trackShareEvent({ channel: "copy", listingId: "abc-123", success: true });
    expect(window.dataLayer).toHaveLength(0);
  });

  it("is a silent no-op when window.dataLayer is not initialized", () => {
    setCookieConsent({ analytics: true, functional: true });
    window.dataLayer = undefined;
    expect(() => trackShareEvent({ channel: "native", listingId: "x", success: true })).not.toThrow();
  });

  it("forwards the error message when success is false", () => {
    setCookieConsent({ analytics: true, functional: true });
    trackShareEvent({ channel: "native", listingId: "abc", success: false, error: "Permission denied" });
    const event = window.dataLayer![0] as [string, string, Record<string, unknown>];
    expect(event[2].success).toBe(false);
    expect(event[2].error).toBe("Permission denied");
  });
});
