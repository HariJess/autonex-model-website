/**
 * Listing.type est désormais un TEXT libre en base (migration
 * Lot 8) — fini l'enum immobilier rigide. Le catalogue officiel
 * de suggestions vit dans `src/data/vehicleTypes.ts` et est
 * affiché via `getVehicleTypeLabel()`.
 *
 * Les constantes ci-dessous gardent leur nom historique pour
 * éviter un refacto massif des 20+ consommateurs, mais leur
 * sémantique a changé :
 * - LISTING_TYPES : tableau de valeurs legacy immobilières
 *   (rétrocompat — encore présentes sur des listings existants)
 *   + valeurs véhicule courantes.
 * - LISTING_TYPE_LABELS : lookup best-effort ; pour un rendu UI
 *   propre sur n'importe quelle valeur (y compris custom user),
 *   préférer `getVehicleTypeLabel()`.
 */
export const LISTING_TYPES = [
  "appartement",
  "villa",
  "maison",
  "terrain",
  "local_commercial",
  "bureau",
] as const;

export type ListingType = string;

/** Types for which bedroom / bathroom filters are usually irrelevant in search UI */
export const LISTING_TYPES_WITHOUT_ROOM_FILTERS: readonly string[] = [
  "terrain",
  "local_commercial",
  "bureau",
] as const;

/** Valeurs `listing_type` qui exposent les champs portes / sièges dans le formulaire de publication. */
export const LISTING_TYPES_WITH_DOORS_FIELDS: readonly string[] = ["appartement", "villa", "maison"];

export const LISTING_TYPE_LABELS: Record<string, string> = {
  appartement: "Citadine",
  villa: "SUV / 4x4",
  maison: "Berline",
  terrain: "Moto",
  local_commercial: "Utilitaire",
  bureau: "Camion",
};

export const LISTING_TYPE_LABELS_PLURAL: Record<string, string> = {
  appartement: "Citadines",
  villa: "SUV / 4x4",
  maison: "Berlines",
  terrain: "Motos",
  local_commercial: "Utilitaires",
  bureau: "Camions",
};

export const TRANSACTION_TYPES = ["vente", "location", "location_vacances"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  vente: "Acheter",
  location: "Location longue durée",
  location_vacances: "Location courte durée",
};

/**
 * Canonical vehicle-native business attributes used by the product.
 */
export type CanonicalVehicleInfo = {
  make: string | null;
  model: string | null;
  year: number | null;
  mileageKm: number | null;
  fuel: string | null;
  transmission: string | null;
  drivetrain: string | null;
  doors: number | null;
  bodyStyle: string | null;
  rentalMode: string | null;
  seats: number | null;
  exteriorColor: string | null;
  engineDisplacementL: number | null;
  interiorColor: string | null;
  availabilityStatus: string | null;
  isElectric: boolean;
  isHybrid: boolean;
  condition: "neuf" | "occasion" | null;
  sellerType: "concessionnaire" | "particulier" | null;
};

/**
 * Normalized listing for display across the app.
 * Works for both DB listings and seed data.
 */
export interface DisplayListing {
  id: string;
  title: string;
  description: string | null;
  type: ListingType;
  transaction: TransactionType;
  price_mga: number;
  original_price_mga?: number | null;
  price_eur: number | null;
  negotiable?: boolean;
  ville: string | null;
  region: string | null;
  arrondissement: string | null;
  quartier: string | null;
  quartier_libre: string | null;
  lat: number | null;
  lng: number | null;
  features: string[];
  images: string[];
  status: string | null;
  views_count: number | null;
  created_at: string | null;
  /** Nullable since Mission 5.0 (ON DELETE SET NULL — RGPD right-to-erasure). */
  owner_id: string | null;
  // optional display fields
  owner_name?: string | null;
  owner_phone?: string | null;
  /** True when agency or owner has a phone on file (WhatsApp CTA). */
  has_whatsapp_contact?: boolean;
  agency_name?: string | null;
  agency_slug?: string | null;
  agency_logo?: string | null;
  agency_verified?: boolean;
  badge?: "boost" | "coup_de_coeur" | "nouveau" | "urgent" | null;
  video_url?: string | null;
  virtual_tour_url?: string | null;
  internal_ref?: string | null;
  is_new_program?: boolean | null;
  rejection_reason?: string | null;
  /** Boost types requested at publish; applied after moderation when listing goes live */
  pending_boost_types?: string[];
  /**
   * Score for search « Plus récent » ordering: combines active boosts (top, featured, daily_bump, urgent)
   * with listing creation / bump recency. Higher = shown first.
   */
  visibility_rank_score?: number;
  /** Canonical vehicle attributes adapter (product truth layer). */
  vehicle?: CanonicalVehicleInfo;
}
