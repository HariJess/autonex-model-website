import { describe, it, expect } from "vitest";
import {
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
  LISTING_TYPES_WITHOUT_ROOM_FILTERS,
  LISTING_TYPES_WITH_DOORS_FIELDS,
  TRANSACTION_LABELS,
  TRANSACTION_TYPES,
} from "@/types/listing";

describe("Listing types", () => {
  it("every LISTING_TYPE has a label", () => {
    for (const type of LISTING_TYPES) {
      expect(LISTING_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it("LISTING_TYPES matches DB enum values", () => {
    const expected = ["appartement", "villa", "maison", "terrain", "local_commercial", "bureau"];
    expect([...LISTING_TYPES]).toEqual(expected);
  });

  it("every TRANSACTION_TYPE has a label", () => {
    for (const type of TRANSACTION_TYPES) {
      expect(TRANSACTION_LABELS[type]).toBeTruthy();
    }
  });

  it("TRANSACTION_TYPES matches DB enum values", () => {
    const expected = ["vente", "location", "location_vacances"];
    expect([...TRANSACTION_TYPES]).toEqual(expected);
  });
});

describe("Filter URL serialization", () => {
  // Inline helper mirroring SearchPage logic
  function filtersToParams(f: Record<string, unknown>): URLSearchParams {
    const p = new URLSearchParams();
    if (f.transaction) p.set("transaction", String(f.transaction));
    if (Array.isArray(f.types) && f.types.length) p.set("type", f.types.join(","));
    if (f.ville) p.set("ville", String(f.ville));
    if (f.priceMin) p.set("prix_min", String(f.priceMin));
    if (f.priceMax) p.set("prix_max", String(f.priceMax));
    if (Array.isArray(f.rooms) && f.rooms.length) p.set("chambres", f.rooms.join(","));
    if (Array.isArray(f.equipments) && f.equipments.length) p.set("equip", f.equipments.join(","));
    return p;
  }

  function filtersFromParams(sp: URLSearchParams): Record<string, unknown> {
    return {
      transaction: sp.get("transaction") || "",
      types: sp.get("type") ? sp.get("type")!.split(",").filter(Boolean) : [],
      ville: sp.get("ville") || "",
      priceMin: Number(sp.get("prix_min")) || 0,
      priceMax: Number(sp.get("prix_max")) || 0,
      rooms: sp.get("chambres") ? sp.get("chambres")!.split(",").map(Number) : [],
      equipments: sp.get("equip") ? sp.get("equip")!.split(",").filter(Boolean) : [],
    };
  }

  it("round-trips filters through URL params", () => {
    const original = {
      transaction: "vente",
      types: ["villa", "appartement"],
      ville: "Antananarivo",
      priceMin: 1000000,
      priceMax: 50000000,
      rooms: [2, 3],
      equipments: ["Bluetooth"],
    };

    const params = filtersToParams(original);
    const restored = filtersFromParams(params);

    expect(restored.transaction).toBe("vente");
    expect(restored.types).toEqual(["villa", "appartement"]);
    expect(restored.ville).toBe("Antananarivo");
    expect(restored.priceMin).toBe(1000000);
    expect(restored.priceMax).toBe(50000000);
    expect(restored.rooms).toEqual([2, 3]);
    expect(restored.equipments).toEqual(["Bluetooth"]);
  });

  it("handles empty filters", () => {
    const params = filtersToParams({});
    expect(params.toString()).toBe("");
    const restored = filtersFromParams(params);
    expect(restored.transaction).toBe("");
    expect(restored.types).toEqual([]);
  });
});

describe("Type-aware field logic (doors)", () => {
  it("doors fields apply to citadine / SUV / berline categories", () => {
    for (const type of LISTING_TYPES_WITH_DOORS_FIELDS) {
      expect(LISTING_TYPES_WITH_DOORS_FIELDS.includes(type)).toBe(true);
    }
  });

  it("types without doors filters exclude those categories", () => {
    for (const type of LISTING_TYPES_WITHOUT_ROOM_FILTERS) {
      expect(LISTING_TYPES_WITH_DOORS_FIELDS.includes(type)).toBe(false);
    }
  });
});
