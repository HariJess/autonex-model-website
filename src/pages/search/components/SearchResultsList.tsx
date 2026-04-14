import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DisplayListing } from "@/types/listing";
import { applyImageFallback } from "@/lib/imageFallback";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchListing } from "@/hooks/useListings";
import {
  formatVehicleDoors,
  formatVehicleMileage,
  formatVehicleVersion,
  getVehicleDisplayTitle,
  getVehicleHeadline,
  getVehicleDoorsValue,
  getVehicleMileageValue,
  getVehicleVersionValue,
} from "@/lib/vehiclePresentation";

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
  const imagePlaceholder = "/placeholder.svg";
  const queryClient = useQueryClient();

  return (
    <div className="space-y-4">
      {listings.map((listing) => {
        const displayTitle = getVehicleDisplayTitle(listing);
        const mileageLabel = formatVehicleMileage(getVehicleMileageValue(listing));
        const versionLabel = formatVehicleVersion(getVehicleVersionValue(listing));
        const doorsLabel = formatVehicleDoors(getVehicleDoorsValue(listing));
        const vehicleHeadline = getVehicleHeadline(listing);
        return (
        <div
          key={listing.id}
          className="flex flex-col sm:flex-row bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
        >
          <Link
            to={`/annonce/${listing.id}`}
            className="w-full sm:w-72 h-48 flex-shrink-0 block"
            onMouseEnter={() => void prefetchListing(queryClient, listing.id)}
            onFocus={() => void prefetchListing(queryClient, listing.id)}
            onTouchStart={() => void prefetchListing(queryClient, listing.id)}
          >
            <img
              src={listing.images[0] ?? imagePlaceholder}
              alt={displayTitle}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                applyImageFallback(e.currentTarget, imagePlaceholder);
              }}
            />
          </Link>
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            <div>
              <Link
                to={`/annonce/${listing.id}`}
                className="block"
                onMouseEnter={() => void prefetchListing(queryClient, listing.id)}
                onFocus={() => void prefetchListing(queryClient, listing.id)}
                onTouchStart={() => void prefetchListing(queryClient, listing.id)}
              >
                <h2 className="font-serif font-semibold text-lg hover:text-primary transition-colors">{displayTitle}</h2>
                {vehicleHeadline && <p className="text-xs text-muted-foreground font-sans mt-1">{vehicleHeadline}</p>}
              </Link>
              {showCloseMatchBadges && (
                <Badge variant="secondary" className="mt-1.5 text-[10px] font-sans font-normal">
                  {getCloseMatchLabel(listing)}
                </Badge>
              )}
              <p className="text-sm text-muted-foreground font-sans mt-1 line-clamp-2">{listing.description}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm font-sans text-muted-foreground">
                {mileageLabel && <span>{mileageLabel}</span>}
                {versionLabel && <span>{versionLabel}</span>}
                {doorsLabel && <span>{doorsLabel}</span>}
                {listing.vehicle?.fuel && <span>{listing.vehicle.fuel}</span>}
                {listing.vehicle?.transmission && <span>{listing.vehicle.transmission}</span>}
                {listing.vehicle?.bodyStyle && <span>{listing.vehicle.bodyStyle}</span>}
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
        );
      })}
    </div>
  );
}
