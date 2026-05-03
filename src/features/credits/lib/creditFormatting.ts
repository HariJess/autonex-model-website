/**
 * Helpers de formatage côté UI pour les crédits AutoNex.
 *
 * Ratio strict 1 crédit = 1 Ariary, donc formatCredits et formatAriary
 * formatent un nombre identique mais avec un suffixe différent. La distinction
 * sémantique reste utile : "127 500 crédits" dans le wallet, "127 500 Ar"
 * dans la facturation/checkout.
 *
 * `describeCreditCost(key)` retourne un libellé FR pour les clés
 * `credit_pricing.key` connues. Utilisé par les tooltips/dialogs.
 */

import {
  BOOST_CREDIT_COSTS,
  BOOST_COSTS_V2,
  CREDIT_PACK_BONUSES,
  LISTING_PUBLISH_60D_CREDIT_COST,
  LISTING_PUBLISH_CREDIT_COST,
  LISTING_RENEWAL_CREDIT_COST,
  SIGNUP_BONUS_CREDIT_AMOUNT,
  VERIFIED_SELLER_YEAR_CREDIT_COST,
  type BoostV2Key,
  type CreditPackId,
  type PurchasableBoostType,
} from "@/config/monetization";

const FR_NUMBER_FORMATTER = new Intl.NumberFormat("fr-MG", {
  maximumFractionDigits: 0,
});

/**
 * Formate un nombre de crédits avec séparateur fr-MG.
 * Exemple : `formatCredits(127500)` → `"127 500 crédits"` (singular géré pour ≤1).
 */
export function formatCredits(n: number): string {
  if (!Number.isFinite(n)) return "0 crédit";
  const rounded = Math.round(n);
  const word = Math.abs(rounded) <= 1 ? "crédit" : "crédits";
  return `${FR_NUMBER_FORMATTER.format(rounded)} ${word}`;
}

/**
 * Formate un montant en Ariary.
 * Exemple : `formatAriary(127500)` → `"127 500 Ar"`.
 *
 * Note : la version dans `@/config/monetization` est conservée pour
 * compat existante. Celle-ci utilise le même `Intl.NumberFormat` cached.
 */
export function formatAriary(amount: number): string {
  if (!Number.isFinite(amount)) return "0 Ar";
  return `${FR_NUMBER_FORMATTER.format(Math.round(amount))} Ar`;
}

// =============================================================================
// describeCreditCost — labels FR par clé credit_pricing
// =============================================================================

/**
 * Clés exposées par `credit_pricing` (table DB), alignées avec PROMPT 1+2.
 * Keep in sync with le seed de credit_pricing.
 */
export type PricingKey =
  | "publish_listing"
  | "publish_listing_60d"
  | "renewal_listing"
  | "boost_urgent"
  | "boost_daily_bump"
  | "boost_featured"
  | "boost_top"
  | "boost_bump"
  | "boost_top_ad"
  | "boost_combo"
  | "boost_video"
  | "boost_express_pack"
  | "agency_spotlight"
  | "verified_seller_year"
  | "signup_bonus";

const PRICING_LABELS_FR: Record<PricingKey, string> = {
  publish_listing: "Publication d'annonce (30 jours)",
  publish_listing_60d: "Publication d'annonce (60 jours)",
  renewal_listing: "Renouvellement d'annonce (30 jours)",
  boost_urgent: "Badge Urgent (14 jours)",
  boost_daily_bump: "Actualisation quotidienne (7 jours)",
  boost_featured: "À la une (14 jours)",
  boost_top: "Top annonce (7 jours)",
  boost_bump: "Remontée ponctuelle",
  boost_top_ad: "Top Annonce (30 jours)",
  boost_combo: "Pack Combo (À la une + Top)",
  boost_video: "Vidéo annonce",
  boost_express_pack: "Vente Express",
  agency_spotlight: "Visibilité agence (30 jours)",
  verified_seller_year: "Verified Seller Badge (12 mois)",
  signup_bonus: "Crédits offerts à l'inscription",
};

/**
 * Retourne le libellé FR pour une clé `credit_pricing`. Utilisé dans
 * les tooltips, dialogs d'achat, transcripts ledger.
 *
 * Inconnue → retourne la clé telle quelle (fallback non-fatal).
 */
export function describeCreditCost(key: PricingKey | string): string {
  return (PRICING_LABELS_FR as Record<string, string>)[key] ?? key;
}

// =============================================================================
// Helpers dérivés
// =============================================================================

/** Concatène montant + libellé pour les tooltips. Exemple : "25 000 crédits — Publication d'annonce (30 jours)". */
export function describeCreditCostWithAmount(key: PricingKey, amount: number): string {
  return `${formatCredits(amount)} — ${describeCreditCost(key)}`;
}

/** Helper pour afficher le bonus d'un pack : "Pack Standard : 25 000 + 2 500 bonus = 27 500 crédits". */
export function describePackBreakdown(packId: CreditPackId): string {
  const pack = CREDIT_PACK_BONUSES[packId];
  if (!pack) return packId;
  if (pack.bonus === 0) return formatCredits(pack.total);
  return `${formatCredits(pack.base)} + ${formatCredits(pack.bonus)} bonus = ${formatCredits(pack.total)}`;
}

/**
 * Re-exports utiles pour les composants UI qui n'ont besoin que des constantes
 * locales (évite un double import config + features).
 */
export const CREDIT_FALLBACKS = {
  publishListing: LISTING_PUBLISH_CREDIT_COST,
  publishListing60d: LISTING_PUBLISH_60D_CREDIT_COST,
  renewalListing: LISTING_RENEWAL_CREDIT_COST,
  signupBonus: SIGNUP_BONUS_CREDIT_AMOUNT,
  verifiedSellerYear: VERIFIED_SELLER_YEAR_CREDIT_COST,
} as const;

export const BOOST_FALLBACKS = {
  legacy: BOOST_CREDIT_COSTS,
  v2: BOOST_COSTS_V2,
} as const;

export type { BoostV2Key, CreditPackId, PurchasableBoostType };
