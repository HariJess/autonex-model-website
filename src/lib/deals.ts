import type { DisplayListing } from "@/types/listing";

export type DealMeta = {
  originalPriceMga: number;
  discountPercent: number;
  /**
   * `true` si c'est un deal officiel activé via le bouton vendeur (sprint 1) :
   * snapshot contractuel `deal_*` actif, garantie de prix 30 jours après la
   * fin via le trigger `enforce_deal_price_lock`.
   *
   * `false` si c'est une baisse spontanée legacy (lecture de
   * `original_price_mga` seul, pas de garantie temporelle).
   */
  isVerified: boolean;
  /**
   * ISO timestamp de fin de deal officiel — null pour une baisse legacy.
   * Sert au composant DealStatusBadge sur le dashboard vendeur, et plus tard
   * au compte à rebours « se termine dans X jours » côté acheteur.
   */
  endsAt: string | null;
};

/**
 * Extrait les métadonnées de deal d'une annonce.
 *
 * Priorité de lecture :
 *
 *   1. **Deal officiel actif** (`deal_active = true` ET `deal_ends_at >
 *      now()` ET snapshots remplis) → `{ isVerified: true, endsAt: ISO }`.
 *      Le `endsAt` futur sert de défense en profondeur pendant que le cron
 *      sprint 3 désactive les expirés.
 *
 *   2. **Baisse spontanée legacy** (`original_price_mga` rempli,
 *      strictement supérieur au `price_mga` courant) →
 *      `{ isVerified: false, endsAt: null }`. C'est le comportement
 *      historique avant la feature deals.
 *
 * Retourne `null` si aucune des deux conditions n'est satisfaite.
 */
export function getDealMeta(listing: DisplayListing): DealMeta | null {
  const current = listing.price_mga;
  if (!Number.isFinite(current) || current <= 0) return null;

  // Priorité 1 — deal officiel actif
  if (
    listing.deal_active === true &&
    listing.deal_original_price_mga != null &&
    listing.deal_discount_percent != null &&
    listing.deal_ends_at
  ) {
    const dealOriginal = Number(listing.deal_original_price_mga);
    if (Number.isFinite(dealOriginal) && dealOriginal > current) {
      const endsAtMs = new Date(listing.deal_ends_at).getTime();
      if (Number.isFinite(endsAtMs) && endsAtMs > Date.now()) {
        return {
          originalPriceMga: dealOriginal,
          discountPercent: listing.deal_discount_percent,
          isVerified: true,
          endsAt: listing.deal_ends_at,
        };
      }
    }
  }

  // Priorité 2 — fallback baisse spontanée legacy
  const original = listing.original_price_mga ?? null;
  if (original == null) return null;
  const originalNum = Number(original);
  if (!Number.isFinite(originalNum) || originalNum <= current) return null;
  const rawPercent = ((originalNum - current) / originalNum) * 100;
  if (!Number.isFinite(rawPercent) || rawPercent <= 0) return null;
  const discount = Math.round(rawPercent);
  if (discount < 1) return null;

  return {
    originalPriceMga: originalNum,
    discountPercent: discount,
    isVerified: false,
    endsAt: null,
  };
}
