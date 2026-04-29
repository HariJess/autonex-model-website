import { describe, it, expect } from "vitest";
import {
  SubmitContactError,
  normalizeSubmitContactError,
  submitContactErrorMessage,
} from "@/hooks/useSubmitContactMessage";

describe("normalizeSubmitContactError", () => {
  it("maps known RPC codes", () => {
    for (const code of ["consent_required", "invalid_subject", "rate_limit_exceeded"] as const) {
      const err = normalizeSubmitContactError(new Error(code));
      expect(err).toBeInstanceOf(SubmitContactError);
      expect(err.code).toBe(code);
    }
  });

  it("extracts the code even when wrapped in a PostgREST-style message", () => {
    const err = normalizeSubmitContactError(
      new Error("PGRST: exception raised — rate_limit_exceeded — hint: too many messages"),
    );
    expect(err.code).toBe("rate_limit_exceeded");
  });

  it("falls back to 'unknown' for unrecognised messages", () => {
    const err = normalizeSubmitContactError(new Error("boom"));
    expect(err.code).toBe("unknown");
  });

  it("handles non-Error inputs", () => {
    expect(normalizeSubmitContactError(null).code).toBe("unknown");
    expect(normalizeSubmitContactError("oops").code).toBe("unknown");
  });
});

describe("submitContactErrorMessage", () => {
  it("returns a user-facing FR message for every code", () => {
    const messages = (["consent_required", "invalid_subject", "rate_limit_exceeded", "unknown"] as const).map(
      (code) => submitContactErrorMessage(code),
    );
    for (const m of messages) {
      expect(m.length).toBeGreaterThan(5);
    }
    expect(submitContactErrorMessage("rate_limit_exceeded")).toMatch(/heure/i);
  });
});
