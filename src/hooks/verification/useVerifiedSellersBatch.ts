import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Batch query des sellers vérifiés actifs pour un set de owner_ids.
 *
 * Lecture VIEW `active_seller_badges` (filtre expires_at > now() côté DB).
 * Public read autorisé via policy `anyone_read_active_badges`.
 *
 * Retour : Set<user_id> pour lookup O(1) côté front lors du mapping
 * `seller_verified` sur chaque DisplayListing.
 *
 * Cache 5min pour éviter le re-fetch sur chaque pagination feed.
 */
export function useVerifiedSellersBatch(ownerIds: ReadonlyArray<string>) {
  const sortedKey = [...ownerIds].sort().join(",");
  return useQuery<Set<string>>({
    queryKey: ["verified-sellers-batch", sortedKey],
    enabled: ownerIds.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      if (ownerIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("active_seller_badges")
        .select("user_id")
        .in("user_id", [...ownerIds]);
      if (error) throw new Error(error.message);
      const set = new Set<string>();
      for (const row of data ?? []) {
        if (typeof row.user_id === "string") set.add(row.user_id);
      }
      return set;
    },
  });
}
