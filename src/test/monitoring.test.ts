import { describe, it, expect } from "vitest";
import { SENTRY_TRACES_SAMPLE_RATE } from "@/lib/monitoring";

describe("monitoring — Sentry tracesSampleRate (M3)", () => {
  it("is 0 in test mode (vitest sets import.meta.env.PROD = false)", () => {
    expect(import.meta.env.PROD).toBe(false);
    expect(SENTRY_TRACES_SAMPLE_RATE).toBe(0);
  });

  it("is a number between 0 and 1", () => {
    expect(typeof SENTRY_TRACES_SAMPLE_RATE).toBe("number");
    expect(SENTRY_TRACES_SAMPLE_RATE).toBeGreaterThanOrEqual(0);
    expect(SENTRY_TRACES_SAMPLE_RATE).toBeLessThanOrEqual(1);
  });
});
