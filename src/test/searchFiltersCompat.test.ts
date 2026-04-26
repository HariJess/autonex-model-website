import { describe, expect, it } from "vitest";
import { hydrateSearchFilters } from "@/lib/searchFiltersCompat";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";

describe("hydrateSearchFilters", () => {
  it("prioritise les clés canoniques véhicule sur les anciennes clés", () => {
    expect(
      hydrateSearchFilters({
        mileageMinKm: 10,
        mileageMaxKm: 20,
        doorCounts: [3],
        surfaceMin: 999,
        surfaceMax: 888,
        bathrooms: [8],
      }),
    ).toEqual({
      ...EMPTY_SEARCH_FILTERS,
      mileageMinKm: 10,
      mileageMaxKm: 20,
      doorCounts: [3],
    });
  });

  it("remplit depuis la forme legacy lorsque les canoniques sont absentes", () => {
    expect(
      hydrateSearchFilters({
        surfaceMin: 5000,
        surfaceMax: 120000,
        bathrooms: [4],
      }),
    ).toMatchObject({
      mileageMinKm: 5000,
      mileageMaxKm: 120000,
      doorCounts: [4],
    });
  });
});
