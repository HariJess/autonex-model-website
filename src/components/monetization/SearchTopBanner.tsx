import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { cn } from "@/lib/utils";
import type { PublicPartnerCampaign } from "@/lib/partnerAds";
import { trackPartnerAdEvent } from "@/lib/trackPartnerAdEvent";

interface SearchTopBannerProps {
  className?: string;
}

/**
 * Bandeau sponsor full-image en haut de la page Recherche.
 * Ratio 8:1 desktop / 2.5:1 mobile. L'image contient tout le visuel.
 */
export function SearchTopBanner({ className }: SearchTopBannerProps) {
  const enabled = MONETIZATION_PLACEMENTS.searchTopBanner;
  const { data: campaign } = usePartnerCampaign("searchTopBanner", enabled);

  useEffect(() => {
    if (!campaign?.id) return;
    void trackPartnerAdEvent({
      campaignId: campaign.id,
      placementKey: "searchTopBanner",
      eventType: "impression",
    });
  }, [campaign?.id]);

  if (!enabled || !campaign) return null;

  const handleClick = () => {
    void trackPartnerAdEvent({
      campaignId: campaign.id,
      placementKey: "searchTopBanner",
      eventType: "click",
    });
  };

  return <SearchTopBannerView campaign={campaign} className={className} onClick={handleClick} />;
}

interface SearchTopBannerViewProps {
  campaign: PublicPartnerCampaign;
  className?: string;
  onClick?: () => void;
}

/** Rendu visuel pur. Utilisable en preview admin sans toucher au hook. */
export function SearchTopBannerView({ campaign, className, onClick }: SearchTopBannerViewProps) {
  const { t } = useTranslation();
  const Wrapper = campaign.destination_url ? "a" : "div";
  const wrapperProps = campaign.destination_url
    ? {
        href: campaign.destination_url,
        target: "_blank" as const,
        rel: "noopener noreferrer sponsored",
        onClick,
      }
    : {};

  return (
    <section className={cn("mb-4", className)}>
      <Wrapper
        {...wrapperProps}
        className="relative block w-full overflow-hidden rounded-xl bg-muted/40 group"
        aria-label={t("monetization.adAriaLabel", "Publicité {{advertiser}}", { advertiser: campaign.advertiser_name })}
      >
        <div className="relative w-full aspect-[2.5/1] md:aspect-[8/1]">
          <picture>
            {campaign.image_url_mobile ? (
              <source media="(max-width: 768px)" srcSet={campaign.image_url_mobile} />
            ) : null}
            <img
              src={campaign.image_url}
              alt={campaign.advertiser_name}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          </picture>
        </div>

        <span className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          {t("monetization.sponsoredLabel", "Sponsorisé")}
        </span>
      </Wrapper>
    </section>
  );
}
