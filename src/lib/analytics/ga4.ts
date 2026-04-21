/**
 * Google Analytics 4 conditional initialisation.
 *
 * Only loads the gtag.js script when BOTH of these are true:
 *   - VITE_GA4_MEASUREMENT_ID is defined and starts with "G-"
 *   - The user has granted analytics consent via the cookie banner
 *
 * If either condition fails, this module is a no-op. Safe to import and call
 * unconditionally on mount — actual side effects are gated.
 *
 * Idempotent: sets window.__ga4Initialized so repeat invocations do nothing.
 * Called by App.tsx on mount AND whenever the consent event fires.
 */

import { getCookieConsent } from "@/lib/analytics/cookieConsentStorage";

declare global {
  interface Window {
    __ga4Initialized?: boolean;
    dataLayer?: unknown[];
  }
}

export function initGA4IfConsented(): void {
  if (typeof window === "undefined") return;

  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
  if (!measurementId || !measurementId.startsWith("G-")) {
    return;
  }

  const consent = getCookieConsent();
  if (!consent?.analytics) {
    return;
  }

  if (window.__ga4Initialized) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  gtag("js", new Date());
  gtag("config", measurementId, {
    anonymize_ip: true,
    send_page_view: true,
  });

  window.__ga4Initialized = true;
}
