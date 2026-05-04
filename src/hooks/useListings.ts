import { useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { DisplayListing, ListingType, TransactionType } from "@/types/listing";
import { deriveVehicleFromLegacy } from "@/lib/vehicleModel";
import { stripVehicleMetaTags } from "@/lib/vehicleMetaTags";
import {
  applyListingFilters,
  type FilterableListingQuery,
  type ListingsFilters,
} from "@/lib/listingQueryFilters";

export type { ListingsFilters } from "@/lib/listingQueryFilters";

// Audit fix M12 — single source of truth for the listing column subset used
// by useDbListings + useListingById. Both the runtime `.select()` string and
// the compile-time `ListingRowLite` Pick are derived from this one array, so
// adding a column means editing exactly one place. Without this, the array
// and the Pick had to be kept in sync manually (51 entries × 2).
const LISTING_SELECT_COLUMN_NAMES = [
  "id",
  "title",
  "description",
  "type",
  "transaction",
  "price_mga",
  "price_eur",
  "negotiable",
  "ville",
  "availability_status",
  "body_style",
  "doors",
  "drivetrain",
  "exterior_color",
  "engine_displacement_l",
  "fuel",
  "interior_color",
  "is_electric",
  "is_hybrid",
  "make",
  "mileage_km",
  "model",
  "rental_mode",
  "seats",
  "seller_type",
  "transmission_gearbox",
  "vehicle_condition",
  "whatsapp_phone",
  "year",
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
  "original_price_mga",
  "video_url",
  "virtual_tour_url",
  "internal_ref",
  "is_new_program",
  "rejection_reason",
  "pending_boost_types",
] as const satisfies readonly (keyof Tables<"listings">)[];

// PROMPT 6 boost denormalized cols. Pas dans le strict array tant que la
// migration boost_system n'a pas regen les types. Cast manuel ci-dessous.
const BOOST_DENORMALIZED_COL_NAMES = [
  "last_bumped_at",
  "featured_until",
  "top_ad_until",
] as const;

type ListingRowLite = Pick<Tables<"listings">, typeof LISTING_SELECT_COLUMN_NAMES[number]> & {
  // PROMPT 6 — cast manuel jusqu'au regen post-migration. Toutes nullables.
  last_bumped_at?: string | null;
  featured_until?: string | null;
  top_ad_until?: string | null;
};

const LISTING_SELECT_COLUMNS = [
  ...LISTING_SELECT_COLUMN_NAMES,
  ...BOOST_DENORMALIZED_COL_NAMES,
].join(",");

function isListingRowLite(row: unknown): row is ListingRowLite {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.title === "string" && typeof r.owner_id === "string";
}

function isCatalogUnavailableErrorMessage(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    m.includes("relation") ||
    m.includes("public.listings") ||
    m.includes("does not exist")
  );
}

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
    sellerVerified?: boolean;
    hasWhatsappContact?: boolean;
  },
): DisplayListing {
  const rawFeatures = Array.isArray(listing.features) ? (listing.features as string[]) : [];
  const features = stripVehicleMetaTags(rawFeatures);
  const pendingBoosts = Array.isArray(listing.pending_boost_types)
    ? (listing.pending_boost_types as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  const vehicle = deriveVehicleFromLegacy({
    title: listing.title,
    mileageKm: listing.mileage_km,
    doors: listing.doors,
    make: listing.make,
    model: listing.model,
    year: listing.year,
    fuel: listing.fuel,
    transmission: listing.transmission_gearbox,
    drivetrain: listing.drivetrain,
    bodyStyle: listing.body_style,
    rentalMode: listing.rental_mode,
    seats: listing.seats,
    exteriorColor: listing.exterior_color,
    engineDisplacementL: listing.engine_displacement_l,
    interiorColor: listing.interior_color,
    availabilityStatus: listing.availability_status,
    isElectric: listing.is_electric,
    isHybrid: listing.is_hybrid,
    vehicleCondition: listing.vehicle_condition,
    sellerType: listing.seller_type,
    isNewProgram: listing.is_new_program,
    features: rawFeatures,
    agencyName: extras?.agencyName ?? null,
  });

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    type: listing.type as ListingType,
    transaction: listing.transaction as TransactionType,
    price_mga: listing.price_mga,
    price_eur: listing.price_eur ? Number(listing.price_eur) : null,
    negotiable: Boolean(listing.negotiable),
    ville: listing.ville,
    region: listing.region,
    arrondissement: listing.arrondissement,
    quartier: listing.quartier,
    quartier_libre: listing.quartier_libre,
    lat: listing.lat != null && Number.isFinite(Number(listing.lat)) ? Number(listing.lat) : null,
    lng: listing.lng != null && Number.isFinite(Number(listing.lng)) ? Number(listing.lng) : null,
    features,
    images: extras?.images ?? [],
    status: listing.status,
    views_count: listing.views_count,
    created_at: listing.created_at,
    owner_id: listing.owner_id,
    original_price_mga: listing.original_price_mga,
    owner_name: extras?.ownerName ?? null,
    owner_phone: extras?.ownerPhone ?? null,
    has_whatsapp_contact: extras?.hasWhatsappContact ?? Boolean(listing.whatsapp_phone?.trim()),
    agency_name: extras?.agencyName ?? null,
    agency_slug: extras?.agencySlug ?? null,
    agency_logo: extras?.agencyLogo ?? null,
    agency_verified: extras?.agencyVerified ?? false,
    seller_verified: extras?.sellerVerified ?? false,
    badge: extras?.badge ?? null,
    visibility_rank_score: extras?.visibilityRankScore,
    video_url: listing.video_url,
    virtual_tour_url: listing.virtual_tour_url,
    internal_ref: listing.internal_ref,
    is_new_program: listing.is_new_program,
    rejection_reason: listing.rejection_reason,
    pending_boost_types: pendingBoosts.length > 0 ? pendingBoosts : undefined,
    vehicle,
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
  if (!listing || !isListingRowLite(listing)) return null;

  const endsAfter = new Date().toISOString();
  const [
    photosRes,
    profileRes,
    boostsRes,
    whatsappRes,
    sellerBadgeRes,
  ] = await Promise.all([
    supabase
      .from("listing_photos")
      .select("url, position")
      .eq("listing_id", listing.id)
      .order("position", { ascending: true }),
    listing.owner_id
      ? supabase.rpc("get_profile_for_listing_display", {
          p_owner_id: listing.owner_id,
        })
      : Promise.resolve({ data: null, error: null } as const),
    supabase.from("boosts").select("type").eq("listing_id", listing.id).gte("ends_at", endsAfter),
    supabase.rpc("listing_has_whatsapp_contact", {
      p_listing_id: listing.id,
    }),
    listing.owner_id
      ? supabase
          .from("active_seller_badges")
          .select("user_id")
          .eq("user_id", listing.owner_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
  ]);

  const { data: photos } = photosRes;
  const { data: profileRow, error: profileRpcError } = profileRes;
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

  const boostTypes = new Set((boostsRes.data ?? []).map((b) => b.type));
  const badge: DisplayListing["badge"] = badgeForListing(listing, boostTypes);

  const { data: hasWhatsappRaw, error: hasWhatsappErr } = whatsappRes;
  const sellerVerified = !!sellerBadgeRes?.data;

  return mapListingRowToDisplayListing(listing, {
    images: photos?.map((p) => p.url) ?? [],
    badge,
    ownerName: profile?.full_name ?? null,
    ownerPhone: null,
    hasWhatsappContact: !hasWhatsappErr && hasWhatsappRaw === true,
    agencyName: agencyInfo?.name ?? null,
    agencySlug: agencyInfo?.slug ?? null,
    agencyLogo: agencyInfo?.logo_url ?? null,
    agencyVerified: agencyInfo?.verified ?? false,
    sellerVerified,
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

/**
 * Score composite côté client utilisé en fallback dans search (cf.
 * `searchResultsModel.ts`). PROMPT 6 V1 : tiers basés sur les colonnes
 * denormalized `top_ad_until`, `featured_until`, `last_bumped_at`. Les
 * legacy types (`top`, `featured`, `daily_bump`, `urgent`) restent
 * supportés en fallback pour les boosts insérés AVANT la migration
 * (rétrocompat anti-régression).
 */
function visibilityRankScore(listing: ListingRowLite, types: Set<string>, dailyBumpStarts: Map<string, number>): number {
  const now = Date.now();
  const created = new Date(listing.created_at ?? 0).getTime();
  const topAdActive =
    typeof listing.top_ad_until === "string" && new Date(listing.top_ad_until).getTime() > now;
  const featuredActive =
    typeof listing.featured_until === "string" && new Date(listing.featured_until).getTime() > now;
  const lastBumped =
    typeof listing.last_bumped_at === "string" ? new Date(listing.last_bumped_at).getTime() : null;

  let tier = 0;
  if (topAdActive || types.has("top_ad") || types.has("top")) tier = 4;
  else if (featuredActive || types.has("featured")) tier = 3;
  else if (lastBumped != null || types.has("bump") || types.has("daily_bump")) tier = 2;
  else if (types.has("urgent")) tier = 1;

  const bumpTs = dailyBumpStarts.get(listing.id);
  const recency = lastBumped != null
    ? Math.max(created, lastBumped)
    : types.has("daily_bump") && bumpTs != null
      ? Math.max(created, bumpTs)
      : created;
  return tier * 1e15 + recency;
}

/**
 * PROMPT 6 V1 : priorité top_ad > featured > legacy. 1 badge max par card
 * (pas de stacking V1, surface mobile limitée). Fallback sur les types
 * boost insérés pré-PROMPT 6 si les colonnes denormalized sont vides.
 */
function badgeForListing(listing: ListingRowLite, types: Set<string>): DisplayListing["badge"] {
  const now = Date.now();
  const topAdActive =
    typeof listing.top_ad_until === "string" && new Date(listing.top_ad_until).getTime() > now;
  if (topAdActive || types.has("top_ad")) return "top_ad";
  const featuredActive =
    typeof listing.featured_until === "string" && new Date(listing.featured_until).getTime() > now;
  if (featuredActive || types.has("featured")) return "featured";
  // Legacy fallback (boosts pré-PROMPT 6)
  if (types.has("top")) return "boost";
  if (types.has("urgent")) return "urgent";
  return null;
}

async function enrichListingsWithRelatedData(listings: ListingRowLite[]): Promise<DisplayListing[]> {
  if (listings.length === 0) return [];

  const listingIds = listings.map((l) => l.id);
  // PROMPT 7 — batch query active_seller_badges pour propager seller_verified
  const ownerIds = Array.from(
    new Set(
      listings
        .map((l) => l.owner_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  const [{ data: allPhotos }, { data: allBoosts }, { data: verifiedRows }] = await Promise.all([
    supabase
      .from("listing_photos")
      .select("listing_id, url, position")
      .in("listing_id", listingIds)
      .order("position", { ascending: true }),
    supabase
      .from("boosts")
      .select("listing_id, type, starts_at")
      .in("listing_id", listingIds)
      .gte("ends_at", new Date().toISOString()),
    ownerIds.length > 0
      ? supabase
          .from("active_seller_badges")
          .select("user_id")
          .in("user_id", ownerIds)
      : Promise.resolve({ data: [] as Array<{ user_id: string | null }>, error: null }),
  ]);

  const verifiedSellers = new Set<string>();
  for (const row of verifiedRows ?? []) {
    if (typeof row?.user_id === "string") verifiedSellers.add(row.user_id);
  }

  const photosByListing = new Map<string, string[]>();
  allPhotos?.forEach((p) => {
    const arr = photosByListing.get(p.listing_id) ?? [];
    arr.push(p.url);
    photosByListing.set(p.listing_id, arr);
  });

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

  return listings.map((listing) => {
    const tset = typesByListing.get(listing.id) ?? new Set<string>();
    return mapListingRowToDisplayListing(listing, {
      images: photosByListing.get(listing.id) ?? [],
      badge: badgeForListing(listing, tset),
      visibilityRankScore: visibilityRankScore(listing, tset, dailyBumpStarts),
      sellerVerified: listing.owner_id ? verifiedSellers.has(listing.owner_id) : false,
    });
  });
}

/** Fetch active listings from Supabase with optional filters */
export function useDbListings(filters: ListingsFilters = {}) {
  return useQuery({
    queryKey: ["db-listings", filters],
    queryFn: async (): Promise<DisplayListing[]> => {
      if (filters.limit === 0) return [];

      // PROMPT 6 — tri composite boost-aware. Index `idx_listings_feed_rank`
      // garantit la perf. NULLS LAST = annonces sans boost en queue dans
      // chaque tier. Cast `as any` sur les colonnes pas encore typées
      // (regen post-migration nettoiera).
      const baseQuery = supabase
        .from("listings")
        .select(LISTING_SELECT_COLUMNS)
        .eq("status", "active")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .order("top_ad_until" as any, { ascending: false, nullsFirst: false })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .order("featured_until" as any, { ascending: false, nullsFirst: false })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .order("last_bumped_at" as any, { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      let query = applyListingFilters(baseQuery as unknown as FilterableListingQuery, filters) as typeof baseQuery;

      if (filters.limit != null && filters.limit > 0) {
        const offset = filters.offset != null && filters.offset > 0 ? filters.offset : 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data: listings, error } = await query;
      if (error) {
        if (isCatalogUnavailableErrorMessage(error.message)) {
          throw new Error(`Catalogue indisponible: ${error.message}`);
        }
        throw new Error(`Erreur recherche: ${error.message}`);
      }
      if (!listings || listings.length === 0) return [];
      const rows: ListingRowLite[] = [];
      for (const row of listings) {
        if (isListingRowLite(row)) rows.push(row);
      }
      return enrichListingsWithRelatedData(rows);
    },
    retry: 1,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Head-count using the same PostgREST filters as `useDbListings` — avoids downloading rows for hero / counters. */
export async function fetchFilteredActiveListingCount(filters: ListingsFilters): Promise<number> {
  if (filters.limit === 0) return 0;

  const baseQuery = supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const query = applyListingFilters(baseQuery as unknown as FilterableListingQuery, filters) as typeof baseQuery;

  const { count, error } = await query;
  if (error) {
    if (isCatalogUnavailableErrorMessage(error.message)) {
      throw new Error(`Catalogue indisponible: ${error.message}`);
    }
    throw new Error(`Erreur recherche: ${error.message}`);
  }
  return count ?? 0;
}

export function useFilteredActiveListingCount(filters: ListingsFilters) {
  return useQuery({
    queryKey: ["db-listings-count", filters],
    queryFn: () => fetchFilteredActiveListingCount(filters),
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
