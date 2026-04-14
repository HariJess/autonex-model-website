import { useState, useEffect, useRef, useCallback } from "react";
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
import { LISTING_EQUIPMENT_OPTIONS } from "@/data/listing-equipment";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import {
  listingTypesForTransaction,
  isTerrainRentalForbidden,
  assertValidTransactionType,
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
import { consumeCredits } from "@/lib/creditsApi";
import { invalidateCreditsBalanceQueries } from "@/lib/creditsBalance";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearLocalPublishBackup,
  createDraftListing,
  deleteListingPhotoRow,
  fetchDraftListingForOwner,
  fetchLatestDraftId,
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
  updateOwnerListing,
  uploadListingPhoto,
  type ServerPhoto,
} from "@/lib/publishDraft";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { PublishPageHeader } from "@/pages/publish/components/PublishPageHeader";
import { PublishProgressSteps } from "@/pages/publish/components/PublishProgressSteps";
import { PublishStepErrors } from "@/pages/publish/components/PublishStepErrors";
import { PublishBasicInfoSection } from "@/pages/publish/components/PublishBasicInfoSection";
import { PublishDetailsSection } from "@/pages/publish/components/PublishDetailsSection";
import { PublishMediaSection } from "@/pages/publish/components/PublishMediaSection";
import { PublishStepNav } from "@/pages/publish/components/PublishStepNav";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TYPES_WITH_ROOMS: ListingType[] = ["appartement", "villa", "maison"];

const LISTING_ID_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MANUAL_PAYMENT_METHODS = [
  { id: "bank_transfer" as const, name: "Virement bancaire" },
  { id: "mvola" as const, name: "MVola" },
  { id: "orange_money" as const, name: "Orange Money" },
  { id: "airtel_money" as const, name: "Airtel Money" },
];

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
  const [draftBootLoading, setDraftBootLoading] = useState(false);
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

  const steps = [
    t("publish.stepMain", "Informations principales"),
    t("publish.stepDetails", "Détails du bien"),
    t("publish.stepMedia", "Médias"),
    t("publish.stepVisibility", "Visibilité & envoi"),
  ];

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

  const showRooms = listingType === "" || TYPES_WITH_ROOMS.includes(listingType as ListingType);
  const typeOptions = listingTypesForTransaction(transaction);

  const { data: creditPacks = [] } = useQuery({
    queryKey: ["credit-packs"],
    queryFn: async (): Promise<CreditPackRow[]> => {
      const { data, error } = await supabase.from("credit_packs").select("*").order("sort_order", { ascending: true });
      if (error) return mergeCanonicalCreditPacks(null);
      return mergeCanonicalCreditPacks(data as CreditPackRow[]);
    },
  });

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!profile?.agency_id) setAgencySpotlight(false);
  }, [profile?.agency_id]);

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

  /** Bootstrap draft listing: ?new=1 forces a fresh draft; ?draft=id resumes; default resumes latest or creates one. */
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
      try {
        const wantNew = spNew === "1";
        const draftParam = spDraft;

        if (wantNew) {
          setIsPublishedListingEdit(false);
          setListingModerationStatus(null);
          baselineMaterialSnapshotRef.current = "";
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
          setSelectedFeatures(fs.selectedFeatures);
          setVideoUrl(fs.videoUrl);
          setVirtualTourUrl(fs.virtualTourUrl);
          setSelectedBoosts(fs.selectedBoosts);
          setAgencySpotlight(fs.agencySpotlight);
          setStep(fs.step);
          setDraftListingId(row.id);
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
          setIsPublishedListingEdit(false);
          setListingModerationStatus(null);
          baselineMaterialSnapshotRef.current = "";
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
          setSelectedFeatures(fs.selectedFeatures);
          setVideoUrl(fs.videoUrl);
          setVirtualTourUrl(fs.virtualTourUrl);
          setSelectedBoosts(fs.selectedBoosts);
          setAgencySpotlight(fs.agencySpotlight);
          setStep(fs.step);
          setDraftListingId(row.id);
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

        const latestId = await fetchLatestDraftId(user.id);
        if (cancelled) return;
        if (latestId) {
          setIsPublishedListingEdit(false);
          setListingModerationStatus(null);
          baselineMaterialSnapshotRef.current = "";
          navigate(`/publier?draft=${latestId}`, { replace: true });
          return;
        }

        setIsPublishedListingEdit(false);
        setListingModerationStatus(null);
        baselineMaterialSnapshotRef.current = "";
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
  }, [user?.id, spNew, spDraft, spEdit, navigate, t]);

  const persistDraft = useCallback(
    async (stepOverride?: number) => {
      if (!user?.id || !draftListingId || !draftHydrated) return;
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
          selectedFeatures,
          videoUrl,
          virtualTourUrl,
          selectedBoosts,
          agencySpotlight,
          draftStep: stepOverride ?? step,
          isDraftSave: true,
        });

        if (isPublishedListingEdit) {
          const patch = omitBoostFieldsFromListingPatch(patchBase);
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
              selectedFeatures,
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
          if (toReview) setListingModerationStatus("pending_review");
          baselineMaterialSnapshotRef.current = currentSnap;
          setLastSavedAt(updatedAt);
          setSaveStatus("saved");
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
            selectedFeatures,
            videoUrl,
            virtualTourUrl,
            selectedBoosts,
            agencySpotlight,
          });
          await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
          await queryClient.invalidateQueries({ queryKey: ["listing", draftListingId] });
          return;
        }

        const { updatedAt } = await saveDraftListing(draftListingId, patchBase);
        setLastSavedAt(updatedAt);
        setSaveStatus("saved");
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
          selectedFeatures,
          videoUrl,
          virtualTourUrl,
          selectedBoosts,
          agencySpotlight,
        });
        await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
      } catch (e) {
        setSaveStatus("error");
        const msg = e instanceof Error ? e.message : "Erreur";
        setSaveError(msg);
        toast.error(t("publish.draftSaveError", "Sauvegarde impossible : {{msg}}").replace("{{msg}}", msg));
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
      selectedFeatures,
      videoUrl,
      virtualTourUrl,
      selectedBoosts,
      agencySpotlight,
      step,
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
    selectedFeatures,
    videoUrl,
    virtualTourUrl,
    selectedBoosts,
    agencySpotlight,
    step,
  ]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden" && draftListingId && user?.id) {
        void persistDraft();
      }
    };
    const onBeforeUnload = () => {
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
            selectedFeatures,
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
    selectedFeatures,
    videoUrl,
    virtualTourUrl,
    selectedBoosts,
    agencySpotlight,
  ]);

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
    setSelectedFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const toggleBoost = (b: PurchasableBoostType) => {
    setSelectedBoosts((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const files = Array.from(e.target.files).slice(0, 10);
    if (!draftListingId) {
      setPendingPhotos((prev) => [
        ...prev,
        ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
      ]);
      return;
    }
    for (const file of files) {
      try {
        const pos = serverPhotosRef.current.length;
        const ph = await uploadListingPhoto(draftListingId, file, pos);
        setServerPhotos((s) => [...s, ph]);
      } catch (err) {
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
      const batch = [...pendingPhotos];
      setPendingPhotos([]);
      batch.forEach((p) => URL.revokeObjectURL(p.preview));
      for (const { file } of batch) {
        if (cancelled) break;
        try {
          const pos = serverPhotosRef.current.length;
          const ph = await uploadListingPhoto(draftListingId, file, pos);
          if (cancelled) break;
          setServerPhotos((s) => [...s, ph]);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Upload impossible");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pendingPhotos.length suffit : on traite par batch, pas à chaque mutation interne
  }, [draftListingId, pendingPhotos.length, user]);

  const validateStep = (s: number): string[] => {
    const errors: string[] = [];
    switch (s) {
      case 0:
        if (!transaction || !assertValidTransactionType(transaction)) errors.push(t("publish.transactionRequired", "Type de transaction requis"));
        if (!listingType) errors.push(t("publish.typeRequired", "Type de véhicule requis"));
        if (transaction && listingType && isTerrainRentalForbidden(transaction, listingType)) {
          errors.push(t("publish.terrainNoRent", "Cette catégorie n’est pas disponible pour ce type d’annonce."));
        }
        if (!ville) errors.push(t("publish.villeRequired", "Ville requise"));
        if (pinLat == null || pinLng == null || !isValidListingCoordinates(pinLat, pinLng)) {
          errors.push(t("publish.mapRequired", "Position sur la carte requise"));
        }
        break;
      case 1:
        if (!title.trim() || title.trim().length < 8) errors.push(t("publish.titleRequired", "Titre requis (min. 8 caractères)"));
        if (description.trim().length < 40) errors.push(t("publish.descFrenchRequired", "Description en français requise (min. 40 caractères)"));
        if (!priceMga || Number(priceMga) <= 0) errors.push(t("publish.priceRequired", "Prix valide requis"));
        if (surface && Number(surface) < 0) errors.push(t("publish.surfaceInvalid", "Surface invalide"));
        break;
      case 2:
        if (serverPhotos.length + pendingPhotos.length < 1) {
          errors.push(t("publish.photoRequired", "Au moins une photo (photo principale) est requise"));
        }
        break;
      default:
        break;
    }
    return errors;
  };

  const handleNext = async () => {
    const errors = validateStep(step);
    setStepErrors(errors);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    const nextStep = step + 1;
    await persistDraft(nextStep);
    setStep(nextStep);
  };

  const handlePublish = async () => {
    const errors = validateStep(0).concat(validateStep(1)).concat(validateStep(2));
    setStepErrors(errors);
    if (errors.length > 0) {
      toast.error(errors[0]);
      setStep(0);
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
        let nextPhotos = [...serverPhotos];
        if (pendingPhotos.length > 0) {
          const batch = [...pendingPhotos];
          setPendingPhotos([]);
          batch.forEach((p) => URL.revokeObjectURL(p.preview));
          for (const { file } of batch) {
            const pos = nextPhotos.length;
            const ph = await uploadListingPhoto(draftListingId, file, pos);
            nextPhotos.push(ph);
          }
          setServerPhotos(nextPhotos);
          serverPhotosRef.current = nextPhotos;
        }

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
          selectedFeatures,
          videoUrl,
          virtualTourUrl,
          selectedBoosts,
          agencySpotlight,
          draftStep: step,
          isDraftSave: false,
        });
        const patch = omitBoostFieldsFromListingPatch(patchBase);

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
            selectedFeatures,
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

        if (toReview) setListingModerationStatus("pending_review");
        baselineMaterialSnapshotRef.current = currentSnap;

        await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
        await queryClient.invalidateQueries({ queryKey: ["listing", draftListingId] });
        clearLocalPublishBackup(user.id, draftListingId);
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

    if (!canPublishWithCredits) {
      toast.error(t("publish.insufficientCredits", "Crédits insuffisants — achetez un pack ou choisissez moins d’options boost."));
      return;
    }

    setPublishing(true);
    try {
      if (pendingPhotos.length > 0 && draftListingId) {
        const batch = [...pendingPhotos];
        setPendingPhotos([]);
        batch.forEach((p) => URL.revokeObjectURL(p.preview));
        for (const { file } of batch) {
          const pos = serverPhotosRef.current.length;
          const ph = await uploadListingPhoto(draftListingId, file, pos);
          setServerPhotos((s) => [...s, ph]);
        }
      }

      const priceNum = Number(priceMga) || 0;
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

      const patch = formToListingUpdate({
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
        selectedFeatures,
        videoUrl,
        virtualTourUrl,
        selectedBoosts,
        agencySpotlight,
        draftStep: step,
        isDraftSave: false,
      });

      const { error: upErr } = await supabase
        .from("listings")
        .update({
          ...patch,
          description: description.trim(),
          status: "pending_review",
          publication_credits_charged: totalCost,
          pending_boost_types: [
            ...selectedBoosts,
            ...(agencySpotlightActive ? (["agency_spotlight"] as const) : []),
          ] as unknown as Json,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", draftListingId)
        .eq("status", "draft");

      if (upErr) throw new Error(upErr.message);

      const { ok, error: creditErr } = await consumeCredits(totalCost, "listing_publish", {
        refType: "listing_publish",
        refId: draftListingId,
      });
      if (!ok) {
        await supabase
          .from("listings")
          .update({ status: "draft", publication_credits_charged: null })
          .eq("id", draftListingId);
        throw new Error(creditErr ?? "Crédits insuffisants");
      }
      invalidateCreditsBalanceQueries(queryClient, user.id);
      await queryClient.invalidateQueries({ queryKey: ["my-credits-ledger", user.id] });
      await refreshProfile();

      await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
      clearLocalPublishBackup(user.id, draftListingId);
      toast.success(
        t(
          "publish.successModeration",
          "Annonce envoyée ! Elle sera visible après modération par notre équipe. Les boosts demandés seront examinés en même temps."
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
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl pb-28 sm:pb-8">
        <PublishPageHeader
          moderationText={t(
            "publish.moderationBanner",
            "AutoNex vérifie chaque annonce avant publication. Coût : {cost} crédits par soumission (+ options boost). Description uniquement en français.",
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
          <div className="flex items-center justify-center gap-3 py-16 mb-8 text-muted-foreground font-sans">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            {spEdit
              ? t("publish.loadingEdit", "Chargement de l’annonce…")
              : t("publish.loadingDraft", "Chargement du brouillon…")}
          </div>
        )}

        {(!user || draftHydrated) && (
        <>
        <PublishProgressSteps steps={steps} step={step} progress={progress} />

        <PublishStepErrors errors={stepErrors} />

        {isPublishedListingEdit && (
          <Alert className="mb-6 rounded-2xl border-border bg-secondary/30">
            <AlertDescription className="font-sans text-sm text-foreground leading-relaxed">
              {t(
                "publish.editBanner",
                "Vous modifiez une annonce existante. Les changements sont enregistrés sur la même fiche. Si l’annonce était en ligne et que le contenu change, elle repassera en vérification avant d’être à nouveau visible publiquement.",
              )}
            </AlertDescription>
          </Alert>
        )}

        {step === 0 && (
          <PublishBasicInfoSection
            transaction={transaction}
            listingType={listingType}
            typeOptions={typeOptions}
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
              newProgram: t("publish.newProgram", "Programme / neuf"),
              newProgramHint: t("publish.newProgramHint", "Cochez si le bien relève d’un promoteur ou d’un lot neuf."),
              internalRef: t("publish.internalRef", "Référence interne (optionnel)"),
              mapTitle: t("publish.mapTitle", "Emplacement approximatif sur la carte"),
              mapPublicHint: t("publish.mapPublicHint", "La position affichée publiquement sera légèrement décalée pour préserver la confidentialité."),
              mapNeedVille: t("publish.mapNeedVille", "Choisissez d’abord une ville."),
              mapNoCoordsForCity: t("publish.mapNoCoordsForCity", "Impossible de placer la carte pour cette ville. Vérifiez le nom ou contactez le support."),
              select: t("common.select"),
              sale: t("search.sale", "Vente"),
              rental: t("search.rental", "Location"),
              vacationRental: t("search.vacationRental", "Vacances / courte durée"),
            }}
            onTransactionChange={(v) => {
              setTransaction(v);
              setListingType((prev) => {
                const allowed = new Set(listingTypesForTransaction(v));
                return allowed.has(prev as ListingType) ? prev : "";
              });
            }}
            onListingTypeChange={setListingType}
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
            selectedFeatures={selectedFeatures}
            equipmentOptions={LISTING_EQUIPMENT_OPTIONS}
            labels={{
              listingTitle: t("publish.listingTitle", "Titre"),
              descriptionFr: t("publish.descriptionFr", "Description (français)"),
              listingSurface: t("listing.surface"),
              listingRooms: t("listing.rooms"),
              listingBathrooms: t("listing.bathrooms"),
              toilets: t("publish.toilets", "Toilettes / WC"),
              listingFeatures: t("listing.features", "Équipements"),
            }}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onPriceMgaChange={setPriceMga}
            onSurfaceChange={setSurface}
            onRoomsChange={setRooms}
            onBathroomsChange={setBathrooms}
            onToiletsChange={setToilets}
            onToggleFeature={toggleFeature}
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
            paymentMethods={MANUAL_PAYMENT_METHODS}
            purchasePaymentMethod={purchasePaymentMethod}
            setPurchasePaymentMethod={setPurchasePaymentMethod}
            onProofFileChange={setProofFile}
            purchaseSubmitting={purchaseSubmitting}
            onSubmitCreditPurchase={submitCreditPurchase}
          />
        )}

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
        </>
        )}
      </div>
      <Footer />
    </>
  );
};

export default PublishPage;
