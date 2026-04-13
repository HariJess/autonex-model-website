import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { ListingType, TransactionType } from "@/types/listing";
import { getRegionForVille } from "@/data/madagascar-locations";
import type { PurchasableBoostType } from "@/config/monetization";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";

export const PUBLISH_DRAFT_TITLE_PLACEHOLDER = "Brouillon — ImmoNex";

const LOCAL_KEY_PREFIX = "immonex.publishDraft.v1";

export type LocalPublishBackupV1 = {
  v: 1;
  draftListingId: string;
  savedAt: string;
  step: number;
  transaction: TransactionType | "";
  listingType: ListingType | "";
  isNewProgram: boolean;
  internalRef: string;
  ville: string;
  arrondissement: string;
  quartier: string;
  quartierLibre: string;
  pinLat: number | null;
  pinLng: number | null;
  title: string;
  description: string;
  priceMga: string;
  surface: string;
  rooms: string;
  bathrooms: string;
  toilets: string;
  selectedFeatures: string[];
  videoUrl: string;
  virtualTourUrl: string;
  selectedBoosts: PurchasableBoostType[];
  agencySpotlight: boolean;
};

export function localBackupKey(userId: string, draftListingId: string) {
  return `${LOCAL_KEY_PREFIX}:${userId}:${draftListingId}`;
}

export function saveLocalPublishBackup(userId: string, draftListingId: string, data: Omit<LocalPublishBackupV1, "v" | "savedAt"> & { step: number }) {
  try {
    const payload: LocalPublishBackupV1 = {
      v: 1,
      savedAt: new Date().toISOString(),
      ...data,
    };
    localStorage.setItem(localBackupKey(userId, draftListingId), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function loadLocalPublishBackup(userId: string, draftListingId: string): LocalPublishBackupV1 | null {
  try {
    const raw = localStorage.getItem(localBackupKey(userId, draftListingId));
    if (!raw) return null;
    const p = JSON.parse(raw) as LocalPublishBackupV1;
    if (p.v !== 1 || !p.savedAt) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearLocalPublishBackup(userId: string, draftListingId: string) {
  try {
    localStorage.removeItem(localBackupKey(userId, draftListingId));
  } catch {
    /* ignore */
  }
}

export type ServerPhoto = { id: string; url: string; position: number };

export function storagePathFromListingPhotoUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split("/listing-photos/");
    return parts.length > 1 ? parts[1] : null;
  } catch {
    return null;
  }
}

export async function fetchDraftListingForOwner(
  listingId: string,
  ownerId: string,
): Promise<Tables<"listings"> | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("owner_id", ownerId)
    .eq("status", "draft")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchLatestDraftId(ownerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function fetchListingPhotos(listingId: string): Promise<ServerPhoto[]> {
  const { data, error } = await supabase
    .from("listing_photos")
    .select("id, url, position")
    .eq("listing_id", listingId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ServerPhoto[];
}

export async function createDraftListing(ownerId: string): Promise<string> {
  const row: TablesInsert<"listings"> = {
    owner_id: ownerId,
    title: PUBLISH_DRAFT_TITLE_PLACEHOLDER,
    description: "",
    type: "appartement",
    transaction: "vente",
    price_mga: 0,
    price_eur: 0,
    status: "draft",
    draft_step: 0,
    features: [] as unknown as Json,
    pending_boost_types: [] as unknown as Json,
  };
  const { data, error } = await supabase.from("listings").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

function effectiveTransaction(t: TransactionType | ""): TransactionType {
  return t || "vente";
}

function effectiveListingType(t: ListingType | ""): ListingType {
  return t || "appartement";
}

function showRoomsForType(listingType: ListingType | ""): boolean {
  const TYPES_WITH_ROOMS: ListingType[] = ["appartement", "villa", "maison"];
  return listingType === "" || TYPES_WITH_ROOMS.includes(listingType as ListingType);
}

/** Map wizard form to a listings UPDATE payload (draft or final). */
export function formToListingUpdate(input: {
  transaction: TransactionType | "";
  listingType: ListingType | "";
  isNewProgram: boolean;
  internalRef: string;
  ville: string;
  arrondissement: string;
  quartier: string;
  quartierLibre: string;
  pinLat: number | null;
  pinLng: number | null;
  title: string;
  description: string;
  priceMga: string;
  surface: string;
  rooms: string;
  bathrooms: string;
  toilets: string;
  selectedFeatures: string[];
  videoUrl: string;
  virtualTourUrl: string;
  selectedBoosts: PurchasableBoostType[];
  agencySpotlight: boolean;
  draftStep: number;
  /** When true, title/description can stay short */
  isDraftSave: boolean;
}): TablesUpdate<"listings"> {
  const tx = effectiveTransaction(input.transaction);
  const lt = effectiveListingType(input.listingType);
  const showRooms = showRoomsForType(lt);
  const priceNum = Math.max(0, Math.floor(Number(input.priceMga) || 0));
  const region = input.ville ? getRegionForVille(input.ville) : null;

  let finalLat: number | null = null;
  let finalLng: number | null = null;
  if (input.pinLat != null && input.pinLng != null && isValidListingCoordinates(input.pinLat, input.pinLng)) {
    finalLat = Number(input.pinLat.toFixed(7));
    finalLng = Number(input.pinLng.toFixed(7));
  }

  const titleTrim = input.title.trim();
  const titleOut =
    titleTrim.length > 0 ? titleTrim.slice(0, 120) : PUBLISH_DRAFT_TITLE_PLACEHOLDER;

  const boostPayload: string[] = [...input.selectedBoosts];
  if (input.agencySpotlight) boostPayload.push("agency_spotlight");

  const pendingBoostJson = boostPayload as unknown as Json;

  return {
    title: titleOut,
    description: input.description.trim() || (input.isDraftSave ? "" : ""),
    type: lt,
    transaction: tx,
    price_mga: priceNum,
    price_eur: priceNum > 0 ? Math.round((priceNum / 5050) * 100) / 100 : 0,
    surface: input.surface ? Number(input.surface) || null : null,
    rooms: showRooms ? (input.rooms ? Number(input.rooms) || null : null) : null,
    bathrooms: showRooms ? (input.bathrooms ? Number(input.bathrooms) || null : null) : null,
    toilets: showRooms && input.toilets ? Number(input.toilets) || null : null,
    ville: input.ville || null,
    arrondissement: input.arrondissement || null,
    quartier: input.quartier || null,
    quartier_libre: input.quartierLibre || null,
    region,
    lat: finalLat,
    lng: finalLng,
    internal_ref: input.internalRef.trim() || null,
    is_new_program: input.isNewProgram,
    video_url: input.videoUrl.trim() || null,
    virtual_tour_url: input.virtualTourUrl.trim() || null,
    features: input.selectedFeatures as unknown as Json,
    pending_boost_types: pendingBoostJson,
    draft_step: Math.min(10, Math.max(0, input.draftStep)),
  };
}

export function listingRowToFormState(row: Tables<"listings">): {
  transaction: TransactionType | "";
  listingType: ListingType | "";
  isNewProgram: boolean;
  internalRef: string;
  ville: string;
  arrondissement: string;
  quartier: string;
  quartierLibre: string;
  pinLat: number | null;
  pinLng: number | null;
  title: string;
  description: string;
  priceMga: string;
  surface: string;
  rooms: string;
  bathrooms: string;
  toilets: string;
  selectedFeatures: string[];
  videoUrl: string;
  virtualTourUrl: string;
  selectedBoosts: PurchasableBoostType[];
  agencySpotlight: boolean;
  step: number;
} {
  const rawBoost = row.pending_boost_types;
  const boostList = Array.isArray(rawBoost) ? rawBoost.filter((x): x is string => typeof x === "string") : [];
  const agencySpotlight = boostList.includes("agency_spotlight");
  const selectedBoosts = boostList.filter((x): x is PurchasableBoostType =>
    x !== "agency_spotlight" && (["urgent", "daily_bump", "featured", "top"] as const).includes(x as PurchasableBoostType),
  );

  const featuresRaw = row.features;
  const selectedFeatures = Array.isArray(featuresRaw)
    ? featuresRaw.filter((x): x is string => typeof x === "string")
    : [];

  const step = row.draft_step ?? 0;

  return {
    transaction: row.transaction as TransactionType,
    listingType: row.type as ListingType,
    isNewProgram: Boolean(row.is_new_program),
    internalRef: row.internal_ref ?? "",
    ville: row.ville ?? "",
    arrondissement: row.arrondissement ?? "",
    quartier: row.quartier ?? "",
    quartierLibre: row.quartier_libre ?? "",
    pinLat: row.lat != null ? Number(row.lat) : null,
    pinLng: row.lng != null ? Number(row.lng) : null,
    title: row.title === PUBLISH_DRAFT_TITLE_PLACEHOLDER ? "" : row.title,
    description: row.description ?? "",
    priceMga: row.price_mga != null ? String(row.price_mga) : "",
    surface: row.surface != null ? String(row.surface) : "",
    rooms: row.rooms != null ? String(row.rooms) : "",
    bathrooms: row.bathrooms != null ? String(row.bathrooms) : "",
    toilets: row.toilets != null ? String(row.toilets) : "",
    selectedFeatures,
    videoUrl: row.video_url ?? "",
    virtualTourUrl: row.virtual_tour_url ?? "",
    selectedBoosts,
    agencySpotlight,
    step: Math.min(3, Math.max(0, step)),
  };
}

export async function saveDraftListing(
  listingId: string,
  patch: TablesUpdate<"listings">,
): Promise<{ updatedAt: string }> {
  const { data, error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", listingId)
    .eq("status", "draft")
    .select("updated_at")
    .single();
  if (error) throw new Error(error.message);
  return { updatedAt: data.updated_at ?? new Date().toISOString() };
}

export async function uploadListingPhoto(listingId: string, file: File, position: number): Promise<ServerPhoto> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${listingId}/${position}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, file, { upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
  const { data: row, error } = await supabase
    .from("listing_photos")
    .insert({
      listing_id: listingId,
      url: urlData.publicUrl,
      position,
    })
    .select("id, url, position")
    .single();
  if (error) throw new Error(error.message);
  return row as ServerPhoto;
}

export async function deleteListingPhotoRow(photoId: string, publicUrl: string): Promise<void> {
  const p = storagePathFromListingPhotoUrl(publicUrl);
  if (p) {
    await supabase.storage.from("listing-photos").remove([p]);
  }
  const { error } = await supabase.from("listing_photos").delete().eq("id", photoId);
  if (error) throw new Error(error.message);
}

export async function setPhotoCoverFirst(listingId: string, photos: ServerPhoto[], coverIndex: number): Promise<void> {
  if (coverIndex <= 0 || coverIndex >= photos.length) return;
  const next = [...photos];
  const [picked] = next.splice(coverIndex, 1);
  next.unshift(picked);
  for (let i = 0; i < next.length; i++) {
    const { error } = await supabase
      .from("listing_photos")
      .update({ position: i })
      .eq("id", next[i].id)
      .eq("listing_id", listingId);
    if (error) throw new Error(error.message);
  }
}
