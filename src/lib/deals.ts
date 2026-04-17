import type { DisplayListing } from "@/types/listing";

export type DealMeta = {
  originalPriceMga: number;
  discountPercent: number;
};

export function getDealMeta(listing: DisplayListing): DealMeta | null {
  const current = listing.price_mga;
  const original = listing.original_price_mga ?? null;
  if (!Number.isFinite(current) || current <= 0) return null;
  if (!Number.isFinite(original) || original == null || original <= current) return null;
  const rawPercent = ((original - current) / original) * 100;
  if (!Number.isFinite(rawPercent) || rawPercent <= 0) return null;
  return {
    originalPriceMga: original,
    discountPercent: Math.round(rawPercent),
  };
}
