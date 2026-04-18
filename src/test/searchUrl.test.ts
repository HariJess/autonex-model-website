import { describe, it, expect } from "vitest";
import {
  sanitizeListingTypes,
  parseTransaction,
  filtersFromSearchParams,
  filtersToSearchParams,
} from "@/lib/searchUrl";
import type { SearchFilters } from "@/types/search";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";

describe("sanitizeListingTypes", () => {
  it("garde uniquement les types valides", () => {
    const result = sanitizeListingTypes(["villa", "appartement", "foo", "chateau"]);
    expect(result).toEqual(["villa", "appartement"]);
  });

  it("retourne tableau vide si rien de valide", () => {
    expect(sanitizeListingTypes(["chateau", "igloo"])).toEqual([]);
  });

  it("retourne tableau vide si input vide", () => {
    expect(sanitizeListingTypes([])).toEqual([]);
  });
});

describe("parseTransaction", () => {
  it("accepte 'vente'", () => {
    expect(parseTransaction("vente")).toBe("vente");
  });

  it("accepte 'location'", () => {
    expect(parseTransaction("location")).toBe("location");
  });

  it("rejette valeur invalide", () => {
    expect(parseTransaction("achat")).toBe("");
  });

  it("gère null", () => {
    expect(parseTransaction(null)).toBe("");
  });

  it("gère chaîne vide", () => {
    expect(parseTransaction("")).toBe("");
  });
});

describe("filtersFromSearchParams", () => {
  it("parse un URL minimal", () => {
    const sp = new URLSearchParams("transaction=vente");
    const f = filtersFromSearchParams(sp);
    expect(f.transaction).toBe("vente");
  });

  it("parse les types multiples", () => {
    const sp = new URLSearchParams("transaction=vente&type=villa,appartement");
    const f = filtersFromSearchParams(sp);
    expect(f.types).toContain("villa");
    expect(f.types).toContain("appartement");
  });

  it("exclut terrain si transaction=location", () => {
    const sp = new URLSearchParams("transaction=location&type=terrain,villa");
    const f = filtersFromSearchParams(sp);
    expect(f.types).not.toContain("terrain");
    expect(f.types).toContain("villa");
  });

  it("parse le ville et quartiers", () => {
    const sp = new URLSearchParams(
      "transaction=vente&ville=Antananarivo&quartiers=Isoraka,Ambatobe"
    );
    const f = filtersFromSearchParams(sp);
    expect(f.ville).toBe("Antananarivo");
    expect(f.quartiers).toContain("Isoraka");
    expect(f.quartiers).toContain("Ambatobe");
  });

  it("parse les chambres (legacy chambres → trimVersionIndices)", () => {
    const sp = new URLSearchParams("transaction=vente&chambres=2,3");
    const f = filtersFromSearchParams(sp);
    expect(f.trimVersionIndices).toEqual([2, 3]);
  });

  it("ignore les chambres invalides (négatives, texte)", () => {
    const sp = new URLSearchParams("chambres=abc,-1,2");
    const f = filtersFromSearchParams(sp);
    expect(f.trimVersionIndices).toEqual([2]);
  });

  it("parse les salles de bains (legacy sdb → doorCounts)", () => {
    const sp = new URLSearchParams("sdb=1,2,4");
    const f = filtersFromSearchParams(sp);
    expect(f.doorCounts).toEqual([1, 2, 4]);
  });

  it("accepte doors comme alias véhicule pour sdb", () => {
    const sp = new URLSearchParams("doors=3,5");
    const f = filtersFromSearchParams(sp);
    expect(f.doorCounts).toEqual([3, 5]);
  });

  it("priorise doors sur sdb si doors est présent", () => {
    const sp = new URLSearchParams("doors=2&sdb=5");
    const f = filtersFromSearchParams(sp);
    expect(f.doorCounts).toEqual([2]);
  });

  it("exclut sdb=0 (invalide pour salle de bain)", () => {
    const sp = new URLSearchParams("sdb=0,1");
    const f = filtersFromSearchParams(sp);
    expect(f.doorCounts).toEqual([1]);
  });

  it("accepte mileage_min/max à la place de surface_*", () => {
    const f = filtersFromSearchParams(new URLSearchParams("mileage_min=5000&mileage_max=200000"));
    expect(f.mileageMinKm).toBe(5000);
    expect(f.mileageMaxKm).toBe(200000);
  });

  it("priorise mileage_* sur surface_* lorsque les deux sont présents", () => {
    const f = filtersFromSearchParams(
      new URLSearchParams("mileage_min=100000&surface_min=1&mileage_max=300000&surface_max=999999"),
    );
    expect(f.mileageMinKm).toBe(100000);
    expect(f.mileageMaxKm).toBe(300000);
  });

  it("parse trim comme alias pour chambres / trimVersionIndices", () => {
    const f = filtersFromSearchParams(new URLSearchParams("trim=2,3"));
    expect(f.trimVersionIndices).toEqual([2, 3]);
  });

  it("priorise trim sur chambres lorsque trim est défini", () => {
    const f = filtersFromSearchParams(new URLSearchParams("trim=2&chambres=9"));
    expect(f.trimVersionIndices).toEqual([2]);
  });

  it("sérialise avec les paramètres véhicule (mileage_min, trim, doors)", () => {
    const p = filtersToSearchParams({
      ...EMPTY_SEARCH_FILTERS,
      mileageMinKm: 10000,
      mileageMaxKm: 150000,
      trimVersionIndices: [1, 2],
      doorCounts: [4, 5],
    });
    expect(p.get("mileage_min")).toBe("10000");
    expect(p.get("mileage_max")).toBe("150000");
    expect(p.get("trim")).toBe("1,2");
    expect(p.get("doors")).toBe("4,5");
    expect(p.get("surface_min")).toBeNull();
    expect(p.get("chambres")).toBeNull();
  });

  it("round-trip interne équivalent après sérialisation canonique", () => {
    const original: SearchFilters = {
      ...EMPTY_SEARCH_FILTERS,
      transaction: "vente",
      mileageMinKm: 5,
      mileageMaxKm: 60000,
      trimVersionIndices: [2],
      doorCounts: [5],
    };
    const restored = filtersFromSearchParams(filtersToSearchParams(original));
    expect(restored.mileageMinKm).toBe(original.mileageMinKm);
    expect(restored.mileageMaxKm).toBe(original.mileageMaxKm);
    expect(restored.trimVersionIndices).toEqual(original.trimVersionIndices);
    expect(restored.doorCounts).toEqual(original.doorCounts);
    expect(restored.transaction).toBe(original.transaction);
  });
});
