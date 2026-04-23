import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublishStepVisibility from "@/components/publish/PublishStepVisibility";
import { Loader2 } from "lucide-react";
import { LISTING_TYPES_WITH_TRIM_AND_DOORS_FIELDS, type ListingType } from "@/types/listing";
import { getSuggestedListingCoordinates } from "@/data/madagascar-locations";
import {
  sanitizeListingEquipment,
  parseCustomFeaturesInput,
  encodeCustomFeature,
} from "@/data/listing-equipment";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import { formatAriary } from "@/config/monetization";
import { usePricing } from "@/hooks/usePricing";
import { invalidateCreditsBalanceQueries } from "@/lib/creditsBalance";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearLocalPublishBackup,
  deleteDraftListingForOwner,
  formToListingUpdate,
  buildListingMaterialSnapshotFromForm,
  listingRowToFormState,
  omitBoostFieldsFromListingPatch,
  saveLocalPublishBackup,
  shouldSendPublishedListingToReview,
  computeOriginalPriceMgaForEdit,
} from "@/lib/publishDraft";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { PublishPageHeader } from "@/pages/publish/components/PublishPageHeader";
import { PublishProgressSteps } from "@/pages/publish/components/PublishProgressSteps";
import { PublishStepErrors } from "@/pages/publish/components/PublishStepErrors";
import { PublishBasicInfoSection } from "@/pages/publish/components/PublishBasicInfoSection";
import { PublishDetailsSection } from "@/pages/publish/components/PublishDetailsSection";
import { PublishMediaSection } from "@/pages/publish/components/PublishMediaSection";
import { PublishStepNav } from "@/pages/publish/components/PublishStepNav";
import { PublishStepGuideCard } from "@/pages/publish/components/PublishStepGuideCard";
import { PublishGuidanceAside } from "@/pages/publish/components/PublishGuidanceAside";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PremiumStatePanel } from "@/components/ui/premium-state";
import { buildVehicleMetaTags } from "@/lib/vehicleMetaTags";
import { normalizeEngineDisplacementInput } from "@/lib/vehicleAttributes";
import { buildLegacyMirrorPatchFromVehicleInputs } from "@/pages/publish/publishVehicleLegacyMirror";
import type { PublishValidationInput } from "@/pages/publish/publishValidation";
import { buildPublishLocalBackupPayload } from "@/pages/publish/publishBackupPayload";
import {
  runPersistDraftOperation,
  type PersistDraftFormSnapshot,
} from "@/pages/publish/publishPersistDraftOperation";
import { usePublishMedia } from "@/hooks/publish/usePublishMedia";
import { usePublishStepValidation } from "@/hooks/publish/usePublishStepValidation";
import { usePublishBootstrap } from "@/hooks/publish/usePublishBootstrap";
import { usePublishDraftLifecycle } from "@/hooks/publish/usePublishDraftLifecycle";
import { isPublishWithCreditsFailure, publishListingWithCredits } from "@/lib/publishWithCredits";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { publishFormSchema, type PublishFormValues } from "@/pages/publish/publishFormSchema";
import { PUBLISH_FORM_DEFAULTS } from "@/pages/publish/publishFormDefaults";
import { mapDbRowToFormValues } from "@/pages/publish/mapDbRowToFormValues";
import { computeProgressFingerprint } from "@/pages/publish/publishProgressFingerprint";

const PublishPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spNew = searchParams.get("new");
  const spDraft = searchParams.get("draft");
  const spEdit = searchParams.get("edit");
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Phase 6.3.a: form instance co-exists with the legacy useState block below.
   * `mode: 'onBlur'` keeps resolver overhead minimal — RHF errors are not
   * surfaced yet (usePublishStepValidation remains the source of truth for
   * step-advancement gating). Subsequent sub-phases (6.3.b, 6.3.c) will
   * progressively delete the duplicated useState and read from this form.
   */
  const form = useForm<PublishFormValues>({
    resolver: zodResolver(publishFormSchema),
    defaultValues: PUBLISH_FORM_DEFAULTS,
    mode: "onBlur",
  });

  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [draftListingId, setDraftListingId] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [, setDraftBootLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hydratingRef = useRef(false);
  /** Mode édition d’annonce déjà publiée / hors brouillon (?edit=uuid). */
  const [isPublishedListingEdit, setIsPublishedListingEdit] = useState(false);
  /** Statut courant côté modération (passe à pending_review après changement matériel). */
  const [listingModerationStatus, setListingModerationStatus] = useState<string | null>(null);
  const baselineMaterialSnapshotRef = useRef<string>("");
  const editPriceBaselineRef = useRef<number | null>(null);
  const editOriginalPriceRef = useRef<number | null>(null);
  /** Skips bootstrap re-entry after we self-navigate post-create; see usePublishBootstrap. */
  const selfNavigatedDraftIdRef = useRef<string | null>(null);

  const steps = [
    t("publish.stepMain", "Informations principales"),
    t("publish.stepDetails", "Détails du véhicule"),
    t("publish.stepMedia", "Médias"),
    t("publish.stepVisibility", "Visibilité & envoi"),
  ];
  const stepGuides = [
    {
      title: t("publish.stepMain", "Informations principales"),
      subtitle: t("publish.stepMainSubtitle", "Cadrez la base de votre annonce avec clarté."),
      helper: t("publish.stepMainHelper", "Définissez transaction, type de véhicule et localisation pour une lecture immédiate."),
    },
    {
      title: t("publish.stepDetails", "Détails du véhicule"),
      subtitle: t("publish.stepDetailsSubtitle", "Renforcez la crédibilité de votre offre."),
      helper: t("publish.stepDetailsHelper", "Titre précis, prix cohérent et identité véhicule complète pour inspirer confiance."),
    },
    {
      title: t("publish.stepMedia", "Médias"),
      subtitle: t("publish.stepMediaSubtitle", "Valorisez visuellement votre annonce."),
      helper: t("publish.stepMediaHelper", "Privilégiez des photos nettes et une couverture forte pour améliorer l’intention de contact."),
    },
    {
      title: t("publish.stepVisibility", "Visibilité & envoi"),
      subtitle: t("home.finalizeConfidence", "Finalisez avec confiance."),
      helper: t("publish.stepVisibilityHelper", "Vérifiez le récapitulatif, ajustez vos options puis envoyez votre annonce à la modération."),
    },
  ] as const;

  // Phase 6.3.b: identity + location fields migrated to RHF.
  const transaction = form.watch("transaction");
  const listingType = form.watch("listingType");
  const isNewProgram = form.watch("isNewProgram");
  const internalRef = form.watch("internalRef");
  const ville = form.watch("ville");
  const arrondissement = form.watch("arrondissement");
  const quartier = form.watch("quartier");
  const quartierLibre = form.watch("quartierLibre");
  const pinLat = form.watch("pinLat");
  const pinLng = form.watch("pinLng");

  // Phase 6.3.b: description + pricing + legacy-specs migrated to RHF.
  const title = form.watch("title");
  const description = form.watch("description");
  const priceMga = form.watch("priceMga");
  const negotiable = form.watch("negotiable");
  const surface = form.watch("surface");
  const rooms = form.watch("rooms");
  const bathrooms = form.watch("bathrooms");
  const toilets = form.watch("toilets");
  // Phase 6.3.b: features migrated to RHF.
  const selectedFeatures = form.watch("selectedFeatures");
  const customFeaturesInput = form.watch("customFeaturesInput");
  // Phase 6.3.b: 19 vehicle attributes migrated to RHF.
  const vehicleMake = form.watch("vehicleMake");
  const vehicleModel = form.watch("vehicleModel");
  const vehicleYear = form.watch("vehicleYear");
  const vehicleFuel = form.watch("vehicleFuel");
  const vehicleTransmission = form.watch("vehicleTransmission");
  const vehicleDrivetrain = form.watch("vehicleDrivetrain");
  const vehicleCondition = form.watch("vehicleCondition");
  const vehicleSellerType = form.watch("vehicleSellerType");
  const vehicleRentalMode = form.watch("vehicleRentalMode");
  const vehicleBodyStyle = form.watch("vehicleBodyStyle");
  const vehicleDoors = form.watch("vehicleDoors");
  const vehicleSeats = form.watch("vehicleSeats");
  const vehicleExteriorColor = form.watch("vehicleExteriorColor");
  const vehicleEngineDisplacement = form.watch("vehicleEngineDisplacement");
  const vehicleInteriorColor = form.watch("vehicleInteriorColor");
  const vehicleAvailabilityStatus = form.watch("vehicleAvailabilityStatus");
  const vehicleWhatsappPhone = form.watch("vehicleWhatsappPhone");
  const vehicleIsElectric = form.watch("vehicleIsElectric");
  const vehicleIsHybrid = form.watch("vehicleIsHybrid");

  // Phase 6.3.b: media fields migrated to RHF.
  const videoUrl = form.watch("videoUrl");
  const virtualTourUrl = form.watch("virtualTourUrl");

  // Phase 6.3.b: boosts migrated to RHF (permissive sub-schema in publishFormSchema).
  const selectedBoosts = form.watch("selectedBoosts");
  const agencySpotlight = form.watch("agencySpotlight");
  // Phase 6.4.e: 4 purchase useState (creditPackPurchase, purchasePaymentMethod,
  // proofFile, purchaseSubmitting) moved into PublishStepVisibility. publishing
  // stays here because handlePublish (parent) toggles it across the publish flow.
  const [publishing, setPublishing] = useState(false);
  const exitBypassRef = useRef(false);
  const lastPersistedFingerprintRef = useRef("");
  const fingerprintInitializedRef = useRef(false);

  const {
    serverPhotos,
    setServerPhotos,
    pendingPhotos,
    serverPhotosRef,
    flushPendingPhotosToServer,
    handlePhotoSelect,
    removePhotoAt,
    makeCoverAtIndex,
    isUploading,
  } = usePublishMedia(draftListingId, user ?? null);

  const publishValidationInput = useMemo<PublishValidationInput>(
    () => ({
      transaction,
      listingType,
      ville,
      pinLat,
      pinLng,
      title,
      description,
      priceMga,
      surface,
      vehicleYear,
      vehicleDoors,
      vehicleSeats,
      vehicleEngineDisplacement,
      vehicleMake,
      vehicleModel,
      photoCount: serverPhotos.length + pendingPhotos.length,
    }),
    [
      transaction,
      listingType,
      ville,
      pinLat,
      pinLng,
      title,
      description,
      priceMga,
      surface,
      vehicleYear,
      vehicleDoors,
      vehicleSeats,
      vehicleEngineDisplacement,
      vehicleMake,
      vehicleModel,
      serverPhotos.length,
      pendingPhotos.length,
    ],
  );

  const { validateStep, getFirstInvalidStep } = usePublishStepValidation(publishValidationInput, t);

  const applyVehicleLegacyMirrorFromInputs = useCallback(
    (nextVehicle: { mileageKmInput?: string; doorsInput?: string; seatsInput?: string }) => {
      const mirrored = buildLegacyMirrorPatchFromVehicleInputs(nextVehicle);
      if (mirrored.surface != null) form.setValue("surface", mirrored.surface);
      if (mirrored.bathrooms != null) form.setValue("bathrooms", mirrored.bathrooms);
      if (mirrored.toilets != null) form.setValue("toilets", mirrored.toilets);
    },
    [form],
  );

  // Phase 6.4.c: showRooms moved into PublishDetailsSection (computed locally from watch("listingType")).
  // Phase 6.4.e: manualPaymentMethods moved into PublishStepVisibility.
  // Phase 6.4.b: typeOptions, publishVehicleTypeOptions and selectedPublishVehicleTypeId
  // moved into PublishBasicInfoSection (recomputed locally from form watches).

  // Phase 6.4.e: creditPacks useQuery moved into PublishStepVisibility.

  const setDraftMode = useCallback(() => {
    setIsPublishedListingEdit(false);
    setListingModerationStatus(null);
    baselineMaterialSnapshotRef.current = "";
    editPriceBaselineRef.current = null;
    editOriginalPriceRef.current = null;
  }, []);

  const applyListingRowToFormState = useCallback((row: Tables<"listings">) => {
    hydratingRef.current = true;
    // Phase 6.3.a: hydrate the new RHF form. The legacy useState setters
    // below are still called so the JSX (which still reads useState values)
    // stays in sync. 6.3.b will remove the useState and read via form.watch.
    form.reset(mapDbRowToFormValues(row));
    const fs = listingRowToFormState(row);
    // Phase 6.3.b: identity + location now hydrated by form.reset above.
    lastAutoVilleRef.current = fs.ville || "";
    // Phase 6.3.b: description + pricing + legacy-specs + features + 19 vehicle attributes
    // are hydrated by form.reset above (mapDbRowToFormValues handles sanitization
    // + customFeaturesInput extraction + meta-tag fallbacks).
    // Phase 6.3.b: videoUrl + virtualTourUrl now hydrated by form.reset above.
    // Phase 6.3.b: boosts hydrated by form.reset above.
    setStep(fs.step);
    setDraftListingId(row.id);
    editPriceBaselineRef.current =
      typeof row.price_mga === "number" && Number.isFinite(row.price_mga) ? row.price_mga : null;
    editOriginalPriceRef.current =
      typeof row.original_price_mga === "number" && Number.isFinite(row.original_price_mga)
        ? row.original_price_mga
        : null;
  }, [form]);

  const currentPriceNumeric = useMemo(() => {
    const value = Number(priceMga);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }, [priceMga]);

  const activeOriginalForCurrentPrice = useMemo(
    () =>
      computeOriginalPriceMgaForEdit({
        previousCurrentPriceMga: editPriceBaselineRef.current,
        previousOriginalPriceMga: editOriginalPriceRef.current,
        nextCurrentPriceMga: currentPriceNumeric,
      }),
    [currentPriceNumeric],
  );

  const priceDealHelperText = useMemo(() => {
    if (!isPublishedListingEdit) {
      return t(
        "publish.priceDealHintDefault",
        "Une baisse de prix réelle peut rendre votre annonce éligible à la section Bonnes affaires.",
      );
    }
    const baselinePrice = editPriceBaselineRef.current;
    if (!baselinePrice || currentPriceNumeric <= 0) {
      return t(
        "publish.priceDealHintDefault",
        "Une baisse de prix réelle peut rendre votre annonce éligible à la section Bonnes affaires.",
      );
    }
    if (activeOriginalForCurrentPrice && activeOriginalForCurrentPrice > currentPriceNumeric) {
      const discountPercent = Math.round(
        ((activeOriginalForCurrentPrice - currentPriceNumeric) / activeOriginalForCurrentPrice) * 100,
      );
      return t(
        "publish.priceDealHintActive",
        "Réduction active: {{percent}}% (ancien prix: {{oldPrice}}).",
        { percent: discountPercent, oldPrice: formatAriary(activeOriginalForCurrentPrice) },
      );
    }
    if (currentPriceNumeric < baselinePrice) {
      return t(
        "publish.priceDealHintLowering",
        "Votre prix précédent sera conservé automatiquement en cas de baisse réelle.",
      );
    }
    if (currentPriceNumeric > baselinePrice) {
      return t(
        "publish.priceDealHintIncrease",
        "Une hausse de prix désactive la mise en avant Bonnes affaires jusqu'à une nouvelle baisse réelle.",
      );
    }
    return t(
      "publish.priceDealHintDefault",
      "Une baisse de prix réelle peut rendre votre annonce éligible à la section Bonnes affaires.",
    );
  }, [isPublishedListingEdit, currentPriceNumeric, activeOriginalForCurrentPrice, t]);

  const selectedFeaturesWithVehicleMeta = useMemo(
    () => [
      ...sanitizeListingEquipment(selectedFeatures),
      ...parseCustomFeaturesInput(customFeaturesInput).map((feature) => encodeCustomFeature(feature)),
      ...buildVehicleMetaTags({
        make: vehicleMake,
        model: vehicleModel,
        year: vehicleYear ? Number(vehicleYear) : null,
        fuel: vehicleFuel,
        transmission: vehicleTransmission,
        drivetrain: vehicleDrivetrain,
        condition: vehicleCondition,
        sellerType: vehicleSellerType,
        engineDisplacementL: normalizeEngineDisplacementInput(vehicleEngineDisplacement),
      }),
    ],
    [
      selectedFeatures,
      customFeaturesInput,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleFuel,
      vehicleTransmission,
      vehicleDrivetrain,
      vehicleCondition,
      vehicleSellerType,
      vehicleEngineDisplacement,
    ],
  );

  /**
   * Snapshot stabilisé pour la persistance serveur / backup.
   * Phase 6.3.c: spread of `form.getValues()` collapses the explicit 40-field
   * mapping to one line; `selectedFeatures` is overridden with the merged
   * equipment + custom-input + vehicle-meta version (single source of truth
   * for what hits the DB).
   */
  const persistDraftForm = useMemo<PersistDraftFormSnapshot>(
    () => ({
      ...form.getValues(),
      selectedFeatures: selectedFeaturesWithVehicleMeta,
    }),
    [
      transaction, listingType, isNewProgram, internalRef,
      ville, arrondissement, quartier, quartierLibre, pinLat, pinLng,
      title, description, priceMga, negotiable, surface, rooms, bathrooms, toilets,
      vehicleMake, vehicleModel, vehicleYear, vehicleFuel, vehicleTransmission,
      vehicleDrivetrain, vehicleCondition, vehicleSellerType, vehicleRentalMode,
      vehicleBodyStyle, vehicleDoors, vehicleSeats, vehicleExteriorColor,
      vehicleEngineDisplacement, vehicleInteriorColor, vehicleAvailabilityStatus,
      vehicleWhatsappPhone, vehicleIsElectric, vehicleIsHybrid,
      videoUrl, virtualTourUrl, selectedBoosts, agencySpotlight,
      selectedFeaturesWithVehicleMeta, form,
    ],
  );

  /**
   * Phase 6.3.c: change-detection hash computed by `computeProgressFingerprint`
   * helper (preserves the exact trim/sort normalization). Deps mirror the
   * fields it reads so the memo recomputes on any meaningful change.
   */
  const progressFingerprint = useMemo(
    () =>
      computeProgressFingerprint(
        form.getValues(),
        step,
        serverPhotos.map((p) => p.id),
        pendingPhotos.length,
      ),
    [
      step,
      transaction, listingType, isNewProgram, internalRef,
      ville, arrondissement, quartier, quartierLibre, pinLat, pinLng,
      title, description, priceMga, negotiable, surface, rooms, bathrooms, toilets,
      vehicleMake, vehicleModel, vehicleYear, vehicleFuel, vehicleTransmission,
      vehicleDrivetrain, vehicleCondition, vehicleSellerType, vehicleRentalMode,
      vehicleBodyStyle, vehicleDoors, vehicleSeats, vehicleExteriorColor,
      vehicleEngineDisplacement, vehicleInteriorColor, vehicleAvailabilityStatus,
      vehicleWhatsappPhone, vehicleIsElectric, vehicleIsHybrid,
      selectedFeatures, customFeaturesInput,
      videoUrl, virtualTourUrl, selectedBoosts, agencySpotlight,
      serverPhotos, pendingPhotos.length, form,
    ],
  );

  const hasMeaningfulDraftProgress = useMemo(() => {
    const hasLocation = Boolean(ville.trim()) || (pinLat != null && pinLng != null);
    return (
      title.trim().length >= 4 ||
      description.trim().length >= 12 ||
      Number(priceMga) > 0 ||
      hasLocation ||
      vehicleMake.trim().length > 0 ||
      vehicleModel.trim().length > 0 ||
      vehicleYear.trim().length > 0 ||
      serverPhotos.length + pendingPhotos.length > 0 ||
      selectedFeatures.length > 0 ||
      customFeaturesInput.trim().length > 0
    );
  }, [
    title,
    description,
    priceMga,
    ville,
    pinLat,
    pinLng,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    serverPhotos.length,
    pendingPhotos.length,
    selectedFeatures.length,
    customFeaturesInput,
  ]);

  const hasUnsavedMeaningfulChanges =
    hasMeaningfulDraftProgress && progressFingerprint !== lastPersistedFingerprintRef.current;

  /**
   * Signal unique pour l'autosave debouncé. Phase 6.3.c: this is now just a
   * spread of the form values + step + the merged equipment list. The hook
   * `usePublishDraftLifecycle` only cares that the reference changes when a
   * persistable field changes — the field-by-field listing was redundant
   * with `form.watch` subscriptions already in place.
   */
  const draftAutosaveSignal = useMemo(
    () => ({
      ...form.getValues(),
      selectedFeaturesWithVehicleMeta,
      step,
    }),
    [
      transaction, listingType, isNewProgram, internalRef,
      ville, arrondissement, quartier, quartierLibre, pinLat, pinLng,
      title, description, priceMga, surface, rooms, bathrooms, toilets,
      vehicleMake, vehicleModel, vehicleYear, vehicleFuel, vehicleTransmission,
      vehicleDrivetrain, vehicleCondition, vehicleSellerType, vehicleRentalMode,
      vehicleBodyStyle, vehicleDoors, vehicleSeats, vehicleExteriorColor,
      vehicleEngineDisplacement, vehicleInteriorColor, vehicleAvailabilityStatus,
      vehicleWhatsappPhone, vehicleIsElectric, vehicleIsHybrid,
      selectedFeatures, customFeaturesInput,
      videoUrl, virtualTourUrl, selectedBoosts, agencySpotlight,
      selectedFeaturesWithVehicleMeta, step, form,
    ],
  );

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!profile?.agency_id) form.setValue("agencySpotlight", false);
  }, [profile?.agency_id, form]);

  useEffect(() => {
    if (!draftHydrated) return;
    if (!profile) return;
    const inferredSellerType =
      profile.role === "agence" || profile.agency_id ? "concessionnaire" : "particulier";
    if (
      vehicleSellerType &&
      (vehicleSellerType === "particulier" || vehicleSellerType === "concessionnaire")
    ) {
      return;
    }
    form.setValue("vehicleSellerType", inferredSellerType);
  }, [draftHydrated, profile, vehicleSellerType, form]);

  /** Centre-ville suggéré uniquement quand la ville change — pas à chaque arrondissement/quartier (évite d’écraser la position choisie sur la carte). */
  const lastAutoVilleRef = useRef<string>("");
  useEffect(() => {
    if (hydratingRef.current) return;
    if (!ville) {
      form.setValue("pinLat", null);
      form.setValue("pinLng", null);
      lastAutoVilleRef.current = "";
      return;
    }
    if (lastAutoVilleRef.current === ville) return;
    lastAutoVilleRef.current = ville;
    const s = getSuggestedListingCoordinates(ville);
    if (s) {
      form.setValue("pinLat", s.lat);
      form.setValue("pinLng", s.lng);
    } else {
      form.setValue("pinLat", null);
      form.setValue("pinLng", null);
    }
  }, [ville, form]);

  usePublishBootstrap({
    userId: user?.id,
    spNew,
    spDraft,
    spEdit,
    navigate,
    t,
    setDraftHydrated,
    setDraftBootLoading,
    setSaveError,
    setStep,
    setServerPhotos,
    setIsPublishedListingEdit,
    setListingModerationStatus,
    setLastSavedAt,
    applyListingRowToFormState,
    setDraftMode,
    exitBypassRef,
    fingerprintInitializedRef,
    hydratingRef,
    baselineMaterialSnapshotRef,
    selfNavigatedDraftIdRef,
  });

  const persistDraft = useCallback(
    async (stepOverride?: number) =>
      runPersistDraftOperation({
        stepOverride,
        step,
        userId: user?.id,
        draftListingId,
        draftHydrated,
        isPublishedListingEdit,
        listingModerationStatus,
        pendingPhotosCount: pendingPhotos.length,
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
        form: persistDraftForm,
      }),
    [
      step,
      user?.id,
      draftListingId,
      draftHydrated,
      isPublishedListingEdit,
      listingModerationStatus,
      pendingPhotos.length,
      progressFingerprint,
      queryClient,
      t,
      persistDraftForm,
    ],
  );

  const deleteCurrentDraft = useCallback(async () => {
    if (!user?.id || !draftListingId || isPublishedListingEdit) return true;
    await deleteDraftListingForOwner(draftListingId, user.id);
    clearLocalPublishBackup(user.id, draftListingId);
    await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
    return true;
  }, [user?.id, draftListingId, isPublishedListingEdit, queryClient]);

  const onBeforeUnloadBackup = useCallback(() => {
    if (!user?.id || !draftListingId) return;
    saveLocalPublishBackup(
      user.id,
      draftListingId,
      buildPublishLocalBackupPayload({
        draftListingId,
        step,
        ...persistDraftForm,
      }),
    );
  }, [user?.id, draftListingId, step, persistDraftForm]);

  usePublishDraftLifecycle({
    persistDraft,
    draftHydrated,
    draftListingId,
    userId: user?.id,
    isPublishedListingEdit,
    progressFingerprint,
    fingerprintInitializedRef,
    lastPersistedFingerprintRef,
    draftAutosaveSignal,
    hasUnsavedMeaningfulChanges,
    onBeforeUnloadBackup,
    exitBypassRef,
    userIdForCleanup: user?.id,
    draftListingIdForCleanup: draftListingId,
    isPublishedListingEditForCleanup: isPublishedListingEdit,
    hasMeaningfulDraftProgress,
    deleteCurrentDraft,
  });

  useEffect(() => {
    if (listingType && !LISTING_TYPES_WITH_TRIM_AND_DOORS_FIELDS.includes(listingType as ListingType)) {
      form.setValue("rooms", "");
      form.setValue("bathrooms", "");
      form.setValue("toilets", "");
    }
  }, [listingType, form]);

  // Phase 6.4.e: useCreditsBalance + agencySpotlightActive + totalCost +
  // canPublishWithCredits + toggleBoost moved into PublishStepVisibility.
  // usePricing kept here for livePrices.publish_listing (consumed by header).
  const { prices: livePrices } = usePricing();

  useEffect(() => {
    const autoTitle = [vehicleMake.trim(), vehicleModel.trim(), vehicleYear.trim()].filter(Boolean).join(" ");
    if (!autoTitle) return;
    if (title.trim().length === 0) {
      form.setValue("title", autoTitle.slice(0, 120));
    }
  }, [vehicleMake, vehicleModel, vehicleYear, title, form]);

  const handleNext = async () => {
    const errors = validateStep(step);
    setStepErrors(errors);
    if (errors.length > 0) {
      toast.error(errors[0]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const nextStep = step + 1;
    await persistDraft(nextStep);
    setStep(nextStep);
  };

  const handlePublish = async () => {
    const firstInvalid = getFirstInvalidStep();
    const errors = firstInvalid
      ? validateStep(0).concat(validateStep(1)).concat(validateStep(2))
      : [];
    setStepErrors(errors);
    if (firstInvalid) {
      toast.error(firstInvalid.errors[0]);
      setStep(firstInvalid.step);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!user || !transaction || !listingType) {
      toast.error(t("publish.loginRequired", "Vous devez être connecté"));
      return;
    }
    if (!draftListingId) {
      toast.error(t("publish.noDraft", "Brouillon introuvable — rechargez la page."));
      return;
    }

    if (isPublishedListingEdit) {
      setPublishing(true);
      try {
        if (pendingPhotos.length > 0) {
          const { failed } = await flushPendingPhotosToServer();
          if (failed > 0) {
            throw new Error(t("publish.uploadRetryNeeded", "Certaines photos n'ont pas pu être envoyées. Réessayez."));
          }
        }
        const nextPhotos = serverPhotosRef.current;

        let finalLat: number | null = null;
        let finalLng: number | null = null;
        if (pinLat != null && pinLng != null && isValidListingCoordinates(pinLat, pinLng)) {
          finalLat = Number(pinLat.toFixed(7));
          finalLng = Number(pinLng.toFixed(7));
        } else {
          const fallback = getSuggestedListingCoordinates(ville, arrondissement || undefined, quartier || undefined);
          if (fallback) {
            finalLat = Number(fallback.lat.toFixed(7));
            finalLng = Number(fallback.lng.toFixed(7));
          }
        }

        // Phase 6.3.c: form.getValues() supplies all 40 listing fields in one spread;
        // pinLat/pinLng + selectedFeatures are overridden with computed values.
        const formValues = form.getValues();
        const patchBase = formToListingUpdate({
          ...formValues,
          pinLat: finalLat,
          pinLng: finalLng,
          selectedFeatures: selectedFeaturesWithVehicleMeta,
          draftStep: step,
          isDraftSave: false,
        });
        const computedOriginalPriceMga = computeOriginalPriceMgaForEdit({
          previousCurrentPriceMga: editPriceBaselineRef.current,
          previousOriginalPriceMga: editOriginalPriceRef.current,
          nextCurrentPriceMga: patchBase.price_mga,
        });
        const patch = {
          ...omitBoostFieldsFromListingPatch(patchBase),
          original_price_mga: computedOriginalPriceMga,
        };

        const photoIdsOrdered = nextPhotos.map((p) => p.id);
        const currentSnap = buildListingMaterialSnapshotFromForm(
          {
            ...formValues,
            pinLat: finalLat,
            pinLng: finalLng,
            selectedFeatures: selectedFeaturesWithVehicleMeta,
          },
          photoIdsOrdered,
          0,
        );
        const toReview = shouldSendPublishedListingToReview({
          moderationStatus: listingModerationStatus,
          baselineSnapshot: baselineMaterialSnapshotRef.current,
          currentSnapshot: currentSnap,
        });

        const { error: upErr } = await supabase
          .from("listings")
          .update({
            ...patch,
            description: description.trim(),
            ...(toReview ? { status: "pending_review" } : {}),
          })
          .eq("id", draftListingId)
          .eq("owner_id", user.id);

        if (upErr) throw new Error(upErr.message);

        editPriceBaselineRef.current =
          typeof patchBase.price_mga === "number" && Number.isFinite(patchBase.price_mga)
            ? patchBase.price_mga
            : null;
        editOriginalPriceRef.current = computedOriginalPriceMga;

        if (toReview) setListingModerationStatus("pending_review");
        baselineMaterialSnapshotRef.current = currentSnap;

        await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
        await queryClient.invalidateQueries({ queryKey: ["listing", draftListingId] });
        clearLocalPublishBackup(user.id, draftListingId);
        exitBypassRef.current = true;
        toast.success(
          toReview
            ? t(
                "publish.editSuccessReview",
                "Modifications enregistrées. L’annonce repasse en vérification avant republication.",
              )
            : t("publish.editSuccess", "Modifications enregistrées."),
        );
        navigate("/dashboard");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t("publish.error", "Erreur lors de la publication");
        toast.error(message);
      } finally {
        setPublishing(false);
      }
      return;
    }

    setPublishing(true);
    try {
      if (pendingPhotos.length > 0 && draftListingId) {
        const { failed } = await flushPendingPhotosToServer();
        if (failed > 0) {
          throw new Error(t("publish.uploadRetryNeeded", "Certaines photos n'ont pas pu être envoyées. Réessayez."));
        }
      }

      const saved = await persistDraft(step);
      if (!saved) {
        throw new Error(t("publish.draftSaveFailed", "Échec de la sauvegarde"));
      }

      const publishResult = await publishListingWithCredits(draftListingId);
      if (isPublishWithCreditsFailure(publishResult)) {
        if (publishResult.code === "insufficient_credits") {
          throw new Error(
            t(
              "publish.insufficientCredits",
              "Crédits insuffisants — achetez un pack ou choisissez moins d’options boost.",
            ),
          );
        }
        if (publishResult.code === "listing_not_found") {
          throw new Error(
            t("publish.listingNotFoundForPublish", "Annonce introuvable ou déjà supprimée."),
          );
        }
        if (publishResult.code === "invalid_listing_status" || publishResult.code === "already_published") {
          throw new Error(
            t("publish.invalidStatusForPublish", "Cette annonce n’est plus en brouillon et ne peut pas être publiée ici."),
          );
        }
        if (publishResult.code === "not_owner" || publishResult.code === "not_authenticated") {
          throw new Error(
            t("publish.notAuthorizedForPublish", "Action non autorisée pour cette annonce."),
          );
        }
        throw new Error(
          t("publish.error", "Erreur lors de la publication"),
        );
      }

      invalidateCreditsBalanceQueries(queryClient, user.id);
      await queryClient.invalidateQueries({ queryKey: ["my-credits-ledger", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["listing", draftListingId] });
      await refreshProfile();

      await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
      clearLocalPublishBackup(user.id, draftListingId);
      exitBypassRef.current = true;
      toast.success(
        t(
          "publish.successPublishedInstant",
          "Annonce publiée avec succès. Elle est maintenant visible sur AutoNex."
        )
      );
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("publish.error", "Erreur lors de la publication");
      toast.error(message);
    }
    setPublishing(false);
  };

  // Phase 6.4.e: submitCreditPurchase moved into PublishStepVisibility (purchase mini-form is autonomous).

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <FormProvider {...form}>
      <Helmet>
        <title>
          {(isPublishedListingEdit ? t("publish.editTitle", "Modifier l’annonce") : t("publish.title"))} — AutoNex
        </title>
      </Helmet>
      <Header />
      <div className="container mx-auto max-w-6xl py-6 md:py-8 pb-36 sm:pb-8">
        <PublishPageHeader
          moderationText={t(
            "publish.publishBannerInstant",
            "Publication directe sur AutoNex. Coût : {cost} crédits par soumission (+ options boost). Description uniquement en français.",
          )}
          publishCreditCost={livePrices.publish_listing}
          title={isPublishedListingEdit ? t("publish.editTitle", "Modifier l’annonce") : t("publish.title")}
          showNewButton={Boolean(user)}
          newListingLabel={t("publish.newListing", "Nouvelle annonce")}
          onNewListing={() => navigate("/publier?new=1")}
          showDraftStatus={Boolean(user && draftHydrated && draftListingId)}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          saveError={saveError}
          labels={{
            saving: t("publish.saving", "Sauvegarde…"),
            draftSaved: t("publish.draftSaved", "Brouillon enregistré"),
            draftSaveFailed: t("publish.draftSaveFailed", "Échec de la sauvegarde"),
            draftAuto: t("publish.draftAuto", "Brouillon automatique"),
            lastSaved: t("publish.lastSaved", "Dernière sauvegarde : {{time}}"),
          }}
        />

        {user && !draftHydrated && (
          <div className="mb-8 py-4">
            <PremiumStatePanel
              overline={t("publish.loadingOverline", "Espace publication")}
              title={spEdit
                ? t("publish.loadingEditTitle", "Chargement de l’annonce à modifier")
                : t("publish.loadingDraftTitle", "Chargement de votre brouillon")}
              description={spEdit
                ? t("publish.loadingEdit", "Chargement de l’annonce…")
                : t("publish.loadingDraft", "Chargement du brouillon…")}
              icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
              className="py-8"
            />
          </div>
        )}

        {(!user || draftHydrated) && (
        <>
        <PublishProgressSteps steps={steps} step={step} progress={progress} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_0.55fr] lg:gap-6">
          <div className="space-y-4">
            <PublishStepGuideCard
              stepGuide={stepGuides[step]}
              stepCounterLabel={t("publish.stepCounter", "Étape {{current}} / {{total}}", {
                current: step + 1,
                total: steps.length,
              })}
            />

            <PublishStepErrors errors={stepErrors} />

            {isPublishedListingEdit && (
              <Alert className="rounded-2xl border-border bg-secondary/30">
                <AlertDescription className="font-sans text-sm text-foreground leading-relaxed">
                  {t(
                    "publish.editBanner",
                    "Vous modifiez une annonce existante. Les changements sont enregistrés sur la même fiche. Si l’annonce était en ligne et que le contenu change, elle repassera en vérification avant d’être à nouveau visible publiquement.",
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-2xl border border-border/70 bg-card/95 p-4 md:p-5 shadow-sm">
        {step === 0 && (
          <PublishBasicInfoSection
            labels={{
              propertyType: t("publish.propertyType", "Type de véhicule"),
              newProgram: t("publish.newProgram", "Véhicule neuf / import"),
              newProgramHint: t("publish.newProgramHint", "Cochez si l’annonce concerne un véhicule neuf ou récemment importé."),
              internalRef: t("publish.internalRef", "Référence interne (optionnel)"),
              mapTitle: t("publish.mapTitle", "Emplacement approximatif sur la carte"),
              mapPublicHint: t("publish.mapPublicHint", "La position affichée publiquement sera légèrement décalée pour préserver la confidentialité."),
              mapNeedVille: t("publish.mapNeedVille", "Choisissez d’abord une ville."),
              mapNoCoordsForCity: t("publish.mapNoCoordsForCity", "Impossible de placer la carte pour cette ville. Vérifiez le nom ou contactez le support."),
              select: t("common.select"),
              sell: t("publish.sell", "Vendre"),
              rent: t("publish.rent", "Louer"),
              shortTermRental: t("publish.shortTermRental", "Location courte durée"),
              transactionHint: t(
                "publish.transactionHint",
                "Définissez le mode de commercialisation de votre annonce (vente, location, ou courte durée).",
              ),
              transactionType: t("publish.transactionType", "Type de transaction"),
              listingLocationTitle: t("publish.listingLocationTitle", "Localisation de l'annonce"),
              listingLocationHint: t("publish.listingLocationHint", "La ville et un point sur carte sont requis pour publier."),
            }}
          />
        )}

        {step === 1 && (
          <PublishDetailsSection
            labels={{
              listingTitle: t("publish.listingTitle", "Titre"),
              descriptionFr: t("publish.descriptionFr", "Description (français)"),
              listingSurface: t("listing.surface", "Kilométrage"),
              listingRooms: t("listing.rooms", "Version / finition"),
              listingBathrooms: t("listing.bathrooms", "Portes"),
              toilets: t("publish.toilets", "Places / capacité (optionnel)"),
              listingFeatures: t("listing.features", "Équipements"),
              priceDealHint: priceDealHelperText,
            }}
            onApplyVehicleLegacyMirror={applyVehicleLegacyMirrorFromInputs}
          />
        )}

        {step === 2 && (
          <PublishMediaSection
            serverPhotos={serverPhotos}
            pendingPhotos={pendingPhotos}
            isUploading={isUploading}
            labels={{
              mainPhotoFirst: t("publish.mainPhotoFirst", "La première image est la photo principale. Utilisez « Couverture » pour réorganiser."),
              chooseFiles: t("publish.chooseFiles", "Choisir des photos"),
              localOnly: t("publish.localOnly", "Local"),
              uploading: t("publish.uploading", "Téléversement en cours…"),
              videoUrl: t("publish.videoUrl", "Lien vidéo (YouTube, etc.) — optionnel"),
              tourUrl: t("publish.tourUrl", "Visite virtuelle (URL) — optionnel"),
              mainPhotosTitle: t("publish.mainPhotosTitle", "Photos principales"),
              cover: t("publish.cover", "Couverture"),
              advancedMediaTitle: t("publish.advancedMediaTitle", "Médias complémentaires (optionnel)"),
              advancedMediaHint: t("publish.advancedMediaHint", "Ajoutez une vidéo ou une visite virtuelle si disponible."),
            }}
            onPhotoSelect={handlePhotoSelect}
            onMakeCoverAtIndex={(i) => void makeCoverAtIndex(i)}
            onRemovePhotoAt={(i) => void removePhotoAt(i)}
          />
        )}

        {step === 3 && (
          <PublishStepVisibility
            editMode={isPublishedListingEdit}
            editSubmitLabel={t("publish.editSave", "Enregistrer les modifications")}
            photoCount={serverPhotos.length + pendingPhotos.length}
            publishing={publishing}
            onPublish={handlePublish}
          />
        )}
            </div>

        <PublishStepNav
          step={step}
          maxStep={3}
          prevLabel={t("publish.prev")}
          nextLabel={t("publish.next")}
          onPrev={() => {
            void (async () => {
              setStepErrors([]);
              const prev = Math.max(0, step - 1);
              await persistDraft(prev);
              setStep(prev);
            })();
          }}
          onNext={() => void handleNext()}
        />
          </div>

          <PublishGuidanceAside
            overline={t("publish.guidanceOverline", "Guidage AutoNex")}
            title={t("publish.publishWithConfidence", "Publiez avec confiance")}
            secureDraftTitle={t("publish.secureDraft", "Brouillon sécurisé")}
            secureDraftHint={t(
              "publish.secureDraftHint",
              "Vos modifications sont sauvegardées automatiquement.",
            )}
            moderationTitle={t("publish.prePublishModeration", "Modération avant publication")}
            moderationHint={t(
              "publish.prePublishModerationHint",
              "Chaque annonce est vérifiée pour protéger la qualité du catalogue.",
            )}
            guidedFlowTitle={t("publish.guidedFlow", "Parcours guidé")}
            guidedFlowHint={t(
              "publish.guidedFlowHint",
              "Validez chaque étape pour avancer sereinement et limiter les retours arrière.",
            )}
          />
        </div>
        </>
        )}
      </div>
      <div className="hidden sm:block">
        <Footer />
      </div>
    </FormProvider>
  );
};

export default PublishPage;
