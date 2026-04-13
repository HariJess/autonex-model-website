import { Link } from "react-router-dom";
import { Bed, Maximize, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import type { DisplayListing, ListingType } from "@/types/listing";
import { LISTING_TYPE_LABELS } from "@/types/listing";

const STUDIO_TYPES: ListingType[] = ["appartement", "villa", "maison"];

interface ListingCardProps {
  listing: DisplayListing;
  agencyName?: string;
  agencyLogo?: string;
  /** When set (e.g. « résultats proches »), shows a subtle hint under the title */
  matchBadge?: string;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop";

const ListingCard = ({ listing, agencyName, agencyLogo, matchBadge }: ListingCardProps) => {
  const images = listing.images.length > 0 ? listing.images : [PLACEHOLDER_IMAGE];
  const [imgIndex, setImgIndex] = useState(0);
  const { formatPrice, formatPriceSecondary } = useCurrency();

  const badgeLabels: Record<string, { label: string; className: string }> = {
    boost: { label: "Boost", className: "gradient-primary" },
    coup_de_coeur: { label: "Coup de cœur", className: "bg-accent" },
    nouveau: { label: "Nouveau", className: "bg-success" },
    urgent: { label: "Urgent", className: "bg-destructive" },
  };

  const displayAgencyName = agencyName ?? listing.agency_name;
  const displayAgencyLogo = agencyLogo ?? listing.agency_logo;
  const city = listing.ville ?? "";
  const region = listing.region ?? "";

  return (
    <div className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Image area — fully clickable */}
      <Link to={`/annonce/${listing.id}`} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={images[imgIndex]}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
        />
        {listing.badge && badgeLabels[listing.badge] && (
          <div className="absolute top-3 left-3">
            <Badge className={`${badgeLabels[listing.badge].className} text-xs font-semibold px-3 py-1`} style={{ color: "#FAFAFA" }}>
              {badgeLabels[listing.badge].label}
            </Badge>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex((i) => (i > 0 ? i - 1 : images.length - 1)); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 min-h-10 min-w-10 inline-flex items-center justify-center rounded-full bg-card/85 backdrop-blur-sm shadow-sm border border-border/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity touch-manipulation active:scale-95"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex((i) => (i < images.length - 1 ? i + 1 : 0)); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-10 min-w-10 inline-flex items-center justify-center rounded-full bg-card/85 backdrop-blur-sm shadow-sm border border-border/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity touch-manipulation active:scale-95"
              aria-label="Photo suivante"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? "bg-white" : "bg-white/50"}`} />
              ))}
              {images.length > 5 && <span className="w-1.5 h-1.5 rounded-full bg-white/50" />}
            </div>
          </>
        )}
        {displayAgencyLogo && (
          <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full overflow-hidden border-2 border-card shadow-sm">
            <img
              src={displayAgencyLogo}
              alt={displayAgencyName ?? ""}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
      </Link>

      <Link to={`/annonce/${listing.id}`} className="block p-4 max-lg:p-5 space-y-2.5">
        <div>
          <p className="text-xl max-sm:text-[1.35rem] font-bold text-primary font-sans tracking-tight">{formatPrice(listing.price_mga)}</p>
          <p className="text-xs text-muted-foreground font-sans mt-0.5">{formatPriceSecondary(listing.price_mga)}</p>
        </div>
        <h3 className="font-serif font-semibold text-base max-lg:text-[1.05rem] text-foreground leading-snug">{listing.title}</h3>
        {matchBadge && (
          <p className="text-[11px] font-sans text-muted-foreground border border-border/80 rounded-md px-2 py-0.5 w-fit bg-muted/40">
            {matchBadge}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-sans flex-wrap">
          {listing.rooms != null && listing.rooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {listing.rooms}
            </span>
          )}
          {listing.rooms === 0 && STUDIO_TYPES.includes(listing.type) && (
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Studio
            </span>
          )}
          {listing.surface != null && listing.surface > 0 && (
            <span className="flex items-center gap-1">
              <Maximize className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {listing.surface}m²
            </span>
          )}
          <span className="capitalize">{LISTING_TYPE_LABELS[listing.type] ?? listing.type}</span>
        </div>
        <p className="text-xs text-muted-foreground font-sans font-medium max-lg:text-[13px]">{city}{region ? `, ${region}` : ""}</p>
      </Link>
    </div>
  );
};

export default ListingCard;
