import { describe, it, expect } from "vitest";
import {
  normalizeListingReportError,
  ListingReportError,
} from "@/hooks/useCreateListingReport";

describe("normalizeListingReportError", () => {
  it("maps known RPC error codes to stable codes", () => {
    const cases: { raw: string; expected: string }[] = [
      { raw: "unauthenticated", expected: "unauthenticated" },
      { raw: "already_reported", expected: "already_reported" },
      { raw: "cannot_report_own_listing", expected: "cannot_report_own_listing" },
      { raw: "listing_not_active", expected: "listing_not_active" },
      { raw: "listing_not_found", expected: "listing_not_found" },
      { raw: "details_required", expected: "details_required" },
      { raw: "invalid_reason", expected: "invalid_reason" },
    ];

    for (const c of cases) {
      const err = normalizeListingReportError(new Error(c.raw));
      expect(err).toBeInstanceOf(ListingReportError);
      expect(err.code).toBe(c.expected);
    }
  });

  it("falls back to 'unknown' for unrecognized messages", () => {
    const err = normalizeListingReportError(new Error("some random DB error"));
    expect(err.code).toBe("unknown");
    expect(err.message).toBe("some random DB error");
  });

  it("handles non-Error inputs", () => {
    const err = normalizeListingReportError("plain string");
    expect(err.code).toBe("unknown");
    expect(err.message).toBe("plain string");
  });

  it("handles null/undefined inputs", () => {
    const err = normalizeListingReportError(null);
    expect(err.code).toBe("unknown");
    expect(err.message).toBe("");
  });

  it("extracts known code from PostgREST-prefixed messages", () => {
    // supabase-js typically surfaces errors as "... already_reported ..." with
    // extra prefix/suffix. Substring match must still land.
    const err = normalizeListingReportError(
      new Error("RPC failed: already_reported — hint: you already reported this listing"),
    );
    expect(err.code).toBe("already_reported");
  });
});
