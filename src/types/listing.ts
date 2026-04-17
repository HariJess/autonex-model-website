/**
 * Canonical listing types — single source of truth.
 * These match the DB enum `listing_type` exactly.
 */
export const LISTING_TYPES = [
  "appartement",
  "villa",
  "maison",
  "terrain",
  "local_commercial",
  "bureau",
] as const;

export type ListingType = (typeof LISTING_TYPES)[number];

/** Types for which bedroom / bathroom filters are usually irrelevant in search UI */
export const LISTING_TYPES_WITHOUT_ROOM_FILTERS: readonly ListingType[] = [
  "terrain",
  "local_commercial",
  "bureau",
] as const;

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  appartement: "Citadine",
  villa: "SUV / 4x4",
  maison: "Berline",
  terrain: "Moto",
  local_commercial: "Utilitaire",
  bureau: "Camion",
};

export const LISTING_TYPE_LABELS_PLURAL: Record<ListingType, string> = {
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
  surface: number | null;
  rooms: number | null;
  bathrooms: number | null;
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
  owner_id: string;
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
  toilets?: number | null;
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
  /** Frontend vehicle-native view model derived from legacy listing fields. */
  vehicle?: {
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
}
