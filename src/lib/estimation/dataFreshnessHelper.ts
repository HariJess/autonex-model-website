import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * PROMPT 10B — Indicateur de fraîcheur des données.
 *
 * Lit la dernière `posted_at` de `market_listings_clean` (rows usable) +
 * un compteur total. Best-effort — toute erreur retourne `lastUpdateIso=null`
 * et `comparableTotalCount=0` (l'UI dégrade en message neutre).
 *
 * Cache TanStack Query 1h (la donnée bouge en jours, pas en minutes).
 */

export type DataFreshness = {
  lastUpdateIso: string | null;
  comparableTotalCount: number;
};

const QUERY_KEY = ["estimation", "data_freshness", "v1"] as const;

export async function fetchDataFreshness(): Promise<DataFreshness> {
  try {
    const { data, error, count } = await supabase
      .from("market_listings_clean")
      .select("posted_at", { count: "exact" })
      .eq("include_in_estimation", true)
      .eq("outlier_flag", false)
      .order("posted_at", { ascending: false })
      .limit(1);
    if (error || !data) return { lastUpdateIso: null, comparableTotalCount: 0 };
    const first = data[0] as { posted_at?: string | null } | undefined;
    return {
      lastUpdateIso: first?.posted_at ?? null,
      comparableTotalCount: count ?? 0,
    };
  } catch (_err) {
    return { lastUpdateIso: null, comparableTotalCount: 0 };
  }
}

/**
 * Hook React Query pour consommer `fetchDataFreshness()` dans les composants.
 * Cache 1h (staleTime), 6h (gcTime).
 */
export function useDataFreshness() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchDataFreshness,
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
  });
}
