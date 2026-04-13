import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DisplayListing } from "@/types/listing";

type SearchResultsListProps = {
  listings: DisplayListing[];
  showCloseMatchBadges: boolean;
  getCloseMatchLabel: (listing: DisplayListing) => string;
  formatPrice: (value: number) => string;
  seeListingLabel: string;
};

export function SearchResultsList({
  listings,
  showCloseMatchBadges,
  getCloseMatchLabel,
  formatPrice,
  seeListingLabel,
}: SearchResultsListProps) {
  return (
    <div className="space-y-4">
      {listings.map((listing) => (
        <div
          key={listing.id}
          className="flex flex-col sm:flex-row bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
        >
          <Link to={`/annonce/${listing.id}`} className="w-full sm:w-72 h-48 flex-shrink-0 block">
            <img
              src={listing.images[0] ?? "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"}
              alt={listing.title}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallbackApplied) {
                  img.dataset.fallbackApplied = "1";
                  img.src = "/placeholder.svg";
                }
              }}
            />
          </Link>
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            <div>
              <Link to={`/annonce/${listing.id}`} className="block">
                <h2 className="font-serif font-semibold text-lg hover:text-primary transition-colors">{listing.title}</h2>
              </Link>
              {showCloseMatchBadges && (
                <Badge variant="secondary" className="mt-1.5 text-[10px] font-sans font-normal">
                  {getCloseMatchLabel(listing)}
                </Badge>
              )}
              <p className="text-sm text-muted-foreground font-sans mt-1 line-clamp-2">{listing.description}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm font-sans text-muted-foreground">
                {listing.surface != null && listing.surface > 0 && <span>{listing.surface} m²</span>}
                {listing.rooms != null && listing.rooms > 0 && <span>{listing.rooms} ch.</span>}
                {listing.rooms === 0 && ["appartement", "villa", "maison"].includes(listing.type) && <span>Studio</span>}
                {listing.bathrooms != null && listing.bathrooms > 0 && <span>{listing.bathrooms} sdb</span>}
                <span>{listing.ville}</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 gap-2">
              <span className="font-serif font-bold text-lg text-primary">{formatPrice(listing.price_mga)}</span>
              <Button variant="outline" size="sm" className="font-sans shrink-0 min-h-10 touch-manipulation" asChild>
                <Link to={`/annonce/${listing.id}`}>{seeListingLabel}</Link>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
