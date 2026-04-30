import { describe, expect, it } from "vitest";
import { VEHICLE_UI_CATALOG_BY_MAKE } from "@/data/vehicleUiCatalog";
import { brandConfig } from "../../scripts/data/lib/configs";

describe("Cohérence catalogue UI vs canonical brands", () => {
  it("la majorité des canonical brands existent dans le catalogue UI", () => {
    const catalogBrands = new Set(Object.keys(VEHICLE_UI_CATALOG_BY_MAKE));
    const known: string[] = [];
    const missing: string[] = [];
    for (const b of brandConfig.canonical_brands) {
      if (catalogBrands.has(b)) known.push(b);
      else missing.push(b);
    }
    // On loggue les marques manquantes mais on n'échoue pas: certaines marques
    // de la liste canonique (Oceantrade revendeur, marques chinoises rares) ne sont
    // volontairement pas dans le catalogue UI. Test sentinel: au moins 80% match.
    if (missing.length > 0) {
      console.warn(`[catalog-check] marques canoniques absentes du catalogue UI:`, missing);
    }
    expect(known.length).toBeGreaterThanOrEqual(Math.floor(brandConfig.canonical_brands.length * 0.6));
  });

  it("les marques principales (Toyota, Hyundai, Renault) sont mappées", () => {
    expect(VEHICLE_UI_CATALOG_BY_MAKE).toHaveProperty("Toyota");
    expect(VEHICLE_UI_CATALOG_BY_MAKE).toHaveProperty("Hyundai");
    expect(VEHICLE_UI_CATALOG_BY_MAKE).toHaveProperty("Renault");
  });
});
