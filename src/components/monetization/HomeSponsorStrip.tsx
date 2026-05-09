import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { cn } from "@/lib/utils";
import type { PublicPartnerCampaign } from "@/lib/partnerAds";
import { trackPartnerAdEvent } from "@/lib/trackPartnerAdEvent";
import { getOptimizedStorageUrl, getOptimizedSrcSet } from "@/lib/storageImage";

interface HomeSponsorStripProps {
  className?: string;
}

/**
 * Bandeau sponsor full-image inline (format leaderboard étendu).
 * Ratio 2.5:1 mobile / 8:1 desktop. L'image contient tout le visuel.
 */
export function HomeSponsorStrip({ className }: HomeSponsorStripProps) {
  const enabled = MONETIZATION_PLACEMENTS.homeSponsorStrip;
  const { data: campaign } = usePartnerCampaign("homeSponsorStrip", enabled);

  useEffect(() => {
    if (!campaign?.id) return;
    void trackPartnerAdEvent({
      campaignId: campaign.id,
      placementKey: "homeSponsorStrip",
      eventType: "impression",
    });
  }, [campaign?.id]);

  if (!enabled || !campaign) return null;

  const handleClick = () => {
    void trackPartnerAdEvent({
      campaignId: campaign.id,
      placementKey: "homeSponsorStrip",
      eventType: "click",
    });
  };

  return <HomeSponsorStripView campaign={campaign} className={className} onClick={handleClick} />;
}

interface HomeSponsorStripViewProps {
  campaign: PublicPartnerCampaign;
  className?: string;
  onClick?: () => void;
}

/** Rendu visuel pur. Utilisable en preview admin sans toucher au hook. */
export function HomeSponsorStripView({ campaign, className, onClick }: HomeSponsorStripViewProps) {
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
    <section className={cn("max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4", className)}>
      <Wrapper
        {...wrapperProps}
        className="relative block w-full overflow-hidden rounded-xl bg-muted/40 group"
        aria-label={t("monetization.adAriaLabel", "Publicité {{advertiser}}", { advertiser: campaign.advertiser_name })}
      >
        <div className="relative w-full aspect-[2.5/1] md:aspect-[8/1]">
          <picture>
            {campaign.image_url_mobile ? (
              <source
                media="(max-width: 768px)"
                srcSet={getOptimizedSrcSet(campaign.image_url_mobile, [400, 800, 1200], 80)}
                type="image/webp"
              />
            ) : null}
            <source
              srcSet={getOptimizedSrcSet(campaign.image_url, [600, 1200, 1800], 80)}
              type="image/webp"
            />
            <img
              src={getOptimizedStorageUrl(campaign.image_url, { width: 1200, quality: 80 }) || campaign.image_url}
              alt={campaign.advertiser_name}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
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
