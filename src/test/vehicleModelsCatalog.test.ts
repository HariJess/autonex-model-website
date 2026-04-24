import { describe, it, expect } from "vitest";
import {
  getModelsForBrand,
  getSortedModelsForBrand,
  getVehicleModelLabel,
  normalizeVehicleModel,
  VEHICLE_MODELS_BY_BRAND,
} from "@/data/vehicleModelsCatalog";

describe("vehicleModelsCatalog — getModelsForBrand", () => {
  it("retourne la liste Toyota pour 'Toyota'", () => {
    const models = getModelsForBrand("Toyota");
    expect(models.length).toBeGreaterThan(10);
    expect(models.some((m) => m.value === "hilux")).toBe(true);
    expect(models.some((m) => m.value === "land cruiser")).toBe(true);
  });

  it("est insensible à la casse et aux espaces", () => {
    expect(getModelsForBrand("  toyota  ").length).toBe(
      getModelsForBrand("TOYOTA").length,
    );
  });

  it("retourne un tableau vide pour une marque inconnue", () => {
    expect(getModelsForBrand("UnknownBrand")).toEqual([]);
  });

  it("retourne un tableau vide si brand null / vide", () => {
    expect(getModelsForBrand(null)).toEqual([]);
    expect(getModelsForBrand(undefined)).toEqual([]);
    expect(getModelsForBrand("")).toEqual([]);
  });
});

describe("vehicleModelsCatalog — normalizeVehicleModel", () => {
  it("trim + lowercase", () => {
    expect(normalizeVehicleModel("  RAV4  ")).toBe("rav4");
    expect(normalizeVehicleModel("Rav 4")).toBe("rav 4");
    expect(normalizeVehicleModel("LAND CRUISER")).toBe("land cruiser");
  });
});

describe("vehicleModelsCatalog — getVehicleModelLabel", () => {
  it("retourne le label officiel catalogué", () => {
    expect(getVehicleModelLabel("Toyota", "rav4")).toBe("RAV4");
    expect(getVehicleModelLabel("Hyundai", "i10")).toBe("i10");
    expect(getVehicleModelLabel("Mazda", "cx-5")).toBe("CX-5");
  });

  it("fallback title-case pour un modèle custom", () => {
    expect(getVehicleModelLabel("Toyota", "camping-car hymer")).toBe("Camping-car Hymer");
  });

  it("gère brand null / value null", () => {
    expect(getVehicleModelLabel(null, "rav4")).toBe("Rav4");
    expect(getVehicleModelLabel("Toyota", null)).toBe("");
    expect(getVehicleModelLabel(null, null)).toBe("");
  });
});

describe("vehicleModelsCatalog — getSortedModelsForBrand", () => {
  it("liste les populaires d'abord, puis le reste par ordre alphabétique", () => {
    const sorted = getSortedModelsForBrand("Toyota");
    const popularCount = sorted.filter((m) => m.popular).length;
    // Les N premiers sont populaires.
    for (let i = 0; i < popularCount; i++) {
      expect(sorted[i].popular).toBe(true);
    }
    // Puis le reste est trié alphabétiquement.
    const rest = sorted.slice(popularCount);
    for (let i = 1; i < rest.length; i++) {
      expect(rest[i - 1].label.localeCompare(rest[i].label, "fr")).toBeLessThanOrEqual(0);
    }
  });
});

describe("vehicleModelsCatalog — exhaustivité", () => {
  it("contient au moins 400 modèles au total", () => {
    const total = Object.values(VEHICLE_MODELS_BY_BRAND).reduce((acc, arr) => acc + arr.length, 0);
    expect(total).toBeGreaterThanOrEqual(400);
  });

  it("contient au moins 30 marques catalogutées", () => {
    expect(Object.keys(VEHICLE_MODELS_BY_BRAND).length).toBeGreaterThanOrEqual(30);
  });

  it("chaque modèle a un label non vide et une value non vide", () => {
    for (const [brand, models] of Object.entries(VEHICLE_MODELS_BY_BRAND)) {
      for (const m of models) {
        expect(m.value.length, `${brand} model missing value`).toBeGreaterThan(0);
        expect(m.label.length, `${brand} model missing label`).toBeGreaterThan(0);
      }
    }
  });

  it("toutes les values d'une même marque sont uniques", () => {
    for (const [brand, models] of Object.entries(VEHICLE_MODELS_BY_BRAND)) {
      const values = models.map((m) => m.value);
      const unique = new Set(values);
      expect(unique.size, `duplicate model values in ${brand}`).toBe(values.length);
    }
  });
});
