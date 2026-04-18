import { describe, expect, it } from "vitest";
import { SEARCH_RELAXED_DB_ROW_CAP } from "@/config/searchListings";
import { buildSearchRelaxedFetchFilters, buildSearchStrictCountFilters } from "@/lib/searchListingFilters";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";

describe("buildSearchRelaxedFetchFilters", () => {
  it("sets relaxation + cap without SQL arrondissements", () => {
    const f = buildSearchRelaxedFetchFilters({
      ...EMPTY_SEARCH_FILTERS,
      transaction: "vente",
      ville: "Antananarivo",
      arrondissements: ["Premier"],
      quartiers: [],
    });
    expect(f.searchRelaxation).toBe(true);
    expect(f.limit).toBe(SEARCH_RELAXED_DB_ROW_CAP);
    expect(f.arrondissements).toBeUndefined();
    expect(f.quartiers).toBeUndefined();
  });

  it("passes offset for future pagination", () => {
    const f = buildSearchRelaxedFetchFilters({ ...EMPTY_SEARCH_FILTERS }, { offset: 500 });
    expect(f.offset).toBe(500);
  });
});

describe("buildSearchStrictCountFilters", () => {
  it("includes subareas and disables relaxation", () => {
    const f = buildSearchStrictCountFilters({
      ...EMPTY_SEARCH_FILTERS,
      ville: "Antananarivo",
      arrondissements: ["Premier"],
      quartiers: ["Centre"],
    });
    expect(f.searchRelaxation).toBe(false);
    expect(f.arrondissements).toEqual(["Premier"]);
    expect(f.quartiers).toEqual(["Centre"]);
    expect(f.limit).toBeUndefined();
  });
});
