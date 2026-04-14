import { BannerSlot } from "./BannerSlot";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";

export function SearchTopBanner() {
  const enabled = MONETIZATION_PLACEMENTS.searchTopBanner;
  const { data: campaign } = usePartnerCampaign("searchTopBanner", enabled);
  if (!enabled || !campaign) return null;

  return (
    <div className="mb-4">
      <BannerSlot
        variant="inline"
        title={campaign.advertiser_name}
        subtitle="Contenu sponsorisé"
        href={campaign.destination_url}
        ctaLabel={campaign.destination_url ? campaign.cta_label?.trim() || "Découvrir" : null}
        imageUrl={campaign.image_url}
      />
    </div>
  );
}
