/**
 * Central monetization config — credit packs (Ar), publication cost, boosts, agency products.
 *
 * Ratio actuel : 1 crédit = 1 Ariary (PROMPT 1 du 2026-05-03, commit 994e7f1).
 *
 * Les valeurs ci-dessous sont des FALLBACKS uniquement. La source de vérité est la
 * table DB `credit_pricing`, exposée au front via la RPC get_pricing et consommée
 * via le hook usePricing (src/hooks/usePricing.ts). Le fallback garde l'UI fonctionnelle
 * pendant la requête initiale et sur réseau instable ; les RPCs server-side
 * (publish_listing_with_credits, purchase_listing_boosts, service_approve_provider_transaction)
 * lisent toujours depuis la DB directement.
 *
 * Quand les prix changent, mettre à jour À LA FOIS la DB (via une nouvelle migration ou
 * un UPDATE admin) ET ce fichier, pour que le fallback reste aligné avec la prod.
 */

// =============================================================================
// COÛTS UNITAIRES (fallbacks pour usePricing)
// =============================================================================

/** Fallback only — see usePricing for live value. Source : credit_pricing.publish_listing */
export const LISTING_PUBLISH_CREDIT_COST = 25_000;

/** Fallback only — see usePricing for live value. Source : credit_pricing.publish_listing_60d */
export const LISTING_PUBLISH_60D_CREDIT_COST = 40_000;

/** Fallback only — see usePricing for live value. Source : credit_pricing.renewal_listing */
export const LISTING_RENEWAL_CREDIT_COST = 15_000;

/**
 * Fallback only — boosts legacy mappés sur boost_type historique.
 * Les valeurs viennent de credit_pricing (boost_urgent, boost_daily_bump, etc.).
 *
 * @deprecated Utilise BOOST_COSTS_V2 pour les nouveaux flows. Cette constante
 * reste pour publish_listing_with_credits et purchase_listing_boosts qui
 * utilisent encore les anciens boost_type.
 */
export const BOOST_CREDIT_COSTS = {
  urgent: 20,        // Inchangé — non touché par PROMPT 1
  daily_bump: 5_000, // Aligné avec credit_pricing.boost_daily_bump
  featured: 30_000,  // Aligné avec credit_pricing.boost_featured
  top: 100_000,      // Aligné avec credit_pricing.boost_top
} as const;

export type PurchasableBoostType = keyof typeof BOOST_CREDIT_COSTS;

/**
 * Nouveaux boost types V2 (PROMPT 1) — pas encore acceptés par
 * purchase_listing_boosts (sera traité au PROMPT 4).
 */
export const BOOST_COSTS_V2 = {
  bump: 5_000,           // credit_pricing.boost_bump
  featured_7d: 30_000,   // credit_pricing.boost_featured (alias sémantique 7j)
  top_ad_30d: 100_000,   // credit_pricing.boost_top_ad
  combo: 120_000,        // credit_pricing.boost_combo (À la une + Top)
  video: 15_000,         // credit_pricing.boost_video
  express_pack: 60_000,  // credit_pricing.boost_express_pack
} as const;

export type BoostV2Key = keyof typeof BOOST_COSTS_V2;

/** Verified Seller Badge — coût annuel. Source : credit_pricing.verified_seller_year */
export const VERIFIED_SELLER_YEAR_CREDIT_COST = 75_000;

/** Crédits offerts au signup. Source : credit_pricing.signup_bonus */
export const SIGNUP_BONUS_CREDIT_AMOUNT = 100_000;

/** Order shown in publish flow (cheapest → premium feel). Mapping legacy. */
export const BOOST_ORDER: PurchasableBoostType[] = ["urgent", "daily_bump", "featured", "top"];

/** French labels for UI (publish, dashboard, tooltips). Mapping legacy. */
export const BOOST_LABELS_FR: Record<PurchasableBoostType, string> = {
  urgent: "Badge Urgent",
  daily_bump: "Actualisation quotidienne",
  featured: "Annonce mise en avant",
  top: "Top annonce",
};

/** French labels for V2 boosts. */
export const BOOST_V2_LABELS_FR: Record<BoostV2Key, string> = {
  bump: "Remontée",
  featured_7d: "À la une (7 jours)",
  top_ad_30d: "Top Annonce (30 jours)",
  combo: "Pack Combo (À la une + Top)",
  video: "Vidéo annonce",
  express_pack: "Vente Express",
};

/** Duration in days — must match `purchase_listing_boosts` and `admin_approve_listing_moderation` SQL. */
export const BOOST_DURATION_DAYS: Record<PurchasableBoostType, number> = {
  urgent: 14,
  daily_bump: 7,
  featured: 14,
  top: 7,
};

export const BOOST_V2_DURATION_DAYS: Record<BoostV2Key, number | null> = {
  bump: null,        // ponctuel (~48-72h)
  featured_7d: 7,
  top_ad_30d: 30,
  combo: 30,
  video: 30,
  express_pack: 30,
};

/** Short French copy: what the boost changes for visibility. */
export const BOOST_VISIBILITY_FR: Record<PurchasableBoostType, string> = {
  urgent:
    "Badge « Urgent » sur la carte et la fiche : votre annonce se distingue tout de suite.",
  daily_bump: "Remonte régulièrement votre annonce dans les listes pour rester visible.",
  featured: "Mise en avant visuelle (emplacements premium) pour plus de clics.",
  top: "Priorité maximale dans les résultats pendant la durée du boost.",
};

/** Fallback only — see usePricing for live value. Source : credit_pricing.agency_spotlight (inchangé PROMPT 1) */
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

// =============================================================================
// PACKS — 4 packs au ratio 1:1 (PROMPT 1)
// =============================================================================

/**
 * Catalogue canonical des packs. IDs match DB `credit_packs.id` (post-PROMPT 1).
 * Total délivré au paiement = credits_amount + bonus_credits.
 */
export const CREDIT_PACKS_CANONICAL = [
  {
    id: "discover",
    name: "Pack Découverte",
    credits_amount: 10_000,
    bonus_credits: 0,
    price_mga: 10_000,
    sort_order: 1,
  },
  {
    id: "standard",
    name: "Pack Standard",
    credits_amount: 25_000,
    bonus_credits: 2_500,
    price_mga: 25_000,
    sort_order: 2,
  },
  {
    id: "pro",
    name: "Pack Pro",
    credits_amount: 50_000,
    bonus_credits: 10_000,
    price_mga: 50_000,
    sort_order: 3,
  },
  {
    id: "power",
    name: "Pack Power",
    credits_amount: 100_000,
    bonus_credits: 30_000,
    price_mga: 100_000,
    sort_order: 4,
  },
] as const;

export type CanonicalCreditPack = (typeof CREDIT_PACKS_CANONICAL)[number];
export type CreditPackId = CanonicalCreditPack["id"];

/** Quick-access map id → bonuses (utile pour drift detector + UI). */
export const CREDIT_PACK_BONUSES: Record<
  CreditPackId,
  { base: number; bonus: number; total: number; bonusPct: number }
> = {
  discover: { base: 10_000, bonus: 0, total: 10_000, bonusPct: 0 },
  standard: { base: 25_000, bonus: 2_500, total: 27_500, bonusPct: 10 },
  pro: { base: 50_000, bonus: 10_000, total: 60_000, bonusPct: 20 },
  power: { base: 100_000, bonus: 30_000, total: 130_000, bonusPct: 30 },
};

// =============================================================================
// LIFECYCLE — durées listings + grants
// =============================================================================

/** Durée par défaut d'une annonce (days). Doit matcher listings.listing_duration_days DEFAULT. */
export const LISTING_DURATION_DAYS_DEFAULT = 30;

/** Durée alternative payante. Source : credit_pricing.publish_listing_60d. */
export const LISTING_DURATION_DAYS_EXTENDED = 60;

/** Fenêtre J-N avant expiration où status passe à 'expiring_soon'. Doit matcher expire_listings_lifecycle. */
export const LISTING_EXPIRING_SOON_THRESHOLD_DAYS = 7;

/** Durée de validité du signup grant (days). Doit matcher grant_signup_bonus_for_user. */
export const SIGNUP_GRANT_EXPIRY_DAYS = 90;

/** Durée du Verified Seller Badge (days). Doit matcher la RPC verification_approve (PROMPT 7). */
export const VERIFIED_SELLER_BADGE_DURATION_DAYS = 365;

// =============================================================================
// FORMATTING — helpers de présentation
// =============================================================================

/** Formate un montant Ariary avec séparateur fr-MG. */
export function formatAriary(amount: number): string {
  return `${amount.toLocaleString("fr-MG")} Ar`;
}

// =============================================================================
// FEATURE FLAGS — placements monétisation (slots ads)
// =============================================================================

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
