/**
 * PROMPT 10E — Tests intégration engine.ts (Couches 2 + 4).
 *
 * Fait tourner `computeVehicleEstimationV2` avec des fixtures qui simulent :
 *   - Toyota Prado 2024 : 0 row exact, mais Land Cruiser disponibles → Couche 2
 *   - Kia Sportage 2015 : assez de comps exacts → Couche 1 prioritaire
 *   - Toyota Prado 2024 sans aucune ressource (ni proxy) → Couche 4 (sanity floor)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstimationInput } from "@/types/estimation";

// Mock supabase global (réutilise le pattern de engineV2NewBehaviors.test.ts)
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
    select(_cols: string) { return this; }
    eq(col: string, val: unknown) { this.filters.push({ kind: "eq", col, val }); return this; }
    ilike(col: string, pattern: string) { this.filters.push({ kind: "ilike", col, pattern }); return this; }
    gte(col: string, val: unknown) { this.filters.push({ kind: "gte", col, val: val as number }); return this; }
    lte(col: string, val: unknown) { this.filters.push({ kind: "lte", col, val: val as number }); return this; }
    in(col: string, vals: unknown[]) { this.filters.push({ kind: "in", col, vals }); return this; }
    limit(n: number) { this.limitN = n; return this; }
    order(col: string, opts?: { ascending?: boolean }) { this.orderBy = { col, ascending: opts?.ascending ?? true }; return this; }
    maybeSingle() {
      const value = this.resolve();
      const data = (value.data as Record<string, unknown>[])[0] ?? null;
      return Promise.resolve({ data, error: value.error });
    }
    private resolve(): { data: unknown; error: unknown } {
      let rows: Record<string, unknown>[];
      if (this.table === "listings") rows = fixturesStore.listings;
      else if (this.table === "listing_photos") rows = fixturesStore.photos;
      else if (this.table === "vehicle_price_reference_profiles") rows = fixturesStore.referenceProfiles;
      else if (this.table === "market_listings_clean") rows = fixturesStore.marketClean;
      else if (this.table === "app_config") rows = fixturesStore.appConfig;
      else rows = [];

      let filtered = rows.filter((row) => {
        for (const f of this.filters) {
          if (f.kind === "eq") { if (row[f.col] !== f.val) return false; }
          else if (f.kind === "ilike") {
            const pattern = f.pattern.replace(/%/g, "");
            const v = String(row[f.col] ?? "");
            if (pattern && v.toLowerCase() !== pattern.toLowerCase()) return false;
          }
          else if (f.kind === "gte") { const v = Number(row[f.col] ?? Number.NEGATIVE_INFINITY); if (v < f.val) return false; }
          else if (f.kind === "lte") { const v = Number(row[f.col] ?? Number.POSITIVE_INFINITY); if (v > f.val) return false; }
          else if (f.kind === "in") { if (!f.vals.includes(row[f.col])) return false; }
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
      from(table: string) { return new MockQueryBuilder(table); },
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

import { computeVehicleEstimationV2 } from "@/lib/estimation/engine";

const baseInput = (overrides: Partial<EstimationInput> = {}): EstimationInput => ({
  makeName: "Toyota",
  modelName: "Land Cruiser Prado",
  year: 2024,
  city: "Antananarivo",
  mileage: 23_000,
  fuelType: "diesel",
  transmissionType: "automatic",
  bodyType: "suv",
  conditionLabel: "excellent",
  accidentDeclared: false,
  maintenanceLevel: "full",
  ownerCountLabel: "1",
  usageType: "personal",
  ...overrides,
});

function makeListing(p: {
  id: string;
  price_mga: number;
  year: number;
  make: string;
  model: string;
  mileage_km?: number;
}): Record<string, unknown> {
  return {
    id: p.id,
    title: `${p.make} ${p.model} ${p.year}`,
    price_mga: p.price_mga,
    year: p.year,
    mileage_km: p.mileage_km ?? 80_000,
    ville: "Antananarivo",
    region: "Analamanga",
    body_style: "SUV",
    fuel: "Diesel",
    transmission_gearbox: "Boîte automatique",
    description: "Véhicule en très bon état général, entretien suivi.",
    created_at: "2026-04-15T12:00:00.000Z",
    updated_at: "2026-04-15T12:00:00.000Z",
    status: "active",
    make: p.make,
    model: p.model,
  };
}

beforeEach(() => {
  setFixtures({});
});

describe("PROMPT 10E — Couche 2 (segment proche) intégration", () => {
  it("Toyota Prado 2024 sans comp exact : utilise Land Cruiser comme proxy → segmentProche > 0", async () => {
    setFixtures({
      // 0 Prado, 6 Land Cruiser 2022-2025
      listings: [
        makeListing({ id: "lc-1", price_mga: 280_000_000, year: 2022, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-2", price_mga: 310_000_000, year: 2023, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-3", price_mga: 295_000_000, year: 2024, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-4", price_mga: 320_000_000, year: 2024, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-5", price_mga: 290_000_000, year: 2023, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-6", price_mga: 305_000_000, year: 2025, make: "Toyota", model: "Land Cruiser" }),
      ],
    });
    const v2 = await computeVehicleEstimationV2(baseInput());
    expect(v2.audit?.comparablesBreakdownByLayer?.segmentProche).toBeGreaterThan(0);
    expect(v2.audit?.proximityModelsUsed?.length).toBeGreaterThan(0);
    const used = v2.audit?.proximityModelsUsed ?? [];
    expect(used.some((p) => p.model === "Land Cruiser")).toBe(true);
  });

  it("Toyota Prado 2024 avec proxy Land Cruiser : estimatedValue >= 200M (sanity bound)", async () => {
    setFixtures({
      listings: [
        makeListing({ id: "lc-1", price_mga: 280_000_000, year: 2023, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-2", price_mga: 310_000_000, year: 2024, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-3", price_mga: 295_000_000, year: 2024, make: "Toyota", model: "Land Cruiser" }),
      ],
    });
    const v2 = await computeVehicleEstimationV2(baseInput());
    expect(v2.values.estimatedValue).toBeGreaterThanOrEqual(200_000_000);
    expect(v2.values.estimatedValue).toBeLessThanOrEqual(600_000_000);
  });

  it("Toyota Prado 2024 avec proxy : tier <= C (pas A_STRONG_MARKET car proxy)", async () => {
    setFixtures({
      listings: [
        makeListing({ id: "lc-1", price_mga: 280_000_000, year: 2023, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-2", price_mga: 310_000_000, year: 2024, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-3", price_mga: 295_000_000, year: 2024, make: "Toyota", model: "Land Cruiser" }),
      ],
    });
    const v2 = await computeVehicleEstimationV2(baseInput());
    expect(v2.tierDecision.tier).not.toBe("A_STRONG_MARKET");
  });

  it("Kia Sportage 2015 avec assez de comps exacts : Couche 1 prioritaire (segmentProche === 0)", async () => {
    setFixtures({
      listings: [
        makeListing({ id: "k-1", price_mga: 35_000_000, year: 2014, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-2", price_mga: 38_000_000, year: 2015, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-3", price_mga: 40_000_000, year: 2015, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-4", price_mga: 36_000_000, year: 2016, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-5", price_mga: 39_000_000, year: 2015, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-6", price_mga: 41_000_000, year: 2016, make: "Kia", model: "Sportage" }),
      ],
    });
    const v2 = await computeVehicleEstimationV2(baseInput({
      makeName: "Kia",
      modelName: "Sportage",
      year: 2015,
      bodyType: "suv",
      mileage: 95_000,
    }));
    expect(v2.audit?.comparablesBreakdownByLayer?.segmentProche ?? 0).toBe(0);
    expect(v2.audit?.comparablesBreakdownByLayer?.exact ?? 0).toBeGreaterThan(0);
  });
});

describe("PROMPT 10E — Couche 4 (sanity check) intégration", () => {
  it("Toyota Prado 2024 sans aucune ressource : sanity floor → estimatedValue >= 200M, audit.sanityCheck.applied=true", async () => {
    setFixtures({});
    const v2 = await computeVehicleEstimationV2(baseInput());
    expect(v2.values.estimatedValue).toBeGreaterThanOrEqual(200_000_000);
    expect(v2.audit?.sanityCheck?.applied).toBe(true);
    expect(v2.audit?.sanityCheck?.action).toBe("raised_to_floor");
    expect(v2.audit?.sanityCheck?.warning).not.toBeNull();
    expect(v2.audit?.sanityCheck?.segmentKey).toBe("premium_pickup_suv_recent");
  });

  it("Modèle inconnu hors bounds : sanity check no_bound, valeur inchangée", async () => {
    setFixtures({});
    const v2 = await computeVehicleEstimationV2(baseInput({
      makeName: "Foo",
      modelName: "Bar",
    }));
    expect(v2.audit?.sanityCheck?.action).toBe("no_bound");
    expect(v2.audit?.sanityCheck?.applied).toBe(false);
  });

  it("Kia Sportage 2015 in-bounds : sanity check action=kept", async () => {
    setFixtures({
      listings: [
        makeListing({ id: "k-1", price_mga: 35_000_000, year: 2014, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-2", price_mga: 38_000_000, year: 2015, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-3", price_mga: 40_000_000, year: 2015, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-4", price_mga: 36_000_000, year: 2016, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-5", price_mga: 39_000_000, year: 2015, make: "Kia", model: "Sportage" }),
      ],
    });
    const v2 = await computeVehicleEstimationV2(baseInput({
      makeName: "Kia",
      modelName: "Sportage",
      year: 2015,
      bodyType: "suv",
      mileage: 95_000,
    }));
    expect(v2.audit?.sanityCheck?.applied).toBe(false);
    expect(["kept", "no_bound"]).toContain(v2.audit?.sanityCheck?.action);
  });
});

describe("PROMPT 10E — audit.reasoningLayer", () => {
  it("Kia Sportage avec assez d'exacts → reasoningLayer=couche_1_exact", async () => {
    setFixtures({
      listings: [
        makeListing({ id: "k-1", price_mga: 35_000_000, year: 2014, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-2", price_mga: 38_000_000, year: 2015, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-3", price_mga: 40_000_000, year: 2015, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-4", price_mga: 36_000_000, year: 2016, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-5", price_mga: 39_000_000, year: 2015, make: "Kia", model: "Sportage" }),
        makeListing({ id: "k-6", price_mga: 41_000_000, year: 2016, make: "Kia", model: "Sportage" }),
      ],
    });
    const v2 = await computeVehicleEstimationV2(baseInput({
      makeName: "Kia",
      modelName: "Sportage",
      year: 2015,
      bodyType: "suv",
      mileage: 95_000,
    }));
    expect(v2.audit?.reasoningLayer).toBe("couche_1_exact");
  });

  it("Toyota Prado avec proxy seulement → reasoningLayer=couche_2_segment_proche", async () => {
    setFixtures({
      listings: [
        makeListing({ id: "lc-1", price_mga: 280_000_000, year: 2023, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-2", price_mga: 310_000_000, year: 2024, make: "Toyota", model: "Land Cruiser" }),
        makeListing({ id: "lc-3", price_mga: 295_000_000, year: 2024, make: "Toyota", model: "Land Cruiser" }),
      ],
    });
    const v2 = await computeVehicleEstimationV2(baseInput());
    expect(v2.audit?.reasoningLayer).toBe("couche_2_segment_proche");
  });

  it("Toyota Prado 2024 sans rien → reasoningLayer=couche_4_sanity_only", async () => {
    setFixtures({});
    const v2 = await computeVehicleEstimationV2(baseInput());
    expect(v2.audit?.reasoningLayer).toBe("couche_4_sanity_only");
  });
});
