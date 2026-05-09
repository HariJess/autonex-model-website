import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCleanInsertPayload,
  buildRawPayload,
  fetchExistingFingerprints,
  insertMarketListingsBatch,
  normalizeCsvRow,
  type NormalizedRow,
  type SupabaseLikeClient,
} from "@/../scripts/data/ingest-market-listings-csv";
import { parseCsv } from "@/../scripts/data/lib/parse";

/**
 * PROMPT 11.b — Tests RGPD strip + write mode (mocked Supabase client).
 *
 * Couverture :
 *   - T-RGPD-1/2/3 : seller_source absent en clean / présent en raw
 *   - T-W-1/2/3 : insert raw + clean appelés avec bons payloads
 *   - T-W-4 : pré-check fingerprint = skip si déjà en DB
 *   - T-W-5 : retry sur 503
 *   - T-W-6 : erreur fatale capturée dans stats.errors (batch continue)
 *   - T-W-9 : --force ignore les fingerprints existants
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

function loadFixturesNormalized(): NormalizedRow[] {
  const raw = stripBom(readFileSync(FIXTURE_PATH, "utf8"));
  const parsed = parseCsv(raw);
  return parsed.map((r) => normalizeCsvRow(r, "test_tag"));
}

// ─── RGPD enforcement ────────────────────────────────────────────────────

describe("PROMPT 11.b — RGPD strip seller_source", () => {
  it("T-RGPD-1 : cleanPayload N'A PAS la clé seller_source", () => {
    const rows = loadFixturesNormalized();
    for (const row of rows) {
      const clean = buildCleanInsertPayload(row);
      expect(clean).not.toHaveProperty("seller_source");
    }
  });

  it("T-RGPD-2 : rawPayload contient seller_source (admin-only)", () => {
    const csvRow = {
      listing_id: "FIX-RGPD",
      seller_source: "Akbaraly Akbaraly",
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
      mileage_raw: "",
      fuel: "Diesel",
      transmission: "Manuelle",
      drivetrain: "4x4",
      engine: "",
      seats: "5",
      options_summary: "",
      condition_notes: "",
      location: "Antananarivo",
      contact: "032 12 345 67",
      include_in_estimation: "True",
      duplicate_group: "",
      data_confidence: "high",
      extraction_notes: "",
    };
    const norm = normalizeCsvRow(csvRow, "test");
    // raw doit contenir le seller_source en clair (admin-only via service_role)
    expect(norm.rawPayload).toHaveProperty("seller_source", "Akbaraly Akbaraly");
    // contact en clair absent
    expect(norm.rawPayload).not.toHaveProperty("contact");
    // contact_hash présent
    expect(norm.rawPayload).toHaveProperty("contact_hash");
  });

  it("T-RGPD-3 : roundtrip 10 fixtures → AUCUN seller_source en clean output", () => {
    const rows = loadFixturesNormalized();
    expect(rows.length).toBe(10);
    for (const row of rows) {
      const clean = buildCleanInsertPayload(row);
      const serialized = JSON.stringify(clean);
      // pas de clé seller_source
      expect(clean).not.toHaveProperty("seller_source");
      // pas de valeur "Test Seller" qui fuirait via un autre champ
      expect(serialized).not.toContain("Test Seller");
    }
  });

  it("buildRawPayload : structure attendue + contact_hash", () => {
    const csvRow = {
      listing_id: "X",
      seller_source: "John Doe",
      seller_type: "Particulier",
      make: "Toyota",
      model: "Corolla",
      trim_generation: "",
      year: "2015",
      price_mga: "30000000",
      price_raw: "30M",
      currency_original: "MGA",
      price_type: "",
      negotiable: "",
      mileage_km: "100000",
      mileage_raw: "",
      fuel: "",
      transmission: "",
      drivetrain: "",
      engine: "",
      seats: "",
      options_summary: "",
      condition_notes: "",
      location: "Antananarivo",
      contact: "032 11 22 33",
      include_in_estimation: "",
      duplicate_group: "",
      data_confidence: "",
      extraction_notes: "",
    };
    const raw = buildRawPayload(csvRow, "abc123");
    expect(raw.contact).toBeUndefined();
    expect(raw.contact_hash).toBe("abc123");
    expect(raw.seller_source).toBe("John Doe");
    expect(raw._pipeline_version).toBe("v1_2026_05_09");
  });
});

// ─── Mock Supabase client builder ────────────────────────────────────────

function makeMockSupabase(opts: {
  existingFingerprints?: string[];
  rawInsertResult?: { data: { id: string } | null; error: { message: string; code?: string } | null };
  cleanInsertResult?: { data: { id: string } | null; error: { message: string; code?: string } | null };
  // Optional : 1st call returns 503, then success
  rawSequence?: Array<{ data: { id: string } | null; error: { message: string; code?: string } | null }>;
}): SupabaseLikeClient {
  const fingerprintRows = (opts.existingFingerprints ?? []).map((f) => ({ fingerprint: f }));
  const rawInsertSpy = vi.fn();
  const cleanInsertSpy = vi.fn();
  const rawCallCount = { n: 0 };

  const mock: SupabaseLikeClient = {
    from: vi.fn((table: string) => {
      if (table === "market_listings_clean") {
        return {
          select: vi.fn((_cols: string) => ({
            eq: vi.fn(async (_col: string, _val: string) => ({
              data: fingerprintRows,
              error: null,
            })),
          })),
          insert: vi.fn((row) => {
            cleanInsertSpy(row);
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () =>
                  opts.cleanInsertResult ?? { data: { id: "clean-id" }, error: null },
                ),
              })),
            };
          }),
        };
      }
      if (table === "market_listings_raw") {
        return {
          select: vi.fn(() => ({ eq: vi.fn() })),
          insert: vi.fn((row) => {
            rawInsertSpy(row);
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => {
                  if (opts.rawSequence) {
                    const r = opts.rawSequence[Math.min(rawCallCount.n, opts.rawSequence.length - 1)];
                    rawCallCount.n += 1;
                    return r;
                  }
                  return opts.rawInsertResult ?? { data: { id: "raw-id-" + rawCallCount.n++ }, error: null };
                }),
              })),
            };
          }),
        };
      }
      throw new Error("Unexpected table " + table);
    }),
    // expose spies for assertions
    // @ts-expect-error utility extension for test spies access
    __spies: { rawInsertSpy, cleanInsertSpy, rawCallCount },
  } as unknown as SupabaseLikeClient;
  return mock;
}

function getSpies(mock: SupabaseLikeClient) {
  // @ts-expect-error utility extension for test spies access
  return mock.__spies as { rawInsertSpy: ReturnType<typeof vi.fn>; cleanInsertSpy: ReturnType<typeof vi.fn>; rawCallCount: { n: number } };
}

// ─── Write mode tests ────────────────────────────────────────────────────

describe("PROMPT 11.b — write mode (mocked supabase)", () => {
  it("T-W-1 : insert raw appelé avec source_listing_id + payload + scraped_at", async () => {
    const rows = loadFixturesNormalized().slice(0, 2);
    const supabase = makeMockSupabase({});
    await insertMarketListingsBatch(supabase, rows, { force: false });
    const { rawInsertSpy } = getSpies(supabase);
    expect(rawInsertSpy).toHaveBeenCalledTimes(2);
    const firstCall = rawInsertSpy.mock.calls[0][0];
    expect(firstCall).toHaveProperty("source", "test_tag");
    expect(firstCall).toHaveProperty("source_listing_id");
    expect(firstCall).toHaveProperty("payload");
    expect(firstCall).toHaveProperty("scraped_at");
    // payload contient seller_source (raw OK), pas contact en clear
    expect(firstCall.payload).toHaveProperty("seller_source");
    expect(firstCall.payload).not.toHaveProperty("contact");
  });

  it("T-W-2 : insert clean reçoit raw_listing_id du retour insert raw", async () => {
    const rows = loadFixturesNormalized().slice(0, 1);
    const supabase = makeMockSupabase({
      rawInsertResult: { data: { id: "raw-uuid-42" }, error: null },
    });
    await insertMarketListingsBatch(supabase, rows, { force: false });
    const { cleanInsertSpy } = getSpies(supabase);
    expect(cleanInsertSpy).toHaveBeenCalledOnce();
    const cleanCall = cleanInsertSpy.mock.calls[0][0];
    expect(cleanCall.raw_listing_id).toBe("raw-uuid-42");
  });

  it("T-W-3 : insert clean ne contient JAMAIS seller_source", async () => {
    const rows = loadFixturesNormalized().slice(0, 3);
    const supabase = makeMockSupabase({});
    await insertMarketListingsBatch(supabase, rows, { force: false });
    const { cleanInsertSpy } = getSpies(supabase);
    for (const call of cleanInsertSpy.mock.calls) {
      expect(call[0]).not.toHaveProperty("seller_source");
    }
  });

  it("T-W-4 : pré-check fingerprint existant → skip insert", async () => {
    const rows = loadFixturesNormalized().slice(0, 2);
    // Simule que les 2 fingerprints existent déjà en DB
    const fps = rows.map((r) => r.fingerprint);
    const supabase = makeMockSupabase({ existingFingerprints: fps });
    const stats = await insertMarketListingsBatch(supabase, rows, { force: false });
    expect(stats.alreadyInDb).toBe(2);
    expect(stats.newlyInserted).toBe(0);
    const { rawInsertSpy } = getSpies(supabase);
    expect(rawInsertSpy).not.toHaveBeenCalled();
  });

  it("T-W-5 : retry sur 503 — 1er fail puis succès", async () => {
    const rows = loadFixturesNormalized().slice(0, 1);
    const supabase = makeMockSupabase({
      rawSequence: [
        { data: null, error: { message: "503 Service Unavailable", code: "503" } },
        { data: { id: "raw-after-retry" }, error: null },
      ],
    });
    const startMs = Date.now();
    const stats = await insertMarketListingsBatch(supabase, rows, { force: false });
    const elapsed = Date.now() - startMs;
    // backoff 1s minimum entre 1st et 2nd attempt
    expect(elapsed).toBeGreaterThanOrEqual(1000);
    expect(stats.newlyInserted).toBe(1);
    expect(stats.errors.length).toBe(0);
  }, 10_000);

  it("T-W-6 : erreur fatale (autre que 503/conflict) → collected, batch continue", async () => {
    const rows = loadFixturesNormalized().slice(0, 2);
    const supabase = makeMockSupabase({
      // Premier insert raw échoue, le 2ème passe
      rawSequence: [
        { data: null, error: { message: "permission denied", code: "42501" } },
        { data: { id: "raw-2" }, error: null },
      ],
    });
    const stats = await insertMarketListingsBatch(supabase, rows, { force: false });
    expect(stats.errors.length).toBe(1);
    expect(stats.errors[0].reason).toContain("permission denied");
    expect(stats.newlyInserted).toBe(1);
  });

  it("T-W-9 : --force = true ignore les fingerprints existants", async () => {
    const rows = loadFixturesNormalized().slice(0, 2);
    const fps = rows.map((r) => r.fingerprint);
    const supabase = makeMockSupabase({ existingFingerprints: fps });
    const stats = await insertMarketListingsBatch(supabase, rows, { force: true });
    // Force ignore le pré-check : on tente d'insérer. Si la DB conflict, c'est layer 2.
    const { rawInsertSpy } = getSpies(supabase);
    expect(rawInsertSpy).toHaveBeenCalledTimes(2);
    expect(stats.newlyInserted).toBe(2);
  });

  it("T-W-conflict : duplicate UNIQUE 23505 → skip silencieux", async () => {
    const rows = loadFixturesNormalized().slice(0, 1);
    const supabase = makeMockSupabase({
      rawInsertResult: { data: { id: "raw-1" }, error: null },
      cleanInsertResult: {
        data: null,
        error: { message: "duplicate key value violates unique constraint", code: "23505" },
      },
    });
    const stats = await insertMarketListingsBatch(supabase, rows, { force: false });
    expect(stats.alreadyInDb).toBe(1);
    expect(stats.errors.length).toBe(0);
  });
});

// ─── Pre-check fingerprint isolation ─────────────────────────────────────

describe("PROMPT 11.b — fetchExistingFingerprints", () => {
  it("retourne Set des fingerprints existants pour le source_tag", async () => {
    const supabase = makeMockSupabase({ existingFingerprints: ["abc123", "def456"] });
    const set = await fetchExistingFingerprints(supabase, "csv_seed_v1_2026");
    expect(set.has("abc123")).toBe(true);
    expect(set.has("def456")).toBe(true);
    expect(set.has("ghi789")).toBe(false);
    expect(set.size).toBe(2);
  });
});
