// Supabase Edge Function — compute-estimation / reference-profiles.ts
// -----------------------------------------------------------------------------
// Portage 1:1 de `src/lib/estimation/referenceProfiles.ts`.
//
// Le client supabase est INJECTÉ pour préserver la pureté du module (pas
// d'import global), permettant de tester côté Node avec un mock identique
// à celui utilisé par le moteur legacy.
//
// IMPORTANT — gardez la logique strictement identique au module legacy :
// les coefficients (`bodyFallbackMultiplier`, `fuelFallbackMultiplier`,
// `transmissionFallbackMultiplier`), la base seedBase 52 000 000 MGA, le
// taux de dépréciation 0.09, le plancher 4 500 000 MGA, et le scoring de
// `findReferenceProfile` sont tous référencés par les tests de parité.
// -----------------------------------------------------------------------------

import type { EstimationInput, FuelType, TransmissionType, BodyType } from "./types.ts";
import type { MinimalSupabaseClient } from "./engine.ts";

export type VehiclePriceReferenceProfile = {
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

function bodyFallbackMultiplier(bodyType: BodyType): number {
  if (bodyType === "suv") return 1.08;
  if (bodyType === "pickup") return 1.15;
  if (bodyType === "hatchback") return 0.92;
  if (bodyType === "sedan") return 1.0;
  if (bodyType === "van") return 1.06;
  if (bodyType === "wagon") return 1.01;
  if (bodyType === "coupe") return 1.03;
  if (bodyType === "convertible") return 1.05;
  return 1.0;
}

function fuelFallbackMultiplier(fuelType: FuelType): number {
  if (fuelType === "diesel") return 1.03;
  if (fuelType === "hybrid") return 1.08;
  if (fuelType === "electric") return 1.12;
  return 1.0;
}

function transmissionFallbackMultiplier(transmission: TransmissionType): number {
  if (transmission === "automatic") return 1.05;
  if (transmission === "cvt") return 1.03;
  return 1.0;
}

export async function findReferenceProfile(
  client: MinimalSupabaseClient,
  input: EstimationInput,
): Promise<VehiclePriceReferenceProfile | null> {
  const { data, error } = (await client
    .from("vehicle_price_reference_profiles")
    .select(
      "id,make_name,model_name,body_type,fuel_type,transmission_type,baseline_year,baseline_price_mga,annual_depreciation_rate,expected_km_per_year,popularity_score,is_active",
    )
    .eq("is_active", true)
    .ilike("make_name", input.makeName)
    .ilike("model_name", input.modelName)
    .limit(40)) as { data: VehiclePriceReferenceProfile[] | null; error: unknown };

  if (error) return null;
  const rows = (data ?? []) as VehiclePriceReferenceProfile[];
  if (rows.length === 0) return null;

  const best = rows
    .map((profile) => {
      let score = 0;
      if (profile.body_type === input.bodyType) score += 22;
      if (profile.fuel_type && profile.fuel_type === input.fuelType) score += 14;
      if (profile.transmission_type && profile.transmission_type === input.transmissionType) score += 12;
      if (!profile.fuel_type) score += 3;
      if (!profile.transmission_type) score += 3;
      return { profile, score };
    })
    .sort((a, b) => b.score - a.score)[0];

  return best?.profile ?? null;
}

export function computeFallbackBaseline(input: EstimationInput): {
  basePrice: number;
  annualDepreciationRate: number;
  expectedKmPerYear: number;
} {
  const yearsOld = Math.max(0, new Date().getFullYear() - input.year);
  const anchorAge = Math.max(0, yearsOld - 4);
  const seedBase = 52_000_000;
  const body = bodyFallbackMultiplier(input.bodyType);
  const fuel = fuelFallbackMultiplier(input.fuelType);
  const gearbox = transmissionFallbackMultiplier(input.transmissionType);
  const ageDecay = Math.pow(1 - 0.09, anchorAge);
  const basePrice = Math.max(4_500_000, Math.round(seedBase * body * fuel * gearbox * ageDecay));
  return {
    basePrice,
    annualDepreciationRate: 0.1,
    expectedKmPerYear: 15_000,
  };
}
