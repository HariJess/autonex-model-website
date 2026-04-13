import { describe, it, expect } from "vitest";
import {
  sanitizeListingTypes,
  parseTransaction,
  filtersFromSearchParams,
} from "@/lib/searchUrl";

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

  it("parse les chambres (rooms)", () => {
    const sp = new URLSearchParams("transaction=vente&chambres=2,3");
    const f = filtersFromSearchParams(sp);
    expect(f.rooms).toEqual([2, 3]);
  });

  it("ignore les chambres invalides (négatives, texte)", () => {
    const sp = new URLSearchParams("chambres=abc,-1,2");
    const f = filtersFromSearchParams(sp);
    expect(f.rooms).toEqual([2]);
  });

  it("parse les salles de bains", () => {
    const sp = new URLSearchParams("sdb=1,2,4");
    const f = filtersFromSearchParams(sp);
    expect(f.bathrooms).toEqual([1, 2, 4]);
  });

  it("exclut sdb=0 (invalide pour salle de bain)", () => {
    const sp = new URLSearchParams("sdb=0,1");
    const f = filtersFromSearchParams(sp);
    expect(f.bathrooms).toEqual([1]);
  });
});
