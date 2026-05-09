import { supabase } from "@/integrations/supabase/client";
import type { BodyType, EstimationInput, FuelType, TransmissionType } from "@/types/estimation";

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
  // Sprint 8.2 — sample_size lu pour tie-break sur les buckets générationnels (L3).
  sample_size: number | null;
  is_active: boolean;
};

/**
 * Sprint 8.2 — extrait un bucket générationnel "(YYYY-YYYY)" du nom de modèle.
 * Renvoie null si le nom ne contient pas le suffixe.
 *   "Tucson (2004-2015)" → { from: 2004, to: 2015 }
 *   "Land Cruiser (Neuf)" → null
 */
function parseGenerationBucket(modelName: string): { from: number; to: number } | null {
  const m = modelName.match(/\((\d{4})-(\d{4})\)/);
  if (!m) return null;
  return { from: Number(m[1]), to: Number(m[2]) };
}

/**
 * Sprint 8.2 — infère le statut véhicule depuis (year, mileage). EstimationInput
 * ne porte pas de champ explicite, donc on déduit "neuf" si année courante ou
 * postérieure ET kilométrage très bas (< 5000).
 */
function inferVehicleStatus(input: EstimationInput): "neuf" | "occasion" {
  // Sprint 8.2 — heuristique : véhicule "neuf" si modèle de l'année courante
  // (ou de l'année dernière, pour couvrir stock dealer début d'année) ET
  // kilométrage très bas (< 10 000 km, marge demo/livraison). Tout le reste
  // est traité comme occasion (default safe).
  const currentYear = new Date().getFullYear();
  if (input.year >= currentYear - 1 && input.mileage < 10_000) return "neuf";
  return "occasion";
}

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

/**
 * Sprint 8.2 — matching cascade à 4 niveaux pour gérer les profils suffixés
 * "(Neuf)", "(Occasion)" et buckets générationnels "(YYYY-YYYY)" produits par
 * le pipeline build-reference-profiles.ts.
 *
 *   L1: match exact sur model_name
 *   L2: match avec suffixe "(Neuf)" ou "(Occasion)" selon inferVehicleStatus()
 *   L3: match avec bucket générationnel "(YYYY-YYYY)" couvrant input.year
 *       (tie-break par sample_size desc, fallback bucket le plus récent)
 *   L4: aucun match → null (fallback heuristique côté appelant)
 *
 * Implémentation : 1 seule requête (tous les profils du make), filtrage
 * cascade côté TS. Évite les multi roundtrips et reste robuste aux quirks
 * de wildcard ilike côté tests.
 */
function selectByCascade(
  rows: VehiclePriceReferenceProfile[],
  input: EstimationInput,
): { candidates: VehiclePriceReferenceProfile[]; level: 1 | 2 | 3 | 4 } {
  const target = input.modelName.toLowerCase().trim();

  // L1 — exact
  const l1 = rows.filter((r) => r.model_name.toLowerCase() === target);
  if (l1.length > 0) return { candidates: l1, level: 1 };

  // L2 — suffixe Neuf/Occasion
  const status = inferVehicleStatus(input);
  const suffix = status === "neuf" ? "(neuf)" : "(occasion)";
  const l2Target = `${target} ${suffix}`;
  const l2 = rows.filter((r) => r.model_name.toLowerCase() === l2Target);
  if (l2.length > 0) return { candidates: l2, level: 2 };

  // L3 — bucket générationnel
  const bucketCandidates = rows.filter((r) => {
    const lower = r.model_name.toLowerCase();
    if (!lower.startsWith(`${target} (`)) return false;
    return parseGenerationBucket(r.model_name) !== null;
  });
  if (bucketCandidates.length > 0) {
    const matchingBucket = bucketCandidates.filter((r) => {
      const b = parseGenerationBucket(r.model_name)!;
      return input.year >= b.from && input.year <= b.to;
    });
    if (matchingBucket.length > 0) {
      // Tie-break : sample_size desc.
      const sorted = [...matchingBucket].sort(
        (a, b) => (b.sample_size ?? 0) - (a.sample_size ?? 0),
      );
      return { candidates: sorted, level: 3 };
    }
    // Aucun bucket ne matche l'année → fallback : bucket le plus récent (max .to).
    const mostRecent = [...bucketCandidates].sort((a, b) => {
      const bb = parseGenerationBucket(b.model_name)!;
      const ba = parseGenerationBucket(a.model_name)!;
      return bb.to - ba.to;
    });
    return { candidates: [mostRecent[0]], level: 3 };
  }

  return { candidates: [], level: 4 };
}

export async function findReferenceProfile(
  input: EstimationInput,
): Promise<VehiclePriceReferenceProfile | null> {
  // Sprint 8.2 — fetch all active profiles for this make, then cascade-match
  // côté TS pour gérer les suffixes "(Neuf)/(Occasion)/(YYYY-YYYY)".
  const { data, error } = await supabase
    .from("vehicle_price_reference_profiles")
    .select(
      "id,make_name,model_name,body_type,fuel_type,transmission_type,baseline_year,baseline_price_mga,annual_depreciation_rate,expected_km_per_year,popularity_score,sample_size,is_active",
    )
    .eq("is_active", true)
    .ilike("make_name", input.makeName)
    .limit(200);

  if (error) return null;
  // Sprint 8.2 — cast via unknown : `sample_size` n'est pas encore dans les
  // types auto-générés de Supabase (régénération à faire post-Sprint 8). La
  // colonne existe en prod (migration 20260430130703).
  const allRows = ((data ?? []) as unknown) as VehiclePriceReferenceProfile[];
  if (allRows.length === 0) return null;

  const { candidates, level } = selectByCascade(allRows, input);
  if (candidates.length === 0) {
    console.log(`[ref-profile-match] level=4 make='${input.makeName}' model='${input.modelName}' → no match`);
    return null;
  }

  const best = candidates
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

  if (best?.profile) {
    console.log(`[ref-profile-match] level=${level} model='${best.profile.model_name}'`);
  }
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
