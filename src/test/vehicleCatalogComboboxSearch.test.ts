import { describe, expect, it } from "vitest";
import {
  isCatalogOptionMatch,
  normalizeCatalogSearchToken,
} from "@/lib/estimation/catalogSearch";

describe("Vehicle catalog combobox search normalization", () => {
  it("normalizes case, separators, and spaces", () => {
    expect(normalizeCatalogSearchToken("  Eco-Sport  ")).toBe("eco sport");
    expect(normalizeCatalogSearchToken("MAZDA_2")).toBe("mazda 2");
    expect(normalizeCatalogSearchToken("MX/5")).toBe("mx 5");
  });

  it("matches compact query for formatted option", () => {
    expect(isCatalogOptionMatch("EcoSport", "ecosport")).toBe(true);
    expect(isCatalogOptionMatch("Mazda 2", "mazda2")).toBe(true);
    expect(isCatalogOptionMatch("MX-5", "mx5")).toBe(true);
  });

  it("matches spaced and hyphenated user variants", () => {
    expect(isCatalogOptionMatch("EcoSport", "eco sport")).toBe(true);
    expect(isCatalogOptionMatch("EcoSport", "eco-sport")).toBe(true);
    expect(isCatalogOptionMatch("Land Cruiser 300", "landcruiser300")).toBe(true);
  });

  it("does not match unrelated model queries", () => {
    expect(isCatalogOptionMatch("Ranger", "ecosport")).toBe(false);
    expect(isCatalogOptionMatch("Corolla", "hilux")).toBe(false);
  });
});
