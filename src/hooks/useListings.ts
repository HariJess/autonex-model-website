import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DisplayListing, ListingType, TransactionType } from "@/types/listing";

/** Fetch a single listing by UUID with photos & owner info */
export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: async (): Promise<DisplayListing | null> => {
      if (!id) return null;
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return null;
      }
      const { data: listing, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !listing) return null;

      const { data: photos } = await supabase
        .from("listing_photos")
        .select("url, position")
        .eq("listing_id", listing.id)
        .order("position", { ascending: true });

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, agency_id")
        .eq("id", listing.owner_id)
        .maybeSingle();

      let agencyInfo: { name: string; slug: string; logo_url: string | null; verified: boolean | null } | null = null;
      if (profile?.agency_id) {
        const { data } = await supabase
          .from("agencies")
          .select("name, slug, logo_url, verified")
          .eq("id", profile.agency_id)
          .maybeSingle();
        agencyInfo = data;
      }

      // Check for active boosts
      let badge: DisplayListing["badge"] = null;
      const { data: boosts } = await supabase
        .from("boosts")
        .select("type")
        .eq("listing_id", listing.id)
        .gte("ends_at", new Date().toISOString())
        .limit(1);
      if (boosts && boosts.length > 0) {
        const boostType = boosts[0].type;
        if (boostType === "top") badge = "boost";
        else if (boostType === "featured") badge = "coup_de_coeur";
      }

      const features = Array.isArray(listing.features) ? listing.features as string[] : [];

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
        ville: listing.ville,
        region: listing.region,
        arrondissement: listing.arrondissement,
        quartier: listing.quartier,
        quartier_libre: listing.quartier_libre,
        lat: listing.lat ? Number(listing.lat) : null,
        lng: listing.lng ? Number(listing.lng) : null,
        features,
        images: photos?.map((p) => p.url) ?? [],
        status: listing.status,
        views_count: listing.views_count,
        created_at: listing.created_at,
        owner_id: listing.owner_id,
        owner_name: profile?.full_name ?? null,
        owner_phone: profile?.phone ?? null,
        agency_name: agencyInfo?.name ?? null,
        agency_slug: agencyInfo?.slug ?? null,
        agency_logo: agencyInfo?.logo_url ?? null,
        agency_verified: agencyInfo?.verified ?? false,
        badge,
      };
    },
    enabled: !!id,
  });
}

interface ListingsFilters {
  transaction?: string;
  types?: string[];
  ville?: string;
  priceMin?: number;
  priceMax?: number;
  rooms?: number[];
  surfaceMin?: number;
  surfaceMax?: number;
  searchText?: string;
  limit?: number;
}

/** Fetch active listings from Supabase with optional filters */
export function useDbListings(filters: ListingsFilters = {}) {
  return useQuery({
    queryKey: ["db-listings", filters],
    queryFn: async (): Promise<DisplayListing[]> => {
      let query = supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (filters.transaction) {
        query = query.eq("transaction", filters.transaction);
      }
      if (filters.types && filters.types.length > 0) {
        query = query.in("type", filters.types);
      }
      if (filters.ville) {
        query = query.eq("ville", filters.ville);
      }
      if (filters.priceMin) {
        query = query.gte("price_mga", filters.priceMin);
      }
      if (filters.priceMax) {
        query = query.lte("price_mga", filters.priceMax);
      }
      if (filters.rooms && filters.rooms.length > 0) {
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
      if (filters.surfaceMin) {
        query = query.gte("surface", filters.surfaceMin);
      }
      if (filters.surfaceMax && filters.surfaceMax < 1000) {
        query = query.lte("surface", filters.surfaceMax);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data: listings, error } = await query;
      if (error || !listings) return [];

      // Batch-fetch photos for all listings
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

      return listings.map((listing) => {
        const features = Array.isArray(listing.features) ? listing.features as string[] : [];
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
          ville: listing.ville,
          region: listing.region,
          arrondissement: listing.arrondissement,
          quartier: listing.quartier,
          quartier_libre: listing.quartier_libre,
          lat: listing.lat ? Number(listing.lat) : null,
          lng: listing.lng ? Number(listing.lng) : null,
          features,
          images: photosByListing.get(listing.id) ?? [],
          status: listing.status,
          views_count: listing.views_count,
          created_at: listing.created_at,
          owner_id: listing.owner_id,
          badge: null,
        };
      });
    },
  });
}
