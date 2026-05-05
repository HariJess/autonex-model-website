/**
 * PROMPT 10E — Tests Couche 4 : sanityBounds.
 */

import { describe, expect, it } from "vitest";
import {
  SANITY_BOUNDS,
  applySanityCheck,
  findSanityBound,
} from "@/lib/estimation/sanityBounds";

describe("PROMPT 10E — findSanityBound", () => {
  it("Toyota Land Cruiser Prado 2024 → premium_pickup_suv_recent", () => {
    const bound = findSanityBound("Toyota", "Land Cruiser Prado", 2024);
    expect(bound).not.toBeNull();
    expect(bound!.segmentKey).toBe("premium_pickup_suv_recent");
    expect(bound!.minMGA).toBe(200_000_000);
    expect(bound!.maxMGA).toBe(600_000_000);
  });

  it("Toyota Land Cruiser Prado 2020 → premium_pickup_suv_2018_2022", () => {
    const bound = findSanityBound("Toyota", "Land Cruiser Prado", 2020);
    expect(bound).not.toBeNull();
    expect(bound!.segmentKey).toBe("premium_pickup_suv_2018_2022");
  });

  it("Toyota Land Cruiser Prado 2010 → premium_pickup_suv_2010_2017", () => {
    const bound = findSanityBound("Toyota", "Land Cruiser Prado", 2010);
    expect(bound).not.toBeNull();
    expect(bound!.segmentKey).toBe("premium_pickup_suv_2010_2017");
  });

  it("Toyota Land Cruiser Prado 1995 → null (hors couverture)", () => {
    expect(findSanityBound("Toyota", "Land Cruiser Prado", 1995)).toBeNull();
  });

  it("Modèle inconnu → null", () => {
    expect(findSanityBound("Foo", "Bar", 2024)).toBeNull();
  });

  it("Kia Sportage 2024 → suv_standard_recent", () => {
    const bound = findSanityBound("Kia", "Sportage", 2024);
    expect(bound).not.toBeNull();
    expect(bound!.segmentKey).toBe("suv_standard_recent");
  });

  it("Toyota Corolla 2020 → compact_sedan_2018_2022", () => {
    const bound = findSanityBound("Toyota", "Corolla", 2020);
    expect(bound).not.toBeNull();
    expect(bound!.segmentKey).toBe("compact_sedan_2018_2022");
  });

  it("lookup case-insensitive", () => {
    expect(findSanityBound("toyota", "land cruiser prado", 2024)).not.toBeNull();
  });
});

describe("PROMPT 10E — applySanityCheck", () => {
  it("82M Ar Toyota Prado 2024 → raised_to_floor 200M", () => {
    const r = applySanityCheck(82_000_000, "Toyota", "Land Cruiser Prado", 2024);
    expect(r.inBounds).toBe(false);
    expect(r.action).toBe("raised_to_floor");
    expect(r.adjustedEstimate).toBe(200_000_000);
    expect(r.warning).not.toBeNull();
    expect(r.warning).toContain("plancher");
  });

  it("250M Ar Toyota Prado 2024 → kept", () => {
    const r = applySanityCheck(250_000_000, "Toyota", "Land Cruiser Prado", 2024);
    expect(r.inBounds).toBe(true);
    expect(r.action).toBe("kept");
    expect(r.adjustedEstimate).toBe(250_000_000);
    expect(r.warning).toBeNull();
  });

  it("800M Ar Toyota Prado 2024 → lowered_to_ceiling 600M", () => {
    const r = applySanityCheck(800_000_000, "Toyota", "Land Cruiser Prado", 2024);
    expect(r.inBounds).toBe(false);
    expect(r.action).toBe("lowered_to_ceiling");
    expect(r.adjustedEstimate).toBe(600_000_000);
    expect(r.warning).toContain("plafond");
  });

  it("Modèle inconnu → no_bound, valeur conservée", () => {
    const r = applySanityCheck(50_000_000, "Foo", "Bar", 2024);
    expect(r.inBounds).toBe(true);
    expect(r.action).toBe("no_bound");
    expect(r.adjustedEstimate).toBe(50_000_000);
    expect(r.warning).toBeNull();
    expect(r.bound).toBeNull();
  });

  it("preserve originalEstimate dans le résultat", () => {
    const r = applySanityCheck(42_000_000, "Toyota", "Land Cruiser Prado", 2024);
    expect(r.originalEstimate).toBe(42_000_000);
    expect(r.adjustedEstimate).toBe(200_000_000);
  });
});

describe("PROMPT 10E — SANITY_BOUNDS structure", () => {
  it("tous les bounds ont min < max et yearRange[0] <= yearRange[1]", () => {
    for (const b of SANITY_BOUNDS) {
      expect(b.minMGA).toBeLessThan(b.maxMGA);
      expect(b.yearRange[0]).toBeLessThanOrEqual(b.yearRange[1]);
      expect(b.models.length).toBeGreaterThan(0);
      expect(b.rationale.length).toBeGreaterThan(0);
    }
  });

  it("planchers premium >= planchers standard pour le même tier d'âge", () => {
    const premiumRecent = SANITY_BOUNDS.find((b) => b.segmentKey === "premium_pickup_suv_recent")!;
    const standardRecent = SANITY_BOUNDS.find((b) => b.segmentKey === "suv_standard_recent")!;
    expect(premiumRecent.minMGA).toBeGreaterThan(standardRecent.minMGA);
  });

  it("planchers récents > planchers anciens pour le même segment", () => {
    const recent = SANITY_BOUNDS.find((b) => b.segmentKey === "premium_pickup_suv_recent")!;
    const old2018 = SANITY_BOUNDS.find((b) => b.segmentKey === "premium_pickup_suv_2018_2022")!;
    const old2010 = SANITY_BOUNDS.find((b) => b.segmentKey === "premium_pickup_suv_2010_2017")!;
    expect(recent.minMGA).toBeGreaterThan(old2018.minMGA);
    expect(old2018.minMGA).toBeGreaterThan(old2010.minMGA);
  });
});
