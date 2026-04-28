import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketStats {
  activeListings: number;
  verifiedSellers: number;
}

/**
 * Aggregate counters surfaced in the hero's social-proof line:
 *   - activeListings  : listings.status = 'active'
 *   - verifiedSellers : agencies.status = 'approved' (agency_status enum,
 *                       set by the admin moderation flow)
 *
 * Two parallel `count: 'exact', head: true` queries — no row payload, just
 * the count metadata, so the network cost is two short HEAD-style requests.
 * Cached for 5 min: this number changes slowly enough that fresh fetches
 * on every navigation are wasteful.
 *
 * Returns zeros on error rather than throwing, so the hero stays renderable
 * even if RLS or the network blips.
 */
export function useMarketStats() {
  return useQuery<MarketStats>({
    queryKey: ["market-stats"],
    queryFn: async (): Promise<MarketStats> => {
      try {
        const [listingsRes, agenciesRes] = await Promise.all([
          supabase
            .from("listings")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
          supabase
            .from("agencies")
            .select("id", { count: "exact", head: true })
            .eq("status", "approved"),
        ]);

        return {
          activeListings: listingsRes.count ?? 0,
          verifiedSellers: agenciesRes.count ?? 0,
        };
      } catch {
        return { activeListings: 0, verifiedSellers: 0 };
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
