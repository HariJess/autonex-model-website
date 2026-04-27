import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DisplayListing, ListingType, TransactionType } from "@/types/listing";
import type { Database } from "@/integrations/supabase/types";
import { deriveVehicleFromLegacy } from "@/lib/vehicleModel";
import { stripVehicleMetaTags } from "@/lib/vehicleMetaTags";

type FavoriteListRow = Database["public"]["Functions"]["list_my_favorites"]["Returns"][number];
type ToggleRow = Database["public"]["Functions"]["toggle_favorite"]["Returns"][number];

export const favoriteIdsQueryKey = (userId: string | null | undefined) =>
  ["favorites", "ids", userId ?? null] as const;

export const favoriteListQueryKey = (userId: string | null | undefined) =>
  ["favorites", "list", userId ?? null] as const;

function mapFavoriteRowToDisplayListing(row: FavoriteListRow): DisplayListing {
  const rawFeatures = Array.isArray(row.lst_features) ? (row.lst_features as string[]) : [];
  const features = stripVehicleMetaTags(rawFeatures);
  const pendingBoosts = Array.isArray(row.lst_pending_boost_types)
    ? (row.lst_pending_boost_types as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const activeBoosts = new Set(row.lst_active_boost_types ?? []);

  let badge: DisplayListing["badge"] = null;
  if (activeBoosts.has("top")) badge = "boost";
  else if (activeBoosts.has("featured")) badge = "coup_de_coeur";
  else if (activeBoosts.has("urgent")) badge = "urgent";

  const vehicle = deriveVehicleFromLegacy({
    title: row.lst_title,
    mileageKm: row.lst_mileage_km,
    doors: row.lst_doors,
    make: row.lst_make,
    model: row.lst_model,
    year: row.lst_year,
    fuel: row.lst_fuel,
    transmission: row.lst_transmission_gearbox,
    drivetrain: row.lst_drivetrain,
    bodyStyle: row.lst_body_style,
    rentalMode: row.lst_rental_mode,
    seats: row.lst_seats,
    exteriorColor: row.lst_exterior_color,
    engineDisplacementL: row.lst_engine_displacement_l,
    interiorColor: row.lst_interior_color,
    availabilityStatus: row.lst_availability_status,
    isElectric: row.lst_is_electric,
    isHybrid: row.lst_is_hybrid,
    vehicleCondition: row.lst_vehicle_condition,
    sellerType: row.lst_seller_type,
    isNewProgram: row.lst_is_new_program,
    features: rawFeatures,
    agencyName: row.agency_name ?? null,
  });

  const hasWhatsappFromListing = Boolean(row.lst_whatsapp_phone?.trim());

  return {
    id: row.lst_id,
    title: row.lst_title,
    description: row.lst_description,
    type: row.lst_type as ListingType,
    transaction: row.lst_transaction as TransactionType,
    price_mga: row.lst_price_mga,
    price_eur: row.lst_price_eur != null ? Number(row.lst_price_eur) : null,
    negotiable: Boolean(row.lst_negotiable),
    ville: row.lst_ville,
    region: row.lst_region,
    arrondissement: row.lst_arrondissement,
    quartier: row.lst_quartier,
    quartier_libre: row.lst_quartier_libre,
    lat: row.lst_lat != null && Number.isFinite(Number(row.lst_lat)) ? Number(row.lst_lat) : null,
    lng: row.lst_lng != null && Number.isFinite(Number(row.lst_lng)) ? Number(row.lst_lng) : null,
    features,
    images: row.lst_photos_urls ?? [],
    status: row.lst_status ?? null,
    views_count: row.lst_views_count,
    created_at: row.lst_created_at,
    owner_id: row.lst_owner_id,
    original_price_mga: row.lst_original_price_mga,
    owner_name: row.owner_full_name ?? null,
    owner_phone: null,
    has_whatsapp_contact: hasWhatsappFromListing,
    agency_name: row.agency_name ?? null,
    agency_slug: row.agency_slug ?? null,
    agency_logo: row.agency_logo_url ?? null,
    agency_verified: row.agency_verified ?? false,
    badge,
    video_url: row.lst_video_url,
    virtual_tour_url: row.lst_virtual_tour_url,
    internal_ref: row.lst_internal_ref,
    is_new_program: row.lst_is_new_program,
    rejection_reason: row.lst_rejection_reason,
    pending_boost_types: pendingBoosts.length > 0 ? pendingBoosts : undefined,
    vehicle,
  };
}

/**
 * Fetch the set of listing IDs favorited by the current user. Fired once on
 * first consumer mount, shared across every ListingCard via TanStack cache.
 * Cache key scoped per userId: logout clears via `enabled: false`, different
 * user on the same device gets an isolated cache entry.
 */
export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: favoriteIdsQueryKey(user?.id),
    queryFn: async (): Promise<Set<string>> => {
      if (!user?.id) return new Set<string>();
      const { data, error } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((r) => r.listing_id));
    },
    enabled: !!user?.id,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}

export function useMyFavoritesList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: favoriteListQueryKey(user?.id),
    queryFn: async (): Promise<DisplayListing[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc("list_my_favorites");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapFavoriteRowToDisplayListing);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * Toggle add/remove with optimistic update on the ids set + rollback on error.
 * Invalidates the enriched list on success so /favoris stays consistent.
 */
export function useToggleFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string): Promise<ToggleRow> => {
      if (!user?.id) throw new Error("not_authenticated");
      const { data, error } = await supabase.rpc("toggle_favorite", {
        p_listing_id: listingId,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : (data as ToggleRow | null);
      if (!row) throw new Error("empty_toggle_response");
      return row;
    },
    onMutate: async (listingId: string) => {
      const key = favoriteIdsQueryKey(user?.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Set<string>>(key);
      const next = new Set(previous ?? []);
      if (next.has(listingId)) next.delete(listingId);
      else next.add(listingId);
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_err, _listingId, context) => {
      const key = favoriteIdsQueryKey(user?.id);
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      } else {
        queryClient.removeQueries({ queryKey: key });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: favoriteListQueryKey(user?.id),
      });
    },
  });
}
