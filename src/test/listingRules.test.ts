import { describe, it, expect } from "vitest";
import {
  isTerrainRentalForbidden,
  listingTypesForTransaction,
  sanitizeListingTypeForTransaction,
  assertValidTransactionType,
} from "@/lib/listingRules";

describe("isTerrainRentalForbidden", () => {
  it("interdit terrain + location", () => {
    expect(isTerrainRentalForbidden("location", "terrain")).toBe(true);
  });

  it("interdit terrain + location_vacances", () => {
    expect(isTerrainRentalForbidden("location_vacances", "terrain")).toBe(true);
  });

  it("autorise terrain + vente", () => {
    expect(isTerrainRentalForbidden("vente", "terrain")).toBe(false);
  });

  it("autorise appartement + location", () => {
    expect(isTerrainRentalForbidden("location", "appartement")).toBe(false);
  });

  it("autorise villa + location_vacances", () => {
    expect(isTerrainRentalForbidden("location_vacances", "villa")).toBe(false);
  });

  it("retourne false pour type inconnu", () => {
    expect(isTerrainRentalForbidden("location", "chateau")).toBe(false);
  });
});

describe("listingTypesForTransaction", () => {
  it("exclut terrain pour location", () => {
    const types = listingTypesForTransaction("location");
    expect(types).not.toContain("terrain");
    expect(types).toContain("appartement");
  });

  it("exclut terrain pour location_vacances", () => {
    const types = listingTypesForTransaction("location_vacances");
    expect(types).not.toContain("terrain");
  });

  it("inclut tous les types pour vente", () => {
    const types = listingTypesForTransaction("vente");
    expect(types).toContain("terrain");
    expect(types).toContain("appartement");
    expect(types).toContain("villa");
    expect(types).toContain("maison");
    expect(types).toContain("local_commercial");
    expect(types).toContain("bureau");
  });

  it("exclut terrain si transaction vide (défense par défaut)", () => {
    const types = listingTypesForTransaction("");
    expect(types).not.toContain("terrain");
  });
});

describe("sanitizeListingTypeForTransaction", () => {
  it("retourne '' si le type n'est pas autorisé pour la transaction", () => {
    expect(sanitizeListingTypeForTransaction("location", "terrain")).toBe("");
  });

  it("retourne le type s'il est autorisé", () => {
    expect(sanitizeListingTypeForTransaction("vente", "villa")).toBe("villa");
  });

  it("retourne '' si type est undefined", () => {
    expect(sanitizeListingTypeForTransaction("vente", undefined)).toBe("");
  });

  it("retourne '' pour un type inconnu", () => {
    expect(sanitizeListingTypeForTransaction("vente", "chateau")).toBe("");
  });
});

describe("assertValidTransactionType", () => {
  it("accepte vente", () => {
    expect(assertValidTransactionType("vente")).toBe(true);
  });

  it("accepte location", () => {
    expect(assertValidTransactionType("location")).toBe(true);
  });

  it("accepte location_vacances", () => {
    expect(assertValidTransactionType("location_vacances")).toBe(true);
  });

  it("rejette valeur invalide", () => {
    expect(assertValidTransactionType("achat")).toBe(false);
  });

  it("rejette chaîne vide", () => {
    expect(assertValidTransactionType("")).toBe(false);
  });
});
