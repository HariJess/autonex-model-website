/**
 * Single source of truth for cookie-consent persistence.
 *
 * Stored under localStorage key `autonex_cookie_consent_v1`. The `_v1` suffix
 * is deliberate: if the consent schema ever changes (new category, altered
 * semantics), bump to _v2 so stored values don't silently apply under new
 * semantics — users get a fresh banner.
 *
 * An "autonex:cookie-consent-change" CustomEvent is dispatched on every write
 * so listeners (GA4 init, banner visibility) can react without a manual
 * subscription to storage events.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "autonex_cookie_consent_v1";
export const COOKIE_CONSENT_EVENT = "autonex:cookie-consent-change";

export type CookieConsent = {
  analytics: boolean;
  functional: boolean;
  version: 1;
  acceptedAt: string;
};

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.version !== 1) return null;
    return {
      analytics: Boolean(parsed.analytics),
      functional: Boolean(parsed.functional),
      version: 1,
      acceptedAt: typeof parsed.acceptedAt === "string" ? parsed.acceptedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function setCookieConsent(input: { analytics: boolean; functional: boolean }): CookieConsent {
  const next: CookieConsent = {
    analytics: Boolean(input.analytics),
    functional: Boolean(input.functional),
    version: 1,
    acceptedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: next }));
    } catch {
      /* quota/privacy-mode: silently drop; banner will reappear on next load */
    }
  }
  return next;
}

export function clearCookieConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: null }));
  } catch {
    /* noop */
  }
}
