import { Link } from "react-router-dom";
import { useDbListings } from "@/hooks/useListings";
import ListingCard from "@/components/ListingCard";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import { FeaturedAgenciesSection } from "./FeaturedAgenciesSection";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { SponsoredPill } from "./MonetizationLabels";
import type { ListingType, TransactionType } from "@/types/listing";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";
import { cn } from "@/lib/utils";
import type { PublicPartnerCampaign } from "@/lib/partnerAds";

interface RelatedPromotedProps {
  listingId: string;
  ville: string | null;
  transaction: TransactionType;
  type: ListingType;
}

/** Subtle related strip — excludes current listing; “promoted” is honest native card when inventory thin. */
export function ListingRelatedPromoted({ listingId, ville, transaction, type }: RelatedPromotedProps) {
  const { data: related = [], isLoading } = useDbListings({
    ville: ville || undefined,
    transaction,
    types: [type],
    limit: 5,
  });

  const filtered = related.filter((l) => l.id !== listingId).slice(0, 3);
  if (!MONETIZATION_PLACEMENTS.listingRelatedPromoted || filtered.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-serif text-lg font-bold">À voir aussi</h3>
        <SponsoredPill label="Pour vous" />
      </div>
      {isLoading ? (
        <WheelSpinner size="md" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground font-sans">
        Suggestions basées sur la ville et le type de bien.{" "}
        <Link to="/recherche" className="text-primary hover:underline">
          Recherche avancée
        </Link>
      </p>
    </section>
  );
}

interface ListingSponsorBlockProps {
  className?: string;
}

/**
 * Bloc sponsor full-image dans la page Fiche annonce.
 * Ratio 3:1 desktop / 2:1 mobile. L'image contient tout le visuel.
 */
export function ListingSponsorBlock({ className }: ListingSponsorBlockProps = {}) {
  const enabled = MONETIZATION_PLACEMENTS.listingSponsor;
  const { data: campaign } = usePartnerCampaign("listingSponsor", enabled);
  if (!enabled || !campaign) return null;
  return <ListingSponsorBlockView campaign={campaign} className={className} />;
}

interface ListingSponsorBlockViewProps {
  campaign: PublicPartnerCampaign;
  className?: string;
}

/** Rendu visuel pur. Utilisable en preview admin sans toucher au hook. */
export function ListingSponsorBlockView({ campaign, className }: ListingSponsorBlockViewProps) {
  const Wrapper = campaign.destination_url ? "a" : "div";
  const wrapperProps = campaign.destination_url
    ? {
        href: campaign.destination_url,
        target: "_blank" as const,
        rel: "noopener noreferrer sponsored",
      }
    : {};

  return (
    <div className={cn("w-full", className)}>
      <Wrapper
        {...wrapperProps}
        className="relative block w-full overflow-hidden rounded-xl bg-muted/40 group"
        aria-label={`Publicité ${campaign.advertiser_name}`}
      >
        <div className="relative w-full aspect-[2/1] md:aspect-[3/1]">
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
          Sponsorisé
        </span>
      </Wrapper>
    </div>
  );
}

export function ListingPartnerAgencyStrip() {
  if (!MONETIZATION_PLACEMENTS.listingPartner) return null;
  return <FeaturedAgenciesSection title="Agences en vedette" enabled limit={6} variant="embedded" />;
}
