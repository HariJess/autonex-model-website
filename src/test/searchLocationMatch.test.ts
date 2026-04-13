import { describe, it, expect } from "vitest";
import {
  matchesLocationSubareas,
  matchesRoomsStrict,
  matchesBathroomsStrict,
  matchesPriceMaxStrict,
  matchesPriceMinStrict,
  matchesSurfaceMaxStrict,
  matchesSurfaceMinStrict,
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
    rooms: 2,
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

describe("matchesRoomsStrict", () => {
  it("match si aucun filtre", () => {
    expect(matchesRoomsStrict(3, [])).toBe(true);
  });

  it("match nombre exact", () => {
    expect(matchesRoomsStrict(3, [3])).toBe(true);
  });

  it("ne match pas nombre différent", () => {
    expect(matchesRoomsStrict(3, [2])).toBe(false);
  });

  it("match studio (0)", () => {
    expect(matchesRoomsStrict(0, [0])).toBe(true);
  });

  it("5+ filter : match 5", () => {
    expect(matchesRoomsStrict(5, [5])).toBe(true);
  });

  it("5+ filter : match 10", () => {
    expect(matchesRoomsStrict(10, [5])).toBe(true);
  });

  it("5+ filter : ne match pas 4", () => {
    expect(matchesRoomsStrict(4, [5])).toBe(false);
  });

  it("match si l'une des valeurs du filtre match", () => {
    expect(matchesRoomsStrict(3, [1, 2, 3])).toBe(true);
  });

  it("rooms null ne match rien (sauf filtre vide)", () => {
    expect(matchesRoomsStrict(null, [2])).toBe(false);
    expect(matchesRoomsStrict(null, [])).toBe(true);
  });
});

describe("matchesBathroomsStrict", () => {
  it("match exact", () => {
    expect(matchesBathroomsStrict(2, [2])).toBe(true);
  });

  it("4+ filter : match 4 et plus", () => {
    expect(matchesBathroomsStrict(4, [4])).toBe(true);
    expect(matchesBathroomsStrict(7, [4])).toBe(true);
  });

  it("4+ filter : ne match pas 3", () => {
    expect(matchesBathroomsStrict(3, [4])).toBe(false);
  });

  it("filtre vide = match tout", () => {
    expect(matchesBathroomsStrict(1, [])).toBe(true);
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

describe("matchesSurfaceMaxStrict", () => {
  it("match si surface <= max", () => {
    expect(matchesSurfaceMaxStrict(80, 100)).toBe(true);
  });

  it("ne match pas si surface > max", () => {
    expect(matchesSurfaceMaxStrict(120, 100)).toBe(false);
  });

  it("surface null est tolérée (ne filtre pas)", () => {
    expect(matchesSurfaceMaxStrict(null, 100)).toBe(true);
  });
});

describe("matchesSurfaceMinStrict", () => {
  it("match si surface >= min", () => {
    expect(matchesSurfaceMinStrict(120, 100)).toBe(true);
  });

  it("ne match pas si surface < min", () => {
    expect(matchesSurfaceMinStrict(80, 100)).toBe(false);
  });

  it("surface null ne match pas si min > 0", () => {
    expect(matchesSurfaceMinStrict(null, 50)).toBe(false);
  });
});
