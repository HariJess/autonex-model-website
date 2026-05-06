import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LISTING_SELECT_COLUMN_NAMES,
  enrichListingsWithRelatedData,
  isListingRowLite,
  type ListingRowLite,
} from "@/hooks/useListings";
import type { DisplayListing } from "@/types/listing";

const SELECT_COLUMNS = LISTING_SELECT_COLUMN_NAMES.join(",");

export interface UseActiveDealsParams {
  /** Pagination — par défaut 24 par page. */
  limit?: number;
  /** Offset pour le « load more ». */
  offset?: number;
  /** Filtres optionnels (sidebar /bonnes-affaires). */
  make?: string;
  bodyStyle?: string;
  /** Remise minimum (5..30). Filtre `deal_discount_percent >= minDiscount`. */
  minDiscount?: number;
  /** Budget max acheteur. Filtre `price_mga <= maxPriceMga`. */
  maxPriceMga?: number;
  ville?: string;
}

export interface ActiveDealsResult {
  listings: DisplayListing[];
  /** Count global (non paginé) pour le compteur de page et les load-more. */
  count: number;
}

/**
 * Fetch les annonces strictement en deal officiel actif :
 *   `deal_active = true` ET `deal_ends_at > now()` ET `status = 'active'`.
 *
 * Tri par défaut : `deal_discount_percent DESC, deal_started_at DESC`.
 *
 * Diffère de `useDbListings` :
 *   - Filtre dur sur `deal_active = true` (pas de fallback `original_price_mga`
 *     legacy — c'est volontaire, cf. décision Q4 sprint 0).
 *   - Tri par % de réduction décroissant (vs. `created_at DESC`).
 *   - Renvoie `count` global pour la pagination.
 *
 * Les baisses spontanées legacy continuent d'être affichées sur la home et
 * dans `/yas-app` via `getDealMeta()` côté `useDbListings`. La page
 * `/bonnes-affaires` n'utilise QUE ce hook → uniquement des deals contractuels.
 */
export function useActiveDeals(params: UseActiveDealsParams = {}) {
  const { limit = 24, offset = 0, make, bodyStyle, minDiscount, maxPriceMga, ville } = params;

  return useQuery<ActiveDealsResult>({
    queryKey: ["active-deals", { limit, offset, make, bodyStyle, minDiscount, maxPriceMga, ville }],
    queryFn: async () => {
      const nowIso = new Date().toISOString();

      let query = supabase
        .from("listings")
        .select(SELECT_COLUMNS, { count: "exact" })
        .eq("deal_active", true)
        .eq("status", "active")
        .gt("deal_ends_at", nowIso)
        .order("deal_discount_percent", { ascending: false })
        .order("deal_started_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (make) query = query.eq("make", make);
      if (bodyStyle) query = query.eq("body_style", bodyStyle);
      if (minDiscount && minDiscount > 0) query = query.gte("deal_discount_percent", minDiscount);
      if (maxPriceMga && maxPriceMga > 0) query = query.lte("price_mga", maxPriceMga);
      if (ville) query = query.eq("ville", ville);

      const { data, error, count } = await query;
      if (error) throw new Error(`Erreur deals: ${error.message}`);

      const rows: ListingRowLite[] = [];
      for (const row of data ?? []) {
        if (isListingRowLite(row)) rows.push(row);
      }
      const listings = await enrichListingsWithRelatedData(rows);
      return { listings, count: count ?? listings.length };
    },
    staleTime: 60_000,
  });
}
