import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { YasBackButton } from "@/features/yas-app/components/YasBackButton";
import PublishStepVisibility from "@/components/publish/PublishStepVisibility";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import { LISTING_TYPES_WITH_DOORS_FIELDS, type ListingType } from "@/types/listing";
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
import { parseSupabaseError } from "@/lib/parseSupabaseError";
import { FormProvider, useForm, useWatch } from "react-hook-form";
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

  /**
   * Single subscription to ALL form values (audit fix U6 + step-2 autosave fix).
   *
   * `useWatch({ control })` subscribes the parent component to every field
   * change so any setValue triggers a re-render. `form.getValues()` then
   * returns the current strictly-typed PublishFormValues at this render —
   * no memo to cache stale defaults.
   *
   * Adding a new field to publishFormSchema propagates automatically;
   * the downstream useMemo `progressFingerprint` depends on `formValues`
   * alone. The autosave useEffect uses `progressFingerprint` (string,
   * stable by value) as its trigger, so re-renders without content change
   * don't re-fire the debouncer. The persistDraft / onBeforeUnloadBackup
   * callbacks read `form.getValues()` directly at fire time to defeat
   * an RHF v7 race where setValue without `shouldDirty: true` defers
   * the _formValues flush past the render that armed the snapshot.
   */
  useWatch({ control: form.control });
  const formValues: PublishFormValues = form.getValues();

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

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [step]);

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
  const ville = form.watch("ville");
  const arrondissement = form.watch("arrondissement");
  const quartier = form.watch("quartier");
  const pinLat = form.watch("pinLat");
  const pinLng = form.watch("pinLng");

  // Granular watches kept only for fields read inline (conditions, effects,
  // useMemo bodies elsewhere in this file). Audit fix U6 removed the watches
  // that were declared solely to feed the bulk-snapshot useMemo deps arrays
  // — those memos now depend on `formValues` (useWatch above).
  const title = form.watch("title");
  const description = form.watch("description");
  const priceMga = form.watch("priceMga");
  const mileageKmInput = form.watch("mileageKmInput");
  const selectedFeatures = form.watch("selectedFeatures");
  const customFeaturesInput = form.watch("customFeaturesInput");
  const vehicleMake = form.watch("vehicleMake");
  const vehicleModel = form.watch("vehicleModel");
  const vehicleYear = form.watch("vehicleYear");
  const vehicleFuel = form.watch("vehicleFuel");
  const vehicleTransmission = form.watch("vehicleTransmission");
  const vehicleDrivetrain = form.watch("vehicleDrivetrain");
  const vehicleCondition = form.watch("vehicleCondition");
  const vehicleSellerType = form.watch("vehicleSellerType");
  const vehicleDoors = form.watch("vehicleDoors");
  const vehicleSeats = form.watch("vehicleSeats");
  const vehicleEngineDisplacement = form.watch("vehicleEngineDisplacement");
  // Phase 6.4.e: 4 purchase useState (creditPackPurchase, purchasePaymentMethod,
  // proofFile, purchaseSubmitting) moved into PublishStepVisibility. publishing
  // stays here because handlePublish (parent) toggles it across the publish flow.
  const [publishing, setPublishing] = useState(false);
  const exitBypassRef = useRef(false);
  const lastPersistedFingerprintRef = useRef("");
  const fingerprintInitializedRef = useRef(false);
  // Lot 9.1c — Flag « draft publié avec succès ». Bloque toute tentative
  // d'autosave ultérieure (debounce en vol après le RPC → PATCH sur une ligne
  // dont le statut est déjà `pending_review` → PGRST116). Reset à false si la
  // publication échoue réellement pour redonner la main à l'autosave.
  const draftPublishedRef = useRef(false);

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
      mileageKmInput,
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
      mileageKmInput,
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
   * Change-detection hash computed by `computeProgressFingerprint` helper
   * (preserves the exact trim/sort normalization).
   * Audit fix U6: deps collapsed to formValues + step + photo counters.
   */
  const progressFingerprint = useMemo(
    () =>
      computeProgressFingerprint(
        formValues,
        step,
        serverPhotos.map((p) => p.id),
        pendingPhotos.length,
      ),
    [formValues, step, serverPhotos, pendingPhotos.length],
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
    async (stepOverride?: number) => {
      // Lot 9.1c — Stop d'office toute sauvegarde si l'annonce a déjà été
      // publiée avec succès. Évite le bruit 406 en arrière-plan.
      if (draftPublishedRef.current) return true;
      // Build fresh snapshot AT FIRE TIME (not at render time). The debouncer
      // delays the call by 1s after the last setValue; reading form.getValues()
      // here ensures we capture the post-flush state, defeating the RHF v7
      // race where setValue without shouldDirty defers _formValues flush.
      const persistDraftForm: PersistDraftFormSnapshot = {
        ...form.getValues(),
        selectedFeatures: selectedFeaturesWithVehicleMeta,
      };
      return runPersistDraftOperation({
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
      });
    },
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
      form,
      selectedFeaturesWithVehicleMeta,
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
    // Build fresh at fire time — same rationale as persistDraft above.
    const persistDraftForm = {
      ...form.getValues(),
      selectedFeatures: selectedFeaturesWithVehicleMeta,
    };
    saveLocalPublishBackup(
      user.id,
      draftListingId,
      buildPublishLocalBackupPayload({
        draftListingId,
        step,
        ...persistDraftForm,
      }),
    );
  }, [user?.id, draftListingId, step, form, selectedFeaturesWithVehicleMeta]);

  usePublishDraftLifecycle({
    persistDraft,
    draftHydrated,
    draftListingId,
    userId: user?.id,
    isPublishedListingEdit,
    progressFingerprint,
    fingerprintInitializedRef,
    lastPersistedFingerprintRef,
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
    if (listingType && !LISTING_TYPES_WITH_DOORS_FIELDS.includes(listingType as ListingType)) {
      form.setValue("doorsInput", "");
      form.setValue("seatsInput", "");
    }
  }, [listingType, form]);

  // Phase 6.4.e: useCreditsBalance + agencySpotlightActive + totalCost +
  // canPublishWithCredits + toggleBoost moved into PublishStepVisibility.
  // usePricing kept here for livePrices.publish_listing (consumed by header).
  const { prices: livePrices } = usePricing();

  // Lot 9.2 — L'auto-title intelligent vit désormais dans PublishDetailsSection
  // (flag autoTitleEnabled + bouton « Régénérer »). Ne plus dupliquer la logique ici.

  // Lot 9.9 — Mapping étape → champs Zod à valider avant d'autoriser le « Suivant ».
  // Seuls les champs typés dans le schéma Zod sont listés (photos, pinLat/Lng et
  // photoCount restent gérés par `validateStep` qui lit `publishValidationInput`).
  const getFieldsForStep = (s: number): Array<keyof PublishFormValues> => {
    switch (s) {
      case 0:
        return ["transaction", "listingType", "ville"];
      case 1:
        return [
          "title",
          "description",
          "priceMga",
          "mileageKmInput",
          "vehicleMake",
          "vehicleModel",
          "vehicleYear",
          "vehicleDoors",
          "vehicleSeats",
          "vehicleEngineDisplacement",
        ];
      case 2:
        return [];
      case 3:
        return ["vehicleWhatsappPhone"];
      default:
        return [];
    }
  };

  const scrollToFirstError = (fields: Array<keyof PublishFormValues>) => {
    const errors = form.formState.errors as Record<string, unknown>;
    const firstErrorField = fields.find((f) => errors[f] !== undefined);
    if (!firstErrorField) return;
    const el = document.querySelector<HTMLElement>(
      `[data-field-error="${String(firstErrorField)}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector<HTMLElement>("input, textarea, [role='combobox']");
      input?.focus();
    }
  };

  const handleNext = async () => {
    // Lot 9.9 — Trigger Zod sur les champs de l'étape avant toute chose.
    // Retourne false si un format DB-incompatible est saisi (ex: titre 3 chars,
    // description 20 chars, prix hors range, whatsapp non-E.164).
    const fieldsForStep = getFieldsForStep(step);
    if (fieldsForStep.length > 0) {
      const zodValid = await form.trigger(fieldsForStep);
      if (!zodValid) {
        scrollToFirstError(fieldsForStep);
        return;
      }
    }
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
      return;
    }
    // Lot 9.9 — Garde finale Zod sur l'intégralité des champs typés (y compris
    // whatsapp en étape 3 qui n'est pas couvert par validateStep).
    const allZodFields: Array<keyof PublishFormValues> = [
      "title",
      "description",
      "priceMga",
      "vehicleYear",
      "vehicleWhatsappPhone",
    ];
    const allValid = await form.trigger(allZodFields);
    if (!allValid) {
      const fieldErrors = form.formState.errors as Record<string, { message?: string }>;
      const firstInvalidField = allZodFields.find((f) => fieldErrors[f]);
      const fallback = t("publish.validation.invalid", "Données invalides");
      const rawMessage = firstInvalidField
        ? fieldErrors[firstInvalidField]?.message ?? fallback
        : fallback;
      // Zod messages are i18n keys (e.g. "publish.validation.title.minLength")
      // resolved here via t() so users see localized errors.
      const firstMessage = rawMessage.startsWith("publish.validation.")
        ? t(rawMessage, { defaultValue: fallback })
        : rawMessage;
      toast.error(firstMessage);
      // Si l'erreur est sur whatsapp (étape 3), on reste ; sinon on renvoie en étape 1.
      if (firstInvalidField && firstInvalidField !== "vehicleWhatsappPhone") {
        setStep(1);
      }
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
      // Lot 9.1c — Geler l'autosave pendant toute la phase de publication
      // édition. Tout debounce en vol sera court-circuité par persistDraft.
      draftPublishedRef.current = true;
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
        navigate(`/dashboard?published=${draftListingId}`, { replace: true });
      } catch (err: unknown) {
        // Lot 9.1c — Redonner la main à l'autosave si la sauvegarde édition
        // a vraiment échoué (l'annonce est probablement toujours publiée telle quelle).
        draftPublishedRef.current = false;
        const message = parseSupabaseError(err);
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

      // Lot 9.1c — À partir d'ici, on « gèle » l'autosave : le RPC va
      // basculer le statut de `draft` à `pending_review`, tout PATCH ulté-
      // rieur filtré sur `status = 'draft'` renverrait 406 PGRST116. On
      // réarme le flag si la publication échoue réellement.
      draftPublishedRef.current = true;

      const publishResult = await publishListingWithCredits(draftListingId);

      if (isPublishWithCreditsFailure(publishResult)) {
        draftPublishedRef.current = false;
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
      // Lot 9.1e — Toast différencié selon le statut final renvoyé par la RPC.
      // `active` = dealer fast-track (visible immédiatement), `pending_review`
      // = particulier (modération manuelle sous 24h).
      if (publishResult.finalStatus === "active") {
        toast.success(
          t("publish.successPublishedActive", "Annonce publiée avec succès !"),
          {
            description: t(
              "publish.successPublishedActiveDesc",
              "Votre annonce est désormais visible publiquement sur AutoNex.",
            ),
          },
        );
      } else {
        toast.success(
          t("publish.successPublishedReview", "Annonce envoyée en vérification"),
          {
            description: t(
              "publish.successPublishedReviewDesc",
              "Notre équipe va vérifier votre annonce sous 24h. Vous serez notifié dès qu'elle sera visible.",
            ),
          },
        );
      }

      // Lot 9.1c — `replace: true` évite que Back revienne sur /publier
      // (autosave sur une ligne non-draft → 406 en boucle).
      navigate(`/dashboard?published=${draftListingId}`, { replace: true });
    } catch (err: unknown) {
      // Si on a levé une exception AVANT le RPC (flushPhotos, persistDraft),
      // l'autosave doit reprendre. Si on a levé APRÈS, le flag a déjà été
      // réarmé lors du check `isPublishWithCreditsFailure`.
      draftPublishedRef.current = false;
      const message = parseSupabaseError(err);
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
        <YasBackButton />
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
              icon={<WheelSpinner size="md" />}
              className="py-8"
            />
          </div>
        )}

        {(!user || draftHydrated) && (
        <>
        <PublishProgressSteps steps={steps} step={step} progress={progress} />

        <div className={`grid grid-cols-1 gap-5 ${step === 0 ? "lg:grid-cols-[1.45fr_0.55fr] lg:gap-6" : ""}`}>
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
              mileageKmLabel: t("listing.mileageKm", "Kilométrage"),
              doorsLabel: t("publish.doors", "Portes"),
              seatsLabel: t("publish.seats", "Places / capacité (optionnel)"),
              listingFeatures: t("listing.features", "Équipements"),
              priceDealHint: priceDealHelperText,
            }}
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

          {step === 0 && (
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
          )}
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
