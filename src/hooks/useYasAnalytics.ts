import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Type retour de la RPC `get_yas_analytics()` (cf. SQL Plan 4/4).
 *
 * Le typegen Supabase n'inclut pas encore cette fonction (créée manuellement
 * par Ali avant deploy via SQL Editor — pattern projet, cf.
 * M-DB-DESYNC-INVESTIGATION dans CLAUDE.md). On déclare le type côté client
 * et on cast le retour `data` au moment du queryFn.
 */
export type YasAnalyticsData = {
  sessions: {
    sessions_24h: number;
    sessions_7d: number;
    sessions_30d: number;
    total_events_30d: number;
  };
  top_events: Array<{ event_name: string; count: number }> | null;
  funnel: {
    autonex_open: number;
    action_click: number;
    search_performed: number;
    listing_view: number;
    seller_contact_click: number;
    estimation_started: number;
    estimation_completed: number;
    publish_started: number;
    publish_completed: number;
  };
  platforms: Array<{ platform: string; count: number }> | null;
  referrers: Array<{ referrer: string; count: number }> | null;
  daily_events: Array<{ date: string; count: number }> | null;
  generated_at: string;
};

/**
 * Fetch des données analytics YAS agrégées via la RPC SECURITY DEFINER
 * `get_yas_analytics()`. La RPC vérifie elle-même `immonex_is_admin()` (un user
 * non-admin reçoit une erreur RLS). React Query staleTime 60s : les sessions
 * 24h/7d/30d ne bougent pas assez vite pour justifier des refetch fréquents.
 */
export function useYasAnalytics() {
  return useQuery<YasAnalyticsData>({
    queryKey: ["admin-yas-analytics"],
    queryFn: async (): Promise<YasAnalyticsData> => {
      // `as never` car la fonction RPC n'est pas typée par le typegen Supabase
      // tant que la fonction n'a pas été incluse dans la régénération auto.
      // Pattern identique à yasTracking.ts ligne 95.
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: "get_yas_analytics",
        ) => Promise<{ data: unknown; error: Error | null }>
      )("get_yas_analytics");
      if (error) throw new Error(error.message);
      return data as YasAnalyticsData;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
