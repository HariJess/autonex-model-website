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

/**
 * Rail « mis en avant » : annonces avec un boost top ou featured actif (non expiré).
 *
 * Contrainte métier: le rail doit rester PURE monétisation. Aucune annonce
 * ne doit apparaître ici si elle n'a pas payé un boost. Quand personne n'a
 * encore boosté, la section est masquée entièrement (plutôt qu'un fallback
 * « dernières annonces » qui diluerait la valeur du boost et créerait une
 * surprise désagréable pour les vendeurs non payants).
 */
export function FeaturedListingsSection({
  title = "Biens mis en avant",
  limit = 8,
  enabled = true,
}: FeaturedListingsSectionProps) {
  const { data: boostIds = [], isLoading: idLoading } = useFeaturedBoostListingIds(limit);
  const hasBoosted = boostIds.length > 0;

  const { data: boostedListings = [], isLoading: loadBoosted } = useDbListings(
    !idLoading && hasBoosted && enabled ? { listingIds: boostIds, limit } : { limit: 0 },
  );

  if (!enabled) return null;

  // Still resolving boost IDs → hide the whole section (no flicker with fallback).
  if (idLoading) return null;

  // No paid boosts active right now → section hidden. Return null, not a placeholder,
  // so the page flows seamlessly and users never see a half-empty monetized rail.
  if (!hasBoosted) return null;

  return (
    <section className="container mx-auto py-14">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
          <FeaturedPill />
        </div>
        <Link to="/recherche" className="text-primary font-sans text-sm font-medium flex items-center gap-1 hover:underline">
          Voir tout <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {loadBoosted ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : boostedListings.length === 0 ? (
        // Boost IDs exist but the listings query returned nothing (listing deleted
        // or unpublished after the boost started). Hide the rail silently.
        null
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {boostedListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );
}
