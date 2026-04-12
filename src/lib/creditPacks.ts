import { CREDIT_PACKS_CANONICAL, type CanonicalCreditPack } from "@/config/monetization";

export type CreditPackRow = {
  id: string;
  name: string;
  credits_amount: number;
  price_mga: number;
  sort_order: number | null;
};

/** Merge DB rows with canonical defaults (name/price) when columns are missing or DB empty. */
export function mergeCanonicalCreditPacks(db: CreditPackRow[] | null | undefined): CreditPackRow[] {
  const canonById = new Map<string, CanonicalCreditPack>(
    CREDIT_PACKS_CANONICAL.map((p) => [p.id, p]),
  );
  if (!db?.length) {
    return CREDIT_PACKS_CANONICAL.map((p) => ({ ...p, sort_order: p.sort_order }));
  }
  return [...db]
    .map((row) => {
      const c = canonById.get(row.id);
      return {
        id: row.id,
        name: row.name?.trim() || c?.name || `Pack ${row.credits_amount}`,
        credits_amount: row.credits_amount || c?.credits_amount || 0,
        price_mga: Number(row.price_mga) || c?.price_mga || 0,
        sort_order: row.sort_order ?? c?.sort_order ?? 0,
      };
    })
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}
