import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Badge actif (depuis VIEW active_seller_badges qui filtre expires_at > now()).
 * Null si pas de badge actif.
 */
export type MySellerBadgeRow = {
  id: string;
  expires_at: string;
  granted_at: string;
};

export function useMySellerBadge() {
  const { user } = useAuth();
  return useQuery<MySellerBadgeRow | null>({
    queryKey: ["my-seller-badge", user?.id ?? null],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MySellerBadgeRow | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("active_seller_badges")
        .select("id, expires_at, granted_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data || !data.id || !data.expires_at || !data.granted_at) return null;
      return {
        id: data.id,
        expires_at: data.expires_at,
        granted_at: data.granted_at,
      };
    },
  });
}
