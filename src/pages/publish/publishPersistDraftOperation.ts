import type { TFunction } from "i18next";
import type { QueryClient } from "@tanstack/react-query";
import type { MutableRefObject } from "react";
import { toast } from "sonner";
import {
  buildListingMaterialSnapshotFromForm,
  formToListingUpdate,
  omitBoostFieldsFromListingPatch,
  saveDraftListing,
  saveLocalPublishBackup,
  shouldSendPublishedListingToReview,
  computeOriginalPriceMgaForEdit,
  updateOwnerListing,
  type ServerPhoto,
} from "@/lib/publishDraft";
import { buildPublishLocalBackupPayload } from "@/pages/publish/publishBackupPayload";
import { isDraftNoLongerDraftError } from "@/lib/parseSupabaseError";

/**
 * Champs nécessaires à `formToListingUpdate` hors `draftStep` / `isDraftSave`.
 * `selectedFeatures` doit être la liste fusionnée équipements + meta véhicule (comme dans la page).
 */
export type PersistDraftFormSnapshot = Omit<
  Parameters<typeof formToListingUpdate>[0],
  "draftStep" | "isDraftSave"
>;

export type PersistDraftOperationInput = {
  stepOverride?: number;
  step: number;
  userId: string | undefined;
  draftListingId: string | null;
  draftHydrated: boolean;
  isPublishedListingEdit: boolean;
  listingModerationStatus: string | null;
  pendingPhotosCount: number;
  progressFingerprint: string;
  queryClient: QueryClient;
  t: TFunction;
  serverPhotosRef: MutableRefObject<ServerPhoto[]>;
  editPriceBaselineRef: MutableRefObject<number | null>;
  editOriginalPriceRef: MutableRefObject<number | null>;
  baselineMaterialSnapshotRef: MutableRefObject<string>;
  lastPersistedFingerprintRef: MutableRefObject<string>;
  setSaveStatus: (s: "idle" | "saving" | "saved" | "error") => void;
  setSaveError: (msg: string | null) => void;
  setLastSavedAt: (iso: string | null) => void;
  setListingModerationStatus: (s: string | null) => void;
  form: PersistDraftFormSnapshot;
};

/**
 * Sauvegarde serveur du brouillon ou mise à jour « édition publiée », + backup local + invalidations.
 * Extrait tel quel depuis `PublishPage` pour clarifier la page sans changer le comportement métier.
 */
export async function runPersistDraftOperation(input: PersistDraftOperationInput): Promise<boolean> {
  const {
    stepOverride,
    step,
    userId,
    draftListingId,
    draftHydrated,
    isPublishedListingEdit,
    listingModerationStatus,
    pendingPhotosCount,
    progressFingerprint,
    queryClient,
    t,
    serverPhotosRef,
    editPriceBaselineRef,
    editOriginalPriceRef,
    baselineMaterialSnapshotRef,
    lastPersistedFingerprintRef,
    setSaveStatus,
    setSaveError,
    setLastSavedAt,
    setListingModerationStatus,
    form,
  } = input;

  if (!userId || !draftListingId || !draftHydrated) return false;

  try {
    setSaveStatus("saving");
    setSaveError(null);
    const patchBase = formToListingUpdate({
      ...form,
      draftStep: stepOverride ?? step,
      isDraftSave: true,
    });

    if (isPublishedListingEdit) {
      const computedOriginalPriceMga = computeOriginalPriceMgaForEdit({
        previousCurrentPriceMga: editPriceBaselineRef.current,
        previousOriginalPriceMga: editOriginalPriceRef.current,
        nextCurrentPriceMga: patchBase.price_mga,
      });
      const patch = {
        ...omitBoostFieldsFromListingPatch(patchBase),
        original_price_mga: computedOriginalPriceMga,
      };
      const photoIdsOrdered = serverPhotosRef.current.map((p) => p.id);
      const currentSnap = buildListingMaterialSnapshotFromForm(
        {
          transaction: form.transaction,
          listingType: form.listingType,
          isNewProgram: form.isNewProgram,
          internalRef: form.internalRef,
          ville: form.ville,
          arrondissement: form.arrondissement,
          quartier: form.quartier,
          quartierLibre: form.quartierLibre,
          pinLat: form.pinLat,
          pinLng: form.pinLng,
          title: form.title,
          description: form.description,
          priceMga: form.priceMga,
          negotiable: form.negotiable,
          surface: form.surface,
          rooms: form.rooms,
          bathrooms: form.bathrooms,
          toilets: form.toilets,
          vehicleMake: form.vehicleMake,
          vehicleModel: form.vehicleModel,
          vehicleYear: form.vehicleYear,
          vehicleFuel: form.vehicleFuel,
          vehicleTransmission: form.vehicleTransmission,
          vehicleDrivetrain: form.vehicleDrivetrain,
          vehicleCondition: form.vehicleCondition,
          vehicleSellerType: form.vehicleSellerType,
          vehicleRentalMode: form.vehicleRentalMode,
          vehicleBodyStyle: form.vehicleBodyStyle,
          vehicleDoors: form.vehicleDoors,
          vehicleSeats: form.vehicleSeats,
          vehicleExteriorColor: form.vehicleExteriorColor,
          vehicleEngineDisplacement: form.vehicleEngineDisplacement,
          vehicleInteriorColor: form.vehicleInteriorColor,
          vehicleAvailabilityStatus: form.vehicleAvailabilityStatus,
          vehicleWhatsappPhone: form.vehicleWhatsappPhone,
          vehicleIsElectric: form.vehicleIsElectric,
          vehicleIsHybrid: form.vehicleIsHybrid,
          selectedFeatures: form.selectedFeatures,
          videoUrl: form.videoUrl,
          virtualTourUrl: form.virtualTourUrl,
        },
        photoIdsOrdered,
        pendingPhotosCount,
      );
      const toReview = shouldSendPublishedListingToReview({
        moderationStatus: listingModerationStatus,
        baselineSnapshot: baselineMaterialSnapshotRef.current,
        currentSnapshot: currentSnap,
      });
      const { updatedAt } = await updateOwnerListing(
        draftListingId,
        userId,
        toReview ? { ...patch, status: "pending_review" } : patch,
      );
      editPriceBaselineRef.current =
        typeof patchBase.price_mga === "number" && Number.isFinite(patchBase.price_mga)
          ? patchBase.price_mga
          : null;
      editOriginalPriceRef.current = computedOriginalPriceMga;
      if (toReview) setListingModerationStatus("pending_review");
      baselineMaterialSnapshotRef.current = currentSnap;
      setLastSavedAt(updatedAt);
      setSaveStatus("saved");
      lastPersistedFingerprintRef.current = progressFingerprint;
      saveLocalPublishBackup(
        userId,
        draftListingId,
        buildPublishLocalBackupPayload({
          draftListingId,
          step: stepOverride ?? step,
          transaction: form.transaction,
          listingType: form.listingType,
          isNewProgram: form.isNewProgram,
          internalRef: form.internalRef,
          ville: form.ville,
          arrondissement: form.arrondissement,
          quartier: form.quartier,
          quartierLibre: form.quartierLibre,
          pinLat: form.pinLat,
          pinLng: form.pinLng,
          title: form.title,
          description: form.description,
          priceMga: form.priceMga,
          negotiable: form.negotiable,
          surface: form.surface,
          rooms: form.rooms,
          bathrooms: form.bathrooms,
          toilets: form.toilets,
          vehicleMake: form.vehicleMake,
          vehicleModel: form.vehicleModel,
          vehicleYear: form.vehicleYear,
          vehicleFuel: form.vehicleFuel,
          vehicleTransmission: form.vehicleTransmission,
          vehicleDrivetrain: form.vehicleDrivetrain,
          vehicleCondition: form.vehicleCondition,
          vehicleSellerType: form.vehicleSellerType,
          vehicleRentalMode: form.vehicleRentalMode,
          vehicleBodyStyle: form.vehicleBodyStyle,
          vehicleDoors: form.vehicleDoors,
          vehicleSeats: form.vehicleSeats,
          vehicleExteriorColor: form.vehicleExteriorColor,
          vehicleEngineDisplacement: form.vehicleEngineDisplacement,
          vehicleInteriorColor: form.vehicleInteriorColor,
          vehicleAvailabilityStatus: form.vehicleAvailabilityStatus,
          vehicleWhatsappPhone: form.vehicleWhatsappPhone,
          vehicleIsElectric: form.vehicleIsElectric,
          vehicleIsHybrid: form.vehicleIsHybrid,
          selectedFeatures: form.selectedFeatures,
          videoUrl: form.videoUrl,
          virtualTourUrl: form.virtualTourUrl,
          selectedBoosts: form.selectedBoosts,
          agencySpotlight: form.agencySpotlight,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: ["my-listings", userId] });
      await queryClient.invalidateQueries({ queryKey: ["listing", draftListingId] });
      return true;
    }

    const { updatedAt } = await saveDraftListing(draftListingId, patchBase);
    setLastSavedAt(updatedAt);
    setSaveStatus("saved");
    lastPersistedFingerprintRef.current = progressFingerprint;
    saveLocalPublishBackup(
      userId,
      draftListingId,
      buildPublishLocalBackupPayload({
        draftListingId,
        step: stepOverride ?? step,
        transaction: form.transaction,
        listingType: form.listingType,
        isNewProgram: form.isNewProgram,
        internalRef: form.internalRef,
        ville: form.ville,
        arrondissement: form.arrondissement,
        quartier: form.quartier,
        quartierLibre: form.quartierLibre,
        pinLat: form.pinLat,
        pinLng: form.pinLng,
        title: form.title,
        description: form.description,
        priceMga: form.priceMga,
        negotiable: form.negotiable,
        surface: form.surface,
        rooms: form.rooms,
        bathrooms: form.bathrooms,
        toilets: form.toilets,
        vehicleMake: form.vehicleMake,
        vehicleModel: form.vehicleModel,
        vehicleYear: form.vehicleYear,
        vehicleFuel: form.vehicleFuel,
        vehicleTransmission: form.vehicleTransmission,
        vehicleDrivetrain: form.vehicleDrivetrain,
        vehicleCondition: form.vehicleCondition,
        vehicleSellerType: form.vehicleSellerType,
        vehicleRentalMode: form.vehicleRentalMode,
        vehicleBodyStyle: form.vehicleBodyStyle,
        vehicleDoors: form.vehicleDoors,
        vehicleSeats: form.vehicleSeats,
        vehicleExteriorColor: form.vehicleExteriorColor,
        vehicleEngineDisplacement: form.vehicleEngineDisplacement,
        vehicleInteriorColor: form.vehicleInteriorColor,
        vehicleAvailabilityStatus: form.vehicleAvailabilityStatus,
        vehicleWhatsappPhone: form.vehicleWhatsappPhone,
        vehicleIsElectric: form.vehicleIsElectric,
        vehicleIsHybrid: form.vehicleIsHybrid,
        selectedFeatures: form.selectedFeatures,
        videoUrl: form.videoUrl,
        virtualTourUrl: form.virtualTourUrl,
        selectedBoosts: form.selectedBoosts,
        agencySpotlight: form.agencySpotlight,
      }),
    );
    await queryClient.invalidateQueries({ queryKey: ["my-listings", userId] });
    return true;
  } catch (e) {
    // Lot 9.1c — Race condition : un autosave debouncé peut encore se
    // déclencher juste après qu'une publication ait basculé le statut en
    // `pending_review`. Le filtre `.eq("status", "draft")` renvoie alors 0
    // ligne (PGRST116). On ne prévient pas l'utilisateur — la publication a
    // en réalité réussi.
    if (isDraftNoLongerDraftError(e)) {
      setSaveStatus("idle");
      setSaveError(null);
      return false;
    }
    setSaveStatus("error");
    const msg = e instanceof Error ? e.message : "Erreur";
    setSaveError(msg);
    toast.error(t("publish.draftSaveError", "Sauvegarde impossible : {{msg}}").replace("{{msg}}", msg));
    return false;
  }
}
