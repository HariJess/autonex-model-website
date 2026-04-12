/**
 * Central monetization config — credit packs (Ar), publication cost, boosts, agency products.
 * Adjust prices here; DB `credit_packs` should stay in sync via migrations.
 */

/** Standard listing submission (moderation included). */
export const LISTING_PUBLISH_CREDIT_COST = 100;

/** Paid boosts applied after moderation when inventory allows (stored in `pending_boost_types`). */
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

/** Agency-level visibility (agencies only); billed at publish like boosts. */
export const AGENCY_SPOTLIGHT_CREDIT_COST = 120;

export function totalBoostCredits(selected: PurchasableBoostType[]): number {
  return selected.reduce((sum, k) => sum + BOOST_CREDIT_COSTS[k], 0);
}

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
  searchTopBanner: true,
  searchSponsoredCard: true,
  searchSidebar: true,
  searchFeaturedAgencies: true,
  listingSponsor: true,
  listingPartner: true,
  listingRelatedPromoted: true,
  agencyStrip: true,
} as const;
