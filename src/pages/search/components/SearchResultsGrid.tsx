import ListingCard from "@/components/ListingCard";
import { SponsoredNativeCard } from "@/components/monetization/SponsoredNativeCard";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
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
        out.push(
          <ListingCard
            key={listing.id}
            listing={listing}
            matchBadge={showCloseMatchBadges ? getCloseMatchLabel(listing) : undefined}
            layout="compact"
          />,
        );
        return out;
      })}
    </div>
  );
}
