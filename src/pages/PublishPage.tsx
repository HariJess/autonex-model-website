import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublishStepVisibility from "@/components/publish/PublishStepVisibility";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { type ListingType, type TransactionType } from "@/types/listing";
import { getRegionForVille, getSuggestedListingCoordinates } from "@/data/madagascar-locations";
import {
  LISTING_EQUIPMENT_OPTIONS,
  sanitizeListingEquipment,
  parseCustomFeaturesInput,
  encodeCustomFeature,
  extractCustomFeatures,
} from "@/data/listing-equipment";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import {
  listingTypesForTransaction,
  sanitizeListingTypeForTransaction,
} from "@/lib/listingRules";
import {
  LISTING_PUBLISH_CREDIT_COST,
  BOOST_CREDIT_COSTS,
  BOOST_ORDER,
  BOOST_LABELS_FR,
  totalPublicationCredits,
  AGENCY_SPOTLIGHT_CREDIT_COST,
  formatAriary,
  type PurchasableBoostType,
} from "@/config/monetization";
import { mergeCanonicalCreditPacks, type CreditPackRow } from "@/lib/creditPacks";
import { invalidateCreditsBalanceQueries } from "@/lib/creditsBalance";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearLocalPublishBackup,
  createDraftListing,
  deleteDraftListingForOwner,
  deleteListingPhotoRow,
  fetchDraftListingForOwner,
  fetchListingForOwnerEdit,
  fetchListingPhotos,
  formToListingUpdate,
  buildListingMaterialSnapshotFromForm,
  buildListingMaterialSnapshotFromRow,
  listingRowToFormState,
  omitBoostFieldsFromListingPatch,
  saveDraftListing,
  saveLocalPublishBackup,
  setPhotoCoverFirst,
  shouldSendPublishedListingToReview,
  computeOriginalPriceMgaForEdit,
  updateOwnerListing,
  uploadListingPhoto,
  type ServerPhoto,
} from "@/lib/publishDraft";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { buildVehicleMetaTags, parseVehicleMetaTags } from "@/lib/vehicleMetaTags";
import { normalizeEngineDisplacementInput } from "@/lib/vehicleAttributes";
import {
  AUTO_SEARCH_VEHICLE_TYPE_OPTIONS,
  inferVehicleTypeOptionIdFromFilters,
} from "@/data/automotiveCatalog";
import { buildLegacyMirrorPatchFromVehicleInputs } from "@/pages/publish/publishVehicleLegacyMirror";
import {
  getFirstInvalidPublishStep,
  validatePublishStep,
  type PublishValidationInput,
} from "@/pages/publish/publishValidation";
import { isPublishWithCreditsFailure, publishListingWithCredits } from "@/lib/publishWithCredits";

const TYPES_WITH_ROOMS: ListingType[] = ["appartement", "villa", "maison"];

const LISTING_ID_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PublishPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spNew = searchParams.get("new");
  const spDraft = searchParams.get("draft");
  const spEdit = searchParams.get("edit");
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [draftListingId, setDraftListingId] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [, setDraftBootLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hydratingRef = useRef(false);
  const serverPhotosRef = useRef<ServerPhoto[]>([]);
  /** Mode édition d’annonce déjà publiée / hors brouillon (?edit=uuid). */
  const [isPublishedListingEdit, setIsPublishedListingEdit] = useState(false);
  /** Statut courant côté modération (passe à pending_review après changement matériel). */
  const [listingModerationStatus, setListingModerationStatus] = useState<string | null>(null);
  const baselineMaterialSnapshotRef = useRef<string>("");
  const editPriceBaselineRef = useRef<number | null>(null);
  const editOriginalPriceRef = useRef<number | null>(null);

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

  const [transaction, setTransaction] = useState<TransactionType | "">("");
  const [listingType, setListingType] = useState<ListingType | "">("");
  const [isNewProgram, setIsNewProgram] = useState(false);
  const [internalRef, setInternalRef] = useState("");
  const [ville, setVille] = useState("");
  const [arrondissement, setArrondissement] = useState("");
  const [quartier, setQuartier] = useState("");
  const [quartierLibre, setQuartierLibre] = useState("");
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceMga, setPriceMga] = useState("");
  const [surface, setSurface] = useState("");
  const [rooms, setRooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [toilets, setToilets] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customFeaturesInput, setCustomFeaturesInput] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleFuel, setVehicleFuel] = useState("");
  const [vehicleTransmission, setVehicleTransmission] = useState("");
  const [vehicleDrivetrain, setVehicleDrivetrain] = useState("");
  const [vehicleCondition, setVehicleCondition] = useState("");
  const [vehicleSellerType, setVehicleSellerType] = useState("");
  const [vehicleRentalMode, setVehicleRentalMode] = useState("");
  const [vehicleBodyStyle, setVehicleBodyStyle] = useState("");
  const [vehicleDoors, setVehicleDoors] = useState("");
  const [vehicleSeats, setVehicleSeats] = useState("");
  const [vehicleExteriorColor, setVehicleExteriorColor] = useState("");
  const [vehicleEngineDisplacement, setVehicleEngineDisplacement] = useState("");
  const [vehicleInteriorColor, setVehicleInteriorColor] = useState("");
  const [vehicleAvailabilityStatus, setVehicleAvailabilityStatus] = useState("");
  const [vehicleWhatsappPhone, setVehicleWhatsappPhone] = useState("");
  const [vehicleIsElectric, setVehicleIsElectric] = useState(false);
  const [vehicleIsHybrid, setVehicleIsHybrid] = useState(false);

  const [serverPhotos, setServerPhotos] = useState<ServerPhoto[]>([]);
  /** Photos not yet uploaded (waiting for draft id or queued) */
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [virtualTourUrl, setVirtualTourUrl] = useState("");

  const [selectedBoosts, setSelectedBoosts] = useState<PurchasableBoostType[]>([]);
  const [agencySpotlight, setAgencySpotlight] = useState(false);
  const [creditPackPurchase, setCreditPackPurchase] = useState("");
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);
  const exitBypassRef = useRef(false);
  const lastPersistedFingerprintRef = useRef("");
  const fingerprintInitializedRef = useRef(false);
  const pendingUploadInFlightRef = useRef(false);

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

  const applyVehicleLegacyMirrorFromInputs = useCallback(
    (nextVehicle: { mileageKmInput?: string; doorsInput?: string; seatsInput?: string }) => {
      const mirrored = buildLegacyMirrorPatchFromVehicleInputs(nextVehicle);
      if (mirrored.surface != null) setSurface(mirrored.surface);
      if (mirrored.bathrooms != null) setBathrooms(mirrored.bathrooms);
      if (mirrored.toilets != null) setToilets(mirrored.toilets);
    },
    [],
  );

  const showRooms = listingType === "" || TYPES_WITH_ROOMS.includes(listingType as ListingType);
  const manualPaymentMethods = useMemo(
    () => [
      { id: "bank_transfer", name: t("publish.paymentMethodBankTransfer", "Bank transfer") },
      { id: "mvola", name: t("publish.paymentMethodMvola", "MVola") },
      { id: "orange_money", name: t("publish.paymentMethodOrangeMoney", "Orange Money") },
      { id: "airtel_money", name: t("publish.paymentMethodAirtelMoney", "Airtel Money") },
    ],
    [t],
  );
  const typeOptions = listingTypesForTransaction(transaction);
  const publishVehicleTypeOptions = useMemo(() => {
    const allowed = new Set(typeOptions);
    return AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.filter((option) => {
      if (!option.listingTypes?.length) return true;
      return option.listingTypes.some((listingTypeOption) => allowed.has(listingTypeOption as ListingType));
    });
  }, [typeOptions]);
  const selectedPublishVehicleTypeId = useMemo(() => {
    if (vehicleBodyStyle && publishVehicleTypeOptions.some((opt) => opt.id === vehicleBodyStyle)) {
      return vehicleBodyStyle;
    }
    const inferred = inferVehicleTypeOptionIdFromFilters({
      types: listingType ? [listingType] : [],
      modelQuery: vehicleBodyStyle,
      fuels: vehicleFuel ? [vehicleFuel] : [],
    });
    if (inferred && publishVehicleTypeOptions.some((opt) => opt.id === inferred)) {
      return inferred;
    }
    return "";
  }, [vehicleBodyStyle, publishVehicleTypeOptions, listingType, vehicleFuel]);

  const { data: creditPacks = [] } = useQuery({
    queryKey: ["credit-packs"],
    queryFn: async (): Promise<CreditPackRow[]> => {
      const { data, error } = await supabase.from("credit_packs").select("*").order("sort_order", { ascending: true });
      if (error) return mergeCanonicalCreditPacks(null);
      return mergeCanonicalCreditPacks(data as CreditPackRow[]);
    },
  });

  const setDraftMode = useCallback(() => {
    setIsPublishedListingEdit(false);
    setListingModerationStatus(null);
    baselineMaterialSnapshotRef.current = "";
    editPriceBaselineRef.current = null;
    editOriginalPriceRef.current = null;
  }, []);

  const applyListingRowToFormState = useCallback((row: Tables<"listings">) => {
    hydratingRef.current = true;
    const fs = listingRowToFormState(row);
    setTransaction(fs.transaction);
    setListingType(sanitizeListingTypeForTransaction(fs.transaction, fs.listingType));
    setIsNewProgram(fs.isNewProgram);
    setInternalRef(fs.internalRef);
    setVille(fs.ville);
    setArrondissement(fs.arrondissement);
    setQuartier(fs.quartier);
    setQuartierLibre(fs.quartierLibre);
    setPinLat(fs.pinLat);
    setPinLng(fs.pinLng);
    lastAutoVilleRef.current = fs.ville || "";
    setTitle(fs.title);
    setDescription(fs.description);
    setPriceMga(fs.priceMga);
    setSurface(fs.surface);
    setRooms(fs.rooms);
    setBathrooms(fs.bathrooms);
    setToilets(fs.toilets);
    setSelectedFeatures(sanitizeListingEquipment(fs.selectedFeatures));
    setCustomFeaturesInput(
      extractCustomFeatures(
        Array.isArray(row.features) ? row.features.filter((x): x is string => typeof x === "string") : [],
      ).join(", "),
    );
    const meta = parseVehicleMetaTags(
      Array.isArray(row.features) ? row.features.filter((x): x is string => typeof x === "string") : [],
    );
    setVehicleMake(fs.vehicleMake || meta.make || "");
    setVehicleModel(fs.vehicleModel || meta.model || "");
    setVehicleYear(fs.vehicleYear || (meta.year != null ? String(meta.year) : ""));
    setVehicleFuel(fs.vehicleFuel || meta.fuel || "");
    setVehicleTransmission(fs.vehicleTransmission || meta.transmission || "");
    setVehicleDrivetrain(fs.vehicleDrivetrain || meta.drivetrain || "");
    setVehicleCondition(fs.vehicleCondition || meta.condition || "");
    setVehicleSellerType(fs.vehicleSellerType || meta.sellerType || "");
    setVehicleRentalMode(fs.vehicleRentalMode);
    setVehicleBodyStyle(fs.vehicleBodyStyle);
    setVehicleDoors(fs.vehicleDoors);
    setVehicleSeats(fs.vehicleSeats);
    setVehicleExteriorColor(fs.vehicleExteriorColor);
    setVehicleEngineDisplacement(
      fs.vehicleEngineDisplacement || (meta.engineDisplacementL != null ? String(meta.engineDisplacementL) : ""),
    );
    setVehicleInteriorColor(fs.vehicleInteriorColor);
    setVehicleAvailabilityStatus(fs.vehicleAvailabilityStatus);
    setVehicleWhatsappPhone(fs.vehicleWhatsappPhone);
    setVehicleIsElectric(fs.vehicleIsElectric);
    setVehicleIsHybrid(fs.vehicleIsHybrid);
    setVideoUrl(fs.videoUrl);
    setVirtualTourUrl(fs.virtualTourUrl);
    setSelectedBoosts(fs.selectedBoosts);
    setAgencySpotlight(fs.agencySpotlight);
    setStep(fs.step);
    setDraftListingId(row.id);
    editPriceBaselineRef.current =
      typeof row.price_mga === "number" && Number.isFinite(row.price_mga) ? row.price_mga : null;
    editOriginalPriceRef.current =
      typeof row.original_price_mga === "number" && Number.isFinite(row.original_price_mga)
        ? row.original_price_mga
        : null;
  }, []);

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

  const progressFingerprint = useMemo(
    () =>
      JSON.stringify({
        step,
        transaction,
        listingType,
        isNewProgram,
        internalRef: internalRef.trim(),
        ville: ville.trim(),
        arrondissement: arrondissement.trim(),
        quartier: quartier.trim(),
        quartierLibre: quartierLibre.trim(),
        pinLat,
        pinLng,
        title: title.trim(),
        description: description.trim(),
        priceMga: priceMga.trim(),
        surface: surface.trim(),
        rooms: rooms.trim(),
        bathrooms: bathrooms.trim(),
        toilets: toilets.trim(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: vehicleYear.trim(),
        vehicleFuel: vehicleFuel.trim(),
        vehicleTransmission: vehicleTransmission.trim(),
        vehicleDrivetrain: vehicleDrivetrain.trim(),
        vehicleCondition: vehicleCondition.trim(),
        vehicleSellerType: vehicleSellerType.trim(),
        vehicleRentalMode: vehicleRentalMode.trim(),
        vehicleBodyStyle: vehicleBodyStyle.trim(),
        vehicleDoors: vehicleDoors.trim(),
        vehicleSeats: vehicleSeats.trim(),
        vehicleExteriorColor: vehicleExteriorColor.trim(),
        vehicleEngineDisplacement: vehicleEngineDisplacement.trim(),
        vehicleInteriorColor: vehicleInteriorColor.trim(),
        vehicleAvailabilityStatus: vehicleAvailabilityStatus.trim(),
        vehicleWhatsappPhone: vehicleWhatsappPhone.trim(),
        vehicleIsElectric,
        vehicleIsHybrid,
        selectedFeatures: [...selectedFeatures].sort(),
        customFeaturesInput: customFeaturesInput.trim(),
        videoUrl: videoUrl.trim(),
        virtualTourUrl: virtualTourUrl.trim(),
        selectedBoosts: [...selectedBoosts].sort(),
        agencySpotlight,
        serverPhotoIds: serverPhotos.map((p) => p.id),
        pendingPhotoCount: pendingPhotos.length,
      }),
    [
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
      customFeaturesInput,
      videoUrl,
      virtualTourUrl,
      selectedBoosts,
      agencySpotlight,
      serverPhotos,
      pendingPhotos.length,
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

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!profile?.agency_id) setAgencySpotlight(false);
  }, [profile?.agency_id]);

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
    setVehicleSellerType(inferredSellerType);
  }, [draftHydrated, profile, vehicleSellerType]);

  /** Centre-ville suggéré uniquement quand la ville change — pas à chaque arrondissement/quartier (évite d’écraser la position choisie sur la carte). */
  const lastAutoVilleRef = useRef<string>("");
  useEffect(() => {
    if (hydratingRef.current) return;
    if (!ville) {
      setPinLat(null);
      setPinLng(null);
      lastAutoVilleRef.current = "";
      return;
    }
    if (lastAutoVilleRef.current === ville) return;
    lastAutoVilleRef.current = ville;
    const s = getSuggestedListingCoordinates(ville);
    if (s) {
      setPinLat(s.lat);
      setPinLng(s.lng);
    } else {
      setPinLat(null);
      setPinLng(null);
    }
  }, [ville]);

  useEffect(() => {
    serverPhotosRef.current = serverPhotos;
  }, [serverPhotos]);

  useEffect(() => {
    return () => {
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [pendingPhotos]);

  /** Bootstrap draft listing: ?new=1 forces a fresh draft; ?draft=id resumes; default creates a fresh draft. */
  useEffect(() => {
    if (!user?.id) {
      setDraftHydrated(true);
      setDraftBootLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setDraftBootLoading(true);
      setSaveError(null);
      exitBypassRef.current = false;
      fingerprintInitializedRef.current = false;
      try {
        const wantNew = spNew === "1";
        const draftParam = spDraft;

        if (wantNew) {
          setDraftMode();
          const id = await createDraftListing(user.id);
          if (cancelled) return;
          setDraftListingId(id);
          navigate(`/publier?draft=${id}`, { replace: true });
          setStep(0);
          setDraftHydrated(true);
          return;
        }

        if (spEdit) {
          if (!LISTING_ID_UUID_RE.test(spEdit)) {
            toast.error(t("publish.editInvalidId", "Lien de modification invalide."));
            navigate("/dashboard");
            return;
          }
          const row = await fetchListingForOwnerEdit(spEdit, user.id);
          if (cancelled) return;
          if (!row) {
            toast.error(t("publish.editNotFound", "Annonce introuvable ou non modifiable."));
            navigate("/dashboard");
            return;
          }
          applyListingRowToFormState(row);
          setIsPublishedListingEdit(true);
          setListingModerationStatus(row.status);
          const photos = await fetchListingPhotos(row.id);
          if (cancelled) return;
          setServerPhotos(photos);
          baselineMaterialSnapshotRef.current = buildListingMaterialSnapshotFromRow(
            row,
            photos.map((p) => p.id),
          );
          setLastSavedAt(row.updated_at ?? row.created_at ?? null);
          navigate(`/publier?edit=${row.id}`, { replace: true });
          queueMicrotask(() => {
            hydratingRef.current = false;
          });
          setDraftHydrated(true);
          return;
        }

        if (draftParam) {
          const row = await fetchDraftListingForOwner(draftParam, user.id);
          if (cancelled) return;
          if (!row) {
            toast.error(t("publish.draftNotFound", "Brouillon introuvable."));
            navigate("/dashboard");
            return;
          }
          setDraftMode();
          applyListingRowToFormState(row);
          const photos = await fetchListingPhotos(row.id);
          if (cancelled) return;
          setServerPhotos(photos);
          setLastSavedAt(row.updated_at ?? row.created_at ?? null);
          queueMicrotask(() => {
            hydratingRef.current = false;
          });
          setDraftHydrated(true);
          return;
        }

        setDraftMode();
        const id = await createDraftListing(user.id);
        if (cancelled) return;
        setDraftListingId(id);
        navigate(`/publier?draft=${id}`, { replace: true });
        setDraftHydrated(true);
      } catch (e) {
        if (!cancelled) {
          setSaveError(e instanceof Error ? e.message : "Erreur");
          toast.error(e instanceof Error ? e.message : "Erreur");
          setDraftHydrated(true);
        }
      } finally {
        if (!cancelled) setDraftBootLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, spNew, spDraft, spEdit, navigate, t, applyListingRowToFormState, setDraftMode]);

  const persistDraft = useCallback(
    async (stepOverride?: number) => {
      if (!user?.id || !draftListingId || !draftHydrated) return false;
      try {
        setSaveStatus("saving");
        setSaveError(null);
        const patchBase = formToListingUpdate({
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
          selectedFeatures: selectedFeaturesWithVehicleMeta,
          videoUrl,
          virtualTourUrl,
          selectedBoosts,
          agencySpotlight,
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
              selectedFeatures: selectedFeaturesWithVehicleMeta,
              videoUrl,
              virtualTourUrl,
            },
            photoIdsOrdered,
            pendingPhotos.length,
          );
          const toReview = shouldSendPublishedListingToReview({
            moderationStatus: listingModerationStatus,
            baselineSnapshot: baselineMaterialSnapshotRef.current,
            currentSnapshot: currentSnap,
          });
          const { updatedAt } = await updateOwnerListing(
            draftListingId,
            user.id,
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
          saveLocalPublishBackup(user.id, draftListingId, {
            draftListingId,
            step: stepOverride ?? step,
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
            selectedFeatures: selectedFeaturesWithVehicleMeta,
            videoUrl,
            virtualTourUrl,
            selectedBoosts,
            agencySpotlight,
          });
          await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
          await queryClient.invalidateQueries({ queryKey: ["listing", draftListingId] });
          return true;
        }

        const { updatedAt } = await saveDraftListing(draftListingId, patchBase);
        setLastSavedAt(updatedAt);
        setSaveStatus("saved");
        lastPersistedFingerprintRef.current = progressFingerprint;
        saveLocalPublishBackup(user.id, draftListingId, {
          draftListingId,
          step: stepOverride ?? step,
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
          selectedFeatures: selectedFeaturesWithVehicleMeta,
          videoUrl,
          virtualTourUrl,
          selectedBoosts,
          agencySpotlight,
        });
        await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
        return true;
      } catch (e) {
        setSaveStatus("error");
        const msg = e instanceof Error ? e.message : "Erreur";
        setSaveError(msg);
        toast.error(t("publish.draftSaveError", "Sauvegarde impossible : {{msg}}").replace("{{msg}}", msg));
        return false;
      }
    },
    [
      user?.id,
      draftListingId,
      draftHydrated,
      isPublishedListingEdit,
      listingModerationStatus,
      pendingPhotos.length,
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
      selectedFeaturesWithVehicleMeta,
      videoUrl,
      virtualTourUrl,
      selectedBoosts,
      agencySpotlight,
      step,
      progressFingerprint,
      queryClient,
      t,
    ],
  );

  const debouncedPersist = useDebouncedCallback(() => {
    void persistDraft();
  }, 1000);

  useEffect(() => {
    if (!draftHydrated || !draftListingId || !user?.id) return;
    if (isPublishedListingEdit) return;
    debouncedPersist();
  }, [
    debouncedPersist,
    draftHydrated,
    draftListingId,
    user?.id,
    isPublishedListingEdit,
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
    selectedFeaturesWithVehicleMeta,
    selectedFeatures,
    customFeaturesInput,
    videoUrl,
    virtualTourUrl,
    selectedBoosts,
    agencySpotlight,
    step,
  ]);

  useEffect(() => {
    if (!draftHydrated || !draftListingId || !user?.id) return;
    if (fingerprintInitializedRef.current) return;
    lastPersistedFingerprintRef.current = progressFingerprint;
    fingerprintInitializedRef.current = true;
  }, [draftHydrated, draftListingId, user?.id, progressFingerprint]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden" && draftListingId && user?.id) {
        void persistDraft();
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedMeaningfulChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
      if (draftListingId && user?.id) {
        try {
          saveLocalPublishBackup(user.id, draftListingId, {
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
            selectedFeatures: selectedFeaturesWithVehicleMeta,
            videoUrl,
            virtualTourUrl,
            selectedBoosts,
            agencySpotlight,
          });
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [
    draftListingId,
    user?.id,
    hasUnsavedMeaningfulChanges,
    persistDraft,
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
    selectedFeaturesWithVehicleMeta,
    videoUrl,
    virtualTourUrl,
    selectedBoosts,
    agencySpotlight,
  ]);

  const deleteCurrentDraft = useCallback(async () => {
    if (!user?.id || !draftListingId || isPublishedListingEdit) return true;
    await deleteDraftListingForOwner(draftListingId, user.id);
    clearLocalPublishBackup(user.id, draftListingId);
    await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
    return true;
  }, [user?.id, draftListingId, isPublishedListingEdit, queryClient]);

  useEffect(() => {
    return () => {
      if (exitBypassRef.current) return;
      if (!user?.id || !draftListingId || isPublishedListingEdit) return;
      if (hasMeaningfulDraftProgress) return;
      void deleteCurrentDraft();
    };
  }, [user?.id, draftListingId, isPublishedListingEdit, hasMeaningfulDraftProgress, deleteCurrentDraft]);

  useEffect(() => {
    if (listingType && !TYPES_WITH_ROOMS.includes(listingType as ListingType)) {
      setRooms("");
      setBathrooms("");
      setToilets("");
    }
  }, [listingType]);

  const { data: creditsBalance = 0, isPending: creditsBalancePending } = useCreditsBalance();
  const agencySpotlightActive = Boolean(profile?.agency_id && agencySpotlight);
  const totalCost = totalPublicationCredits(selectedBoosts, { agencySpotlight: agencySpotlightActive });
  const canPublishWithCredits = !creditsBalancePending && creditsBalance >= totalCost;

  const toggleFeature = (f: string) => {
    if (!LISTING_EQUIPMENT_OPTIONS.includes(f)) return;
    setSelectedFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const toggleBoost = (b: PurchasableBoostType) => {
    setSelectedBoosts((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  useEffect(() => {
    const autoTitle = [vehicleMake.trim(), vehicleModel.trim(), vehicleYear.trim()].filter(Boolean).join(" ");
    if (!autoTitle) return;
    if (title.trim().length === 0) {
      setTitle(autoTitle.slice(0, 120));
    }
  }, [vehicleMake, vehicleModel, vehicleYear, title]);

  const makeCoverAtIndex = async (globalIndex: number) => {
    if (!draftListingId || globalIndex <= 0) return;
    const nServer = serverPhotos.length;
    if (globalIndex < nServer) {
      try {
        await setPhotoCoverFirst(draftListingId, serverPhotos, globalIndex);
        const next = await fetchListingPhotos(draftListingId);
        setServerPhotos(next);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    } else {
      const pendingIdx = globalIndex - nServer;
      setPendingPhotos((prev) => {
        if (pendingIdx <= 0) return prev;
        const n = [...prev];
        const [x] = n.splice(pendingIdx, 1);
        n.unshift(x);
        return n;
      });
    }
  };

  const flushPendingPhotosToServer = useCallback(async (): Promise<{ uploaded: number; failed: number }> => {
    if (!draftListingId || pendingPhotos.length === 0) return { uploaded: 0, failed: 0 };
    if (pendingUploadInFlightRef.current) return { uploaded: 0, failed: 0 };

    pendingUploadInFlightRef.current = true;
    const batch = [...pendingPhotos];
    const successPreviews = new Set<string>();
    let failed = 0;
    let nextPosition = serverPhotosRef.current.length;

    try {
      for (const row of batch) {
        try {
          const photo = await uploadListingPhoto(draftListingId, row.file, nextPosition);
          nextPosition += 1;
          successPreviews.add(row.preview);
          serverPhotosRef.current = [...serverPhotosRef.current, photo];
          setServerPhotos((prev) => [...prev, photo]);
        } catch {
          failed += 1;
        }
      }
    } finally {
      setPendingPhotos((prev) => prev.filter((row) => !successPreviews.has(row.preview)));
      successPreviews.forEach((preview) => URL.revokeObjectURL(preview));
      pendingUploadInFlightRef.current = false;
    }

    return { uploaded: successPreviews.size, failed };
  }, [draftListingId, pendingPhotos]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 10);
    if (!draftListingId || !user) {
      setPendingPhotos((prev) => [
        ...prev,
        ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
      ]);
      return;
    }
    let nextPosition = serverPhotosRef.current.length;
    for (const file of files) {
      try {
        const ph = await uploadListingPhoto(draftListingId, file, nextPosition);
        nextPosition += 1;
        serverPhotosRef.current = [...serverPhotosRef.current, ph];
        setServerPhotos((s) => [...s, ph]);
      } catch (err) {
        setPendingPhotos((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
        toast.error(err instanceof Error ? err.message : "Upload impossible");
      }
    }
  };

  const removePhotoAt = async (globalIndex: number) => {
    const nServer = serverPhotos.length;
    if (globalIndex < nServer) {
      const ph = serverPhotos[globalIndex];
      try {
        await deleteListingPhotoRow(ph.id, ph.url);
        setServerPhotos((s) => s.filter((x) => x.id !== ph.id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    } else {
      const pi = globalIndex - nServer;
      setPendingPhotos((prev) => {
        const row = prev[pi];
        if (row) URL.revokeObjectURL(row.preview);
        return prev.filter((_, i) => i !== pi);
      });
    }
  };

  /** Flush pending local files once draft id exists (e.g. user logged in late). */
  useEffect(() => {
    if (!draftListingId || pendingPhotos.length === 0 || !user) return;
    let cancelled = false;
    (async () => {
      const { failed } = await flushPendingPhotosToServer();
      if (!cancelled && failed > 0) {
        toast.error(t("publish.uploadRetryNeeded", "Certaines photos n'ont pas pu être envoyées. Réessayez."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftListingId, pendingPhotos.length, user, flushPendingPhotosToServer, t]);

  const validateStep = useCallback(
    (s: number) =>
      validatePublishStep(s, publishValidationInput, (key, fallback) =>
        t(key, fallback),
      ),
    [publishValidationInput, t],
  );

  const getFirstInvalidStep = useCallback(
    () =>
      getFirstInvalidPublishStep(publishValidationInput, (key, fallback) =>
        t(key, fallback),
      ),
    [publishValidationInput, t],
  );

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

        const patchBase = formToListingUpdate({
          transaction,
          listingType,
          isNewProgram,
          internalRef,
          ville,
          arrondissement,
          quartier,
          quartierLibre,
          pinLat: finalLat,
          pinLng: finalLng,
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
          selectedFeatures: selectedFeaturesWithVehicleMeta,
          videoUrl,
          virtualTourUrl,
          selectedBoosts,
          agencySpotlight,
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
            transaction,
            listingType,
            isNewProgram,
            internalRef,
            ville,
            arrondissement,
            quartier,
            quartierLibre,
            pinLat: finalLat,
            pinLng: finalLng,
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
            selectedFeatures: selectedFeaturesWithVehicleMeta,
            videoUrl,
            virtualTourUrl,
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

  const submitCreditPurchase = async () => {
    if (!user) {
      toast.error(t("publish.loginRequired", "Vous devez être connecté"));
      return;
    }
    const pack = creditPacks.find((p) => p.id === creditPackPurchase);
    if (!pack) {
      toast.error(t("publish.selectPack", "Choisissez un pack de crédits"));
      return;
    }
    if (!purchasePaymentMethod) {
      toast.error(t("publish.paymentProofRequired", "Choisissez un mode de paiement"));
      return;
    }
    if (!proofFile) {
      toast.error(t("publish.proofRequired", "Joignez une preuve de paiement (capture ou RIB annoté)"));
      return;
    }

    setPurchaseSubmitting(true);
    try {
      const ext = proofFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-proof.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proofFile);
      if (upErr) throw new Error(upErr.message);

      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount_mga: pack.price_mga,
        method: purchasePaymentMethod as "bank_transfer" | "mvola" | "orange_money" | "airtel_money",
        status: "pending",
        reference: `CR-${pack.id}-${Date.now()}`,
        payment_proof_url: path,
        credit_pack_id: pack.id,
      });
      if (txErr) throw new Error(txErr.message);

      await queryClient.invalidateQueries({ queryKey: ["pending-credit-purchases", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["credit-tx-history", user.id] });

      toast(
        t(
          "publish.creditRequestSent",
          "Demande enregistrée. Nos équipes valideront votre paiement et créditeront votre compte sous peu — les crédits ne sont pas encore disponibles."
        ),
        { duration: 6500 },
      );
      setProofFile(null);
      setCreditPackPurchase("");
      setPurchasePaymentMethod("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setPurchaseSubmitting(false);
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <>
      <Helmet>
        <title>
          {(isPublishedListingEdit ? t("publish.editTitle", "Modifier l’annonce") : t("publish.title"))} — AutoNex
        </title>
      </Helmet>
      <Header />
      <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8 pb-36 sm:pb-8">
        <PublishPageHeader
          moderationText={t(
            "publish.publishBannerInstant",
            "Publication directe sur AutoNex. Coût : {cost} crédits par soumission (+ options boost). Description uniquement en français.",
          )}
          publishCreditCost={LISTING_PUBLISH_CREDIT_COST}
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
            transaction={transaction}
            vehicleTypeId={selectedPublishVehicleTypeId}
            vehicleTypeOptions={publishVehicleTypeOptions}
            isNewProgram={isNewProgram}
            internalRef={internalRef}
            ville={ville}
            arrondissement={arrondissement}
            quartier={quartier}
            quartierLibre={quartierLibre}
            pinLat={pinLat}
            pinLng={pinLng}
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
            onTransactionChange={(v) => {
              setTransaction(v);
              setListingType((prev) => {
                const allowed = new Set(listingTypesForTransaction(v));
                return allowed.has(prev as ListingType) ? prev : "";
              });
              setVehicleBodyStyle((prev) => {
                if (!prev) return prev;
                const nextOptions = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.filter((option) => {
                  if (!option.listingTypes?.length) return true;
                  const allowed = new Set(listingTypesForTransaction(v));
                  return option.listingTypes.some((listingTypeOption) => allowed.has(listingTypeOption as ListingType));
                });
                return nextOptions.some((option) => option.id === prev) ? prev : "";
              });
            }}
            onVehicleTypeChange={(vehicleTypeId) => {
              const option = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.find((entry) => entry.id === vehicleTypeId);
              const allowed = new Set(typeOptions);
              const mappedType =
                option?.listingTypes?.find((entry) => allowed.has(entry as ListingType)) ?? null;

              setVehicleBodyStyle(vehicleTypeId);
              if (mappedType) {
                setListingType(mappedType as ListingType);
              } else if (!listingType) {
                setListingType(typeOptions[0] ?? "");
              }
              if (option?.fuels?.length) {
                setVehicleFuel(option.fuels[0]);
                const isElectric = option.fuels.includes("Électrique");
                const isHybrid = option.fuels.some((fuelOption) => fuelOption.includes("Hybride"));
                setVehicleIsElectric(isElectric);
                setVehicleIsHybrid(isHybrid);
              }
            }}
            onNewProgramChange={setIsNewProgram}
            onInternalRefChange={setInternalRef}
            onVilleChange={setVille}
            onArrondissementChange={setArrondissement}
            onQuartierChange={setQuartier}
            onQuartierLibreChange={setQuartierLibre}
            onMapPositionChange={(la, ln) => {
              setPinLat(la);
              setPinLng(ln);
            }}
          />
        )}

        {step === 1 && (
          <PublishDetailsSection
            showRooms={showRooms}
            title={title}
            description={description}
            priceMga={priceMga}
            surface={surface}
            rooms={rooms}
            bathrooms={bathrooms}
            toilets={toilets}
            make={vehicleMake}
            model={vehicleModel}
            year={vehicleYear}
            fuel={vehicleFuel}
            transmission={vehicleTransmission}
            drivetrain={vehicleDrivetrain}
            condition={vehicleCondition}
            sellerType={vehicleSellerType}
            rentalMode={vehicleRentalMode}
            bodyStyle={vehicleBodyStyle}
            doors={vehicleDoors}
            seats={vehicleSeats}
            exteriorColor={vehicleExteriorColor}
            engineDisplacement={vehicleEngineDisplacement}
            interiorColor={vehicleInteriorColor}
            availabilityStatus={vehicleAvailabilityStatus}
            whatsappPhone={vehicleWhatsappPhone}
            isElectric={vehicleIsElectric}
            isHybrid={vehicleIsHybrid}
            selectedFeatures={selectedFeatures}
            customFeaturesInput={customFeaturesInput}
            equipmentOptions={LISTING_EQUIPMENT_OPTIONS}
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
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onPriceMgaChange={setPriceMga}
            onSurfaceChange={(value) => applyVehicleLegacyMirrorFromInputs({ mileageKmInput: value })}
            onRoomsChange={setRooms}
            onBathroomsChange={setBathrooms}
            onToiletsChange={setToilets}
            onMakeChange={setVehicleMake}
            onModelChange={setVehicleModel}
            onYearChange={setVehicleYear}
            onFuelChange={setVehicleFuel}
            onTransmissionChange={setVehicleTransmission}
            onDrivetrainChange={setVehicleDrivetrain}
            onConditionChange={setVehicleCondition}
            onSellerTypeChange={setVehicleSellerType}
            onRentalModeChange={setVehicleRentalMode}
            onBodyStyleChange={setVehicleBodyStyle}
            onDoorsChange={(value) => {
              setVehicleDoors(value);
              applyVehicleLegacyMirrorFromInputs({ doorsInput: value });
            }}
            onSeatsChange={(value) => {
              setVehicleSeats(value);
              applyVehicleLegacyMirrorFromInputs({ seatsInput: value });
            }}
            onExteriorColorChange={setVehicleExteriorColor}
            onEngineDisplacementChange={setVehicleEngineDisplacement}
            onInteriorColorChange={setVehicleInteriorColor}
            onAvailabilityStatusChange={setVehicleAvailabilityStatus}
            onWhatsappPhoneChange={setVehicleWhatsappPhone}
            onElectricChange={setVehicleIsElectric}
            onHybridChange={setVehicleIsHybrid}
            onToggleFeature={toggleFeature}
            onCustomFeaturesInputChange={setCustomFeaturesInput}
          />
        )}

        {step === 2 && (
          <PublishMediaSection
            serverPhotos={serverPhotos}
            pendingPhotos={pendingPhotos}
            videoUrl={videoUrl}
            virtualTourUrl={virtualTourUrl}
            labels={{
              mainPhotoFirst: t("publish.mainPhotoFirst", "La première image est la photo principale. Utilisez « Couverture » pour réorganiser."),
              chooseFiles: t("publish.chooseFiles", "Choisir des photos"),
              localOnly: t("publish.localOnly", "Local"),
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
            onVideoUrlChange={setVideoUrl}
            onVirtualTourUrlChange={setVirtualTourUrl}
          />
        )}

        {step === 3 && (
          <PublishStepVisibility
            editMode={isPublishedListingEdit}
            editSubmitLabel={t("publish.editSave", "Enregistrer les modifications")}
            creditsBalance={creditsBalance}
            creditsBalancePending={creditsBalancePending}
            totalCost={isPublishedListingEdit ? 0 : totalCost}
            canPublishWithCredits={isPublishedListingEdit || canPublishWithCredits}
            title={title}
            listingType={listingType}
            transaction={transaction}
            ville={ville}
            photoCount={serverPhotos.length + pendingPhotos.length}
            selectedBoosts={selectedBoosts}
            toggleBoost={toggleBoost}
            hasAgency={Boolean(profile?.agency_id)}
            agencySpotlight={agencySpotlight}
            setAgencySpotlight={setAgencySpotlight}
            agencySpotlightActive={agencySpotlightActive}
            publishing={publishing}
            onPublish={handlePublish}
            creditPacks={creditPacks}
            creditPackPurchase={creditPackPurchase}
            setCreditPackPurchase={setCreditPackPurchase}
            paymentMethods={manualPaymentMethods}
            purchasePaymentMethod={purchasePaymentMethod}
            setPurchasePaymentMethod={setPurchasePaymentMethod}
            onProofFileChange={setProofFile}
            purchaseSubmitting={purchaseSubmitting}
            onSubmitCreditPurchase={submitCreditPurchase}
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
    </>
  );
};

export default PublishPage;
