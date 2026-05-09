import { describe, it, expect } from "vitest";
import { formatPriceCompact, formatMileageCompact } from "@/config/currency";

describe("formatPriceCompact — MGA", () => {
  it("affiche les centaines de millions au format compact avec 1 décimale", () => {
    expect(formatPriceCompact(237_500_000, "MGA")).toBe("237,5 M Ar");
  });

  it("supprime la décimale quand la valeur est entière", () => {
    expect(formatPriceCompact(250_000_000, "MGA")).toBe("250 M Ar");
  });

  it("affiche les milliards en Md", () => {
    expect(formatPriceCompact(1_500_000_000, "MGA")).toBe("1,5 Md Ar");
    expect(formatPriceCompact(2_000_000_000, "MGA")).toBe("2 Md Ar");
  });

  it("affiche les milliers en K (arrondi entier)", () => {
    expect(formatPriceCompact(850_000, "MGA")).toBe("850 K Ar");
  });

  it("retourne '—' pour 0 / null / undefined", () => {
    expect(formatPriceCompact(0, "MGA")).toBe("—");
    expect(formatPriceCompact(null, "MGA")).toBe("—");
    expect(formatPriceCompact(undefined, "MGA")).toBe("—");
  });

  it("retourne '—' pour les valeurs négatives (ne plante pas)", () => {
    expect(formatPriceCompact(-100, "MGA")).toBe("—");
  });

  it("retourne le montant brut pour les très petites valeurs", () => {
    expect(formatPriceCompact(950, "MGA")).toBe("950 Ar");
  });
});

describe("formatPriceCompact — EUR", () => {
  it("garde le format Intl pour les montants < 1M", () => {
    const out = formatPriceCompact(47_029, "EUR");
    // Intl.NumberFormat fr-FR EUR sans décimales — accepte un espace
    // insécable, fine, etc. entre les chiffres et la devise.
    expect(out.replace(/\D/g, "")).toBe("47029");
    expect(out).toContain("€");
  });

  it("affiche les millions en M €", () => {
    expect(formatPriceCompact(1_500_000, "EUR")).toBe("1,5 M €");
    expect(formatPriceCompact(2_000_000, "EUR")).toBe("2 M €");
  });
});

describe("formatMileageCompact", () => {
  it("affiche les milliers de km en k km", () => {
    expect(formatMileageCompact(45_000)).toBe("45k km");
  });

  it("affiche 1 décimale pour les valeurs non entières (en milliers)", () => {
    expect(formatMileageCompact(5_500)).toBe("5,5k km");
  });

  it("affiche les valeurs sous 1000 km tel quel", () => {
    expect(formatMileageCompact(850)).toBe("850 km");
  });

  it("retourne chaîne vide pour les valeurs invalides", () => {
    expect(formatMileageCompact(null)).toBe("");
    expect(formatMileageCompact(undefined)).toBe("");
    expect(formatMileageCompact(-100)).toBe("");
  });
});
