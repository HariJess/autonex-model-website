import { LISTING_TYPES, type ListingType, type TransactionType, TRANSACTION_TYPES } from "@/types/listing";

const RENTAL: TransactionType[] = ["location", "location_vacances"];

/** Terrain cannot be offered for rent or holiday rent (Madagascar-wide rule). */
export function isTerrainRentalForbidden(transaction: string, type: string): boolean {
  return type === "terrain" && RENTAL.includes(transaction as TransactionType);
}

export function listingTypesForTransaction(transaction: string): ListingType[] {
  if (!transaction || RENTAL.includes(transaction as TransactionType)) {
    return LISTING_TYPES.filter((t) => t !== "terrain");
  }
  return [...LISTING_TYPES];
}

export function sanitizeListingTypeForTransaction(
  transaction: string,
  type: string | undefined
): ListingType | "" {
  if (!type) return "";
  const allowed = new Set(listingTypesForTransaction(transaction));
  return allowed.has(type as ListingType) ? (type as ListingType) : "";
}

export function assertValidTransactionType(tx: string): tx is TransactionType {
  return TRANSACTION_TYPES.includes(tx as TransactionType);
}
