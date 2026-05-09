import { useMemo } from "react";
import { useDbListings } from "@/hooks/useListings";
import { getDealMeta, type DealMeta } from "@/lib/deals";
import type { DisplayListing } from "@/types/listing";

export type DealEntry = { listing: DisplayListing; deal: DealMeta };

/**
 * Hook mutualisé pour les "Bonnes affaires" de la mini-app YAS.
 *
 * Utilisé par :
 * - `YasActionGrid` : pour décider si la card "Bonnes affaires" est affichée
 *   (`hasDeals`).
 * - `YasFeaturedDeals` : pour rendre la liste des deals (`deals`) + spinner
 *   (`isLoading`).
 *
 * React Query dédoublonne naturellement le fetch via la queryKey de
 * `useDbListings` (identique : `{ limit: 24 }`), mais on centralise ici la
 * logique métier (filtrage par `getDealMeta`, `PREVIEW_COUNT`) pour éviter la
 * duplication et garantir une source unique de vérité.
 *
 * Limit hardcodé à 24 : trade-off entre payload réseau et chances de trouver
 * au moins 4 deals pour la grid (`PREVIEW_COUNT`). Si un jour le ratio
 * deals/total baisse (peu de deals), on pourra remonter ce nombre ou créer
 * un endpoint RPC dédié côté Supabase qui filtre côté DB (cf. AUDIT PERF #4).
 */
const FETCH_LIMIT = 24;
const PREVIEW_COUNT = 4;

export function useYasDeals(): {
  deals: DealEntry[];
  hasDeals: boolean;
  isLoading: boolean;
} {
  const { data: listings = [], isLoading } = useDbListings({ limit: FETCH_LIMIT });

  const deals = useMemo<DealEntry[]>(() => {
    const filtered: DealEntry[] = [];
    for (const listing of listings) {
      const deal = getDealMeta(listing);
      if (deal) filtered.push({ listing, deal });
      if (filtered.length >= PREVIEW_COUNT) break;
    }
    return filtered;
  }, [listings]);

  return {
    deals,
    hasDeals: deals.length > 0,
    isLoading,
  };
}
