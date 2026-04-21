import { useCallback, useEffect, useState } from "react";
import {
  COOKIE_CONSENT_EVENT,
  type CookieConsent,
  getCookieConsent,
  setCookieConsent as writeConsent,
} from "@/lib/analytics/cookieConsentStorage";

/**
 * Shared consent state + UI triggers.
 *
 * - `consent` reflects the latest persisted value (null until the user makes
 *   a choice).
 * - `preferencesOpen` drives the customisation modal's visibility. Both the
 *   banner's "Personnaliser" button and the footer's "Gérer mes cookies"
 *   link call `openPreferences`.
 * - Writes go through `acceptAll` / `rejectAll` / `savePreferences` which
 *   persist AND dispatch the custom event that GA4's initialiser listens to.
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => getCookieConsent());
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsent | null>).detail ?? null;
      setConsent(detail);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, handler);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handler);
  }, []);

  const acceptAll = useCallback(() => {
    writeConsent({ analytics: true, functional: true });
  }, []);

  const rejectAll = useCallback(() => {
    writeConsent({ analytics: false, functional: false });
  }, []);

  const savePreferences = useCallback((input: { analytics: boolean; functional: boolean }) => {
    writeConsent(input);
  }, []);

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  return {
    consent,
    hasDecided: consent !== null,
    preferencesOpen,
    openPreferences,
    closePreferences,
    acceptAll,
    rejectAll,
    savePreferences,
  };
}
