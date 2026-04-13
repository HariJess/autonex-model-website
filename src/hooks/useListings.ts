import { useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { DisplayListing, ListingType, TransactionType } from "@/types/listing";

type ListingRowLite = Pick<
  Tables<"listings">,
  | "id"
  | "title"
  | "description"
  | "type"
  | "transaction"
  | "price_mga"
  | "price_eur"
  | "surface"
  | "rooms"
  | "bathrooms"
  | "toilets"
  | "ville"
  | "region"
  | "arrondissement"
  | "quartier"
  | "quartier_libre"
  | "lat"
  | "lng"
  | "features"
  | "status"
  | "views_count"
  | "created_at"
  | "owner_id"
  | "video_url"
  | "virtual_tour_url"
  | "internal_ref"
  | "is_new_program"
  | "rejection_reason"
  | "pending_boost_types"
>;

const LISTING_SELECT_COLUMNS = [
  "id",
  "title",
  "description",
  "type",
  "transaction",
  "price_mga",
  "price_eur",
  "surface",
  "rooms",
  "bathrooms",
  "toilets",
  "ville",
  "region",
  "arrondissement",
  "quartier",
  "quartier_libre",
  "lat",
  "lng",
  "features",
  "status",
  "views_count",
  "created_at",
  "owner_id",
  "video_url",
  "virtual_tour_url",
  "internal_ref",
  "is_new_program",
  "rejection_reason",
  "pending_boost_types",
].join(",");

function mapListingRowToDisplayListing(
  listing: ListingRowLite,
  extras?: {
    images?: string[];
    badge?: DisplayListing["badge"];
    visibilityRankScore?: number;
    ownerName?: string | null;
    ownerPhone?: string | null;
    agencyName?: string | null;
    agencySlug?: string | null;
    agencyLogo?: string | null;
    agencyVerified?: boolean;
  },
): DisplayListing {
  const features = Array.isArray(listing.features) ? (listing.features as string[]) : [];
  const pendingBoosts = Array.isArray(listing.pending_boost_types)
    ? (listing.pending_boost_types as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    type: listing.type as ListingType,
    transaction: listing.transaction as TransactionType,
    price_mga: listing.price_mga,
    price_eur: listing.price_eur ? Number(listing.price_eur) : null,
    surface: listing.surface,
    rooms: listing.rooms,
    bathrooms: listing.bathrooms,
    toilets: listing.toilets,
    ville: listing.ville,
    region: listing.region,
    arrondissement: listing.arrondissement,
    quartier: listing.quartier,
    quartier_libre: listing.quartier_libre,
    lat: listing.lat != null && listing.lat !== "" ? Number(listing.lat) : null,
    lng: listing.lng != null && listing.lng !== "" ? Number(listing.lng) : null,
    features,
    images: extras?.images ?? [],
    status: listing.status,
    views_count: listing.views_count,
    created_at: listing.created_at,
    owner_id: listing.owner_id,
    owner_name: extras?.ownerName ?? null,
    owner_phone: extras?.ownerPhone ?? null,
    agency_name: extras?.agencyName ?? null,
    agency_slug: extras?.agencySlug ?? null,
    agency_logo: extras?.agencyLogo ?? null,
    agency_verified: extras?.agencyVerified ?? false,
    badge: extras?.badge ?? null,
    visibility_rank_score: extras?.visibilityRankScore,
    video_url: listing.video_url,
    virtual_tour_url: listing.virtual_tour_url,
    internal_ref: listing.internal_ref,
    is_new_program: listing.is_new_program,
    rejection_reason: listing.rejection_reason,
    pending_boost_types: pendingBoosts.length > 0 ? pendingBoosts : undefined,
  };
}

async function fetchListingById(id: string | undefined): Promise<DisplayListing | null> {
  if (!id) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const { data: listing, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erreur de chargement: ${error.message}`);
  if (!listing) return null;

  const { data: photos } = await supabase
    .from("listing_photos")
    .select("url, position")
    .eq("listing_id", listing.id)
    .order("position", { ascending: true });

  const { data: profileRow, error: profileRpcError } = await supabase.rpc("get_profile_for_listing_display", {
    p_owner_id: listing.owner_id,
  });
  if (profileRpcError) {
    throw new Error(`Profil: ${profileRpcError.message}`);
  }
  const profile = Array.isArray(profileRow) ? profileRow[0] : profileRow;

  let agencyInfo: { name: string; slug: string; logo_url: string | null; verified: boolean | null } | null = null;
  if (profile?.agency_id) {
    const { data } = await supabase
      .from("agencies")
      .select("name, slug, logo_url, verified")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agencyInfo = data;
  }

  let badge: DisplayListing["badge"] = null;
  const { data: boosts } = await supabase
    .from("boosts")
    .select("type")
    .eq("listing_id", listing.id)
    .gte("ends_at", new Date().toISOString());
  const boostTypes = new Set((boosts ?? []).map((b) => b.type));
  if (boostTypes.has("top")) badge = "boost";
  else if (boostTypes.has("featured")) badge = "coup_de_coeur";
  else if (boostTypes.has("urgent")) badge = "urgent";

  return mapListingRowToDisplayListing(listing, {
    images: photos?.map((p) => p.url) ?? [],
    badge,
    ownerName: profile?.full_name ?? null,
    ownerPhone: null,
    agencyName: agencyInfo?.name ?? null,
    agencySlug: agencyInfo?.slug ?? null,
    agencyLogo: agencyInfo?.logo_url ?? null,
    agencyVerified: agencyInfo?.verified ?? false,
  });
}

/** Fetch a single listing by UUID with photos & owner info */
export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id),
    enabled: !!id,
    retry: 1,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function prefetchListing(queryClient: QueryClient, id: string | undefined): Promise<void> {
  if (!id) return Promise.resolve();
  return queryClient
    .prefetchQuery({
      queryKey: ["listing", id],
      queryFn: () => fetchListingById(id),
      staleTime: 60_000,
      gcTime: 10 * 60_000,
    })
    .then(() => undefined);
}

export interface ListingsFilters {
  transaction?: string;
  types?: string[];
  ville?: string;
  /** Free-text search (title, description, quartier, region, etc.) — server-side ilike OR */
  freeText?: string;
  priceMin?: number;
  priceMax?: number;
  rooms?: number[];
  bathrooms?: number[];
  surfaceMin?: number;
  surfaceMax?: number;
  searchText?: string;
  limit?: number;
  ownerIds?: string[];
  /** When set, only these listing IDs (e.g. boosted featured rail). Other filters ignored. */
  listingIds?: string[];
  /**
   * Search page only: widen DB filters (price/rooms/surface) so client-side logic can show
   * strict matches vs. « résultats proches ». Other callers should omit this (strict DB match).
   */
  searchRelaxation?: boolean;
}

/** Strip characters that would break PostgREST `or` / `ilike` filters */
function sanitizeIlikeTerm(raw: string): string {
  return raw.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
}

const CLOSE_MATCH_PRICE_FACTOR = 1.25;
const CLOSE_MATCH_SURFACE_MAX_FACTOR = 1.15;

/** ±1 chambre (et voisinage « 5+ ») pour élargir la requête SQL */
function expandRoomsForRelaxedQuery(rooms: number[]): number[] {
  const out = new Set<number>();
  for (const r of rooms) {
    if (r === 5) {
      for (let i = 4; i <= 20; i++) out.add(i);
    } else {
      out.add(Math.max(0, r - 1));
      out.add(r);
      out.add(Math.min(99, r + 1));
    }
  }
  return Array.from(out);
}

function expandBathroomsForRelaxedQuery(bathrooms: number[]): number[] {
  const out = new Set<number>();
  for (const b of bathrooms) {
    if (b === 4) {
      for (let i = 3; i <= 12; i++) out.add(i);
    } else {
      out.add(Math.max(1, b - 1));
      out.add(b);
      out.add(Math.min(99, b + 1));
    }
  }
  return Array.from(out);
}

/** Fetch active listings from Supabase with optional filters */
export function useDbListings(filters: ListingsFilters = {}) {
  return useQuery({
    queryKey: ["db-listings", filters],
    queryFn: async (): Promise<DisplayListing[]> => {
      if (filters.limit === 0) return [];

      let query = supabase
        .from("listings")
        .select(LISTING_SELECT_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      const idsOnly = filters.listingIds && filters.listingIds.length > 0;
      const relaxed = filters.searchRelaxation === true;

      if (idsOnly) {
        query = query.in("id", filters.listingIds!);
      } else {
        if (filters.transaction) {
          query = query.eq("transaction", filters.transaction as TransactionType);
        }
        if (filters.types && filters.types.length > 0) {
          query = query.in("type", filters.types as ListingType[]);
        }
        if (filters.ville) {
          query = query.eq("ville", filters.ville);
        }
        const ft = filters.freeText?.trim();
        if (ft) {
          const safe = sanitizeIlikeTerm(ft);
          if (safe.length >= 1) {
            const p = `%${safe}%`;
            query = query.or(
              `title.ilike.${p},description.ilike.${p},quartier.ilike.${p},quartier_libre.ilike.${p},region.ilike.${p},ville.ilike.${p}`,
            );
          }
        }
        if (filters.ownerIds && filters.ownerIds.length > 0) {
          query = query.in("owner_id", filters.ownerIds);
        }
        if (filters.priceMin) {
          query = query.gte("price_mga", filters.priceMin);
        }
        if (filters.priceMax) {
          const cap = relaxed
            ? Math.ceil(filters.priceMax * CLOSE_MATCH_PRICE_FACTOR)
            : filters.priceMax;
          query = query.lte("price_mga", cap);
        }
        if (filters.rooms && filters.rooms.length > 0) {
          if (relaxed) {
            const expanded = expandRoomsForRelaxedQuery(filters.rooms);
            const under5 = [...new Set(expanded.filter((r) => r < 5))].sort((a, b) => a - b);
            const hasGte5 = expanded.some((r) => r >= 5);
            if (hasGte5 && under5.length > 0) {
              query = query.or(`rooms.in.(${under5.join(",")}),rooms.gte.5`);
            } else if (hasGte5) {
              query = query.gte("rooms", 4);
            } else {
              query = query.in("rooms", under5);
            }
          } else {
            const hasHighEnd = filters.rooms.includes(5);
            if (hasHighEnd) {
              const otherRooms = filters.rooms.filter((r) => r < 5);
              if (otherRooms.length > 0) {
                query = query.or(`rooms.in.(${otherRooms.join(",")}),rooms.gte.5`);
              } else {
                query = query.gte("rooms", 5);
              }
            } else {
              query = query.in("rooms", filters.rooms);
            }
          }
        }
        if (filters.bathrooms && filters.bathrooms.length > 0) {
          if (relaxed) {
            const expanded = expandBathroomsForRelaxedQuery(filters.bathrooms);
            const under4 = [...new Set(expanded.filter((b) => b < 4))].sort((a, b) => a - b);
            const hasGte4 = expanded.some((b) => b >= 4);
            if (hasGte4 && under4.length > 0) {
              query = query.or(`bathrooms.in.(${under4.join(",")}),bathrooms.gte.4`);
            } else if (hasGte4) {
              query = query.gte("bathrooms", 3);
            } else {
              query = query.in("bathrooms", under4);
            }
          } else {
            const hasPlus = filters.bathrooms.includes(4);
            const others = filters.bathrooms.filter((b) => b < 4);
            if (hasPlus && others.length > 0) {
              query = query.or(`bathrooms.in.(${others.join(",")}),bathrooms.gte.4`);
            } else if (hasPlus) {
              query = query.gte("bathrooms", 4);
            } else {
              query = query.in("bathrooms", others);
            }
          }
        }
        if (filters.surfaceMin) {
          const sm = relaxed ? Math.max(0, Math.floor(filters.surfaceMin * 0.88)) : filters.surfaceMin;
          query = query.gte("surface", sm);
        }
        if (filters.surfaceMax && filters.surfaceMax > 0) {
          const cap = relaxed
            ? Math.ceil(filters.surfaceMax * CLOSE_MATCH_SURFACE_MAX_FACTOR)
            : filters.surfaceMax;
          query = query.lte("surface", cap);
        }
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data: listings, error } = await query;
      if (error) throw new Error(`Erreur recherche: ${error.message}`);
      if (!listings || listings.length === 0) return [];

      // Batch-fetch photos
      const listingIds = listings.map((l) => l.id);
      const { data: allPhotos } = await supabase
        .from("listing_photos")
        .select("listing_id, url, position")
        .in("listing_id", listingIds)
        .order("position", { ascending: true });

      const photosByListing = new Map<string, string[]>();
      allPhotos?.forEach((p) => {
        const arr = photosByListing.get(p.listing_id) ?? [];
        arr.push(p.url);
        photosByListing.set(p.listing_id, arr);
      });

      // Batch-fetch boosts (starts_at sert au tri « actualisation » / daily_bump)
      const { data: allBoosts } = await supabase
        .from("boosts")
        .select("listing_id, type, starts_at")
        .in("listing_id", listingIds)
        .gte("ends_at", new Date().toISOString());

      const typesByListing = new Map<string, Set<string>>();
      const dailyBumpStarts = new Map<string, number>();
      allBoosts?.forEach((b) => {
        const set = typesByListing.get(b.listing_id) ?? new Set<string>();
        set.add(b.type);
        typesByListing.set(b.listing_id, set);
        if (b.type === "daily_bump" && b.starts_at) {
          const t = new Date(b.starts_at).getTime();
          const prev = dailyBumpStarts.get(b.listing_id) ?? 0;
          if (t > prev) dailyBumpStarts.set(b.listing_id, t);
        }
      });

      const visibilityRankScore = (
        listing: (typeof listings)[0],
        types: Set<string>,
      ): number => {
        const created = new Date(listing.created_at ?? 0).getTime();
        let tier = 0;
        if (types.has("top")) tier = 4;
        else if (types.has("featured")) tier = 3;
        else if (types.has("daily_bump")) tier = 2;
        else if (types.has("urgent")) tier = 1;
        const bumpTs = dailyBumpStarts.get(listing.id);
        const recency =
          types.has("daily_bump") && bumpTs != null ? Math.max(created, bumpTs) : created;
        return tier * 1e15 + recency;
      };
      const badgeForTypes = (types: Set<string>): DisplayListing["badge"] => {
        if (types.has("top")) return "boost";
        if (types.has("featured")) return "coup_de_coeur";
        if (types.has("urgent")) return "urgent";
        return null;
      };

      return listings.map((listing) => {
        const tset = typesByListing.get(listing.id) ?? new Set<string>();
        return mapListingRowToDisplayListing(listing, {
          images: photosByListing.get(listing.id) ?? [],
          badge: badgeForTypes(tset),
          visibilityRankScore: visibilityRankScore(listing, tset),
        });
      });
    },
    retry: 1,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Counts active listings by city without downloading full listing rows.
 * Uses lightweight head-count queries per city as a scalable fallback when no SQL aggregation RPC exists.
 */
export async function fetchActiveListingCountsByVille(villeNames: string[]): Promise<Record<string, number>> {
  const uniqueVilles = Array.from(new Set(villeNames.filter((v) => v.trim().length > 0)));
  if (uniqueVilles.length === 0) return {};

  // Prefer a single aggregated DB call if available, and fallback safely.
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_active_listing_counts_by_ville", {
    p_villes: uniqueVilles,
  });
  if (!rpcError && Array.isArray(rpcData)) {
    const counts: Record<string, number> = {};
    for (const row of rpcData as Array<{ ville?: string | null; count?: number | null }>) {
      if (typeof row?.ville === "string" && row.ville.trim()) {
        counts[row.ville] = Number(row.count ?? 0);
      }
    }
    return counts;
  }

  const results = await Promise.all(
    uniqueVilles.map(async (ville) => {
      const { count, error } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("ville", ville);
      if (error) return [ville, 0] as const;
      return [ville, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(results);
}
