/**
 * PROMPT 10E — Couche 4 : Sanity bounds par segment + année.
 *
 * Garde-fou absolu : peu importe ce que l'engine calcule, l'estimation finale
 * doit rester dans des bornes raisonnables définies par segment + année.
 * Si l'engine calcule 82M Ar pour une Toyota Prado 2024 → c'est sous le
 * plancher du segment "premium pickup/SUV récent" → on remonte au plancher
 * avec un warning fort, et le tier est rabaissé à C_REFERENCE_ASSISTED.
 *
 * Ce module est pure TS (aucun import projet) pour pouvoir être mirrored
 * trivialement dans `supabase/functions/compute-estimation/sanityBounds.ts`.
 */

export interface SanityBound {
  /** Identifiant stable pour audit (ex: "premium_pickup_suv_recent"). */
  segmentKey: string;
  /** Label humain pour audit/UI. */
  segmentLabel: string;
  /** Plage d'années couverte par ce bound (inclusive). */
  yearRange: [number, number];
  /** Plancher absolu en Ariary. */
  minMGA: number;
  /** Plafond absolu en Ariary. */
  maxMGA: number;
  /** Liste de "Make|Model" couverts par ce segment. */
  models: string[];
  /** Justification du plancher/plafond pour audit. */
  rationale: string;
}

/**
 * Sanity bounds calibrés sur le marché malgache 2026.
 * Ordre = ordre de matching (premier match gagne — placer les segments les
 * plus spécifiques d'abord).
 */
const PREMIUM_PICKUP_SUV_MODELS = [
  "Toyota|Land Cruiser",
  "Toyota|Land Cruiser Prado",
  "Toyota|Hilux",
  "Toyota|Fortuner",
  "Toyota|4runner",
  "Land Rover|Range Rover",
  "Land Rover|Discovery",
  "Land Rover|Defender",
  "Mitsubishi|Pajero",
  "Mitsubishi|L200",
  "Ford|Ranger",
  "Ford|Everest",
  "Nissan|Patrol",
  "Nissan|Navara",
];

const SUV_STANDARD_MODELS = [
  "Hyundai|Tucson",
  "Hyundai|Santafe",
  "Kia|Sportage",
  "Kia|Sorento",
  "Toyota|Rav4",
  "Volkswagen|Tiguan",
  "Renault|Duster",
  "Renault|Koleos",
  "Chevrolet|Captiva",
  "Mazda|Cx-5",
  "Honda|Crv",
];

const COMPACT_SEDAN_MODELS = [
  "Toyota|Corolla",
  "Toyota|Yaris",
  "Hyundai|Accent",
  "Hyundai|I30",
  "Kia|Pride",
  "Kia|Picanto",
  "Volkswagen|Polo",
  "Volkswagen|Golf",
  "Renault|Clio",
  "Peugeot|208",
  "Peugeot|308",
  "Suzuki|Swift",
  "Mitsubishi|Mirage",
];

export const SANITY_BOUNDS: SanityBound[] = [
  // ===== PREMIUM PICKUP/SUV — RÉCENT =====
  {
    segmentKey: "premium_pickup_suv_recent",
    segmentLabel: "Pickup/SUV premium 2023+",
    yearRange: [2023, 2026],
    minMGA: 200_000_000,
    maxMGA: 600_000_000,
    models: PREMIUM_PICKUP_SUV_MODELS,
    rationale:
      "Marché Mada : pickups/SUV haut de gamme neufs/quasi-neufs jamais < 200M, jamais > 600M (sauf Range Rover Vogue full options).",
  },
  {
    segmentKey: "premium_pickup_suv_2018_2022",
    segmentLabel: "Pickup/SUV premium 2018-2022",
    yearRange: [2018, 2022],
    minMGA: 100_000_000,
    maxMGA: 400_000_000,
    models: PREMIUM_PICKUP_SUV_MODELS,
    rationale: "Mêmes modèles 2018-2022 : décote pour 4-7 ans.",
  },
  {
    segmentKey: "premium_pickup_suv_2010_2017",
    segmentLabel: "Pickup/SUV premium 2010-2017",
    yearRange: [2010, 2017],
    minMGA: 40_000_000,
    maxMGA: 200_000_000,
    models: PREMIUM_PICKUP_SUV_MODELS,
    rationale: "Pickups/SUV premium 8-15 ans : usage chargé typique, décote forte.",
  },

  // ===== SUV STANDARD =====
  {
    segmentKey: "suv_standard_recent",
    segmentLabel: "SUV standard 2023+",
    yearRange: [2023, 2026],
    minMGA: 80_000_000,
    maxMGA: 250_000_000,
    models: SUV_STANDARD_MODELS,
    rationale: "SUV milieu de gamme neufs/quasi-neufs.",
  },
  {
    segmentKey: "suv_standard_2018_2022",
    segmentLabel: "SUV standard 2018-2022",
    yearRange: [2018, 2022],
    minMGA: 45_000_000,
    maxMGA: 150_000_000,
    models: SUV_STANDARD_MODELS,
    rationale: "SUV milieu de gamme 4-7 ans.",
  },
  {
    segmentKey: "suv_standard_2010_2017",
    segmentLabel: "SUV standard 2010-2017",
    yearRange: [2010, 2017],
    minMGA: 20_000_000,
    maxMGA: 80_000_000,
    models: SUV_STANDARD_MODELS,
    rationale: "SUV milieu de gamme 8-15 ans : décote standard.",
  },

  // ===== BERLINE/CITADINE =====
  {
    segmentKey: "compact_sedan_recent",
    segmentLabel: "Berline/citadine 2023+",
    yearRange: [2023, 2026],
    minMGA: 40_000_000,
    maxMGA: 130_000_000,
    models: COMPACT_SEDAN_MODELS,
    rationale: "Compactes courantes Mada neuves/quasi-neuves.",
  },
  {
    segmentKey: "compact_sedan_2018_2022",
    segmentLabel: "Berline/citadine 2018-2022",
    yearRange: [2018, 2022],
    minMGA: 22_000_000,
    maxMGA: 75_000_000,
    models: COMPACT_SEDAN_MODELS,
    rationale: "Compactes 4-7 ans : tranche médiane Mada.",
  },
  {
    segmentKey: "compact_sedan_2010_2017",
    segmentLabel: "Berline/citadine 2010-2017",
    yearRange: [2010, 2017],
    minMGA: 10_000_000,
    maxMGA: 45_000_000,
    models: COMPACT_SEDAN_MODELS,
    rationale: "Compactes 8-15 ans : occasion courante Mada.",
  },
];

/**
 * Trouve le bound applicable pour un véhicule donné.
 * Lookup case-insensitive sur (make, model). Premier match gagne.
 *
 * @returns null si aucun bound ne couvre ce make+model+year
 */
export function findSanityBound(make: string, model: string, year: number): SanityBound | null {
  const targetKey = `${make}|${model}`.toLowerCase();
  for (const bound of SANITY_BOUNDS) {
    if (year < bound.yearRange[0] || year > bound.yearRange[1]) continue;
    for (const m of bound.models) {
      if (m.toLowerCase() === targetKey) return bound;
    }
  }
  return null;
}

export type SanityCheckAction =
  | "kept"
  | "raised_to_floor"
  | "lowered_to_ceiling"
  | "no_bound";

export interface SanityCheckResult {
  inBounds: boolean;
  adjustedEstimate: number;
  originalEstimate: number;
  bound: SanityBound | null;
  action: SanityCheckAction;
  warning: string | null;
}

function formatM(value: number): string {
  return `${(value / 1_000_000).toFixed(1)}M`;
}

/**
 * Vérifie l'estimation contre les bornes du segment+année.
 * Si hors borne, ajuste vers le plancher/plafond et émet un warning.
 *
 * Le caller (engine.ts) est responsable de :
 *   - Appliquer `adjustedEstimate` à la place de `originalEstimate`
 *   - Recalculer la fourchette (lowEstimate/highEstimate) avec le ratio
 *   - Rabaisser le tier si l'ajustement a été fort
 *   - Réduire la confiance
 */
export function applySanityCheck(
  originalEstimate: number,
  make: string,
  model: string,
  year: number,
): SanityCheckResult {
  const bound = findSanityBound(make, model, year);

  if (!bound) {
    return {
      inBounds: true,
      adjustedEstimate: originalEstimate,
      originalEstimate,
      bound: null,
      action: "no_bound",
      warning: null,
    };
  }

  if (originalEstimate < bound.minMGA) {
    return {
      inBounds: false,
      adjustedEstimate: bound.minMGA,
      originalEstimate,
      bound,
      action: "raised_to_floor",
      warning: `Estimation calculée (${formatM(originalEstimate)}) sous le plancher segment "${bound.segmentLabel}" (${formatM(bound.minMGA)}). Plancher appliqué.`,
    };
  }

  if (originalEstimate > bound.maxMGA) {
    return {
      inBounds: false,
      adjustedEstimate: bound.maxMGA,
      originalEstimate,
      bound,
      action: "lowered_to_ceiling",
      warning: `Estimation calculée (${formatM(originalEstimate)}) au-dessus du plafond segment "${bound.segmentLabel}" (${formatM(bound.maxMGA)}). Plafond appliqué.`,
    };
  }

  return {
    inBounds: true,
    adjustedEstimate: originalEstimate,
    originalEstimate,
    bound,
    action: "kept",
    warning: null,
  };
}
