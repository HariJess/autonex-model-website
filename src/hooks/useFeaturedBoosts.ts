import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Listing IDs that currently have paid top or featured boost (for monetized rails). */
export function useFeaturedBoostListingIds(limit = 16) {
  return useQuery({
    queryKey: ["featured-boost-listing-ids", limit],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("boosts")
        .select("listing_id")
        .in("type", ["top", "featured"])
        .gte("ends_at", new Date().toISOString());
      if (error) throw new Error(error.message);
      const seen = new Set<string>();
      const out: string[] = [];
      for (const row of data ?? []) {
        if (row.listing_id && !seen.has(row.listing_id)) {
          seen.add(row.listing_id);
          out.push(row.listing_id);
          if (out.length >= limit) break;
        }
      }
      return out;
    },
    staleTime: 60_000,
  });
}
