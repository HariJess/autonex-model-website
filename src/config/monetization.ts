/**
 * Central monetization config — credit packs (Ar), publication cost, boosts, agency products.
 *
 * The six credit prices below (LISTING_PUBLISH_CREDIT_COST, BOOST_CREDIT_COSTS,
 * AGENCY_SPOTLIGHT_CREDIT_COST) are FALLBACK VALUES ONLY. The source of truth is
 * the DB `credit_pricing` table, exposed to the front via the get_pricing RPC
 * and consumed through the usePricing hook (src/hooks/usePricing.ts). The
 * fallback keeps the UI functional during the initial query and on unstable
 * networks; server-side RPCs (publish_listing_with_credits,
 * purchase_listing_boosts) always read from the DB directly.
 *
 * When prices change, update BOTH the DB (via a new migration or an admin
 * UPDATE) AND this file, so the fallback stays aligned with production.
 */

/** Fallback only — see usePricing for live value. */
export const LISTING_PUBLISH_CREDIT_COST = 100;

/** Fallback only — see usePricing for live values. */
export const BOOST_CREDIT_COSTS = {
  urgent: 20,
  daily_bump: 30,
  featured: 40,
  top: 60,
} as const;

export type PurchasableBoostType = keyof typeof BOOST_CREDIT_COSTS;

/** Order shown in publish flow (cheapest → premium feel). */
export const BOOST_ORDER: PurchasableBoostType[] = ["urgent", "daily_bump", "featured", "top"];

/** French labels for UI (publish, dashboard, tooltips). */
export const BOOST_LABELS_FR: Record<PurchasableBoostType, string> = {
  urgent: "Badge Urgent",
  daily_bump: "Actualisation quotidienne",
  featured: "Annonce mise en avant",
  top: "Top annonce",
};

/** Duration in days — must match `purchase_listing_boosts` and `admin_approve_listing_moderation` SQL. */
export const BOOST_DURATION_DAYS: Record<PurchasableBoostType, number> = {
  urgent: 14,
  daily_bump: 7,
  featured: 14,
  top: 7,
};

/** Short French copy: what the boost changes for visibility (dashboard / purchase dialog). */
export const BOOST_VISIBILITY_FR: Record<PurchasableBoostType, string> = {
  urgent:
    "Badge « Urgent » sur la carte et la fiche : votre annonce se distingue tout de suite.",
  daily_bump: "Remonte régulièrement votre annonce dans les listes pour rester visible.",
  featured: "Mise en avant visuelle (emplacements premium) pour plus de clics.",
  top: "Priorité maximale dans les résultats pendant la durée du boost.",
};

/** Fallback only — see usePricing for live value. */
export const AGENCY_SPOTLIGHT_CREDIT_COST = 120;

/** Fallback-backed helper. Components that need live prices should call usePricing().totalBoosts. */
export function totalBoostCredits(selected: PurchasableBoostType[]): number {
  return selected.reduce((sum, k) => sum + BOOST_CREDIT_COSTS[k], 0);
}

/** Fallback-backed helper. Components that need live prices should call usePricing().totalPublication. */
export function totalPublicationCredits(
  selected: PurchasableBoostType[],
  options?: { agencySpotlight?: boolean },
): number {
  let sum = LISTING_PUBLISH_CREDIT_COST + totalBoostCredits(selected);
  if (options?.agencySpotlight) sum += AGENCY_SPOTLIGHT_CREDIT_COST;
  return sum;
}

/** Canonical launch packs (Ariary). IDs match DB `credit_packs.id`. */
export const CREDIT_PACKS_CANONICAL = [
  { id: "cp_200", name: "Pack 200 crédits", credits_amount: 200, price_mga: 25_000, sort_order: 1 },
  { id: "cp_400", name: "Pack 400 crédits", credits_amount: 400, price_mga: 45_000, sort_order: 2 },
  { id: "cp_600", name: "Pack 600 crédits", credits_amount: 600, price_mga: 65_000, sort_order: 3 },
  { id: "cp_800", name: "Pack 800 crédits", credits_amount: 800, price_mga: 85_000, sort_order: 4 },
  { id: "cp_1000", name: "Pack 1000 crédits", credits_amount: 1000, price_mga: 100_000, sort_order: 5 },
] as const;

export type CanonicalCreditPack = (typeof CREDIT_PACKS_CANONICAL)[number];

export function formatAriary(amount: number): string {
  return `${amount.toLocaleString("fr-MG")} Ar`;
}

/** Feature flags for ad slots (toggle without removing components). */
export const MONETIZATION_PLACEMENTS = {
  homeSponsorStrip: true,
  homeBillboard: true,
  homeFeaturedRail: true,
  homeNativeMid: true,
  homeModal: true,
  searchTopBanner: true,
  searchSponsoredCard: true,
  searchSidebar: true,
  searchFeaturedAgencies: true,
  listingSponsor: true,
  listingPartner: true,
  listingRelatedPromoted: true,
  agencyStrip: true,
} as const;

export type MonetizationPlacementKey = keyof typeof MONETIZATION_PLACEMENTS;
export type MonetizationSlotFamily = "agency_listing" | "partner_advertising" | "neutral";

/**
 * Slot taxonomy for public surfaces.
 * - agency_listing: credit/boost/agency visibility tied to real-estate workflows.
 * - partner_advertising: external brand campaigns (banks, insurance, brand media).
 * - neutral: editorial/recommendation blocks (not sold as ads directly).
 */
export const MONETIZATION_SLOT_META: Record<
  MonetizationPlacementKey,
  { family: MonetizationSlotFamily; label: string }
> = {
  homeSponsorStrip: { family: "partner_advertising", label: "Home sponsor strip" },
  homeBillboard: { family: "partner_advertising", label: "Home billboard" },
  homeFeaturedRail: { family: "agency_listing", label: "Home featured listings rail" },
  homeNativeMid: { family: "partner_advertising", label: "Home native partner block" },
  homeModal: { family: "partner_advertising", label: "Home popup modal" },
  searchTopBanner: { family: "partner_advertising", label: "Search top banner" },
  searchSponsoredCard: { family: "partner_advertising", label: "Search sponsored native card" },
  searchSidebar: { family: "agency_listing", label: "Search sidebar credits upsell" },
  searchFeaturedAgencies: { family: "agency_listing", label: "Search featured agencies" },
  listingSponsor: { family: "partner_advertising", label: "Listing sponsor block" },
  listingPartner: { family: "agency_listing", label: "Listing partner agencies strip" },
  listingRelatedPromoted: { family: "neutral", label: "Listing related suggestions" },
  agencyStrip: { family: "agency_listing", label: "Agency visibility strip" },
};
