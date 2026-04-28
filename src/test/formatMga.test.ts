import { describe, expect, it } from "vitest";
import { formatMga, formatNumber, formatDeltaPct } from "@/lib/formatMga";

describe("formatMga", () => {
  it("formats integer amounts with thousand separators and Ar suffix", () => {
    expect(formatMga(25000)).toMatch(/25.000.Ar$/);
    expect(formatMga(1234567)).toMatch(/1.234.567.Ar$/);
  });

  it("returns '0 Ar' for null, undefined and NaN", () => {
    expect(formatMga(null)).toBe("0 Ar");
    expect(formatMga(undefined)).toBe("0 Ar");
    expect(formatMga(NaN)).toBe("0 Ar");
  });

  it("rounds non-integer values", () => {
    expect(formatMga(1234.7)).toMatch(/1.235.Ar$/);
  });
});

describe("formatNumber", () => {
  it("formats with thousand separators", () => {
    expect(formatNumber(1234567)).toMatch(/1.234.567/);
  });

  it("returns '0' for null/undefined/NaN", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
    expect(formatNumber(NaN)).toBe("0");
  });
});

describe("formatDeltaPct", () => {
  it("adds + sign for positive values", () => {
    expect(formatDeltaPct(12.5)).toBe("+12.5%");
  });

  it("preserves the - sign for negative values", () => {
    expect(formatDeltaPct(-3.2)).toBe("-3.2%");
  });

  it("treats zero as positive", () => {
    expect(formatDeltaPct(0)).toBe("+0.0%");
  });
});
