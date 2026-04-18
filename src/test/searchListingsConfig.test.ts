import { describe, expect, it } from "vitest";
import { AGENCY_PROFILE_LISTINGS_CAP, SEARCH_RELAXED_DB_ROW_CAP } from "@/config/searchListings";

describe("searchListings config", () => {
  it("keeps a bounded search row cap for relaxed DB fetch", () => {
    expect(SEARCH_RELAXED_DB_ROW_CAP).toBeGreaterThan(0);
    expect(SEARCH_RELAXED_DB_ROW_CAP).toBeLessThanOrEqual(2000);
  });

  it("keeps a bounded agency page cap", () => {
    expect(AGENCY_PROFILE_LISTINGS_CAP).toBeGreaterThan(0);
  });
});
