// Sprint Estimation Engine v2 — Sprint 1 / Chantier 4
// =============================================================================
// Tests de parité STRICTE legacy vs v2 sur 30 cas représentatifs.
//
// Stratégie (Option A, retenue par défaut)
//   - Le moteur Edge Function `supabase/functions/compute-estimation/engine.ts`
//     est volontairement PUR (pas d'imports Deno-only). On l'importe direct
//     ici, on lui passe un client mock qui renvoie les MÊMES fixtures que
//     celles vues par le moteur legacy via `vi.mock("@/integrations/supabase/client")`.
//   - Les deux moteurs partagent la même logique byte-for-byte, donc des
//     entrées + données strictement identiques DOIVENT produire des sorties
//     strictement identiques. Différence absolue tolérée : 0.
//   - On fixe l'horloge (`vi.setSystemTime`) car la freshness des comparables
//     dépend de `Date.now()` et `new Date().getFullYear()` ; sans fix, deux
//     exécutions back-to-back peuvent bouger le score.
//
// Couverture (30 cas)
//   - 5 cas Tier A : ≥ 8 comparables forts, similarité haute.
//   - 8 cas Tier B : 5–7 comparables, similarité moderate.
//   - 9 cas Tier C : peu de comparables, profile de référence présent.
//   - 8 cas Tier D : pas de profile, pas de comparables.
// =============================================================================

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  EstimationInput,
  EstimationOutputV2,
} from "@/types/estimation";

// On définit un store de fixtures partagé. Le mock supabase global et le mock
// passé au moteur v2 lisent dans CE même store ; on ne peut pas avoir de skew
// puisque c'est exactement la même source de données pour les deux moteurs.
type ListingFixture = {
  id: string;
  title: string;
  price_mga: number;
  year: number;
  mileage_km: number;
  ville: string | null;
  region: string | null;
  body_style: string | null;
  fuel: string | null;
  transmission_gearbox: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  make: string;
  model: string;
};

type ReferenceProfileFixture = {
  id: string;
  make_name: string;
  model_name: string;
  body_type: string;
  fuel_type: string | null;
  transmission_type: string | null;
  baseline_year: number;
  baseline_price_mga: number;
  annual_depreciation_rate: number;
  expected_km_per_year: number;
  popularity_score: number | null;
  is_active: boolean;
};

// -----------------------------------------------------------------------------
// Mock Supabase commun — utilisé à la fois par le moteur legacy (via vi.mock
// du module @/integrations/supabase/client) et par le moteur v2 (passé en
// paramètre).
//
// vi.mock factory est hoisté en haut du fichier ; pour que la factory puisse
// référencer notre store de fixtures + MockQueryBuilder, on regroupe TOUT
// dans un unique `vi.hoisted` block. Les helpers (`setFixtures`, `mockSupabase`)
// sont exposés en retour pour rester accessibles dans le code de test.
// -----------------------------------------------------------------------------

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
  } = {
    listings: [],
    photos: [],
    referenceProfiles: [],
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

    private resolve(): { data: unknown; error: unknown } {
      let rows: Record<string, unknown>[];
      if (this.table === "listings") rows = fixturesStore.listings;
      else if (this.table === "listing_photos") rows = fixturesStore.photos;
      else if (this.table === "vehicle_price_reference_profiles") rows = fixturesStore.referenceProfiles;
      else rows = [];

      let filtered = rows.filter((row) => {
        for (const f of this.filters) {
          if (f.kind === "eq") {
            if (row[f.col] !== f.val) return false;
          } else if (f.kind === "ilike") {
            // Le moteur passe makeName/modelName tels quels (pas de wildcard).
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
    setFixtures(
      listings: Record<string, unknown>[],
      referenceProfiles: Record<string, unknown>[],
      photos: Record<string, unknown>[] = [],
    ) {
      fixturesStore.listings = listings;
      fixturesStore.photos = photos;
      fixturesStore.referenceProfiles = referenceProfiles;
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
  getSupabaseClient: () => mockSupabase,
}));

// -----------------------------------------------------------------------------
// Imports — le moteur legacy doit être importé APRÈS le mock supabase pour
// que sa closure `from "@/integrations/supabase/client"` capture le mock.
// -----------------------------------------------------------------------------

import { computeVehicleEstimationV2 as legacyEngine } from "@/lib/estimation/engine";
import { computeVehicleEstimationV2 as v2Engine } from "../../supabase/functions/compute-estimation/engine";

// -----------------------------------------------------------------------------
// Helpers de génération de fixtures
// -----------------------------------------------------------------------------

const TODAY_ISO = "2026-04-30T12:00:00.000Z";
const RECENT_ISO = "2026-04-15T12:00:00.000Z";

function makeListing(
  partial: Partial<ListingFixture> & { id: string; price_mga: number; year: number; mileage_km: number },
): ListingFixture {
  return {
    id: partial.id,
    title: partial.title ?? "Toyota Corolla 2020 belle occasion bien entretenue",
    price_mga: partial.price_mga,
    year: partial.year,
    mileage_km: partial.mileage_km,
    ville: partial.ville ?? "Antananarivo",
    region: partial.region ?? "Analamanga",
    body_style: partial.body_style ?? "Berline",
    fuel: partial.fuel ?? "Diesel",
    transmission_gearbox: partial.transmission_gearbox ?? "Boîte manuelle",
    description:
      partial.description ??
      "Véhicule en très bon état général, entretien suivi, factures disponibles. Climatisation, direction assistée, vitres électriques.",
    created_at: partial.created_at ?? RECENT_ISO,
    updated_at: partial.updated_at ?? RECENT_ISO,
    status: partial.status ?? "active",
    make: partial.make ?? "Toyota",
    model: partial.model ?? "Corolla",
  };
}

function makeProfile(partial: Partial<ReferenceProfileFixture> & { make_name: string; model_name: string }): ReferenceProfileFixture {
  return {
    id: partial.id ?? `prof-${partial.make_name}-${partial.model_name}`,
    make_name: partial.make_name,
    model_name: partial.model_name,
    body_type: partial.body_type ?? "sedan",
    fuel_type: partial.fuel_type ?? "diesel",
    transmission_type: partial.transmission_type ?? "manual",
    baseline_year: partial.baseline_year ?? 2020,
    baseline_price_mga: partial.baseline_price_mga ?? 45_000_000,
    annual_depreciation_rate: partial.annual_depreciation_rate ?? 0.1,
    expected_km_per_year: partial.expected_km_per_year ?? 15_000,
    popularity_score: partial.popularity_score ?? 50,
    is_active: partial.is_active ?? true,
  };
}

function generateStrongComparableSet(
  baseInput: EstimationInput,
  count: number,
  basePrice: number,
): ListingFixture[] {
  // Cas Tier A : on génère ≥ 8 comparables très similaires (même make/model/year/body/fuel/trans),
  // mêmes ville, prix très proches → similarité ≥ 70 et dispersion ≥ 55.
  const out: ListingFixture[] = [];
  for (let i = 0; i < count; i++) {
    const priceJitter = (i % 5) * 200_000 - 400_000;
    out.push(
      makeListing({
        id: `strong-${i}`,
        price_mga: basePrice + priceJitter,
        year: baseInput.year - (i % 2),
        mileage_km: baseInput.mileage + i * 2_000,
        ville: baseInput.city,
        body_style: "Berline",
        fuel: "Diesel",
        transmission_gearbox: "Boîte manuelle",
        make: baseInput.makeName,
        model: baseInput.modelName,
      }),
    );
  }
  return out;
}

function generateModerateComparableSet(
  baseInput: EstimationInput,
  count: number,
  basePrice: number,
): ListingFixture[] {
  // Cas Tier B : 5-7 comparables, certains avec attributs partiels (pas de fuel/transmission).
  const out: ListingFixture[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      makeListing({
        id: `mod-${i}`,
        price_mga: basePrice + i * 600_000,
        year: baseInput.year - (i % 3),
        mileage_km: baseInput.mileage + i * 8_000,
        ville: i % 2 === 0 ? baseInput.city : "Toamasina",
        body_style: i % 2 === 0 ? "Berline" : "berline",
        fuel: i % 3 === 0 ? null : "Diesel",
        transmission_gearbox: i % 4 === 0 ? null : "Boîte manuelle",
        make: baseInput.makeName,
        model: baseInput.modelName,
      }),
    );
  }
  return out;
}

// -----------------------------------------------------------------------------
// Comparaison stricte des deux outputs
// -----------------------------------------------------------------------------

function compareOutputs(legacy: EstimationOutputV2, v2: EstimationOutputV2): void {
  // Champs prix (le critère d'acceptation principal).
  expect(v2.values.estimatedValue).toBe(legacy.values.estimatedValue);
  expect(v2.values.lowEstimate).toBe(legacy.values.lowEstimate);
  expect(v2.values.highEstimate).toBe(legacy.values.highEstimate);
  expect(v2.values.quickSalePrice).toBe(legacy.values.quickSalePrice);
  expect(v2.values.recommendedListingPrice).toBe(legacy.values.recommendedListingPrice);
  expect(v2.values.roundingStepApplied).toBe(legacy.values.roundingStepApplied);

  // Tier + confidence.
  expect(v2.tierDecision.tier).toBe(legacy.tierDecision.tier);
  expect(v2.tierDecision.tierReasonCode).toBe(legacy.tierDecision.tierReasonCode);
  expect(v2.confidence.confidenceScore).toBe(legacy.confidence.confidenceScore);
  expect(v2.confidence.confidenceBand).toBe(legacy.confidence.confidenceBand);
  expect(v2.confidence.confidenceCeiling).toBe(legacy.confidence.confidenceCeiling);

  // Évidence + ancrage.
  expect(v2.evidence.comparableCountUsed).toBe(legacy.evidence.comparableCountUsed);
  expect(v2.evidence.referenceProfileUsed).toBe(legacy.evidence.referenceProfileUsed);
  expect(v2.evidence.fallbackUsed).toBe(legacy.evidence.fallbackUsed);
  expect(v2.anchors.finalBaseAnchor).toBe(legacy.anchors.finalBaseAnchor);
  expect(v2.anchors.anchorBlendMode).toBe(legacy.anchors.anchorBlendMode);

  // Mode governance (driver de l'UI). Doit matcher.
  expect(v2.modeGovernance).toEqual(legacy.modeGovernance);
}

// -----------------------------------------------------------------------------
// Builders de cas
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Suite — 30 cas
// -----------------------------------------------------------------------------

describe("Estimation engine parity — legacy vs v2 (Edge port) — 30 cas", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TODAY_ISO));
  });
  afterAll(() => {
    vi.useRealTimers();
  });
  beforeEach(() => {
    setFixtures([], []);
  });

  // -------- Tier A (5 cas) --------

  it("A1 — Toyota Corolla 2020 sedan, 10 strong comparables, profile present", async () => {
    const input = baseInput();
    setFixtures(
      generateStrongComparableSet(input, 10, 38_000_000),
      [makeProfile({ make_name: "Toyota", model_name: "Corolla", baseline_price_mga: 40_000_000 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
    expect(v2.tierDecision.tier).toBe("A_STRONG_MARKET");
  });

  it("A2 — Hilux pickup 2018, 12 strong comparables", async () => {
    const input = baseInput({ makeName: "Toyota", modelName: "Hilux", bodyType: "pickup", year: 2018, mileage: 95_000 });
    const listings = generateStrongComparableSet(input, 12, 75_000_000).map((l) => ({
      ...l,
      body_style: "Pickup",
      title: "Toyota Hilux 2018 4x4 double cabine",
    }));
    setFixtures(
      listings,
      [makeProfile({ make_name: "Toyota", model_name: "Hilux", body_type: "pickup", baseline_price_mga: 80_000_000, baseline_year: 2018 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("A3 — Picanto hatchback 2019, 9 comparables forts", async () => {
    const input = baseInput({ makeName: "Kia", modelName: "Picanto", bodyType: "hatchback", year: 2019, mileage: 60_000, fuelType: "petrol", transmissionType: "automatic" });
    const listings = generateStrongComparableSet(input, 9, 22_000_000).map((l) => ({
      ...l,
      body_style: "Citadine",
      fuel: "Essence",
      transmission_gearbox: "Boîte automatique",
      title: "Kia Picanto 2019 essence boîte auto",
    }));
    setFixtures(
      listings,
      [makeProfile({ make_name: "Kia", model_name: "Picanto", body_type: "hatchback", fuel_type: "petrol", transmission_type: "automatic", baseline_price_mga: 23_000_000, baseline_year: 2019 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("A4 — X3 SUV 2017 essence auto, 8 comparables forts dispersés", async () => {
    const input = baseInput({ makeName: "BMW", modelName: "X3", bodyType: "suv", year: 2017, mileage: 110_000, fuelType: "petrol", transmissionType: "automatic" });
    const listings = generateStrongComparableSet(input, 8, 95_000_000).map((l, i) => ({
      ...l,
      body_style: "SUV",
      fuel: "Essence",
      transmission_gearbox: "Boîte automatique",
      price_mga: 95_000_000 + i * 500_000,
      title: "BMW X3 2017 SUV essence",
    }));
    setFixtures(listings, [makeProfile({ make_name: "BMW", model_name: "X3", body_type: "suv", fuel_type: "petrol", transmission_type: "automatic", baseline_price_mga: 100_000_000, baseline_year: 2017 })]);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("A5 — Sorento SUV 2021 diesel, 11 comparables très récents", async () => {
    const input = baseInput({ makeName: "Kia", modelName: "Sorento", bodyType: "suv", year: 2021, mileage: 50_000 });
    const listings = generateStrongComparableSet(input, 11, 130_000_000).map((l) => ({
      ...l,
      body_style: "SUV",
      title: "Kia Sorento 2021 diesel",
    }));
    setFixtures(listings, [makeProfile({ make_name: "Kia", model_name: "Sorento", body_type: "suv", baseline_price_mga: 135_000_000, baseline_year: 2021 })]);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  // -------- Tier B (8 cas) --------

  it("B1 — Patrol SUV 2015, 6 comparables modérés", async () => {
    const input = baseInput({ makeName: "Nissan", modelName: "Patrol", bodyType: "suv", year: 2015, mileage: 165_000 });
    setFixtures(
      generateModerateComparableSet(input, 6, 60_000_000),
      [makeProfile({ make_name: "Nissan", model_name: "Patrol", body_type: "suv", baseline_price_mga: 65_000_000, baseline_year: 2015 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("B2 — Corolla sedan 2017, 5 comparables modérés sans profile", async () => {
    const input = baseInput({ year: 2017, mileage: 110_000 });
    setFixtures(generateModerateComparableSet(input, 5, 28_000_000), []);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("B3 — Mazda 3 sedan 2019, 7 modérés", async () => {
    const input = baseInput({ makeName: "Mazda", modelName: "3", year: 2019, mileage: 80_000 });
    setFixtures(
      generateModerateComparableSet(input, 7, 38_000_000),
      [makeProfile({ make_name: "Mazda", model_name: "3", baseline_price_mga: 40_000_000, baseline_year: 2019 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("B4 — Hyundai Tucson SUV 2018, 6 comparables", async () => {
    const input = baseInput({ makeName: "Hyundai", modelName: "Tucson", bodyType: "suv", year: 2018, mileage: 95_000 });
    setFixtures(
      generateModerateComparableSet(input, 6, 65_000_000).map((l) => ({ ...l, body_style: "SUV" })),
      [makeProfile({ make_name: "Hyundai", model_name: "Tucson", body_type: "suv", baseline_price_mga: 70_000_000, baseline_year: 2018 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("B5 — Ford Ranger pickup 2020, 5 comparables", async () => {
    const input = baseInput({ makeName: "Ford", modelName: "Ranger", bodyType: "pickup", year: 2020, mileage: 70_000 });
    setFixtures(
      generateModerateComparableSet(input, 5, 95_000_000).map((l) => ({ ...l, body_style: "Pickup" })),
      [makeProfile({ make_name: "Ford", model_name: "Ranger", body_type: "pickup", baseline_price_mga: 100_000_000, baseline_year: 2020 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("B6 — Suzuki Swift hatchback 2020 essence, 6 modérés", async () => {
    const input = baseInput({ makeName: "Suzuki", modelName: "Swift", bodyType: "hatchback", year: 2020, mileage: 50_000, fuelType: "petrol" });
    setFixtures(
      generateModerateComparableSet(input, 6, 28_000_000).map((l) => ({ ...l, body_style: "Citadine", fuel: "Essence" })),
      [makeProfile({ make_name: "Suzuki", model_name: "Swift", body_type: "hatchback", fuel_type: "petrol", baseline_price_mga: 30_000_000, baseline_year: 2020 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("B7 — Honda Civic sedan 2016, 5 comparables, bcp d'accident sur input", async () => {
    const input = baseInput({ makeName: "Honda", modelName: "Civic", year: 2016, mileage: 130_000, accidentDeclared: true, conditionLabel: "fair" });
    setFixtures(
      generateModerateComparableSet(input, 5, 32_000_000),
      [makeProfile({ make_name: "Honda", model_name: "Civic", baseline_price_mga: 34_000_000, baseline_year: 2016 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("B8 — Mitsubishi L200 pickup 2017, 6 comparables ; usage rental", async () => {
    const input = baseInput({ makeName: "Mitsubishi", modelName: "L200", bodyType: "pickup", year: 2017, mileage: 175_000, usageType: "rental" });
    setFixtures(
      generateModerateComparableSet(input, 6, 50_000_000).map((l) => ({ ...l, body_style: "Pickup" })),
      [makeProfile({ make_name: "Mitsubishi", model_name: "L200", body_type: "pickup", baseline_price_mga: 55_000_000, baseline_year: 2017 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  // -------- Tier C (9 cas) --------

  it("C1 — Toyota Yaris 2014, 0 comparables, profile présent", async () => {
    const input = baseInput({ makeName: "Toyota", modelName: "Yaris", bodyType: "hatchback", year: 2014, mileage: 140_000, fuelType: "petrol" });
    setFixtures([], [makeProfile({ make_name: "Toyota", model_name: "Yaris", body_type: "hatchback", fuel_type: "petrol", baseline_price_mga: 18_000_000, baseline_year: 2014 })]);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("C2 — Renault Duster 2013, 2 comparables (sub-threshold) + profile", async () => {
    const input = baseInput({ makeName: "Renault", modelName: "Duster", bodyType: "suv", year: 2013, mileage: 180_000 });
    setFixtures(
      generateModerateComparableSet(input, 2, 22_000_000).map((l) => ({ ...l, body_style: "SUV" })),
      [makeProfile({ make_name: "Renault", model_name: "Duster", body_type: "suv", baseline_price_mga: 25_000_000, baseline_year: 2013 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("C3 — Audi A3 sedan 2012, 0 comparables, profile sedan-other-other", async () => {
    const input = baseInput({ makeName: "Audi", modelName: "A3", bodyType: "sedan", year: 2012, mileage: 200_000, fuelType: "petrol" });
    setFixtures([], [makeProfile({ make_name: "Audi", model_name: "A3", body_type: "sedan", fuel_type: null, transmission_type: null, baseline_price_mga: 25_000_000, baseline_year: 2012 })]);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("C4 — Citroen C4 2014, 1 comparable + profile", async () => {
    const input = baseInput({ makeName: "Citroen", modelName: "C4", bodyType: "hatchback", year: 2014, mileage: 145_000, fuelType: "petrol" });
    setFixtures(
      generateModerateComparableSet(input, 1, 18_000_000).map((l) => ({ ...l, body_style: "Citadine", fuel: "Essence" })),
      [makeProfile({ make_name: "Citroen", model_name: "C4", body_type: "hatchback", fuel_type: "petrol", baseline_price_mga: 20_000_000, baseline_year: 2014 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("C5 — Peugeot 308 hatchback 2015, 3 comparables faibles + profile", async () => {
    const input = baseInput({ makeName: "Peugeot", modelName: "308", bodyType: "hatchback", year: 2015, mileage: 130_000, fuelType: "petrol" });
    setFixtures(
      generateModerateComparableSet(input, 3, 23_000_000).map((l) => ({ ...l, body_style: "Citadine", fuel: "Essence", transmission_gearbox: "Boîte manuelle" })),
      [makeProfile({ make_name: "Peugeot", model_name: "308", body_type: "hatchback", fuel_type: "petrol", baseline_price_mga: 25_000_000, baseline_year: 2015 })],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("C6 — Chevrolet Cruze sedan 2014, profile only", async () => {
    const input = baseInput({ makeName: "Chevrolet", modelName: "Cruze", bodyType: "sedan", year: 2014, mileage: 160_000, fuelType: "petrol" });
    setFixtures([], [makeProfile({ make_name: "Chevrolet", model_name: "Cruze", body_type: "sedan", fuel_type: "petrol", baseline_price_mga: 17_000_000, baseline_year: 2014 })]);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("C7 — Audi Q5 SUV 2012 diesel auto, profile only", async () => {
    const input = baseInput({ makeName: "Audi", modelName: "Q5", bodyType: "suv", year: 2012, mileage: 220_000, fuelType: "diesel", transmissionType: "automatic" });
    setFixtures([], [makeProfile({ make_name: "Audi", model_name: "Q5", body_type: "suv", fuel_type: "diesel", transmission_type: "automatic", baseline_price_mga: 51_000_000, baseline_year: 2012 })]);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("C8 — Great Wall Poer pickup 2025 neuf, profile only", async () => {
    const input = baseInput({ makeName: "Great Wall", modelName: "Poer", bodyType: "pickup", year: 2025, mileage: 5_000, transmissionType: "automatic" });
    setFixtures([], [makeProfile({ make_name: "Great Wall", model_name: "Poer", body_type: "pickup", transmission_type: "automatic", fuel_type: null, baseline_price_mga: 169_000_000, baseline_year: 2025 })]);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("C9 — Ford Ranger 2025 neuf, profile only, pas de comparables", async () => {
    const input = baseInput({ makeName: "Ford", modelName: "Ranger", bodyType: "pickup", year: 2025, mileage: 3_000 });
    setFixtures([], [makeProfile({ make_name: "Ford", model_name: "Ranger", body_type: "pickup", fuel_type: null, transmission_type: null, baseline_price_mga: 167_000_000, baseline_year: 2025 })]);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  // -------- Tier D (8 cas) --------

  it("D1 — make/model inconnus, sans profile, sans comparables", async () => {
    const input = baseInput({ makeName: "MysteryBrand", modelName: "X-Unknown", bodyType: "other", year: 2010, mileage: 250_000 });
    setFixtures([], []);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
    expect(v2.tierDecision.tier).toBe("D_HEURISTIC_ONLY");
  });

  it("D2 — Tata Indica 2008, ZERO data", async () => {
    const input = baseInput({ makeName: "Tata", modelName: "Indica", bodyType: "hatchback", year: 2008, mileage: 280_000 });
    setFixtures([], []);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("D3 — modèle exotique convertible 1995", async () => {
    const input = baseInput({ makeName: "Triumph", modelName: "Spitfire", bodyType: "convertible", year: 1995, mileage: 80_000, fuelType: "petrol", transmissionType: "manual" });
    setFixtures([], []);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("D4 — van inconnu 2005, fleet usage", async () => {
    const input = baseInput({ makeName: "Random", modelName: "Van200", bodyType: "van", year: 2005, mileage: 320_000, usageType: "fleet" });
    setFixtures([], []);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("D5 — wagon inconnu 2010, kilométrage ultra élevé", async () => {
    const input = baseInput({ makeName: "Foo", modelName: "Wagon", bodyType: "wagon", year: 2010, mileage: 400_000 });
    setFixtures([], []);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("D6 — coupe rare 2018, accident + 3 propriétaires", async () => {
    const input = baseInput({ makeName: "Rare", modelName: "Coupe", bodyType: "coupe", year: 2018, mileage: 60_000, accidentDeclared: true, ownerCountLabel: "3_plus" });
    setFixtures([], []);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("D7 — pickup inconnu 2022, 1 comparable rejeté (mauvais titre)", async () => {
    const input = baseInput({ makeName: "FooMake", modelName: "Pup", bodyType: "pickup", year: 2022, mileage: 30_000 });
    setFixtures(
      [
        makeListing({
          id: "rejected-1",
          price_mga: 50_000_000,
          year: 2022,
          mileage_km: 30_000,
          title: "Hi", // < 8 chars → rejected
          make: "FooMake",
          model: "Pup",
          body_style: "Pickup",
        }),
      ],
      [],
    );
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });

  it("D8 — sedan inconnu 2024 électrique, condition needs_work", async () => {
    const input = baseInput({ makeName: "EVZ", modelName: "Sedan", bodyType: "sedan", year: 2024, mileage: 12_000, fuelType: "electric", transmissionType: "automatic", conditionLabel: "needs_work" });
    setFixtures([], []);
    const legacy = await legacyEngine(input);
    const v2 = await v2Engine(mockSupabase as never, input);
    compareOutputs(legacy, v2);
  });
});
