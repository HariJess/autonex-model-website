import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_CSV_COLUMNS,
  buildIngestionStats,
  chunk,
  computeFingerprint,
  hashContact,
  normalizeCsvRow,
  normalizeDataConfidence,
  normalizeDrivetrain,
  normalizeMakeModel,
  normalizePrice,
  normalizePriceType,
  parseBool,
  parseIntSafe,
  validateCsvHeaders,
} from "@/../scripts/data/ingest-market-listings-csv";
import { parseCsv } from "@/../scripts/data/lib/parse";

/**
 * PROMPT 11 — Tests d'ingestion CSV.
 *
 * 20+ cas couvrant :
 *   - Parse CSV header + 10 rows fixtures
 *   - normalizePrice : MGA in/out bande, FMG conversion, no_price
 *   - hashContact : determinism, RGPD, prefix Madagascar
 *   - computeFingerprint : determinism, banding, discrimination
 *   - normalizeMakeModel : casing, acronymes, trim split
 *   - parseBool / parseIntSafe : edge cases
 *   - normalizeCsvRow : include_in_estimation gating, RGPD strip
 *   - chunk batches
 *   - buildIngestionStats : compteurs cohérents
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(
  HERE,
  "..",
  "..",
  "scripts",
  "data",
  "__tests__",
  "fixtures",
  "market_listings_sample.csv",
);

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

describe("PROMPT 11 — CSV header validation (T1)", () => {
  it("accepte le header attendu (27 colonnes)", () => {
    const raw = stripBom(readFileSync(FIXTURE_PATH, "utf8"));
    const parsed = parseCsv(raw);
    const check = validateCsvHeaders(parsed);
    expect(check.ok).toBe(true);
    expect(check.missing).toEqual([]);
  });

  it("rejette un header incomplet", () => {
    const partial: Record<string, string>[] = [
      { listing_id: "x", make: "y" },
    ];
    const check = validateCsvHeaders(partial);
    expect(check.ok).toBe(false);
    expect(check.missing.length).toBeGreaterThan(0);
  });
});

describe("PROMPT 11 — normalizePrice (T3-T6)", () => {
  it("T3 : MGA dans la bande [5M, 800M] → no suspicion", () => {
    const r = normalizePrice(75_000_000, "MGA");
    expect(r.price).toBe(75_000_000);
    expect(r.suspicion).toBeNull();
  });

  it("T4 : MGA hors bande basse (<5M) → out_of_band", () => {
    const r = normalizePrice(2_000_000, "MGA");
    expect(r.price).toBe(2_000_000);
    expect(r.suspicion).toBe("out_of_band");
  });

  it("T5 : MGA > seuil FMG (>1.5e9) → conversion auto", () => {
    const r = normalizePrice(140_000_000, "MGA"); // dans la bande, pas de conversion
    expect(r.suspicion).toBeNull();

    const r2 = normalizePrice(2_000_000_000, "MGA"); // > seuil → conversion
    expect(r2.price).toBe(400_000_000);
    expect(r2.suspicion).toBe("fmg_converted");
  });

  it("T6 : currency='FMG' explicite → conversion /5", () => {
    const r = normalizePrice(140_000_000, "FMG");
    expect(r.price).toBe(28_000_000);
    expect(r.suspicion).toBe("fmg_converted");
  });

  it("FMG converted hors bande après /5 → fmg_conversion_out_of_band", () => {
    const r = normalizePrice(20_000_000, "FMG"); // /5 = 4M → < 5M
    expect(r.suspicion).toBe("fmg_conversion_out_of_band");
  });

  it("price null/0/négatif → no_price", () => {
    expect(normalizePrice(null, "MGA").suspicion).toBe("no_price");
    expect(normalizePrice(0, "MGA").suspicion).toBe("no_price");
    expect(normalizePrice(-1, "MGA").suspicion).toBe("no_price");
  });
});

describe("PROMPT 11 — hashContact (T7-T8)", () => {
  it("T7 : même contact normalisé → même hash 16 chars", () => {
    const a = hashContact("032 12 345 67");
    const b = hashContact("0321234567");
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });

  it("T8 : null / vide → null", () => {
    expect(hashContact(null)).toBeNull();
    expect(hashContact("")).toBeNull();
    expect(hashContact("   ")).toBeNull();
  });

  it("préfixe 0XX → +261XX (Madagascar)", () => {
    const fromShort = hashContact("032 12 345 67");
    const fromInternational = hashContact("+261321234567");
    expect(fromShort).toBe(fromInternational);
  });
});

describe("PROMPT 11 — computeFingerprint (T9-T11)", () => {
  it("T9 : même row → même hash", () => {
    const row = {
      normalizedMake: "Toyota",
      normalizedModel: "Hilux",
      year: 2018,
      mileageKm: 80_000,
      priceMga: 75_000_000,
      city: "Antananarivo",
    };
    expect(computeFingerprint(row)).toBe(computeFingerprint(row));
  });

  it("T10 : mileage dans la même bande de 20k → même hash", () => {
    const row1 = { normalizedMake: "Toyota", normalizedModel: "Hilux", year: 2018, mileageKm: 80_000, priceMga: 75_000_000, city: "Antananarivo" };
    const row2 = { ...row1, mileageKm: 85_000 };
    expect(computeFingerprint(row1)).toBe(computeFingerprint(row2));
  });

  it("T10b : mileage dans bande différente → hash différent", () => {
    const row1 = { normalizedMake: "Toyota", normalizedModel: "Hilux", year: 2018, mileageKm: 80_000, priceMga: 75_000_000, city: "Antananarivo" };
    const row2 = { ...row1, mileageKm: 105_000 };
    expect(computeFingerprint(row1)).not.toBe(computeFingerprint(row2));
  });

  it("T11 : make différent → hash différent", () => {
    const a = computeFingerprint({ normalizedMake: "Toyota", normalizedModel: "Hilux", year: 2018, mileageKm: 80_000, priceMga: 75_000_000, city: "Antananarivo" });
    const b = computeFingerprint({ normalizedMake: "Nissan", normalizedModel: "Hilux", year: 2018, mileageKm: 80_000, priceMga: 75_000_000, city: "Antananarivo" });
    expect(a).not.toBe(b);
  });
});

describe("PROMPT 11 — normalizeMakeModel (T12-T13)", () => {
  it("T12 : 'TOYOTA' → 'Toyota' (Title Case)", () => {
    const r = normalizeMakeModel("TOYOTA", "hilux", null);
    expect(r.make).toBe("Toyota");
    expect(r.model).toBe("Hilux");
  });

  it("T13 : trim_generation séparée (LC79)", () => {
    const r = normalizeMakeModel("Toyota", "Land Cruiser", "LC79");
    expect(r.make).toBe("Toyota");
    expect(r.model).toBe("Land Cruiser");
    expect(r.trim).toBe("LC79");
  });

  it("Acronymes courts (BMW, VW, GMC) préservés en UPPER", () => {
    const r = normalizeMakeModel("BMW", "X5", null);
    expect(r.make).toBe("BMW");
    const r2 = normalizeMakeModel("VW", "Golf", "Mk4");
    expect(r2.make).toBe("VW");
  });
});

describe("PROMPT 11 — RGPD : contact strip (T14-T15)", () => {
  it("T14 : contact non présent dans rawPayload normalisé", () => {
    const csvRow = {
      listing_id: "TEST-1",
      seller_source: "Test",
      seller_type: "Particulier Facebook",
      make: "Toyota",
      model: "Hilux",
      trim_generation: "",
      year: "2018",
      price_mga: "75000000",
      price_raw: "75 000 000 Ar",
      currency_original: "MGA",
      price_type: "asking",
      negotiable: "True",
      mileage_km: "80000",
      mileage_raw: "80 000 km",
      fuel: "Diesel",
      transmission: "Manuelle",
      drivetrain: "4x4",
      engine: "2.5L",
      seats: "5",
      options_summary: "Clim",
      condition_notes: "Bon état",
      location: "Antananarivo",
      contact: "032 12 345 67",
      include_in_estimation: "True",
      duplicate_group: "",
      data_confidence: "high",
      extraction_notes: "",
    };
    const norm = normalizeCsvRow(csvRow, "test_tag");
    // RGPD : payload.contact absent OU null (selon strip), JAMAIS la valeur clear
    expect(norm.rawPayload.contact).toBeUndefined();
    // contact_hash présent
    expect(norm.contactHash).toBeTruthy();
    expect(norm.rawPayload.contact_hash).toBe(norm.contactHash);
    // valeur clear absente partout
    const serialized = JSON.stringify(norm.rawPayload);
    expect(serialized).not.toContain("032 12 345 67");
    expect(serialized).not.toContain("0321234567");
  });

  it("T15 : contact_hash 16 chars + reproductible", () => {
    const csvRow = {
      ...EMPTY_CSV_ROW,
      make: "Toyota",
      model: "Hilux",
      year: "2018",
      price_mga: "75000000",
      currency_original: "MGA",
      contact: "032 12 345 67",
    };
    const a = normalizeCsvRow(csvRow, "test").contactHash;
    const b = normalizeCsvRow(csvRow, "test").contactHash;
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });
});

describe("PROMPT 11 — include_in_estimation gating (T17-T18)", () => {
  it("T17 : suspicion=out_of_band → include=false", () => {
    const csvRow = {
      ...EMPTY_CSV_ROW,
      make: "Toyota",
      model: "Hilux",
      year: "2018",
      price_mga: "2000000", // < 5M
      currency_original: "MGA",
    };
    const norm = normalizeCsvRow(csvRow, "test");
    expect(norm.includeInEstimation).toBe(false);
    expect(norm.extractionNotes).toContain("out_of_band");
  });

  it("T18 : year manquant mais price+make+model OK → include=true (tolérance)", () => {
    const csvRow = {
      ...EMPTY_CSV_ROW,
      make: "Hyundai",
      model: "Tucson",
      year: "",
      price_mga: "17500000",
      currency_original: "MGA",
      mileage_km: "140000",
    };
    const norm = normalizeCsvRow(csvRow, "test");
    expect(norm.includeInEstimation).toBe(true);
    expect(norm.extractionNotes).toContain("year_invalid_or_missing");
  });

  it("CSV explicite include=False respecté même si données OK", () => {
    const csvRow = {
      ...EMPTY_CSV_ROW,
      make: "Toyota",
      model: "Hilux",
      year: "2018",
      price_mga: "75000000",
      currency_original: "MGA",
      include_in_estimation: "False",
    };
    const norm = normalizeCsvRow(csvRow, "test");
    expect(norm.includeInEstimation).toBe(false);
  });
});

describe("PROMPT 11 — chunk batching (T20)", () => {
  it("T20 : 105 rows / batch 50 → 3 batches (50, 50, 5)", () => {
    const rows = Array.from({ length: 105 }, (_, i) => i);
    const batches = chunk(rows, 50);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(50);
    expect(batches[1]).toHaveLength(50);
    expect(batches[2]).toHaveLength(5);
  });

  it("0 rows → tableau vide (no-op)", () => {
    expect(chunk([], 50)).toEqual([]);
  });

  it("size <= 0 → tout dans un seul batch", () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
  });
});

describe("PROMPT 11 — parseBool / parseIntSafe edge cases", () => {
  it("parseBool tolérant", () => {
    expect(parseBool("True")).toBe(true);
    expect(parseBool("false")).toBe(false);
    expect(parseBool("1")).toBe(true);
    expect(parseBool("0")).toBe(false);
    expect(parseBool("oui")).toBe(true);
    expect(parseBool("non")).toBe(false);
    expect(parseBool("")).toBeNull();
    expect(parseBool("maybe")).toBeNull();
  });

  it("parseIntSafe tolérant", () => {
    expect(parseIntSafe("80000")).toBe(80_000);
    expect(parseIntSafe("80 000")).toBe(80_000);
    expect(parseIntSafe("80,000")).toBe(80_000);
    expect(parseIntSafe("")).toBeNull();
    expect(parseIntSafe("abc")).toBeNull();
    expect(parseIntSafe(null)).toBeNull();
  });
});

describe("PROMPT 11 — Enum normalizers", () => {
  it("normalizeDrivetrain", () => {
    expect(normalizeDrivetrain("4x4")).toBe("4x4");
    expect(normalizeDrivetrain("4WD")).toBe("4x4");
    expect(normalizeDrivetrain("AWD")).toBe("awd");
    expect(normalizeDrivetrain("rear")).toBe("rwd");
    expect(normalizeDrivetrain("front")).toBe("fwd");
    expect(normalizeDrivetrain("custom")).toBe("other");
    expect(normalizeDrivetrain(null)).toBeNull();
  });

  it("normalizeDataConfidence", () => {
    expect(normalizeDataConfidence("high")).toBe("high");
    expect(normalizeDataConfidence("Medium")).toBe("medium");
    expect(normalizeDataConfidence("xyz")).toBeNull();
  });

  it("normalizePriceType", () => {
    expect(normalizePriceType("asking")).toBe("asking");
    expect(normalizePriceType("FIRM")).toBe("firm");
    expect(normalizePriceType("xyz")).toBeNull();
  });
});

describe("PROMPT 11 — full fixture roundtrip (10 rows)", () => {
  it("T2 : parse 10 rows fixtures + stats cohérentes", () => {
    const raw = stripBom(readFileSync(FIXTURE_PATH, "utf8"));
    const parsed = parseCsv(raw);
    expect(parsed.length).toBe(10);
    const normalized = parsed.map((r) => normalizeCsvRow(r, "test"));
    const stats = buildIngestionStats(normalized);
    expect(stats.totalParsed).toBe(10);
    // FIX-0004 = FMG conversion
    expect(stats.fmgConverted).toBeGreaterThanOrEqual(1);
    // FIX-0005 = price 4M → out_of_band → include=false
    expect(stats.outOfBand).toBeGreaterThanOrEqual(1);
    // FIX-0007 et FIX-0008 sont quasi-identiques à FIX-0001 (Hilux 2018 80k 75M)
    // → fingerprint partagé probable
    expect(stats.duplicateInBatch).toBeGreaterThanOrEqual(1);
    // 27 colonnes attendues → header check
    expect(EXPECTED_CSV_COLUMNS.length).toBe(27);
  });

  it("dedup detection : 2 rows quasi-identiques partagent fingerprint", () => {
    const raw = stripBom(readFileSync(FIXTURE_PATH, "utf8"));
    const parsed = parseCsv(raw);
    const normalized = parsed.map((r) => normalizeCsvRow(r, "test"));
    const fp1 = normalized.find((r) => r.csvListingId === "FIX-0001")?.fingerprint;
    const fp7 = normalized.find((r) => r.csvListingId === "FIX-0007")?.fingerprint;
    const fp8 = normalized.find((r) => r.csvListingId === "FIX-0008")?.fingerprint;
    // FIX-0001 et FIX-0007 : même mileage band 80k, même prix band 75M → même fingerprint
    expect(fp1).toBe(fp7);
    // FIX-0008 : mileage 82k même band 80k, prix 75.1M même band 75M → même fingerprint
    expect(fp1).toBe(fp8);
  });
});

// =============================================================================
// Helpers de test : row CSV vide template
// =============================================================================

const EMPTY_CSV_ROW: Record<string, string> = {
  listing_id: "",
  seller_source: "",
  seller_type: "",
  make: "",
  model: "",
  trim_generation: "",
  year: "",
  price_mga: "",
  price_raw: "",
  currency_original: "",
  price_type: "",
  negotiable: "",
  mileage_km: "",
  mileage_raw: "",
  fuel: "",
  transmission: "",
  drivetrain: "",
  engine: "",
  seats: "",
  options_summary: "",
  condition_notes: "",
  location: "",
  contact: "",
  include_in_estimation: "",
  duplicate_group: "",
  data_confidence: "",
  extraction_notes: "",
};
