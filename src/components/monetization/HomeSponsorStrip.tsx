import { BannerSlot } from "./BannerSlot";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";

/** Bandeau sponsor inline rendu sur la home. Modeled on SearchTopBanner. */
export function HomeSponsorStrip() {
  const enabled = MONETIZATION_PLACEMENTS.homeSponsorStrip;
  const { data: campaign } = usePartnerCampaign("homeSponsorStrip", enabled);
  if (!enabled || !campaign) return null;

  return (
    <section className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
      <BannerSlot
        variant="inline"
        title={campaign.advertiser_name}
        subtitle="Contenu sponsorisé"
        href={campaign.destination_url}
        ctaLabel={campaign.destination_url ? campaign.cta_label?.trim() || "Découvrir" : null}
        imageUrl={campaign.image_url}
      />
    </section>
  );
}
