import { describe, expect, it } from "vitest";
import { parsePriceToAriary, parseYear, parseKm, parseCsv } from "../../scripts/data/lib/parse";

describe("parsePriceToAriary", () => {
  it("parse un nombre simple en Ariary par défaut", () => {
    const r = parsePriceToAriary("5000000", "AR");
    expect(r.price_ar).toBe(5_000_000);
    expect(r.currency_detected).toBe("AR");
  });

  it("convertit FMG en Ariary (1 Ar = 5 FMG)", () => {
    const r = parsePriceToAriary("100000000", "FMG");
    expect(r.price_ar).toBe(20_000_000);
    expect(r.currency_detected).toBe("FMG");
  });

  it("détecte FMG dans la chaîne et applique la conversion", () => {
    const r = parsePriceToAriary("100M Fmg", null);
    expect(r.price_ar).toBe(20_000_000);
    expect(r.currency_detected).toBe("FMG");
  });

  it("expand les multiplicateurs M/K", () => {
    expect(parsePriceToAriary("12.5M", "AR").price_ar).toBe(12_500_000);
    expect(parsePriceToAriary("500K", "AR").price_ar).toBe(500_000);
  });

  it("tolère les séparateurs de milliers", () => {
    expect(parsePriceToAriary("12,500,000", "AR").price_ar).toBe(12_500_000);
    expect(parsePriceToAriary("12 500 000", "AR").price_ar).toBe(12_500_000);
  });

  it("retourne null pour input vide", () => {
    expect(parsePriceToAriary("", "AR").price_ar).toBeNull();
    expect(parsePriceToAriary(null, "AR").price_ar).toBeNull();
  });
});

describe("parseYear", () => {
  it("parse un YYYY", () => {
    expect(parseYear("2018")).toBe(2018);
    expect(parseYear("2019.0")).toBe(2019);
  });

  it("retourne null pour input non valide", () => {
    expect(parseYear("")).toBeNull();
    expect(parseYear("abc")).toBeNull();
  });
});

describe("parseKm", () => {
  it("parse un kilométrage simple", () => {
    expect(parseKm("85000")).toBe(85_000);
    expect(parseKm("85 000 km")).toBe(85_000);
  });

  it("expand le suffixe k", () => {
    expect(parseKm("85k")).toBe(85_000);
  });
});

describe("parseCsv", () => {
  it("parse un CSV simple", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n4,5,6\n");
    expect(rows).toEqual([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });

  it("gère les guillemets et nouvelles lignes embarquées", () => {
    const csv = `a,b\n"hello\nworld","x"\n"with ""quote""","y"\n`;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].a).toBe("hello\nworld");
    expect(rows[1].a).toBe('with "quote"');
  });

  it("ignore les lignes vides", () => {
    const rows = parseCsv("a,b\n1,2\n\n3,4\n");
    expect(rows).toHaveLength(2);
  });
});
