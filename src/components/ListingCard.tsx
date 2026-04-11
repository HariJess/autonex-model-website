import { Link } from "react-router-dom";
import { Heart, Bed, Maximize, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMGA, mgaToEur, formatEUR } from "@/config/currency";
import { useState } from "react";
import type { SeedListing } from "@/data/seed-listings";

interface ListingCardProps {
  listing: SeedListing;
  agencyName?: string;
  agencyLogo?: string;
}

const ListingCard = ({ listing, agencyName, agencyLogo }: ListingCardProps) => {
  const [imgIndex, setImgIndex] = useState(0);
  const [favorited, setFavorited] = useState(false);

  const badgeLabels: Record<string, { label: string; className: string }> = {
    boost: { label: "Boost", className: "gradient-primary" },
    coup_de_coeur: { label: "Coup de cœur", className: "bg-accent" },
    nouveau: { label: "Nouveau", className: "bg-success" },
  };

  return (
    <div className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={listing.images[imgIndex]}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Badge */}
        {listing.badge && (
          <div className="absolute top-3 left-3">
            <Badge className={`${badgeLabels[listing.badge].className} text-xs font-semibold px-3 py-1`} style={{ color: '#FAFAFA' }}>
              {badgeLabels[listing.badge].label}
            </Badge>
          </div>
        )}
        {/* Favorite */}
        <button
          onClick={(e) => { e.preventDefault(); setFavorited(!favorited); }}
          className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
        >
          <Heart className={`h-4 w-4 ${favorited ? 'fill-accent text-accent' : 'text-foreground'}`} />
        </button>
        {/* Image nav */}
        {listing.images.length > 1 && (
          <>
            <button onClick={(e) => { e.preventDefault(); setImgIndex(i => i > 0 ? i - 1 : listing.images.length - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={(e) => { e.preventDefault(); setImgIndex(i => i < listing.images.length - 1 ? i + 1 : 0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        {/* Agency mini */}
        {agencyLogo && (
          <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full overflow-hidden border-2 border-card shadow-sm">
            <img src={agencyLogo} alt={agencyName} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <Link to={`/annonce/${listing.id}`} className="block p-4 space-y-2">
        <div>
          <p className="text-lg font-bold text-primary font-sans">{formatMGA(listing.price_mga)}</p>
          <p className="text-xs text-muted-foreground font-sans">{formatEUR(mgaToEur(listing.price_mga))}</p>
        </div>
        <h3 className="font-serif font-semibold text-foreground leading-tight">{listing.title}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-sans">
          {listing.rooms > 0 && (
            <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{listing.rooms}</span>
          )}
          <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{listing.surface}m²</span>
        </div>
        <p className="text-xs text-muted-foreground font-sans">{listing.city}, {listing.region}</p>
      </Link>
    </div>
  );
};

export default ListingCard;
