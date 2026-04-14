import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { selectFirstCampaign, type PartnerAdPlacementKey, type PublicPartnerCampaign } from "@/lib/partnerAds";

export function usePartnerCampaign(placementKey: PartnerAdPlacementKey, enabled = true) {
  return useQuery({
    queryKey: ["partner-campaign", placementKey],
    queryFn: async (): Promise<PublicPartnerCampaign | null> => {
      const { data, error } = await supabase.rpc("get_active_partner_campaign", {
        p_placement_key: placementKey,
      });
      if (error) throw new Error(error.message);
      return selectFirstCampaign(data as PublicPartnerCampaign[] | null);
    },
    enabled,
    staleTime: 30_000,
  });
}
