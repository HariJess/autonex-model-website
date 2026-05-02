import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";
import type { PublicPartnerCampaign } from "@/lib/partnerAds";
import { trackPartnerAdEvent } from "@/lib/trackPartnerAdEvent";
import { getOptimizedStorageUrl, getOptimizedSrcSet } from "@/lib/storageImage";

const POPUP_DELAY_MS = 2000;
const SESSION_KEY_PREFIX = "autonex.popup.dismissed.";

/**
 * Pop-up modal sponsor sur la home. Apparaît 2s après le mount, fermable,
 * persiste son dismissal en sessionStorage (1 affichage par session).
 */
export function HomePopupModal() {
  const { t } = useTranslation();
  const enabled = MONETIZATION_PLACEMENTS.homeModal;
  const [shouldFetchCampaign, setShouldFetchCampaign] = useState(false);
  const { data: campaign } = usePartnerCampaign("homeModal", enabled && shouldFetchCampaign);
  const [isOpen, setIsOpen] = useState(false);

  // Defer the partner-campaign fetch by POPUP_DELAY_MS so it stays out of the
  // critical-path of the first paint. The 2 s timer doubles as the UX grace
  // period before the modal can appear, so removing the second setTimeout
  // does not regress the perceived popup delay.
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => setShouldFetchCampaign(true), POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!campaign) return;
    const sessionKey = `${SESSION_KEY_PREFIX}${campaign.id}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(sessionKey)) return;
    setIsOpen(true);
  }, [campaign]);

  // Impression fires only when modal is actually visible to the user.
  useEffect(() => {
    if (!isOpen || !campaign?.id) return;
    void trackPartnerAdEvent({
      campaignId: campaign.id,
      placementKey: "homeModal",
      eventType: "impression",
    });
  }, [isOpen, campaign?.id]);

  const handleClose = () => {
    if (campaign && typeof window !== "undefined") {
      window.sessionStorage.setItem(`${SESSION_KEY_PREFIX}${campaign.id}`, "1");
    }
    setIsOpen(false);
  };

  if (!enabled || !campaign) return null;

  const handleClick = () => {
    void trackPartnerAdEvent({
      campaignId: campaign.id,
      placementKey: "homeModal",
      eventType: "click",
    });
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-xl bg-transparent shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-label={t("monetization.adAriaLabel", "Publicité {{advertiser}}", { advertiser: campaign.advertiser_name })}
        >
          <DialogPrimitive.Title className="sr-only">
            {t("monetization.adAriaLabel", "Publicité {{advertiser}}", { advertiser: campaign.advertiser_name })}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={t("common.close", "Fermer")}
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
          <HomePopupModalView campaign={campaign} onClick={handleClick} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface HomePopupModalViewProps {
  campaign: PublicPartnerCampaign;
  onClick?: () => void;
}

/** Rendu visuel pur. Utilisable en preview admin (sans Dialog ni timer). */
export function HomePopupModalView({ campaign, onClick }: HomePopupModalViewProps) {
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
    <div className="mx-auto max-w-lg">
      <Wrapper
        {...wrapperProps}
        className="relative block w-full overflow-hidden rounded-xl bg-muted/40"
        aria-label={t("monetization.adAriaLabel", "Publicité {{advertiser}}", { advertiser: campaign.advertiser_name })}
      >
        <picture>
          {campaign.image_url_mobile ? (
            <source
              media="(max-width: 768px)"
              srcSet={getOptimizedSrcSet(campaign.image_url_mobile, [400, 800, 1200], 80)}
              type="image/webp"
            />
          ) : null}
          <source
            srcSet={getOptimizedSrcSet(campaign.image_url, [400, 800, 1200], 80)}
            type="image/webp"
          />
          <img
            src={getOptimizedStorageUrl(campaign.image_url, { width: 800, quality: 80 }) || campaign.image_url}
            alt={campaign.advertiser_name}
            className="block h-auto w-full"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <span className="absolute right-3 bottom-3 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          {t("monetization.sponsoredLabel", "Sponsorisé")}
        </span>
      </Wrapper>
    </div>
  );
}
