import { useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useListing, useDbListings } from "@/hooks/useListings";
import { getSearchSessionId } from "@/lib/searchSession";

/**
 * Fetch annonce principale + annonces similaires + incrément vues (session, debounced).
 */
export function useListingDetailPageData(listingId: string | undefined) {
  const viewIncremented = useRef<string | null>(null);

  const { data: listing, isLoading, error: fetchError } = useListing(listingId);

  useEffect(() => {
    if (listing?.id && viewIncremented.current !== listing.id) {
      viewIncremented.current = listing.id;
      const timer = setTimeout(() => {
        const sessionId = getSearchSessionId();
        supabase.rpc("increment_views_public", { p_listing_id: listing.id, p_session_id: sessionId }).then(() => {});
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [listing?.id]);

  const { data: similar = [] } = useDbListings({
    ville: listing?.ville ?? undefined,
    types: listing?.type ? [listing.type] : undefined,
    transaction: listing?.transaction ?? undefined,
    limit: listing ? 5 : 0,
  });

  const filteredSimilar = useMemo(
    () => similar.filter((l) => l.id !== listing?.id).slice(0, 4),
    [similar, listing?.id],
  );

  return {
    listing,
    isLoading,
    fetchError,
    filteredSimilar,
  };
}
