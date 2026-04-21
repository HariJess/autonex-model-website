import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  clearCookieConsent,
  getCookieConsent,
  setCookieConsent,
} from "@/lib/analytics/cookieConsentStorage";

describe("cookieConsentStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(getCookieConsent()).toBeNull();
  });

  it("persists and retrieves analytics + functional flags", () => {
    setCookieConsent({ analytics: true, functional: false });
    const consent = getCookieConsent();
    expect(consent).not.toBeNull();
    expect(consent?.analytics).toBe(true);
    expect(consent?.functional).toBe(false);
    expect(consent?.version).toBe(1);
    expect(typeof consent?.acceptedAt).toBe("string");
  });

  it("rejects mismatched schema versions (future v2 won't load as v1)", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ analytics: true, functional: true, version: 999 }),
    );
    expect(getCookieConsent()).toBeNull();
  });

  it("dispatches the consent-change custom event on write", () => {
    const listener = vi.fn();
    window.addEventListener(COOKIE_CONSENT_EVENT, listener);
    setCookieConsent({ analytics: true, functional: true });
    expect(listener).toHaveBeenCalledTimes(1);
    const evt = listener.mock.calls[0][0] as CustomEvent;
    expect(evt.detail?.analytics).toBe(true);
    window.removeEventListener(COOKIE_CONSENT_EVENT, listener);
  });

  it("dispatches a null-detail event when cleared", () => {
    setCookieConsent({ analytics: true, functional: true });
    const listener = vi.fn();
    window.addEventListener(COOKIE_CONSENT_EVENT, listener);
    clearCookieConsent();
    expect(listener).toHaveBeenCalledTimes(1);
    const evt = listener.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toBeNull();
    expect(getCookieConsent()).toBeNull();
    window.removeEventListener(COOKIE_CONSENT_EVENT, listener);
  });

  it("coerces truthy/falsy input into booleans", () => {
    // ts-intentional: users of the API should pass booleans, but be defensive.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCookieConsent({ analytics: 1 as any, functional: 0 as any });
    const consent = getCookieConsent();
    expect(consent?.analytics).toBe(true);
    expect(consent?.functional).toBe(false);
  });
});
