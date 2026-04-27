import { HomePopupModalView } from "@/components/monetization/HomePopupModal";
import { HomeSponsorStripView } from "@/components/monetization/HomeSponsorStrip";
import { ListingSponsorBlockView } from "@/components/monetization/ListingDetailPlacements";
import { PremiumBillboardView } from "@/components/monetization/PremiumBillboard";
import { SearchTopBannerView } from "@/components/monetization/SearchTopBanner";
import type { PartnerAdPlacementKey, PublicPartnerCampaign } from "@/lib/partnerAds";

const PLACEMENT_RATIOS: Record<
  PartnerAdPlacementKey,
  { desktop: string; mobile: string; label: string }
> = {
  homeBillboard: {
    desktop: "aspect-[6/1]",
    mobile: "aspect-[2/1]",
    label: "Billboard, ratio 6:1",
  },
  homeSponsorStrip: {
    desktop: "aspect-[8/1]",
    mobile: "aspect-[2.5/1]",
    label: "Bandeau, ratio 8:1",
  },
  searchTopBanner: {
    desktop: "aspect-[8/1]",
    mobile: "aspect-[2.5/1]",
    label: "Bandeau Recherche, ratio 8:1",
  },
  listingSponsor: {
    desktop: "aspect-[3/1]",
    mobile: "aspect-[2/1]",
    label: "Bloc Fiche annonce, ratio 3:1",
  },
  homeModal: {
    desktop: "aspect-[4/5]",
    mobile: "aspect-[4/5]",
    label: "Pop-up modal, format vertical 4:5",
  },
};

interface PartnerCampaignPreviewProps {
  placement: PartnerAdPlacementKey;
  imageUrl: string;
  imageUrlMobile: string;
  advertiserName: string;
  destinationUrl: string;
  ctaLabel: string;
}

function PreviewPlaceholder({
  placement,
  variant,
  message,
}: {
  placement: PartnerAdPlacementKey;
  variant: "desktop" | "mobile";
  message: string;
}) {
  const ratios = PLACEMENT_RATIOS[placement];
  const aspectClass = variant === "desktop" ? ratios.desktop : ratios.mobile;

  return (
    <div
      className={`flex w-full ${aspectClass} items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground font-sans`}
    >
      {message}
    </div>
  );
}

export function PartnerCampaignPreview({
  placement,
  imageUrl,
  imageUrlMobile,
  advertiserName,
  destinationUrl,
  ctaLabel,
}: PartnerCampaignPreviewProps) {
  const mockCampaign: PublicPartnerCampaign = {
    id: "preview",
    advertiser_name: advertiserName.trim() || "(nom de l'annonceur)",
    placement_key: placement,
    media_type: "image",
    image_url: imageUrl,
    image_url_mobile: imageUrlMobile.trim() || null,
    destination_url: destinationUrl.trim() || null,
    cta_label: ctaLabel.trim() || null,
    audience: "all",
  };

  const renderView = (variant: "desktop" | "mobile") => {
    const label = PLACEMENT_RATIOS[placement].label;

    if (!imageUrl) {
      const message =
        variant === "desktop"
          ? `Uploadez une image desktop pour voir l’aperçu — format ${label}.`
          : `Uploadez une image mobile (ou desktop en fallback) pour voir l’aperçu mobile.`;
      return <PreviewPlaceholder placement={placement} variant={variant} message={message} />;
    }

    switch (placement) {
      case "homeBillboard":
        return <PremiumBillboardView campaign={mockCampaign} />;
      case "homeSponsorStrip":
        return <HomeSponsorStripView campaign={mockCampaign} />;
      case "searchTopBanner":
        return <SearchTopBannerView campaign={mockCampaign} />;
      case "listingSponsor":
        return <ListingSponsorBlockView campaign={mockCampaign} />;
      case "homeModal":
        return <HomePopupModalView campaign={mockCampaign} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 font-sans">
          Aperçu desktop
        </p>
        <div className="rounded-lg border bg-background p-4">{renderView("desktop")}</div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 font-sans">
          Aperçu mobile (375px)
        </p>
        <div className="rounded-lg border bg-background p-4">
          <div className="mx-auto" style={{ maxWidth: "375px" }}>
            {renderView("mobile")}
          </div>
        </div>
        <p className="text-xs italic text-muted-foreground mt-2 font-sans">
          Les breakpoints Tailwind suivent la largeur réelle du viewport, pas du conteneur :
          le rendu mobile final dépend du device. Validez via DevTools (mode responsive) ou un mobile réel.
        </p>
      </div>
    </div>
  );
}

const PLACEMENT_SPECS: Record<
  PartnerAdPlacementKey,
  { desktop: string; mobile: string; tip: string }
> = {
  homeBillboard: {
    desktop: "1920×320 px (ratio 6:1)",
    mobile: "1200×600 px (ratio 2:1)",
    tip: "Centrez votre branding (logo, produit) dans les 60% centraux du visuel pour qu’il reste visible sur tous les écrans.",
  },
  homeSponsorStrip: {
    desktop: "1920×240 px (ratio 8:1)",
    mobile: "1200×480 px (ratio 2.5:1)",
    tip: "Ratio extra-aplati : prévoyez un visuel mobile dédié, le crop d’un visuel desktop sur mobile coupe les éléments latéraux.",
  },
  searchTopBanner: {
    desktop: "1920×240 px (ratio 8:1)",
    mobile: "1200×480 px (ratio 2.5:1)",
    tip: "S’affiche en haut de la page Recherche. Visuel mobile dédié recommandé pour préserver le branding latéral.",
  },
  listingSponsor: {
    desktop: "1920×640 px (ratio 3:1)",
    mobile: "1200×600 px (ratio 2:1)",
    tip: "S’affiche dans la page Fiche annonce. Format plus carré que les bandeaux Home.",
  },
  homeModal: {
    desktop: "1080×1350 px (ratio 4:5) ou 1080×1080 (carré)",
    mobile: "1080×1350 px (idem desktop)",
    tip: "Pop-up plein écran centré sur la home, apparaît 2 secondes après le chargement, fermable. Limité à 1× par session.",
  },
};

export function PlacementSpecsPanel({ placement }: { placement: PartnerAdPlacementKey }) {
  const current = PLACEMENT_SPECS[placement];

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
        Spécifications recommandées
      </p>
      <div className="grid grid-cols-2 gap-3 text-sm font-sans">
        <div>
          <p className="font-semibold">Desktop</p>
          <p className="text-muted-foreground">{current.desktop}</p>
        </div>
        <div>
          <p className="font-semibold">Mobile</p>
          <p className="text-muted-foreground">{current.mobile}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/40 font-sans">
        {current.tip}
      </p>
    </div>
  );
}
