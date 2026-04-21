import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setCookieConsent } from "@/lib/analytics/cookieConsentStorage";

const GA_SRC_PREFIX = "https://www.googletagmanager.com/gtag/js";

function resetGa() {
  window.localStorage.clear();
  delete (window as unknown as { __ga4Initialized?: boolean }).__ga4Initialized;
  window.dataLayer = undefined;
  document.head.querySelectorAll(`script[src^="${GA_SRC_PREFIX}"]`).forEach((n) => n.remove());
}

describe("initGA4IfConsented", () => {
  beforeEach(() => {
    resetGa();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    resetGa();
    vi.unstubAllEnvs();
  });

  it("is a no-op when VITE_GA4_MEASUREMENT_ID is undefined", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "");
    setCookieConsent({ analytics: true, functional: true });
    const { initGA4IfConsented } = await import("@/lib/analytics/ga4");
    initGA4IfConsented();
    expect(window.__ga4Initialized).toBeFalsy();
    expect(document.head.querySelector(`script[src^="${GA_SRC_PREFIX}"]`)).toBeNull();
  });

  it("is a no-op when measurement ID does not start with G-", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "UA-1234-5");
    setCookieConsent({ analytics: true, functional: true });
    const { initGA4IfConsented } = await import("@/lib/analytics/ga4");
    initGA4IfConsented();
    expect(window.__ga4Initialized).toBeFalsy();
  });

  it("does not inject gtag when analytics consent is false", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TESTTEST00");
    setCookieConsent({ analytics: false, functional: true });
    const { initGA4IfConsented } = await import("@/lib/analytics/ga4");
    initGA4IfConsented();
    expect(window.__ga4Initialized).toBeFalsy();
    expect(document.head.querySelector(`script[src^="${GA_SRC_PREFIX}"]`)).toBeNull();
  });

  it("does not inject gtag when no consent has been recorded", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TESTTEST00");
    const { initGA4IfConsented } = await import("@/lib/analytics/ga4");
    initGA4IfConsented();
    expect(window.__ga4Initialized).toBeFalsy();
  });

  it("injects gtag.js when env + consent are both present", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TESTTEST00");
    setCookieConsent({ analytics: true, functional: true });
    const { initGA4IfConsented } = await import("@/lib/analytics/ga4");
    initGA4IfConsented();
    expect(window.__ga4Initialized).toBe(true);
    const script = document.head.querySelector<HTMLScriptElement>(`script[src^="${GA_SRC_PREFIX}"]`);
    expect(script).not.toBeNull();
    expect(script?.src).toContain("G-TESTTEST00");
  });

  it("is idempotent — repeat calls do not inject a second script", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TESTTEST00");
    setCookieConsent({ analytics: true, functional: true });
    const { initGA4IfConsented } = await import("@/lib/analytics/ga4");
    initGA4IfConsented();
    initGA4IfConsented();
    initGA4IfConsented();
    expect(document.head.querySelectorAll(`script[src^="${GA_SRC_PREFIX}"]`).length).toBe(1);
  });
});
