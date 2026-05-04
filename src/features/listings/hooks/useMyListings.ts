/**
 * useMyListings — listings du user courant + filtrage par tab + Realtime.
 *
 * Une seule query SELECT * FROM listings WHERE owner_id = userId. Filtrage
 * client + counts par catégorie calculés en O(N) sur les ~10-50 lignes
 * typiques. Évite N+1 round-trips pour chaque tab.
 *
 * Realtime : invalide le cache sur INSERT/UPDATE/DELETE listings du user.
 * Pattern channel name unique repris du hotfix Sentry useNotifications.
 */

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type MyListingsFilter =
  | "all"
  | "active"
  | "expiring_soon"
  | "expired"
  | "sold"
  | "draft";

/**
 * Type métier consommé par MyListingCard. cover_url est synthétisé depuis la
 * jointure listing_photos (la table listings n'a pas de colonne cover dédiée).
 * sold_price arrive de la migration PROMPT 4 (qui doit être appliquée pour que
 * le types regen le révèle ; en attendant on caste).
 */
export type MyListingRow = Pick<
  Tables<"listings">,
  | "id"
  | "title"
  | "price_mga"
  | "ville"
  | "type"
  | "status"
  | "expires_at"
  | "published_at"
  | "sold_at"
  | "views_count"
  | "contact_count"
  | "favorite_count"
  | "renewal_count"
  | "created_at"
  | "updated_at"
> & {
  cover_url: string | null;
  sold_price: number | null;
  // PROMPT 6 : colonnes boost denormalized. Cast `as unknown as` à la lecture
  // tant que la migration boost_system n'est pas appliquée + types regen
  // (alignement identique à sold_price PROMPT 4).
  last_bumped_at: string | null;
  featured_until: string | null;
  top_ad_until: string | null;
};

export interface UseMyListingsResult {
  listings: MyListingRow[];
  counts: Record<MyListingsFilter, number>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const EMPTY_COUNTS: Record<MyListingsFilter, number> = {
  all: 0,
  active: 0,
  expiring_soon: 0,
  expired: 0,
  sold: 0,
  draft: 0,
};

// Sous-select listing_photos(url, position) pour synthétiser cover_url côté client.
// Le types regen Supabase ne typant pas encore sold_price (migration PROMPT 4
// pas encore appliquée), on cast la réponse en `unknown as ...` pour passer.
const SELECT_COLS =
  "id, title, price_mga, ville, type, status, expires_at, " +
  "published_at, sold_at, sold_price, views_count, contact_count, favorite_count, " +
  "renewal_count, created_at, updated_at, " +
  // PROMPT 6 boost denormalized cols.
  "last_bumped_at, featured_until, top_ad_until, " +
  "listing_photos(url, position)";

export const myListingsQueryKey = (userId: string | null | undefined) =>
  ["my-listings-dashboard", userId ?? null] as const;

type RawListingWithPhotos = Record<string, unknown> & {
  listing_photos?: Array<{ url: string | null; position: number | null }> | null;
};

async function fetchMyListings(userId: string): Promise<MyListingRow[]> {
  const { data, error } = await supabase
    .from("listings")
    // Cast volontaire : sold_price + listing_photos sub-select pas encore typés
    // par le regen (migration PROMPT 4 à appliquer en prod puis regen).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select(SELECT_COLS as any)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as RawListingWithPhotos[];

  return rows.map((row) => {
    const photos = (row.listing_photos ?? []).slice().sort((a, b) => {
      const pa = a.position ?? Number.POSITIVE_INFINITY;
      const pb = b.position ?? Number.POSITIVE_INFINITY;
      return pa - pb;
    });
    const coverUrl = photos.find((p) => p.url)?.url ?? null;
    // strip listing_photos avant cast final
    const { listing_photos: _photos, ...rest } = row;
    void _photos;
    return { ...rest, cover_url: coverUrl } as unknown as MyListingRow;
  });
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Détermine la catégorie d'un listing pour le filtrage par tab.
 * Logique alignée avec le brief PROMPT 4 :
 *   - draft : status = 'draft'
 *   - sold : status = 'sold'
 *   - expired : status = 'expired' OU expires_at <= now() (sauf sold/draft)
 *   - expiring_soon : status IN (active, expiring_soon) AND expires_at dans [now, now+7j]
 *   - active : status = 'active' AND expires_at > now+7j (ou pas d'expires_at)
 */
export function categorizeListingForTab(listing: MyListingRow, nowMs: number): MyListingsFilter[] {
  const cats: MyListingsFilter[] = ["all"];
  const status = listing.status;
  const expiresMs = listing.expires_at ? new Date(listing.expires_at).getTime() : null;

  if (status === "draft") {
    cats.push("draft");
    return cats;
  }
  if (status === "sold") {
    cats.push("sold");
    return cats;
  }
  if (status === "expired" || (expiresMs !== null && expiresMs <= nowMs)) {
    cats.push("expired");
    return cats;
  }
  if (
    (status === "active" || status === "expiring_soon") &&
    expiresMs !== null &&
    expiresMs > nowMs &&
    expiresMs <= nowMs + SEVEN_DAYS_MS
  ) {
    cats.push("expiring_soon");
    return cats;
  }
  if (status === "active") {
    cats.push("active");
    return cats;
  }
  // Statuts résiduels (pending_review, paused, etc.) : seulement dans 'all'
  return cats;
}

export function computeCounts(listings: MyListingRow[]): Record<MyListingsFilter, number> {
  const counts: Record<MyListingsFilter, number> = { ...EMPTY_COUNTS };
  const nowMs = Date.now();
  for (const l of listings) {
    for (const cat of categorizeListingForTab(l, nowMs)) {
      counts[cat] += 1;
    }
  }
  return counts;
}

export function filterListingsForTab(
  listings: MyListingRow[],
  filter: MyListingsFilter,
): MyListingRow[] {
  if (filter === "all") return listings;
  const nowMs = Date.now();
  return listings.filter((l) => categorizeListingForTab(l, nowMs).includes(filter));
}

export function useMyListings(filter: MyListingsFilter): UseMyListingsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: myListingsQueryKey(userId),
    queryFn: () => fetchMyListings(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Realtime — pattern hotfix Sentry : channel name unique par mount + try/catch.
  useEffect(() => {
    if (!userId) return;

    const channelName = `my-listings:${userId}:${Date.now()}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "listings", filter: `owner_id=eq.${userId}` },
          () => {
            void queryClient.invalidateQueries({ queryKey: ["my-listings-dashboard"] });
          },
        )
        .subscribe();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[useMyListings] realtime subscription failed", err);
      return;
    }

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId, queryClient]);

  const allListings = query.data ?? [];
  const counts = useMemo(() => computeCounts(allListings), [allListings]);
  const listings = useMemo(() => filterListingsForTab(allListings, filter), [allListings, filter]);

  return {
    listings,
    counts,
    isLoading: query.isPending && !!userId,
    error: (query.error as Error | null) ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}
