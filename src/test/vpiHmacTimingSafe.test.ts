import { describe, it, expect } from "vitest";
import { constantTimeEqual } from "../../supabase/functions/_shared/vpi-hmac";

/**
 * Audit fix M2 — sanity tests for the constant-time HMAC comparator used
 * by the VPI webhook signature verification. We can't measure timing
 * deterministically in a unit test, but we can verify the boolean
 * contract (match / mismatch / length-mismatch).
 */
describe("constantTimeEqual (vpi-hmac, M2)", () => {
  const MATCH_64 = "A".repeat(64);

  it("returns true for identical strings of equal length", () => {
    expect(constantTimeEqual(MATCH_64, MATCH_64)).toBe(true);
    expect(constantTimeEqual("AB12EF", "AB12EF")).toBe(true);
    expect(constantTimeEqual("", "")).toBe(true);
  });

  it("returns false for different strings of equal length", () => {
    expect(constantTimeEqual("A".repeat(64), "B".repeat(64))).toBe(false);
    expect(constantTimeEqual("AB12EF", "AB12EG")).toBe(false);
    expect(
      constantTimeEqual(
        "0000000000000000000000000000000000000000000000000000000000000000",
        "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      ),
    ).toBe(false);
  });

  it("returns false for different lengths without throwing", () => {
    expect(constantTimeEqual("AB12EF", "AB12EF00")).toBe(false);
    expect(constantTimeEqual("", "A")).toBe(false);
    expect(constantTimeEqual("A".repeat(63), "A".repeat(64))).toBe(false);
  });

  it("returns false when a single trailing char differs (no early exit)", () => {
    const expected = "A".repeat(64);
    const almostMatch = "A".repeat(63) + "B";
    expect(constantTimeEqual(expected, almostMatch)).toBe(false);
  });
});
