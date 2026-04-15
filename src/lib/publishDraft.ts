import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { ListingType, TransactionType } from "@/types/listing";
import { getRegionForVille } from "@/data/madagascar-locations";
import type { PurchasableBoostType } from "@/config/monetization";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import { stripVehicleMetaTags } from "@/lib/vehicleMetaTags";

export const PUBLISH_DRAFT_TITLE_PLACEHOLDER = "Brouillon — AutoNex";

const LOCAL_KEY_PREFIX = "immonex.publishDraft.v1";

const CONTROLLED_FUEL_VALUES = ["Essence", "Diesel", "Hybride", "Hybride rechargeable", "Électrique"] as const;
const CONTROLLED_TRANSMISSION_VALUES = ["Boîte manuelle", "Boîte automatique"] as const;
const CONTROLLED_DRIVETRAIN_VALUES = ["4x2", "4x4", "Traction", "Propulsion", "AWD"] as const;
const CONTROLLED_CONDITION_VALUES = ["neuf", "occasion"] as const;
const CONTROLLED_SELLER_VALUES = ["particulier", "concessionnaire"] as const;
const CONTROLLED_RENTAL_MODE_VALUES = ["none", "short_term", "long_term"] as const;
const CONTROLLED_BODY_STYLE_VALUES = [
  "citadine",
  "berline",
  "suv_4x4",
  "crossover",
  "pick_up",
  "coupe",
  "cabriolet",
  "utilitaire_leger",
  "van_fourgon",
  "minibus_bus",
  "camion",
  "moto",
  "scooter",
  "quad",
  "buggy",
  "electrique",
  "hybride",
] as const;
const CONTROLLED_AVAILABILITY_VALUES = ["disponible", "reserve", "vendu", "en_arrivage"] as const;

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
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleFuel: string;
  vehicleTransmission: string;
  vehicleDrivetrain: string;
  vehicleCondition: string;
  vehicleSellerType: string;
  vehicleRentalMode: string;
  vehicleBodyStyle: string;
  vehicleDoors: string;
  vehicleSeats: string;
  vehicleExteriorColor: string;
  vehicleInteriorColor: string;
  vehicleAvailabilityStatus: string;
  vehicleWhatsappPhone: string;
  vehicleIsElectric: boolean;
  vehicleIsHybrid: boolean;
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

/** Statuts modifiables via /publier?edit= (hors brouillon — ceux-ci utilisent ?draft=). */
export const EDITABLE_PUBLISHED_LISTING_STATUSES = [
  "active",
  "paused",
  "pending_review",
  "rejected",
  "expired",
] as const satisfies readonly (Tables<"listings">["status"])[];

export function isEditablePublishedListingStatus(status: string | null | undefined): boolean {
  return (EDITABLE_PUBLISHED_LISTING_STATUSES as readonly string[]).includes(status ?? "");
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

/** Annonce déjà créée (non brouillon) — propriétaire uniquement. */
export async function fetchListingForOwnerEdit(
  listingId: string,
  ownerId: string,
): Promise<Tables<"listings"> | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("owner_id", ownerId)
    .in("status", [...EDITABLE_PUBLISHED_LISTING_STATUSES])
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
    seller_type: null,
    features: [] as unknown as Json,
    pending_boost_types: [] as unknown as Json,
  };
  const { data, error } = await supabase.from("listings").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteDraftListingForOwner(listingId: string, ownerId: string): Promise<void> {
  const { data: photos, error: photosError } = await supabase
    .from("listing_photos")
    .select("id, url")
    .eq("listing_id", listingId);
  if (photosError) throw new Error(photosError.message);

  if (photos && photos.length > 0) {
    const paths = photos
      .map((p) => storagePathFromListingPhotoUrl(p.url))
      .filter((path): path is string => Boolean(path));
    if (paths.length > 0) {
      await supabase.storage.from("listing-photos").remove(paths);
    }
    const { error: deletePhotosError } = await supabase.from("listing_photos").delete().eq("listing_id", listingId);
    if (deletePhotosError) throw new Error(deletePhotosError.message);
  }

  const { error: deleteListingError } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("owner_id", ownerId)
    .eq("status", "draft");
  if (deleteListingError) throw new Error(deleteListingError.message);
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
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleFuel: string;
  vehicleTransmission: string;
  vehicleDrivetrain: string;
  vehicleCondition: string;
  vehicleSellerType: string;
  vehicleRentalMode: string;
  vehicleBodyStyle: string;
  vehicleDoors: string;
  vehicleSeats: string;
  vehicleExteriorColor: string;
  vehicleInteriorColor: string;
  vehicleAvailabilityStatus: string;
  vehicleWhatsappPhone: string;
  vehicleIsElectric: boolean;
  vehicleIsHybrid: boolean;
  selectedFeatures: string[];
  videoUrl: string;
  virtualTourUrl: string;
  selectedBoosts: PurchasableBoostType[];
  agencySpotlight: boolean;
  draftStep: number;
  /** When true, title/description can stay short */
  isDraftSave: boolean;
}): TablesUpdate<"listings"> {
  const normalizeKey = (value: string): string =>
    value
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const normalizeText = (value: string, max = 120): string | null => {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return null;
    return trimmed.slice(0, max);
  };
  const normalizeControlledValue = <T extends readonly string[]>(
    value: string,
    allowedValues: T,
    aliasMap?: Record<string, T[number]>,
  ): T[number] | null => {
    const raw = value.trim();
    if (!raw) return null;
    const direct = allowedValues.find((candidate) => candidate === raw);
    if (direct) return direct;
    const key = normalizeKey(raw);
    if (aliasMap && aliasMap[key]) return aliasMap[key];
    return null;
  };
  const normalizeInt = (value: string, min: number, max?: number): number | null => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const intVal = Math.floor(n);
    if (intVal < min) return null;
    if (typeof max === "number" && intVal > max) return null;
    return intVal;
  };
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
  const currentYear = new Date().getFullYear() + 1;
  const mileageKm = normalizeInt(input.surface, 0);
  const versionOrTrim = normalizeInt(input.rooms, 0);
  const doorsLegacy = normalizeInt(input.bathrooms, 0);
  const seats = normalizeInt(input.toilets, 0);
  const year = normalizeInt(input.vehicleYear, 1950, currentYear);
  const doors = normalizeInt(input.vehicleDoors, 0, 8) ?? doorsLegacy;
  const make = normalizeText(input.vehicleMake, 80);
  const model = normalizeText(input.vehicleModel, 100);
  const fuel =
    normalizeControlledValue(input.vehicleFuel, CONTROLLED_FUEL_VALUES, {
      essence: "Essence",
      diesel: "Diesel",
      hybride: "Hybride",
      "hybride rechargeable": "Hybride rechargeable",
      electrique: "Électrique",
    }) ?? normalizeText(input.vehicleFuel, 60);
  const transmission =
    normalizeControlledValue(input.vehicleTransmission, CONTROLLED_TRANSMISSION_VALUES, {
      manuelle: "Boîte manuelle",
      "boite manuelle": "Boîte manuelle",
      automatique: "Boîte automatique",
      "boite automatique": "Boîte automatique",
    }) ?? normalizeText(input.vehicleTransmission, 80);
  const drivetrain =
    normalizeControlledValue(input.vehicleDrivetrain, CONTROLLED_DRIVETRAIN_VALUES, {
      traction: "Traction",
      propulsion: "Propulsion",
      awd: "AWD",
      "4x2": "4x2",
      "4x4": "4x4",
    }) ?? normalizeText(input.vehicleDrivetrain, 80);
  const condition =
    normalizeControlledValue(input.vehicleCondition, CONTROLLED_CONDITION_VALUES, {
      neuf: "neuf",
      occasion: "occasion",
    }) ?? normalizeText(input.vehicleCondition, 40);
  const sellerType =
    normalizeControlledValue(input.vehicleSellerType, CONTROLLED_SELLER_VALUES, {
      particulier: "particulier",
      concessionnaire: "concessionnaire",
      agence: "concessionnaire",
    }) ?? normalizeText(input.vehicleSellerType, 40);
  const rentalMode =
    normalizeControlledValue(input.vehicleRentalMode, CONTROLLED_RENTAL_MODE_VALUES, {
      none: "none",
      "non applicable": "none",
      "court terme": "short_term",
      "courte duree": "short_term",
      short_term: "short_term",
      "long terme": "long_term",
      "longue duree": "long_term",
      long_term: "long_term",
    }) ?? normalizeText(input.vehicleRentalMode, 40);
  const bodyStyle =
    normalizeControlledValue(input.vehicleBodyStyle, CONTROLLED_BODY_STYLE_VALUES, {
      citadine: "citadine",
      berline: "berline",
      suv: "suv_4x4",
      "suv 4x4": "suv_4x4",
      suv_4x4: "suv_4x4",
      crossover: "crossover",
      "pick-up": "pick_up",
      pickup: "pick_up",
      pick_up: "pick_up",
      coupe: "coupe",
      cabriolet: "cabriolet",
      "utilitaire leger": "utilitaire_leger",
      utilitaire_leger: "utilitaire_leger",
      "van fourgon": "van_fourgon",
      van_fourgon: "van_fourgon",
      "minibus bus": "minibus_bus",
      minibus_bus: "minibus_bus",
      camion: "camion",
      moto: "moto",
      scooter: "scooter",
      quad: "quad",
      buggy: "buggy",
      electrique: "electrique",
      hybride: "hybride",
    }) ?? normalizeText(input.vehicleBodyStyle, 60);
  const exteriorColor = normalizeText(input.vehicleExteriorColor, 40);
  const interiorColor = normalizeText(input.vehicleInteriorColor, 40);
  const availabilityStatus =
    normalizeControlledValue(input.vehicleAvailabilityStatus, CONTROLLED_AVAILABILITY_VALUES, {
      disponible: "disponible",
      reserve: "reserve",
      "reservé": "reserve",
      vendu: "vendu",
      "en arrivage": "en_arrivage",
      en_arrivage: "en_arrivage",
    }) ?? normalizeText(input.vehicleAvailabilityStatus, 40);
  const whatsappPhone = normalizeText(input.vehicleWhatsappPhone, 30);

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
    surface: mileageKm,
    rooms: showRooms ? versionOrTrim : null,
    bathrooms: showRooms ? doorsLegacy : null,
    toilets: showRooms ? seats : null,
    make,
    model,
    year,
    mileage_km: mileageKm,
    fuel,
    transmission_gearbox: transmission,
    drivetrain,
    doors,
    vehicle_condition: condition,
    seller_type: sellerType,
    rental_mode: rentalMode,
    body_style: bodyStyle,
    seats,
    exterior_color: exteriorColor,
    interior_color: interiorColor,
    availability_status: availabilityStatus,
    whatsapp_phone: whatsappPhone,
    is_electric: input.vehicleIsElectric,
    is_hybrid: input.vehicleIsHybrid,
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
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleFuel: string;
  vehicleTransmission: string;
  vehicleDrivetrain: string;
  vehicleCondition: string;
  vehicleSellerType: string;
  vehicleRentalMode: string;
  vehicleBodyStyle: string;
  vehicleDoors: string;
  vehicleSeats: string;
  vehicleExteriorColor: string;
  vehicleInteriorColor: string;
  vehicleAvailabilityStatus: string;
  vehicleWhatsappPhone: string;
  vehicleIsElectric: boolean;
  vehicleIsHybrid: boolean;
  selectedFeatures: string[];
  videoUrl: string;
  virtualTourUrl: string;
  selectedBoosts: PurchasableBoostType[];
  agencySpotlight: boolean;
  step: number;
} {
  const isPristineDraft =
    row.status === "draft" &&
    row.title === PUBLISH_DRAFT_TITLE_PLACEHOLDER &&
    !(row.description ?? "").trim() &&
    (row.price_mga ?? 0) === 0 &&
    !row.ville &&
    !row.arrondissement &&
    !row.quartier &&
    !row.quartier_libre &&
    !row.make &&
    !row.model &&
    row.year == null;

  const rawBoost = row.pending_boost_types;
  const boostList = Array.isArray(rawBoost) ? rawBoost.filter((x): x is string => typeof x === "string") : [];
  const agencySpotlight = boostList.includes("agency_spotlight");
  const selectedBoosts = boostList.filter((x): x is PurchasableBoostType =>
    x !== "agency_spotlight" && (["urgent", "daily_bump", "featured", "top"] as const).includes(x as PurchasableBoostType),
  );

  const featuresRaw = row.features;
  const selectedFeatures = Array.isArray(featuresRaw)
    ? stripVehicleMetaTags(featuresRaw.filter((x): x is string => typeof x === "string"))
    : [];

  const step = row.draft_step ?? 0;

  return {
    transaction: isPristineDraft ? "" : (row.transaction as TransactionType),
    listingType: isPristineDraft ? "" : (row.type as ListingType),
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
    vehicleMake: row.make ?? "",
    vehicleModel: row.model ?? "",
    vehicleYear: row.year != null ? String(row.year) : "",
    vehicleFuel: row.fuel ?? "",
    vehicleTransmission: row.transmission_gearbox ?? "",
    vehicleDrivetrain: row.drivetrain ?? "",
    vehicleCondition: row.vehicle_condition ?? "",
    vehicleSellerType: isPristineDraft ? "" : (row.seller_type ?? ""),
    vehicleRentalMode: row.rental_mode ?? "",
    vehicleBodyStyle: row.body_style ?? "",
    vehicleDoors: row.doors != null ? String(row.doors) : "",
    vehicleSeats: row.seats != null ? String(row.seats) : "",
    vehicleExteriorColor: row.exterior_color ?? "",
    vehicleInteriorColor: row.interior_color ?? "",
    vehicleAvailabilityStatus: row.availability_status ?? "",
    vehicleWhatsappPhone: row.whatsapp_phone ?? "",
    vehicleIsElectric: row.is_electric === true,
    vehicleIsHybrid: row.is_hybrid === true,
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

/** Mise à jour par le propriétaire sans filtre de statut (mode édition). */
export async function updateOwnerListing(
  listingId: string,
  ownerId: string,
  patch: TablesUpdate<"listings">,
): Promise<{ updatedAt: string }> {
  const { data, error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", listingId)
    .eq("owner_id", ownerId)
    .select("updated_at")
    .single();
  if (error) throw new Error(error.message);
  return { updatedAt: data.updated_at ?? new Date().toISOString() };
}

/** Retire les champs boosts du patch pour ne pas les réécraser en mode édition. */
export function omitBoostFieldsFromListingPatch(patch: TablesUpdate<"listings">): TablesUpdate<"listings"> {
  const { pending_boost_types: _pb, ...rest } = patch;
  return rest;
}

export type PublishFormFieldsForSnapshot = {
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
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleFuel: string;
  vehicleTransmission: string;
  vehicleDrivetrain: string;
  vehicleCondition: string;
  vehicleSellerType: string;
  vehicleRentalMode: string;
  vehicleBodyStyle: string;
  vehicleDoors: string;
  vehicleSeats: string;
  vehicleExteriorColor: string;
  vehicleInteriorColor: string;
  vehicleAvailabilityStatus: string;
  vehicleWhatsappPhone: string;
  vehicleIsElectric: boolean;
  vehicleIsHybrid: boolean;
  selectedFeatures: string[];
  videoUrl: string;
  virtualTourUrl: string;
};

/** Snapshot stable pour détecter un changement « matériel » (contenu, prix, médias, etc.). */
export function buildListingMaterialSnapshotFromRow(
  row: Tables<"listings">,
  /** Identifiants photos dans l’ordre d’affichage (couverture en premier). */
  photoIdsInOrder: string[],
): string {
  const featuresRaw = row.features;
  const features = Array.isArray(featuresRaw)
    ? featuresRaw.filter((x): x is string => typeof x === "string").slice().sort()
    : [];
  const lat =
    row.lat != null && row.lat !== ""
      ? Number(row.lat).toFixed(7)
      : null;
  const lng =
    row.lng != null && row.lng !== ""
      ? Number(row.lng).toFixed(7)
      : null;
  return JSON.stringify({
    title: (row.title ?? "").trim(),
    description: (row.description ?? "").trim(),
    price_mga: row.price_mga ?? 0,
    transaction: row.transaction,
    type: row.type,
    ville: (row.ville ?? "").trim(),
    arrondissement: (row.arrondissement ?? "").trim(),
    quartier: (row.quartier ?? "").trim(),
    quartier_libre: (row.quartier_libre ?? "").trim(),
    lat,
    lng,
    surface: row.surface ?? null,
    rooms: row.rooms ?? null,
    bathrooms: row.bathrooms ?? null,
    toilets: row.toilets ?? null,
    make: (row.make ?? "").trim(),
    model: (row.model ?? "").trim(),
    year: row.year ?? null,
    mileage_km: row.mileage_km ?? null,
    fuel: (row.fuel ?? "").trim(),
    transmission_gearbox: (row.transmission_gearbox ?? "").trim(),
    drivetrain: (row.drivetrain ?? "").trim(),
    doors: row.doors ?? null,
    vehicle_condition: (row.vehicle_condition ?? "").trim(),
    seller_type: (row.seller_type ?? "").trim(),
    rental_mode: (row.rental_mode ?? "").trim(),
    body_style: (row.body_style ?? "").trim(),
    seats: row.seats ?? null,
    exterior_color: (row.exterior_color ?? "").trim(),
    interior_color: (row.interior_color ?? "").trim(),
    availability_status: (row.availability_status ?? "").trim(),
    whatsapp_phone: (row.whatsapp_phone ?? "").trim(),
    is_electric: row.is_electric === true,
    is_hybrid: row.is_hybrid === true,
    features,
    video_url: (row.video_url ?? "").trim(),
    virtual_tour_url: (row.virtual_tour_url ?? "").trim(),
    internal_ref: (row.internal_ref ?? "").trim(),
    is_new_program: Boolean(row.is_new_program),
    photos: photoIdsInOrder.join(","),
  });
}

export function buildListingMaterialSnapshotFromForm(
  input: PublishFormFieldsForSnapshot,
  /** Identifiants photos serveur dans l’ordre courant (couverture en premier). */
  photoIdsInOrder: string[],
  pendingPhotoCount: number,
): string {
  const tx = effectiveTransaction(input.transaction);
  const lt = effectiveListingType(input.listingType);
  const showRooms = showRoomsForType(lt);
  const priceNum = Math.max(0, Math.floor(Number(input.priceMga) || 0));
  let finalLat: string | null = null;
  let finalLng: string | null = null;
  if (input.pinLat != null && input.pinLng != null && isValidListingCoordinates(input.pinLat, input.pinLng)) {
    finalLat = input.pinLat.toFixed(7);
    finalLng = input.pinLng.toFixed(7);
  }
  const features = input.selectedFeatures.slice().sort();
  return JSON.stringify({
    title: input.title.trim(),
    description: input.description.trim(),
    price_mga: priceNum,
    transaction: tx,
    type: lt,
    ville: input.ville.trim(),
    arrondissement: input.arrondissement.trim(),
    quartier: input.quartier.trim(),
    quartier_libre: input.quartierLibre.trim(),
    lat: finalLat,
    lng: finalLng,
    surface: input.surface ? Number(input.surface) || null : null,
    rooms: showRooms ? (input.rooms ? Number(input.rooms) || null : null) : null,
    bathrooms: showRooms ? (input.bathrooms ? Number(input.bathrooms) || null : null) : null,
    toilets: showRooms && input.toilets ? Number(input.toilets) || null : null,
    make: input.vehicleMake.trim(),
    model: input.vehicleModel.trim(),
    year: input.vehicleYear ? Number(input.vehicleYear) || null : null,
    mileage_km: input.surface ? Number(input.surface) || null : null,
    fuel: input.vehicleFuel.trim(),
    transmission_gearbox: input.vehicleTransmission.trim(),
    drivetrain: input.vehicleDrivetrain.trim(),
    doors: input.vehicleDoors ? Number(input.vehicleDoors) || null : null,
    vehicle_condition: input.vehicleCondition.trim(),
    seller_type: input.vehicleSellerType.trim(),
    rental_mode: input.vehicleRentalMode.trim(),
    body_style: input.vehicleBodyStyle.trim(),
    seats: input.vehicleSeats ? Number(input.vehicleSeats) || null : null,
    exterior_color: input.vehicleExteriorColor.trim(),
    interior_color: input.vehicleInteriorColor.trim(),
    availability_status: input.vehicleAvailabilityStatus.trim(),
    whatsapp_phone: input.vehicleWhatsappPhone.trim(),
    is_electric: input.vehicleIsElectric,
    is_hybrid: input.vehicleIsHybrid,
    features,
    video_url: input.videoUrl.trim(),
    virtual_tour_url: input.virtualTourUrl.trim(),
    internal_ref: input.internalRef.trim(),
    is_new_program: input.isNewProgram,
    photos: photoIdsInOrder.join(","),
    pending_photo_count: pendingPhotoCount,
  });
}

/** Si vrai, l’annonce doit repasser en modération avant d’être publique à nouveau. */
export function shouldSendPublishedListingToReview(params: {
  moderationStatus: string | null | undefined;
  baselineSnapshot: string;
  currentSnapshot: string;
}): boolean {
  if (params.baselineSnapshot === params.currentSnapshot) return false;
  const s = params.moderationStatus ?? "";
  return (
    s === "active" ||
    s === "paused" ||
    s === "pending_review" ||
    s === "rejected" ||
    s === "expired"
  );
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
