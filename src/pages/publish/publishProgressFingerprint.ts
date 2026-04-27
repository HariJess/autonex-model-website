import type { PublishFormValues } from "@/pages/publish/publishFormSchema";

/**
 * Change-detection hash over the full publish form state plus the current
 * step and photo counters.
 *
 * Whitespace in text fields is trimmed and array fields are sorted so that
 * cosmetic edits (extra space, equipment toggle order) don't churn
 * persistence — the fingerprint only flips when the *meaningful* content
 * changes. The exact normalization mirrors the legacy inline implementation
 * to keep `lastPersistedFingerprintRef` comparisons backwards-compatible.
 */
export function computeProgressFingerprint(
  v: PublishFormValues,
  step: number,
  serverPhotoIds: string[],
  pendingPhotoCount: number,
): string {
  return JSON.stringify({
    step,
    transaction: v.transaction,
    listingType: v.listingType,
    isNewProgram: v.isNewProgram,
    internalRef: v.internalRef.trim(),
    ville: v.ville.trim(),
    arrondissement: v.arrondissement.trim(),
    quartier: v.quartier.trim(),
    quartierLibre: v.quartierLibre.trim(),
    pinLat: v.pinLat,
    pinLng: v.pinLng,
    title: v.title.trim(),
    description: v.description.trim(),
    priceMga: v.priceMga.trim(),
    mileageKmInput: v.mileageKmInput.trim(),
    doorsInput: v.doorsInput.trim(),
    seatsInput: v.seatsInput.trim(),
    vehicleMake: v.vehicleMake.trim(),
    vehicleModel: v.vehicleModel.trim(),
    vehicleYear: v.vehicleYear.trim(),
    vehicleFuel: v.vehicleFuel.trim(),
    vehicleTransmission: v.vehicleTransmission.trim(),
    vehicleDrivetrain: v.vehicleDrivetrain.trim(),
    vehicleCondition: v.vehicleCondition.trim(),
    vehicleSellerType: v.vehicleSellerType.trim(),
    vehicleRentalMode: v.vehicleRentalMode.trim(),
    vehicleBodyStyle: v.vehicleBodyStyle.trim(),
    vehicleDoors: v.vehicleDoors.trim(),
    vehicleSeats: v.vehicleSeats.trim(),
    vehicleExteriorColor: v.vehicleExteriorColor.trim(),
    vehicleEngineDisplacement: v.vehicleEngineDisplacement.trim(),
    vehicleInteriorColor: v.vehicleInteriorColor.trim(),
    vehicleAvailabilityStatus: v.vehicleAvailabilityStatus.trim(),
    vehicleWhatsappPhone: v.vehicleWhatsappPhone.trim(),
    vehicleIsElectric: v.vehicleIsElectric,
    vehicleIsHybrid: v.vehicleIsHybrid,
    selectedFeatures: [...v.selectedFeatures].sort(),
    customFeaturesInput: v.customFeaturesInput.trim(),
    videoUrl: v.videoUrl.trim(),
    virtualTourUrl: v.virtualTourUrl.trim(),
    selectedBoosts: [...v.selectedBoosts].sort(),
    agencySpotlight: v.agencySpotlight,
    serverPhotoIds,
    pendingPhotoCount,
  });
}
