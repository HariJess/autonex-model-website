import type { Tables } from "@/integrations/supabase/types";
import { BOOST_ORDER, type PurchasableBoostType } from "@/config/monetization";

export type ListingBoostRow = Pick<Tables<"boosts">, "listing_id" | "type" | "ends_at">;

export type ListingBoostPartition = {
  active: Array<{ type: string; ends_at: string }>;
  expired: Array<{ type: string; ends_at: string }>;
};

/** Split boost rows per listing into active vs expired using `ends_at` vs `now`. */
export function partitionBoostRowsByListing(rows: ListingBoostRow[], now: Date): Map<string, ListingBoostPartition> {
  const m = new Map<string, ListingBoostPartition>();
  const t = now.getTime();
  for (const row of rows) {
    if (!row.listing_id || !row.ends_at) continue;
    const ends = new Date(row.ends_at).getTime();
    const entry = m.get(row.listing_id) ?? { active: [], expired: [] };
    const item = { type: row.type, ends_at: row.ends_at };
    if (ends > t) entry.active.push(item);
    else entry.expired.push(item);
    m.set(row.listing_id, entry);
  }
  for (const [, v] of m) {
    v.active.sort((a, b) => a.ends_at.localeCompare(b.ends_at));
    v.expired.sort((a, b) => b.ends_at.localeCompare(a.ends_at));
  }
  return m;
}

/** Post-publish RPC: only live or paused listings (not draft / moderation queue). */
export function isListingEligibleForPostPublishBoost(status: string | null | undefined): boolean {
  return status === "active" || status === "paused";
}

/** Boost types the user can still buy (no overlapping active row for that type). */
export function purchasableBoostTypesForListing(partition: ListingBoostPartition | undefined): PurchasableBoostType[] {
  const activeTypes = new Set((partition?.active ?? []).map((x) => x.type));
  return BOOST_ORDER.filter((k) => !activeTypes.has(k));
}

export function formatBoostEndDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** User-facing French message for Supabase / Postgres errors from `purchase_listing_boosts`. */
export function purchaseListingBoostsErrorMessage(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("insufficient_credits")) {
    return "Crédits insuffisants. Rechargez votre solde avant d’acheter des boosts.";
  }
  if (s.includes("boost_already_active")) {
    return "Ce type de boost est déjà actif pour cette annonce. Attendez la fin de la période ou choisissez un autre boost.";
  }
  if (s.includes("duplicate_boost_types")) {
    return "Vous avez sélectionné le même boost plusieurs fois.";
  }
  if (s.includes("listing_not_boostable")) {
    return "Cette annonce ne peut pas être boostée dans son état actuel.";
  }
  if (s.includes("not_owner") || s.includes("not_authenticated")) {
    return "Action non autorisée.";
  }
  if (s.includes("invalid_boost_type") || s.includes("no_boost_types")) {
    return "Sélection de boosts invalide.";
  }
  return "Impossible d’appliquer les boosts. Réessayez ou contactez le support.";
}
