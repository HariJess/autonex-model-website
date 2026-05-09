/**
 * PROMPT 10E — Couche 2 : Comparables segment proche.
 *
 * Quand l'engine V2 ne trouve pas assez de comparables exacts (`make + model`),
 * il élargit la recherche aux modèles de la même famille (proxy), avec un
 * `priceFactorRange` qui ajuste les prix observés vers le modèle cible.
 *
 * Exemple : Toyota Land Cruiser Prado n'a aucun comparable en DB → on utilise
 * Toyota Land Cruiser comme proxy, avec un facteur ~0.97 (Prado vaut entre
 * 85% et 110% d'un Land Cruiser standard).
 *
 * Ce module est pure TS (pas d'import projet) pour pouvoir être mirrored
 * trivialement dans `supabase/functions/compute-estimation/modelProximity.ts`.
 */

export interface ModelProximityConfig {
  /** Liste de modèles proxy au format "Make|Model" (insensible à la casse côté lookup). */
  proxyModels: string[];
  /** Plage du multiplicateur prix [min, max] que vaut le modèle cible vs le proxy. */
  priceFactorRange: [number, number];
  /** Label humain pour audit/UI (ex: "Famille SUV/Pickup Toyota premium"). */
  proximityLabel: string;
}

/**
 * Configuration des familles de proximité par modèle.
 * Clé : "Make|Model" (case-sensitive — utiliser le casing canonique du catalogue).
 */
export const MODEL_PROXIMITY: Record<string, ModelProximityConfig> = {
  // ===== TOYOTA — SUV/Pickup premium =====
  "Toyota|Land Cruiser Prado": {
    proxyModels: [
      "Toyota|Land Cruiser",
      "Toyota|Hilux",
      "Toyota|4runner",
      "Toyota|Fortuner",
    ],
    priceFactorRange: [0.85, 1.10],
    proximityLabel: "Famille SUV/Pickup Toyota premium",
  },

  "Toyota|Land Cruiser": {
    proxyModels: [
      "Toyota|Land Cruiser Prado",
      "Toyota|Hilux",
      "Toyota|4runner",
      "Toyota|Fortuner",
    ],
    priceFactorRange: [0.95, 1.20],
    proximityLabel: "Famille SUV/Pickup Toyota premium",
  },

  "Toyota|4runner": {
    proxyModels: [
      "Toyota|Land Cruiser Prado",
      "Toyota|Land Cruiser",
      "Toyota|Fortuner",
    ],
    priceFactorRange: [0.85, 1.05],
    proximityLabel: "Famille SUV Toyota premium",
  },

  "Toyota|Fortuner": {
    proxyModels: [
      "Toyota|Land Cruiser Prado",
      "Toyota|Hilux",
      "Toyota|4runner",
      "Mitsubishi|Pajero",
    ],
    priceFactorRange: [0.80, 1.00],
    proximityLabel: "Famille SUV/Pickup premium",
  },

  "Toyota|Hilux": {
    proxyModels: [
      "Toyota|Land Cruiser Prado",
      "Toyota|Land Cruiser",
      "Toyota|Fortuner",
      "Mitsubishi|L200",
      "Ford|Ranger",
      "Nissan|Navara",
    ],
    priceFactorRange: [0.90, 1.15],
    proximityLabel: "Pickups premium Madagascar",
  },

  // ===== AUTRES PICKUPS =====
  "Mitsubishi|L200": {
    proxyModels: [
      "Toyota|Hilux",
      "Ford|Ranger",
      "Nissan|Navara",
      "Mitsubishi|Pajero",
    ],
    priceFactorRange: [0.85, 1.10],
    proximityLabel: "Pickups premium Madagascar",
  },

  "Ford|Ranger": {
    proxyModels: [
      "Toyota|Hilux",
      "Mitsubishi|L200",
      "Nissan|Navara",
      "Ford|Everest",
    ],
    priceFactorRange: [0.85, 1.10],
    proximityLabel: "Pickups premium Madagascar",
  },

  "Nissan|Navara": {
    proxyModels: [
      "Toyota|Hilux",
      "Mitsubishi|L200",
      "Ford|Ranger",
    ],
    priceFactorRange: [0.85, 1.05],
    proximityLabel: "Pickups premium Madagascar",
  },

  // ===== SUV PREMIUM AUTRES MARQUES =====
  "Mitsubishi|Pajero": {
    proxyModels: [
      "Toyota|Land Cruiser Prado",
      "Toyota|Fortuner",
      "Nissan|Patrol",
    ],
    priceFactorRange: [0.80, 1.00],
    proximityLabel: "Famille SUV premium",
  },

  "Nissan|Patrol": {
    proxyModels: [
      "Toyota|Land Cruiser",
      "Toyota|Land Cruiser Prado",
      "Mitsubishi|Pajero",
    ],
    priceFactorRange: [0.85, 1.05],
    proximityLabel: "Famille SUV premium",
  },

  "Ford|Everest": {
    proxyModels: [
      "Toyota|Fortuner",
      "Toyota|Land Cruiser Prado",
      "Mitsubishi|Pajero",
      "Ford|Ranger",
    ],
    priceFactorRange: [0.80, 1.00],
    proximityLabel: "Famille SUV/Pickup premium",
  },

  // ===== SUV STANDARD (pour cases où DB pauvre) =====
  "Hyundai|Tucson": {
    proxyModels: [
      "Hyundai|Santafe",
      "Kia|Sportage",
      "Kia|Sorento",
      "Toyota|Rav4",
    ],
    priceFactorRange: [0.90, 1.10],
    proximityLabel: "SUV milieu de gamme coréen/japonais",
  },

  "Hyundai|Santafe": {
    proxyModels: [
      "Hyundai|Tucson",
      "Kia|Sorento",
      "Toyota|Rav4",
    ],
    priceFactorRange: [0.95, 1.15],
    proximityLabel: "SUV milieu de gamme coréen/japonais",
  },

  "Kia|Sportage": {
    proxyModels: [
      "Hyundai|Tucson",
      "Kia|Sorento",
      "Toyota|Rav4",
    ],
    priceFactorRange: [0.90, 1.10],
    proximityLabel: "SUV milieu de gamme coréen/japonais",
  },

  "Kia|Sorento": {
    proxyModels: [
      "Hyundai|Santafe",
      "Kia|Sportage",
      "Toyota|Rav4",
    ],
    priceFactorRange: [0.95, 1.15],
    proximityLabel: "SUV milieu de gamme coréen/japonais",
  },

  "Toyota|Rav4": {
    proxyModels: [
      "Hyundai|Tucson",
      "Kia|Sportage",
      "Honda|Crv",
      "Mazda|Cx-5",
    ],
    priceFactorRange: [0.95, 1.15],
    proximityLabel: "SUV milieu de gamme",
  },

  "Honda|Crv": {
    proxyModels: [
      "Toyota|Rav4",
      "Hyundai|Tucson",
      "Mazda|Cx-5",
    ],
    priceFactorRange: [0.95, 1.10],
    proximityLabel: "SUV milieu de gamme",
  },

  "Mazda|Cx-5": {
    proxyModels: [
      "Toyota|Rav4",
      "Honda|Crv",
      "Hyundai|Tucson",
    ],
    priceFactorRange: [0.95, 1.10],
    proximityLabel: "SUV milieu de gamme",
  },

  // ===== Sprint engine v2 — extension full-size US + Toyota US + Lexus =====
  // Cf. brief 2026-05-06 : fix bug Tahoe + couverture catalogue marché Mada.
  // Casse des proxies alignée sur les clés existantes (ex: "Toyota|4runner")
  // pour cohérence visuelle ; le lookup est case-insensitive (findProxyModels).

  // SUV full-size US — proxy = SUV jap full-size existants (Land Cruiser/Patrol)
  "Chevrolet|Tahoe": {
    proxyModels: ["Toyota|Land Cruiser", "Nissan|Patrol"],
    priceFactorRange: [0.85, 1.15],
    proximityLabel: "SUV full-size US (équivalent body-on-frame premium)",
  },

  "Chevrolet|Suburban": {
    proxyModels: ["Toyota|Land Cruiser", "Nissan|Patrol"],
    priceFactorRange: [0.95, 1.25],
    proximityLabel: "SUV full-size US allongé (Tahoe + 8%)",
  },

  "GMC|Yukon": {
    proxyModels: ["Toyota|Land Cruiser", "Nissan|Patrol"],
    priceFactorRange: [0.90, 1.20],
    proximityLabel: "SUV full-size US (jumeau Tahoe positioning premium)",
  },

  "Ford|Expedition": {
    proxyModels: ["Toyota|Land Cruiser", "Nissan|Patrol"],
    priceFactorRange: [0.85, 1.15],
    proximityLabel: "SUV full-size US (concurrent direct Tahoe)",
  },

  "Toyota|Sequoia": {
    proxyModels: ["Toyota|Land Cruiser", "Nissan|Patrol"],
    priceFactorRange: [0.85, 1.15],
    proximityLabel: "SUV full-size Toyota US",
  },

  "Nissan|Armada": {
    proxyModels: ["Toyota|Land Cruiser", "Nissan|Patrol"],
    priceFactorRange: [0.80, 1.10],
    proximityLabel: "SUV full-size US (Patrol US-spec)",
  },

  // Pickups full-size US — proxy = pickups mid-size jap (Hilux/Ranger/Navara)
  // priceFactorRange élargi vers le haut : pickups full-size US sont
  // 30-40 % plus chers que les mid-size mid-class japonais.
  "Chevrolet|Silverado": {
    proxyModels: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"],
    priceFactorRange: [1.20, 1.60],
    proximityLabel: "Pickup full-size US (famille Silverado/Sierra)",
  },

  "GMC|Sierra": {
    proxyModels: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"],
    priceFactorRange: [1.20, 1.60],
    proximityLabel: "Pickup full-size US (jumeau Silverado)",
  },

  "Ford|F-150": {
    proxyModels: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"],
    priceFactorRange: [1.20, 1.60],
    proximityLabel: "Pickup full-size US (le plus vendu USA)",
  },

  "Dodge|Ram 1500": {
    proxyModels: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"],
    priceFactorRange: [1.20, 1.60],
    proximityLabel: "Pickup full-size US (concurrent F-150 / Silverado)",
  },

  "Toyota|Tundra": {
    proxyModels: ["Toyota|Hilux", "Ford|Ranger", "Nissan|Navara"],
    priceFactorRange: [1.30, 1.70],
    proximityLabel: "Pickup full-size Toyota US (Tundra haut de gamme)",
  },

  // Lifestyle 4×4 — proxy = SUV mid-size off-road (4Runner/Pajero)
  // Décote lente, positionnement lifestyle premium.
  "Jeep|Wrangler": {
    proxyModels: ["Toyota|4runner", "Mitsubishi|Pajero"],
    priceFactorRange: [1.30, 1.70],
    proximityLabel: "Lifestyle 4×4 premium (Wrangler iconique)",
  },

  "Jeep|Gladiator": {
    proxyModels: ["Toyota|Hilux", "Ford|Ranger", "Mitsubishi|L200"],
    priceFactorRange: [1.30, 1.70],
    proximityLabel: "Pickup lifestyle 4×4 (Wrangler-based)",
  },

  "Jeep|Grand Cherokee": {
    proxyModels: ["Toyota|Land Cruiser Prado", "Toyota|4runner"],
    priceFactorRange: [0.90, 1.20],
    proximityLabel: "SUV mid-size premium (concurrent Prado)",
  },

  // Lexus LX — proxy = Land Cruiser (sister technique Toyota)
  // LX = Land Cruiser luxury : +50-90 % prix.
  "Lexus|LX": {
    proxyModels: ["Toyota|Land Cruiser"],
    priceFactorRange: [1.50, 1.90],
    proximityLabel: "SUV ultra-premium (Land Cruiser luxury sister)",
  },
};

/**
 * Cherche la config de proximité pour un véhicule donné.
 * Le lookup est case-insensitive : on normalise make+model en lowercase pour
 * absorber les variations de casing en DB.
 *
 * @returns null si aucun modèle proxy n'est défini pour ce make+model
 */
export function findProxyModels(make: string, model: string): ModelProximityConfig | null {
  const targetKey = `${make}|${model}`.toLowerCase();
  for (const [k, v] of Object.entries(MODEL_PROXIMITY)) {
    if (k.toLowerCase() === targetKey) return v;
  }
  return null;
}

/**
 * Calcule le facteur prix médian d'une config (moyenne du range).
 * Ce facteur s'applique au `price_mga` brut d'un comparable proxy pour le
 * convertir en équivalent du modèle cible.
 *
 * Ex: si Prado vaut [0.85, 1.10] d'un Land Cruiser, on multiplie chaque prix
 * Land Cruiser observé par 0.975 pour obtenir une valeur équivalente Prado.
 */
export function proximityFactorMid(config: ModelProximityConfig): number {
  return (config.priceFactorRange[0] + config.priceFactorRange[1]) / 2;
}

/**
 * Plafond similarité pour les comparables proxy (vs 100 pour exact).
 * Permet de dégrader le score sans le mettre à 0 (les proxy restent utiles).
 */
export const PROXIMITY_SIMILARITY_CEILING = 75;
