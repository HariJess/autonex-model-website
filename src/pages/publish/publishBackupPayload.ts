import type { LocalPublishBackupV1 } from "@/lib/publishDraft";

/** Shape accepted by `saveLocalPublishBackup` (without version/timestamp metadata). */
export type PublishLocalBackupPayload = Omit<LocalPublishBackupV1, "v" | "savedAt"> & { step: number };

/** Builds a consistent localStorage backup payload from live form fields (single source of truth). */
export function buildPublishLocalBackupPayload(params: {
  draftListingId: string;
  step: number;
  transaction: LocalPublishBackupV1["transaction"];
  listingType: LocalPublishBackupV1["listingType"];
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
  vehicleEngineDisplacement: string;
  vehicleInteriorColor: string;
  vehicleAvailabilityStatus: string;
  vehicleWhatsappPhone: string;
  vehicleIsElectric: boolean;
  vehicleIsHybrid: boolean;
  selectedFeatures: string[];
  videoUrl: string;
  virtualTourUrl: string;
  selectedBoosts: LocalPublishBackupV1["selectedBoosts"];
  agencySpotlight: boolean;
}): PublishLocalBackupPayload {
  const {
    draftListingId,
    step,
    transaction,
    listingType,
    isNewProgram,
    internalRef,
    ville,
    arrondissement,
    quartier,
    quartierLibre,
    pinLat,
    pinLng,
    title,
    description,
    priceMga,
    surface,
    rooms,
    bathrooms,
    toilets,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleFuel,
    vehicleTransmission,
    vehicleDrivetrain,
    vehicleCondition,
    vehicleSellerType,
    vehicleRentalMode,
    vehicleBodyStyle,
    vehicleDoors,
    vehicleSeats,
    vehicleExteriorColor,
    vehicleEngineDisplacement,
    vehicleInteriorColor,
    vehicleAvailabilityStatus,
    vehicleWhatsappPhone,
    vehicleIsElectric,
    vehicleIsHybrid,
    selectedFeatures,
    videoUrl,
    virtualTourUrl,
    selectedBoosts,
    agencySpotlight,
  } = params;

  return {
    draftListingId,
    step,
    transaction,
    listingType,
    isNewProgram,
    internalRef,
    ville,
    arrondissement,
    quartier,
    quartierLibre,
    pinLat,
    pinLng,
    title,
    description,
    priceMga,
    surface,
    rooms,
    bathrooms,
    toilets,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleFuel,
    vehicleTransmission,
    vehicleDrivetrain,
    vehicleCondition,
    vehicleSellerType,
    vehicleRentalMode,
    vehicleBodyStyle,
    vehicleDoors,
    vehicleSeats,
    vehicleExteriorColor,
    vehicleEngineDisplacement,
    vehicleInteriorColor,
    vehicleAvailabilityStatus,
    vehicleWhatsappPhone,
    vehicleIsElectric,
    vehicleIsHybrid,
    selectedFeatures,
    videoUrl,
    virtualTourUrl,
    selectedBoosts,
    agencySpotlight,
  };
}
