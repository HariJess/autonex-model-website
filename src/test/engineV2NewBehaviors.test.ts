/**
 * PROMPT 10A — Tests des nouveaux comportements du moteur V2.
 *
 * Couvre :
 *   - Percentile helper + computeRangeFromPercentiles (Tâche 6)
 *   - 3 valeurs Argus-grade (Tâche 5)
 *   - Trim split cascade (Tâche 7)
 *   - Fix cap +12% (Tâche 8)
 *   - Application transaction factor pipeline (Tâche 4)
 *
 * On utilise le mock supabase + le moteur legacy (qui consomme `supabase`
 * importé) pour rester end-to-end. Les fixtures sont précisément choisies
 * pour exercer les branches nouvelles.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { EstimationInput } from "@/types/estimation";

// -- Mock supabase global ------------------------------------------------
const { mockSupabase, setFixtures } = vi.hoisted(() => {
  type Filter =
    | { kind: "eq"; col: string; val: unknown }
    | { kind: "ilike"; col: string; pattern: string }
    | { kind: "gte"; col: string; val: number }
    | { kind: "lte"; col: string; val: number }
    | { kind: "in"; col: string; vals: unknown[] };

  const fixturesStore: {
    listings: Record<string, unknown>[];
    photos: Record<string, unknown>[];
    referenceProfiles: Record<string, unknown>[];
    marketClean: Record<string, unknown>[];
    appConfig: Record<string, unknown>[];
  } = {
    listings: [],
    photos: [],
    referenceProfiles: [],
    marketClean: [],
    appConfig: [],
  };

  class MockQueryBuilder {
    private filters: Filter[] = [];
    private limitN: number | null = null;
    private orderBy: { col: string; ascending: boolean } | null = null;

    constructor(private readonly table: string) {}

    select(_cols: string) {
      return this;
    }
    eq(col: string, val: unknown) {
      this.filters.push({ kind: "eq", col, val });
      return this;
    }
    ilike(col: string, pattern: string) {
      this.filters.push({ kind: "ilike", col, pattern });
      return this;
    }
    gte(col: string, val: unknown) {
      this.filters.push({ kind: "gte", col, val: val as number });
      return this;
    }
    lte(col: string, val: unknown) {
      this.filters.push({ kind: "lte", col, val: val as number });
      return this;
    }
    in(col: string, vals: unknown[]) {
      this.filters.push({ kind: "in", col, vals });
      return this;
    }
    limit(n: number) {
      this.limitN = n;
      return this;
    }
    order(col: string, opts?: { ascending?: boolean }) {
      this.orderBy = { col, ascending: opts?.ascending ?? true };
      return this;
    }
    maybeSingle() {
      const value = this.resolve();
      const data = (value.data as Record<string, unknown>[])[0] ?? null;
      return Promise.resolve({ data, error: value.error });
    }

    private resolve(): { data: unknown; error: unknown } {
      let rows: Record<string, unknown>[];
      if (this.table === "listings") rows = fixturesStore.listings;
      else if (this.table === "listing_photos") rows = fixturesStore.photos;
      else if (this.table === "vehicle_price_reference_profiles")
        rows = fixturesStore.referenceProfiles;
      else if (this.table === "market_listings_clean") rows = fixturesStore.marketClean;
      else if (this.table === "app_config") rows = fixturesStore.appConfig;
      else rows = [];

      let filtered = rows.filter((row) => {
        for (const f of this.filters) {
          if (f.kind === "eq") {
            if (row[f.col] !== f.val) return false;
          } else if (f.kind === "ilike") {
            const pattern = f.pattern.replace(/%/g, "");
            const v = String(row[f.col] ?? "");
            if (pattern && v.toLowerCase() !== pattern.toLowerCase()) return false;
          } else if (f.kind === "gte") {
            const v = Number(row[f.col] ?? Number.NEGATIVE_INFINITY);
            if (v < f.val) return false;
          } else if (f.kind === "lte") {
            const v = Number(row[f.col] ?? Number.POSITIVE_INFINITY);
            if (v > f.val) return false;
          } else if (f.kind === "in") {
            if (!f.vals.includes(row[f.col])) return false;
          }
        }
        return true;
      });

      if (this.orderBy) {
        const { col, ascending } = this.orderBy;
        filtered = [...filtered].sort((a, b) => {
          const av = a[col] as number;
          const bv = b[col] as number;
          return ascending ? av - bv : bv - av;
        });
      }
      if (this.limitN != null) filtered = filtered.slice(0, this.limitN);

      return { data: filtered, error: null };
    }

    then<T>(onfulfilled?: ((value: { data: unknown; error: unknown }) => T) | null): Promise<T> {
      const value = this.resolve();
      return Promise.resolve(onfulfilled ? onfulfilled(value) : (value as unknown as T));
    }
  }

  return {
    mockSupabase: {
      from(table: string) {
        return new MockQueryBuilder(table);
      },
    },
    setFixtures(opts: {
      listings?: Record<string, unknown>[];
      photos?: Record<string, unknown>[];
      referenceProfiles?: Record<string, unknown>[];
      marketClean?: Record<string, unknown>[];
      appConfig?: Record<string, unknown>[];
    }) {
      fixturesStore.listings = opts.listings ?? [];
      fixturesStore.photos = opts.photos ?? [];
      fixturesStore.referenceProfiles = opts.referenceProfiles ?? [];
      fixturesStore.marketClean = opts.marketClean ?? [];
      fixturesStore.appConfig = opts.appConfig ?? [];
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
  getSupabaseClient: () => mockSupabase,
}));

import {
  computeVehicleEstimationV2,
  percentile,
  computeRangeFromPercentiles,
} from "@/lib/estimation/engine";

const TODAY_ISO = "2026-04-30T12:00:00.000Z";

const baseInput = (overrides: Partial<EstimationInput> = {}): EstimationInput => ({
  makeName: "Toyota",
  modelName: "Corolla",
  year: 2020,
  city: "Antananarivo",
  mileage: 75_000,
  fuelType: "diesel",
  transmissionType: "manual",
  bodyType: "sedan",
  conditionLabel: "good",
  accidentDeclared: false,
  maintenanceLevel: "partial",
  ownerCountLabel: "2",
  usageType: "personal",
  ...overrides,
});

function makeListing(p: {
  id: string;
  price_mga: number;
  year: number;
  mileage_km: number;
  title?: string;
  make?: string;
  model?: string;
  ville?: string;
  body_style?: string;
  fuel?: string;
  transmission_gearbox?: string;
}): Record<string, unknown> {
  return {
    id: p.id,
    title: p.title ?? "Toyota Corolla 2020 belle occasion bien entretenue",
    price_mga: p.price_mga,
    year: p.year,
    mileage_km: p.mileage_km,
    ville: p.ville ?? "Antananarivo",
    region: "Analamanga",
    body_style: p.body_style ?? "Berline",
    fuel: p.fuel ?? "Diesel",
    transmission_gearbox: p.transmission_gearbox ?? "Boîte manuelle",
    description:
      "Véhicule en très bon état général, entretien suivi, factures disponibles. Climatisation, direction assistée, vitres électriques.",
    created_at: "2026-04-15T12:00:00.000Z",
    updated_at: "2026-04-15T12:00:00.000Z",
    status: "active",
    make: p.make ?? "Toyota",
    model: p.model ?? "Corolla",
  };
}

function makeProfile(p: {
  make: string;
  model: string;
  baseline_year?: number;
  baseline_price_mga?: number;
  body_type?: string;
  fuel_type?: string;
  transmission_type?: string;
}): Record<string, unknown> {
  return {
    id: `p-${p.make}-${p.model}`,
    make_name: p.make,
    model_name: p.model,
    body_type: p.body_type ?? "sedan",
    fuel_type: p.fuel_type ?? "diesel",
    transmission_type: p.transmission_type ?? "manual",
    baseline_year: p.baseline_year ?? 2020,
    baseline_price_mga: p.baseline_price_mga ?? 40_000_000,
    annual_depreciation_rate: 0.1,
    expected_km_per_year: 15_000,
    popularity_score: 50,
    sample_size: null,
    is_active: true,
  };
}

// =============================================================================
// Section 1 — Helper percentile
// =============================================================================

describe("PROMPT 10A — percentile helper", () => {
  it("pct-1 : percentile([10,20,30,40,50], 0.1) → 14", () => {
    expect(percentile([10, 20, 30, 40, 50], 0.1)).toBe(14);
  });

  it("pct-2 : percentile([10,20,30,40,50], 0.5) → 30 (médiane)", () => {
    expect(percentile([10, 20, 30, 40, 50], 0.5)).toBe(30);
  });

  it("pct-3 : percentile([10,20,30,40,50], 0.9) → 46", () => {
    expect(percentile([10, 20, 30, 40, 50], 0.9)).toBe(46);
  });

  it("pct-4 : percentile([], 0.5) → 0", () => {
    expect(percentile([], 0.5)).toBe(0);
  });

  it("pct-5 : percentile([100], 0.5) → 100", () => {
    expect(percentile([100], 0.5)).toBe(100);
  });

  it("pct-bonus : non-trié, tolérant", () => {
    expect(percentile([50, 30, 10, 40, 20], 0.5)).toBe(30);
  });
});

describe("PROMPT 10A — computeRangeFromPercentiles", () => {
  it("range-1 : n≥8 → P10/P90", () => {
    const prices = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const r = computeRangeFromPercentiles(prices, 50, 0.1);
    expect(r.method).toBe("percentile_p10_p90");
    expect(r.low).toBe(percentile(prices, 0.1));
    expect(r.high).toBe(percentile(prices, 0.9));
  });

  it("range-2 : n≥5 et <8 → P25/P75", () => {
    const prices = [10, 20, 30, 40, 50];
    const r = computeRangeFromPercentiles(prices, 30, 0.1);
    expect(r.method).toBe("percentile_p25_p75");
    expect(r.low).toBe(percentile(prices, 0.25));
    expect(r.high).toBe(percentile(prices, 0.75));
  });

  it("range-3 : n<5 → synthetic ±%", () => {
    const prices = [10, 20, 30];
    const r = computeRangeFromPercentiles(prices, 100, 0.1);
    expect(r.method).toBe("synthetic_spread");
    expect(r.low).toBe(90);
    expect(r.high).toBe(110);
  });
});

// =============================================================================
// Section 2 — End-to-end engine V2 (3 Argus values, factor, range method, etc.)
// =============================================================================

describe("PROMPT 10A — Engine V2 end-to-end nouveaux comportements", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TODAY_ISO));
  });
  afterAll(() => {
    vi.useRealTimers();
  });
  beforeEach(() => {
    setFixtures({});
  });

  // ─── 3 Argus-grade values ──────────────────────────────────────────────

  it("argus-1 : output.values inclut tradeInPro + privateMarket + dealerRetail", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 8 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(r.values.tradeInPro).toBeGreaterThan(0);
    expect(r.values.privateMarket).toBeGreaterThan(0);
    expect(r.values.dealerRetail).toBeGreaterThan(0);
  });

  it("argus-2 : tradeInPro < privateMarket < dealerRetail (ordre Argus)", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 8 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(r.values.tradeInPro).toBeLessThan(r.values.privateMarket);
    expect(r.values.privateMarket).toBeLessThan(r.values.dealerRetail);
  });

  it("argus-3 : estimatedValue (rétro-compat legacy) === privateMarket", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 8 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(r.values.estimatedValue).toBe(r.values.privateMarket);
  });

  it("argus-4 : ratio tradeInPro/privateMarket ≈ 0.78 (à roundingStep près)", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 10 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 100_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [
        makeProfile({ make: "Toyota", model: "Corolla", baseline_price_mga: 100_000_000 }),
      ],
    });
    const r = await computeVehicleEstimationV2(input);
    const ratio = r.values.tradeInPro / r.values.privateMarket;
    expect(ratio).toBeGreaterThan(0.74);
    expect(ratio).toBeLessThan(0.82);
  });

  // ─── Range method audit ────────────────────────────────────────────────

  it("range-method-1 : n=10 comps → audit.rangeMethod = percentile_p10_p90", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 10 }, (_, i) =>
        makeListing({
          id: `l-${i}`,
          price_mga: 38_000_000 + i * 200_000,
          year: 2020,
          mileage_km: 75_000 + i * 1000,
        }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(r.audit?.rangeMethod).toBe("percentile_p10_p90");
  });

  it("range-method-2 : n=2 comps → audit.rangeMethod = synthetic_spread", async () => {
    const input = baseInput();
    setFixtures({
      listings: [
        makeListing({ id: "l-1", price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
        makeListing({ id: "l-2", price_mga: 39_000_000, year: 2020, mileage_km: 75_000 }),
      ],
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(r.audit?.rangeMethod).toBe("synthetic_spread");
  });

  // ─── Trim split ────────────────────────────────────────────────────────

  it("trim-1 : input.trim=null → audit.trimFiltering = unspecified", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 6 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(r.audit?.trimFiltering).toBe("unspecified");
  });

  it("trim-2 : input.trim='LC79' avec 4 comps title=Land Cruiser LC79 → strict", async () => {
    const input = baseInput({ makeName: "Toyota", modelName: "Land Cruiser", trim: "LC79" });
    setFixtures({
      listings: Array.from({ length: 5 }, (_, i) =>
        makeListing({
          id: `l-${i}`,
          price_mga: 200_000_000,
          year: 2020,
          mileage_km: 120_000,
          title: "Toyota Land Cruiser LC79 4x4 double cabine",
          make: "Toyota",
          model: "Land Cruiser",
          body_style: "Pickup",
        }),
      ),
      referenceProfiles: [
        makeProfile({ make: "Toyota", model: "Land Cruiser", body_type: "pickup" }),
      ],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(r.audit?.trimFiltering).toBe("strict");
  });

  it("trim-3 : input.trim='Vigo' avec 3 comps title sans Vigo (trim=null) → relaxed", async () => {
    const input = baseInput({ makeName: "Toyota", modelName: "Hilux", trim: "Vigo" });
    setFixtures({
      listings: Array.from({ length: 3 }, (_, i) =>
        makeListing({
          id: `l-${i}`,
          price_mga: 75_000_000,
          year: 2018,
          mileage_km: 95_000,
          title: "Toyota Hilux 2018 4x4",
          make: "Toyota",
          model: "Hilux",
          body_style: "Pickup",
        }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Hilux", body_type: "pickup" })],
    });
    const r = await computeVehicleEstimationV2(input);
    // strict=0 (Vigo non dans title), mais les 3 listings ont trim=null →
    // tombent dans relaxed (length>=3 → mode='relaxed')
    expect(r.audit?.trimFiltering).toBe("relaxed");
  });

  // ─── Cap fix ───────────────────────────────────────────────────────────

  it("cap-1 : ratio adjustedPrice/baseAnchor ∈ [0.80, 1.12] (clamp post-blend)", async () => {
    // Worst-case négatif (3+ owners + needs_work + accident + fleet = -0.30 → cap -0.20)
    const input = baseInput({
      conditionLabel: "needs_work",
      accidentDeclared: true,
      ownerCountLabel: "3_plus",
      usageType: "fleet",
    });
    setFixtures({
      listings: Array.from({ length: 8 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    const ratio = r.anchors.adjustedMarketEstimate / r.anchors.finalBaseAnchor;
    expect(ratio).toBeGreaterThanOrEqual(0.79); // tolérance arrondi roundToStep
    expect(ratio).toBeLessThanOrEqual(1.13);
  });

  it("cap-2 : audit.capApplied existe (false ou true selon scenario)", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 8 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(typeof r.audit?.capApplied).toBe("boolean");
  });

  // ─── Transaction factor pipeline ───────────────────────────────────────

  it("tf-pipeline-1 : audit.transactionFactorAvg ≈ 0.96 (autonex active comps only)", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 8 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(r.audit?.transactionFactorAvg).toBe(0.96);
    expect(r.audit?.comparableSourceBreakdown.autonexActive).toBeGreaterThan(0);
    expect(r.audit?.comparableSourceBreakdown.marketClean).toBe(0);
  });

  it("tf-pipeline-2 : factor borne dans [0.65, 1.10] (sanity)", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 8 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    const f = r.audit?.transactionFactorAvg ?? 1;
    expect(f).toBeGreaterThanOrEqual(0.65);
    expect(f).toBeLessThanOrEqual(1.1);
  });

  it("tf-pipeline-3 : audit.transactionFactorVersion populé (fallback ou config)", async () => {
    const input = baseInput();
    setFixtures({
      listings: Array.from({ length: 8 }, (_, i) =>
        makeListing({ id: `l-${i}`, price_mga: 38_000_000, year: 2020, mileage_km: 75_000 }),
      ),
      referenceProfiles: [makeProfile({ make: "Toyota", model: "Corolla" })],
    });
    const r = await computeVehicleEstimationV2(input);
    expect(r.audit?.transactionFactorVersion).toBeTruthy();
  });
});
