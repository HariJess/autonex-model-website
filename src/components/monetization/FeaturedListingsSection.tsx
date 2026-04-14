import { Link } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import ListingCard from "@/components/ListingCard";
import { useDbListings } from "@/hooks/useListings";
import { useFeaturedBoostListingIds } from "@/hooks/useFeaturedBoosts";
import { FeaturedPill } from "./MonetizationLabels";

interface FeaturedListingsSectionProps {
  title?: string;
  limit?: number;
  enabled?: boolean;
}

/** Rail « mis en avant » : annonces avec boost top/featured (stock réel), sinon dernières annonces. */
export function FeaturedListingsSection({
  title = "Biens mis en avant",
  limit = 8,
  enabled = true,
}: FeaturedListingsSectionProps) {
  const { data: boostIds = [], isLoading: idLoading } = useFeaturedBoostListingIds(limit);
  const idsReady = !idLoading;
  const hasBoosted = boostIds.length > 0;

  const { data: boostedListings = [], isLoading: loadBoosted } = useDbListings(
    idsReady && hasBoosted && enabled ? { listingIds: boostIds, limit } : { limit: 0 },
  );

  const { data: fallbackListings = [], isLoading: loadFallback } = useDbListings(
    idsReady && !hasBoosted && enabled ? { limit } : { limit: 0 },
  );

  const listings = hasBoosted ? boostedListings : fallbackListings;
  const loading = enabled && (idLoading || (hasBoosted ? loadBoosted : loadFallback));

  if (!enabled) return null;

  return (
    <section className="container mx-auto px-4 py-14">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
          <FeaturedPill />
        </div>
        <Link to="/recherche" className="text-primary font-sans text-sm font-medium flex items-center gap-1 hover:underline">
          Voir tout <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground font-sans">Aucune annonce à afficher pour le moment.</p>
          <p className="text-xs text-muted-foreground font-sans mt-2">
            Le catalogue AutoNex est prêt: publiez le premier véhicule pour lancer la vitrine.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
      {!hasBoosted && listings.length > 0 && (
        <p className="text-center text-xs text-muted-foreground font-sans mt-6 max-w-2xl mx-auto">
          Les annonces avec boost « top » ou « mise en avant » apparaîtront ici en priorité lorsqu’elles seront actives.
        </p>
      )}
    </section>
  );
}
