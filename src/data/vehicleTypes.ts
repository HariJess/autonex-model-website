/**
 * Catalogue des types de véhicules suggérés dans le formulaire
 * de publication et les filtres de recherche.
 *
 * Ces valeurs sont des SUGGESTIONS, pas des contraintes : la
 * colonne DB `listings.type` est en TEXT libre, l'utilisateur
 * peut saisir un type custom (camping-car, food-truck…) si les
 * suggestions ne couvrent pas son besoin.
 *
 * Normalisation : lowercase pour le stockage en base, affichage
 * via label.
 */

export type VehicleCategory =
  | "voiture"
  | "suv_4x4"
  | "utilitaire"
  | "deux_roues"
  | "nautique"
  | "autre";

export type VehicleTypeSuggestion = {
  value: string;
  label: string;
  category: VehicleCategory;
  popular?: boolean;
};

export const VEHICLE_TYPES: VehicleTypeSuggestion[] = [
  { value: "citadine", label: "Citadine", category: "voiture", popular: true },
  { value: "berline", label: "Berline", category: "voiture", popular: true },
  { value: "break", label: "Break", category: "voiture" },
  { value: "coupe", label: "Coupé", category: "voiture" },
  { value: "cabriolet", label: "Cabriolet", category: "voiture" },
  { value: "monospace", label: "Monospace", category: "voiture" },

  { value: "suv", label: "SUV", category: "suv_4x4", popular: true },
  { value: "4x4", label: "4x4", category: "suv_4x4", popular: true },
  { value: "pickup", label: "Pick-up", category: "suv_4x4", popular: true },

  { value: "fourgon", label: "Fourgon", category: "utilitaire" },
  { value: "camion", label: "Camion", category: "utilitaire" },
  { value: "minibus", label: "Minibus", category: "utilitaire" },

  { value: "moto", label: "Moto", category: "deux_roues", popular: true },
  { value: "scooter", label: "Scooter", category: "deux_roues" },
  { value: "quad", label: "Quad", category: "deux_roues" },

  { value: "bateau", label: "Bateau", category: "nautique" },
  { value: "jetski", label: "Jet-ski", category: "nautique" },

  { value: "autre", label: "Autre", category: "autre" },
];

/**
 * Groupes pour les filtres search. Plusieurs types peuvent être
 * mappés à un même groupe (ex : "suv_4x4_pickup" regroupe suv,
 * 4x4 et pickup pour un filtre plus large).
 */
export const VEHICLE_FILTER_GROUPS: Record<string, string[]> = {
  voitures: ["citadine", "berline", "break", "coupe", "cabriolet", "monospace"],
  suv_4x4_pickup: ["suv", "4x4", "pickup"],
  utilitaires: ["fourgon", "camion", "minibus"],
  deux_roues: ["moto", "scooter", "quad"],
  nautique: ["bateau", "jetski"],
};

/**
 * Mapping rétrocompat : anciennes valeurs immobilières encore
 * présentes en base ou dans certaines routes hardcodées. Permet
 * d'afficher proprement un listing legacy sans migration de
 * données.
 */
const LEGACY_IMMOBILIER_LABELS: Record<string, string> = {
  appartement: "Citadine",
  villa: "SUV / 4x4",
  maison: "Berline",
  terrain: "Moto",
  local_commercial: "Utilitaire",
  bureau: "Camion",
};

/**
 * Normalise une valeur de type saisie (trim + lowercase). À
 * utiliser au moment du submit pour éviter les doublons « SUV »
 * vs « Suv » vs « suv ».
 */
export function normalizeVehicleType(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Trouve le label d'affichage pour une valeur. Ordre de priorité :
 * 1) suggestion du catalogue, 2) mapping legacy immobilier, 3)
 *    fallback capitalisation de la saisie utilisateur.
 */
export function getVehicleTypeLabel(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.toLowerCase();
  const suggestion = VEHICLE_TYPES.find((t) => t.value === normalized);
  if (suggestion) return suggestion.label;
  const legacy = LEGACY_IMMOBILIER_LABELS[normalized];
  if (legacy) return legacy;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Retourne les suggestions populaires en premier, puis le reste
 * par ordre alphabétique.
 */
export function getSortedVehicleTypes(): VehicleTypeSuggestion[] {
  const popular = VEHICLE_TYPES.filter((t) => t.popular);
  const rest = VEHICLE_TYPES.filter((t) => !t.popular).sort((a, b) =>
    a.label.localeCompare(b.label, "fr")
  );
  return [...popular, ...rest];
}
