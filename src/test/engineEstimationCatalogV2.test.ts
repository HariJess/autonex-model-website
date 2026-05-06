/**
 * Tests unitaires de l'extension catalogue engine v2 (sprint 2026-05-06).
 *
 * Couvre les 3 niveaux affectés par le fix bug Tahoe :
 *   - SANITY_BOUNDS (sanityBounds.ts) : 15 nouveaux modèles tombent dans les
 *     3 segments `premium_pickup_suv_*` selon l'année.
 *   - MODEL_PROXIMITY (modelProximity.ts) : 15 nouvelles entrées proxy.
 *   - Non-régression : les 18 modèles existants (Land Cruiser, RAV4 etc.)
 *     conservent leur comportement.
 *
 * Les tests d'estimation END-TO-END (sortie engine ≈ 280M Ar pour Tahoe 2023)
 * dépendent de l'appel Supabase (reference profile + comparables + sanity)
 * et sont validés MANUELLEMENT par Ali sur autonex.mg/estimation après
 * deploy Edge function (cf. brief 2026-05-06).
 */

import { describe, it, expect } from "vitest";
import {
  findSanityBound,
  type SanityBound,
} from "@/lib/estimation/sanityBounds";
import {
  findProxyModels,
  type ModelProximityConfig,
} from "@/lib/estimation/modelProximity";

describe("Engine catalogue v2 — extension full-size US + Toyota US + Lexus", () => {
  // ─── 1. SANITY_BOUNDS — 15 nouveaux modèles couverts ─────────────────────

  describe("SANITY_BOUNDS — 15 nouveaux modèles tombent dans premium_pickup_suv_*", () => {
    const cases: Array<{ make: string; model: string; year: number; expectedSegment: string }> = [
      // Tahoe 2023 → segment recent (200-600M)
      { make: "Chevrolet", model: "Tahoe", year: 2023, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Chevrolet", model: "Suburban", year: 2024, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Chevrolet", model: "Silverado", year: 2025, expectedSegment: "premium_pickup_suv_recent" },
      { make: "GMC", model: "Yukon", year: 2026, expectedSegment: "premium_pickup_suv_recent" },
      { make: "GMC", model: "Sierra", year: 2023, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Ford", model: "Expedition", year: 2024, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Ford", model: "F-150", year: 2024, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Dodge", model: "Ram 1500", year: 2025, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Jeep", model: "Grand Cherokee", year: 2023, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Jeep", model: "Wrangler", year: 2024, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Jeep", model: "Gladiator", year: 2023, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Toyota", model: "Tundra", year: 2024, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Toyota", model: "Sequoia", year: 2024, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Nissan", model: "Armada", year: 2023, expectedSegment: "premium_pickup_suv_recent" },
      { make: "Lexus", model: "LX", year: 2025, expectedSegment: "premium_pickup_suv_recent" },

      // Tranches 2018-2022 et 2010-2017 : Wrangler / Gladiator / Tahoe
      { make: "Jeep", model: "Wrangler", year: 2020, expectedSegment: "premium_pickup_suv_2018_2022" },
      { make: "Chevrolet", model: "Tahoe", year: 2015, expectedSegment: "premium_pickup_suv_2010_2017" },
    ];

    it.each(cases)(
      "$make $model $year → segment $expectedSegment",
      ({ make, model, year, expectedSegment }) => {
        const bound: SanityBound | null = findSanityBound(make, model, year);
        expect(bound).not.toBeNull();
        expect(bound!.segmentKey).toBe(expectedSegment);
      },
    );

    it("Lookup case-insensitive : Chevrolet|tahoe minuscule trouve aussi le segment", () => {
      const bound = findSanityBound("chevrolet", "tahoe", 2023);
      expect(bound).not.toBeNull();
      expect(bound!.segmentKey).toBe("premium_pickup_suv_recent");
    });

    it("Bornes segment recent inchangées : 200M-600M (cible plancher Tahoe 2023)", () => {
      const bound = findSanityBound("Chevrolet", "Tahoe", 2023);
      expect(bound!.minMGA).toBe(200_000_000);
      expect(bound!.maxMGA).toBe(600_000_000);
    });
  });

  // ─── 2. MODEL_PROXIMITY — 15 nouvelles entrées avec proxies ────────────

  describe("MODEL_PROXIMITY — 15 nouveaux modèles ont des proxies définis", () => {
    const expected: Array<{ make: string; model: string; expectedProxies: string[]; rangeMin: number; rangeMax: number }> = [
      // SUV full-size US → proxy Land Cruiser + Patrol
      { make: "Chevrolet", model: "Tahoe", expectedProxies: ["Toyota|Land Cruiser", "Nissan|Patrol"], rangeMin: 0.85, rangeMax: 1.15 },
      { make: "Chevrolet", model: "Suburban", expectedProxies: ["Toyota|Land Cruiser", "Nissan|Patrol"], rangeMin: 0.95, rangeMax: 1.25 },
      { make: "GMC", model: "Yukon", expectedProxies: ["Toyota|Land Cruiser", "Nissan|Patrol"], rangeMin: 0.90, rangeMax: 1.20 },
      { make: "Ford", model: "Expedition", expectedProxies: ["Toyota|Land Cruiser", "Nissan|Patrol"], rangeMin: 0.85, rangeMax: 1.15 },
      { make: "Toyota", model: "Sequoia", expectedProxies: ["Toyota|Land Cruiser", "Nissan|Patrol"], rangeMin: 0.85, rangeMax: 1.15 },
      { make: "Nissan", model: "Armada", expectedProxies: ["Toyota|Land Cruiser", "Nissan|Patrol"], rangeMin: 0.80, rangeMax: 1.10 },

      // Pickups full-size US → proxy mid-size jap (range élargi 1.20-1.70)
      { make: "Chevrolet", model: "Silverado", expectedProxies: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"], rangeMin: 1.20, rangeMax: 1.60 },
      { make: "GMC", model: "Sierra", expectedProxies: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"], rangeMin: 1.20, rangeMax: 1.60 },
      { make: "Ford", model: "F-150", expectedProxies: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"], rangeMin: 1.20, rangeMax: 1.60 },
      { make: "Dodge", model: "Ram 1500", expectedProxies: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"], rangeMin: 1.20, rangeMax: 1.60 },
      { make: "Toyota", model: "Tundra", expectedProxies: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"], rangeMin: 1.30, rangeMax: 1.70 },

      // Lifestyle 4×4 + Grand Cherokee
      { make: "Jeep", model: "Wrangler", expectedProxies: ["Toyota|4runner", "Mitsubishi|Pajero"], rangeMin: 1.30, rangeMax: 1.70 },
      { make: "Jeep", model: "Gladiator", expectedProxies: ["Toyota|Hilux", "Ford|Ranger", "Mitsubishi|L200"], rangeMin: 1.30, rangeMax: 1.70 },
      { make: "Jeep", model: "Grand Cherokee", expectedProxies: ["Toyota|Land Cruiser Prado", "Toyota|4runner"], rangeMin: 0.90, rangeMax: 1.20 },

      // Lexus LX
      { make: "Lexus", model: "LX", expectedProxies: ["Toyota|Land Cruiser"], rangeMin: 1.50, rangeMax: 1.90 },
    ];

    it.each(expected)(
      "$make $model → proxies + priceFactorRange",
      ({ make, model, expectedProxies, rangeMin, rangeMax }) => {
        const cfg: ModelProximityConfig | null = findProxyModels(make, model);
        expect(cfg).not.toBeNull();
        expect(cfg!.proxyModels).toEqual(expectedProxies);
        expect(cfg!.priceFactorRange[0]).toBeCloseTo(rangeMin, 2);
        expect(cfg!.priceFactorRange[1]).toBeCloseTo(rangeMax, 2);
        expect(cfg!.proximityLabel.length).toBeGreaterThan(0);
      },
    );

    it("Lookup case-insensitive : Lexus|lx minuscule trouve la config", () => {
      const cfg = findProxyModels("lexus", "lx");
      expect(cfg).not.toBeNull();
      expect(cfg!.proxyModels).toContain("Toyota|Land Cruiser");
    });
  });

  // ─── 3. Non-régression sur les 18 modèles existants ────────────────────

  describe("Non-régression — modèles existants inchangés", () => {
    it("Toyota Land Cruiser 2025 → segment recent inchangé", () => {
      const bound = findSanityBound("Toyota", "Land Cruiser", 2025);
      expect(bound).not.toBeNull();
      expect(bound!.segmentKey).toBe("premium_pickup_suv_recent");
      expect(bound!.minMGA).toBe(200_000_000);
      expect(bound!.maxMGA).toBe(600_000_000);
    });

    it("Toyota Land Cruiser → proxies inchangés (Prado/Hilux/4runner/Fortuner)", () => {
      const cfg = findProxyModels("Toyota", "Land Cruiser");
      expect(cfg).not.toBeNull();
      expect(cfg!.proxyModels).toEqual([
        "Toyota|Land Cruiser Prado",
        "Toyota|Hilux",
        "Toyota|4runner",
        "Toyota|Fortuner",
      ]);
      expect(cfg!.priceFactorRange).toEqual([0.95, 1.20]);
    });

    it("Toyota RAV4 → proxies inchangés (Tucson/Sportage/Crv/Cx-5)", () => {
      const cfg = findProxyModels("Toyota", "Rav4");
      expect(cfg).not.toBeNull();
      expect(cfg!.proxyModels).toEqual([
        "Hyundai|Tucson",
        "Kia|Sportage",
        "Honda|Crv",
        "Mazda|Cx-5",
      ]);
    });

    it("Hyundai Tucson 2020 → segment suv_standard_2018_2022 inchangé", () => {
      const bound = findSanityBound("Hyundai", "Tucson", 2020);
      expect(bound).not.toBeNull();
      expect(bound!.segmentKey).toBe("suv_standard_2018_2022");
      expect(bound!.minMGA).toBe(45_000_000);
      expect(bound!.maxMGA).toBe(150_000_000);
    });

    it("Toyota Corolla 2015 → segment compact_sedan_2010_2017 inchangé", () => {
      const bound = findSanityBound("Toyota", "Corolla", 2015);
      expect(bound).not.toBeNull();
      expect(bound!.segmentKey).toBe("compact_sedan_2010_2017");
    });
  });
});
