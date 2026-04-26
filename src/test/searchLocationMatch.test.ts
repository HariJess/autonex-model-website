import { describe, it, expect } from "vitest";
import {
  matchesLocationSubareas,
  matchesDoorCountFilterStrict,
  matchesPriceMaxStrict,
  matchesPriceMinStrict,
  matchesMileageKmMaxStrict,
  matchesMileageKmMinStrict,
} from "@/lib/searchLocationMatch";
import type { DisplayListing } from "@/types/listing";
import type { SearchFilters } from "@/types/search";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";

function makeListing(overrides: Partial<DisplayListing> = {}): DisplayListing {
  return {
    id: "test-id",
    title: "Test listing",
    description: "",
    type: "appartement",
    transaction: "vente",
    price_mga: 10_000_000,
    price_eur: null,
    surface: 50,
    bathrooms: 1,
    toilets: null,
    ville: "Antananarivo",
    region: "Analamanga",
    arrondissement: "1er arrondissement",
    quartier: "Isoraka",
    quartier_libre: "",
    lat: null,
    lng: null,
    features: [],
    images: [],
    status: "active",
    views_count: 0,
    created_at: new Date().toISOString(),
    owner_id: "owner-1",
    badge: null,
    visibility_rank_score: 0,
    ...overrides,
  } as DisplayListing;
}

function makeFilters(overrides: Partial<SearchFilters> = {}): SearchFilters {
  return { ...EMPTY_SEARCH_FILTERS, ...overrides };
}

describe("matchesLocationSubareas", () => {
  it("match si aucune ville filtrée", () => {
    expect(matchesLocationSubareas(makeListing(), makeFilters())).toBe(true);
  });

  it("ne match pas si la ville diffère", () => {
    const l = makeListing({ ville: "Antananarivo" });
    const f = makeFilters({ ville: "Tamatave" });
    expect(matchesLocationSubareas(l, f)).toBe(false);
  });

  it("match si ville identique et pas de sous-zone filtrée", () => {
    const l = makeListing({ ville: "Antananarivo" });
    const f = makeFilters({ ville: "Antananarivo" });
    expect(matchesLocationSubareas(l, f)).toBe(true);
  });

  it("match sur arrondissement", () => {
    const l = makeListing({ arrondissement: "1er arrondissement" });
    const f = makeFilters({
      ville: "Antananarivo",
      arrondissements: ["1er arrondissement"],
    });
    expect(matchesLocationSubareas(l, f)).toBe(true);
  });

  it("match sur quartier", () => {
    const l = makeListing({ quartier: "Isoraka" });
    const f = makeFilters({ ville: "Antananarivo", quartiers: ["Isoraka"] });
    expect(matchesLocationSubareas(l, f)).toBe(true);
  });

  it("ne match pas si arrondissement et quartier différents", () => {
    const l = makeListing({
      arrondissement: "1er arrondissement",
      quartier: "Isoraka",
    });
    const f = makeFilters({
      ville: "Antananarivo",
      arrondissements: ["5e arrondissement"],
      quartiers: ["Ambatobe"],
    });
    expect(matchesLocationSubareas(l, f)).toBe(false);
  });
});

describe("matchesDoorCountFilterStrict", () => {
  it("match exact", () => {
    expect(matchesDoorCountFilterStrict(2, [2])).toBe(true);
  });

  it("4+ filter : match 4 et plus", () => {
    expect(matchesDoorCountFilterStrict(4, [4])).toBe(true);
    expect(matchesDoorCountFilterStrict(7, [4])).toBe(true);
  });

  it("4+ filter : ne match pas 3", () => {
    expect(matchesDoorCountFilterStrict(3, [4])).toBe(false);
  });

  it("filtre vide = match tout", () => {
    expect(matchesDoorCountFilterStrict(1, [])).toBe(true);
  });
});

describe("matchesPriceMaxStrict", () => {
  it("match si prix <= max", () => {
    expect(matchesPriceMaxStrict(5_000_000, 10_000_000)).toBe(true);
  });

  it("ne match pas si prix > max", () => {
    expect(matchesPriceMaxStrict(15_000_000, 10_000_000)).toBe(false);
  });

  it("match égalité exacte", () => {
    expect(matchesPriceMaxStrict(10_000_000, 10_000_000)).toBe(true);
  });

  it("match si pas de max défini (0)", () => {
    expect(matchesPriceMaxStrict(999_999_999, 0)).toBe(true);
  });
});

describe("matchesPriceMinStrict", () => {
  it("match si prix >= min", () => {
    expect(matchesPriceMinStrict(15_000_000, 10_000_000)).toBe(true);
  });

  it("ne match pas si prix < min", () => {
    expect(matchesPriceMinStrict(5_000_000, 10_000_000)).toBe(false);
  });

  it("match si pas de min défini", () => {
    expect(matchesPriceMinStrict(1, 0)).toBe(true);
  });
});

describe("matchesMileageKmMaxStrict", () => {
  it("match si km <= max", () => {
    expect(matchesMileageKmMaxStrict(80, 100)).toBe(true);
  });

  it("ne match pas si km > max", () => {
    expect(matchesMileageKmMaxStrict(120, 100)).toBe(false);
  });

  it("km null est toléré (ne filtre pas)", () => {
    expect(matchesMileageKmMaxStrict(null, 100)).toBe(true);
  });
});

describe("matchesMileageKmMinStrict", () => {
  it("match si km >= min", () => {
    expect(matchesMileageKmMinStrict(120, 100)).toBe(true);
  });

  it("ne match pas si km < min", () => {
    expect(matchesMileageKmMinStrict(80, 100)).toBe(false);
  });

  it("km null ne match pas si min > 0", () => {
    expect(matchesMileageKmMinStrict(null, 50)).toBe(false);
  });
});
