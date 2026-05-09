import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * V1 anti-spam rate limit status pour l'utilisateur courant.
 * Consume la RPC `can_publish_listing(uuid)` (PROMPT 8) qui retourne :
 *   - allowed (boolean)
 *   - reason : null | rate_limit_active_listings | rate_limit_publish_24h | rate_limit_cooldown
 *   - active_listings_count + active_listings_limit
 *   - publishes_24h_count + publishes_24h_limit
 *   - cooldown_remaining_seconds
 *
 * Cache 30s (granularité cooldown). Refetch fréquent géré côté composant
 * (RateLimitStatusCard utilise un setInterval pour le countdown cooldown).
 */
export type RateLimitReason =
  | "rate_limit_active_listings"
  | "rate_limit_publish_24h"
  | "rate_limit_cooldown"
  | "auth_required"
  | null;

export type RateLimitStatus = {
  allowed: boolean;
  reason: RateLimitReason;
  active_listings_count: number;
  active_listings_limit: number;
  publishes_24h_count: number;
  publishes_24h_limit: number;
  cooldown_remaining_seconds: number;
};

export function useMyRateLimitStatus() {
  const { user } = useAuth();
  return useQuery<RateLimitStatus | null>({
    queryKey: ["my-rate-limit", user?.id ?? null],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<RateLimitStatus | null> => {
      if (!user) return null;
      const { data, error } = await supabase.rpc("can_publish_listing", {
        p_user_id: user.id,
      });
      if (error) throw new Error(error.message);
      // RPC retourne SETOF (TABLE) → premier row uniquement
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return row as RateLimitStatus;
    },
  });
}
