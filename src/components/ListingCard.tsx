import { Link } from "react-router-dom";
import { Heart, Bed, Maximize, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import type { DisplayListing } from "@/types/listing";
import { LISTING_TYPE_LABELS } from "@/types/listing";

interface ListingCardProps {
  listing: DisplayListing;
  agencyName?: string;
  agencyLogo?: string;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop";

const ListingCard = ({ listing, agencyName, agencyLogo }: ListingCardProps) => {
  const images = listing.images.length > 0 ? listing.images : [PLACEHOLDER_IMAGE];
  const [imgIndex, setImgIndex] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const { formatPrice, formatPriceSecondary } = useCurrency();

  const badgeLabels: Record<string, { label: string; className: string }> = {
    boost: { label: "Boost", className: "gradient-primary" },
    coup_de_coeur: { label: "Coup de cœur", className: "bg-accent" },
    nouveau: { label: "Nouveau", className: "bg-success" },
  };

  const displayAgencyName = agencyName ?? listing.agency_name;
  const displayAgencyLogo = agencyLogo ?? listing.agency_logo;
  const city = listing.ville ?? "";
  const region = listing.region ?? "";

  return (
    <div className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={images[imgIndex]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {listing.badge && badgeLabels[listing.badge] && (
          <div className="absolute top-3 left-3">
            <Badge className={`${badgeLabels[listing.badge].className} text-xs font-semibold px-3 py-1`} style={{ color: "#FAFAFA" }}>
              {badgeLabels[listing.badge].label}
            </Badge>
          </div>
        )}
        <button onClick={(e) => { e.preventDefault(); setFavorited(!favorited); }} className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors">
          <Heart className={`h-4 w-4 ${favorited ? "fill-accent text-accent" : "text-foreground"}`} />
        </button>
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.preventDefault(); setImgIndex((i) => (i > 0 ? i - 1 : images.length - 1)); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={(e) => { e.preventDefault(); setImgIndex((i) => (i < images.length - 1 ? i + 1 : 0)); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        {displayAgencyLogo && (
          <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full overflow-hidden border-2 border-card shadow-sm">
            <img src={displayAgencyLogo} alt={displayAgencyName ?? ""} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <Link to={`/annonce/${listing.id}`} className="block p-4 space-y-2">
        <div>
          <p className="text-lg font-bold text-primary font-sans">{formatPrice(listing.price_mga)}</p>
          <p className="text-xs text-muted-foreground font-sans">{formatPriceSecondary(listing.price_mga)}</p>
        </div>
        <h3 className="font-serif font-semibold text-foreground leading-tight">{listing.title}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-sans">
          {listing.rooms != null && listing.rooms > 0 && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{listing.rooms}</span>}
          {listing.surface != null && listing.surface > 0 && <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{listing.surface}m²</span>}
          <span className="capitalize">{LISTING_TYPE_LABELS[listing.type] ?? listing.type}</span>
        </div>
        <p className="text-xs text-muted-foreground font-sans">{city}{region ? `, ${region}` : ""}</p>
      </Link>
    </div>
  );
};

export default ListingCard;
