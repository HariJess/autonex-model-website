import { useEffect } from "react";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";
import { cn } from "@/lib/utils";
import type { PublicPartnerCampaign } from "@/lib/partnerAds";
import { trackPartnerAdEvent } from "@/lib/trackPartnerAdEvent";

interface PremiumBillboardProps {
  enabled?: boolean;
  className?: string;
}

/**
 * Billboard sponsor full-image (standard IAB display).
 * Affiche l'image fournie par l'annonceur en plein cadre, ratio 6:1 desktop / 2:1 mobile.
 * L'image doit contenir tout le visuel (texte/CTA inclus). Aucun overlay côté AutoNex.
 */
export function PremiumBillboard({ enabled = true, className }: PremiumBillboardProps) {
  const { data: campaign } = usePartnerCampaign("homeBillboard", enabled);

  useEffect(() => {
    if (!campaign?.id) return;
    void trackPartnerAdEvent({
      campaignId: campaign.id,
      placementKey: "homeBillboard",
      eventType: "impression",
    });
  }, [campaign?.id]);

  if (!enabled || !campaign) return null;

  const handleClick = () => {
    void trackPartnerAdEvent({
      campaignId: campaign.id,
      placementKey: "homeBillboard",
      eventType: "click",
    });
  };

  return <PremiumBillboardView campaign={campaign} className={className} onClick={handleClick} />;
}

interface PremiumBillboardViewProps {
  campaign: PublicPartnerCampaign;
  className?: string;
  onClick?: () => void;
}

/** Rendu visuel pur. Utilisable en preview admin sans toucher au hook. */
export function PremiumBillboardView({ campaign, className, onClick }: PremiumBillboardViewProps) {
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
    <section className={cn("max-w-7xl mx-auto px-4 md:px-6 lg:px-8", className)}>
      <Wrapper
        {...wrapperProps}
        className="relative block w-full overflow-hidden rounded-xl bg-muted/40 group"
        aria-label={`Publicité ${campaign.advertiser_name}`}
      >
        <div className="relative w-full aspect-[2/1] md:aspect-[6/1]">
          <picture>
            {campaign.image_url_mobile ? (
              <source media="(max-width: 768px)" srcSet={campaign.image_url_mobile} />
            ) : null}
            <img
              src={campaign.image_url}
              alt={campaign.advertiser_name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </picture>
        </div>

        <span className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          Sponsorisé
        </span>
      </Wrapper>
    </section>
  );
}
