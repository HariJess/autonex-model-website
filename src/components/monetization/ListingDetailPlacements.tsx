import { Link } from "react-router-dom";
import { useDbListings } from "@/hooks/useListings";
import ListingCard from "@/components/ListingCard";
import { Loader2 } from "lucide-react";
import { BannerSlot } from "./BannerSlot";
import { FeaturedAgenciesSection } from "./FeaturedAgenciesSection";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { SponsoredPill } from "./MonetizationLabels";
import type { ListingType, TransactionType } from "@/types/listing";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";

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
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
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

export function ListingSponsorBlock() {
  const enabled = MONETIZATION_PLACEMENTS.listingSponsor;
  const { data: campaign } = usePartnerCampaign("listingSponsor", enabled);
  if (!enabled || !campaign) return null;
  return (
    <BannerSlot
      variant="inline"
      title={campaign.advertiser_name}
      subtitle="Contenu sponsorisé"
      href={campaign.destination_url}
      ctaLabel={campaign.destination_url ? campaign.cta_label?.trim() || "Découvrir" : null}
      imageUrl={campaign.image_url}
    />
  );
}

export function ListingPartnerAgencyStrip() {
  if (!MONETIZATION_PLACEMENTS.listingPartner) return null;
  return <FeaturedAgenciesSection title="Agences en vedette" enabled limit={6} variant="embedded" />;
}
