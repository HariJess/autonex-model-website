import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";
import type { PublicPartnerCampaign } from "@/lib/partnerAds";

const POPUP_DELAY_MS = 2000;
const SESSION_KEY_PREFIX = "autonex.popup.dismissed.";

/**
 * Pop-up modal sponsor sur la home. Apparaît 2s après le mount, fermable,
 * persiste son dismissal en sessionStorage (1 affichage par session).
 */
export function HomePopupModal() {
  const enabled = MONETIZATION_PLACEMENTS.homeModal;
  const { data: campaign } = usePartnerCampaign("homeModal", enabled);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!campaign) return;
    const sessionKey = `${SESSION_KEY_PREFIX}${campaign.id}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(sessionKey)) return;

    const timer = setTimeout(() => setIsOpen(true), POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [campaign]);

  const handleClose = () => {
    if (campaign && typeof window !== "undefined") {
      window.sessionStorage.setItem(`${SESSION_KEY_PREFIX}${campaign.id}`, "1");
    }
    setIsOpen(false);
  };

  if (!enabled || !campaign) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-xl bg-transparent shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-label={`Publicité ${campaign.advertiser_name}`}
        >
          <DialogPrimitive.Title className="sr-only">
            {`Publicité ${campaign.advertiser_name}`}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
          <HomePopupModalView campaign={campaign} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface HomePopupModalViewProps {
  campaign: PublicPartnerCampaign;
}

/** Rendu visuel pur. Utilisable en preview admin (sans Dialog ni timer). */
export function HomePopupModalView({ campaign }: HomePopupModalViewProps) {
  const Wrapper = campaign.destination_url ? "a" : "div";
  const wrapperProps = campaign.destination_url
    ? {
        href: campaign.destination_url,
        target: "_blank" as const,
        rel: "noopener noreferrer sponsored",
      }
    : {};

  return (
    <div className="mx-auto max-w-lg">
      <Wrapper
        {...wrapperProps}
        className="relative block w-full overflow-hidden rounded-xl bg-muted/40"
        aria-label={`Publicité ${campaign.advertiser_name}`}
      >
        <picture>
          {campaign.image_url_mobile ? (
            <source media="(max-width: 768px)" srcSet={campaign.image_url_mobile} />
          ) : null}
          <img
            src={campaign.image_url}
            alt={campaign.advertiser_name}
            className="block h-auto w-full"
            loading="lazy"
          />
        </picture>
        <span className="absolute right-3 bottom-3 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          Sponsorisé
        </span>
      </Wrapper>
    </div>
  );
}
