import ListingCard from "@/components/ListingCard";
import { SponsoredNativeCard } from "@/components/monetization/SponsoredNativeCard";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { getDealMeta } from "@/lib/deals";
import type { DisplayListing } from "@/types/listing";
import type { ReactNode } from "react";

type SearchResultsGridProps = {
  listings: DisplayListing[];
  showCloseMatchBadges: boolean;
  getCloseMatchLabel: (listing: DisplayListing) => string;
};

export function SearchResultsGrid({ listings, showCloseMatchBadges, getCloseMatchLabel }: SearchResultsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-4 lg:gap-5 xl:gap-6">
      {listings.flatMap((listing, index): ReactNode[] => {
        const out: ReactNode[] = [];
        if (MONETIZATION_PLACEMENTS.searchSponsoredCard && index === 5) {
          out.push(<SponsoredNativeCard key="monetization-sponsored" />);
        }
        // Sprint 5 fix #2 — calcul dealMeta côté grille pour que les badges
        // -X% / Vérifié apparaissent sur les annonces en deal officiel ou
        // legacy (la home le faisait déjà via getDealMeta inline ; cette
        // grille filtrée l'oubliait, c'est corrigé).
        const dealMeta = getDealMeta(listing);
        out.push(
          <ListingCard
            key={listing.id}
            listing={listing}
            matchBadge={showCloseMatchBadges ? getCloseMatchLabel(listing) : undefined}
            layout="compact"
            priority={index === 0}
            dealMeta={dealMeta}
            feedContext="filtered"
          />,
        );
        return out;
      })}
    </div>
  );
}
