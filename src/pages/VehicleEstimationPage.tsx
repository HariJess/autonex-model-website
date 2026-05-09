import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowRight, ChevronRight, Gauge, Loader2, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  ESTIMATION_BODY_OPTIONS,
  ESTIMATION_CONDITION_OPTIONS,
  ESTIMATION_FUEL_OPTIONS,
  ESTIMATION_MAINTENANCE_OPTIONS,
  ESTIMATION_OWNER_COUNT_OPTIONS,
  ESTIMATION_TRANSMISSION_OPTIONS,
  ESTIMATION_USAGE_OPTIONS,
} from "@/lib/estimation/constants";
import { runVehicleEstimation } from "@/lib/estimation/api";
import { describeEstimationErrorForUi } from "@/lib/estimation/errors";
import { recordVehicleEstimationEvent } from "@/lib/estimation/repository";
import { buildEstimationPresentation } from "@/lib/estimation/presentation";
import { buildEstimationEventContext } from "@/lib/estimation/telemetry";
import { loadVehicleCatalog, resolveModelBodyTypes } from "@/lib/estimation/vehicleCatalog";
import VehicleCatalogCombobox from "@/components/estimation/VehicleCatalogCombobox";
import { PremiumStatePanel } from "@/components/ui/premium-state";
import type { EstimationInput, EstimationRunResult } from "@/types/estimation";
import EstimationProgressHeader from "@/pages/estimation/components/EstimationProgressHeader";
import {
  getCurrentEstimationStepIndex,
  getVehicleFieldErrors,
  type EstimationFormStateForValidation as EstimationFormState,
} from "@/pages/estimation/estimationPageModel";
import { cn } from "@/lib/utils";
import { YasBackButton } from "@/features/yas-app/components/YasBackButton";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { useYasTrackerOnMount, useYasTracker } from "@/features/yas-app/hooks/useYasTracker";

const EstimationResultReport = lazy(() => import("@/components/estimation/EstimationResultReport"));

const ESTIMATION_DRAFT_KEY = "autonex:estimation:draft:v1";
const currentYear = new Date().getFullYear();

const parseNumberInput = (raw: string): number | null =>
  raw === "" ? null : Number(raw);

const EMPTY_FORM: EstimationInput = {
  makeName: "",
  modelName: "",
  // PROMPT 10B — Trim/version optionnel pour matching strict cascade côté engine V2.
  trim: null,
  year: currentYear - 5,
  city: "",
  mileage: 75_000,
  fuelType: "diesel",
  transmissionType: "manual",
  bodyType: "suv",
  conditionLabel: "good",
  accidentDeclared: false,
  maintenanceLevel: "partial",
  ownerCountLabel: "2",
  usageType: "personal",
};

const STEP_META = [
  { id: "vehicle", labelKey: "estimation.stepVehicle", helperKey: "estimation.stepVehicleHelper", labelDefault: "Véhicule", helperDefault: "Informations principales" },
  { id: "condition", labelKey: "estimation.stepCondition", helperKey: "estimation.stepConditionHelper", labelDefault: "État", helperDefault: "Historique et usage" },
  { id: "result", labelKey: "estimation.stepResult", helperKey: "estimation.stepResultHelper", labelDefault: "Résultat", helperDefault: "Rapport estimatif" },
] as const;

const MADAGASCAR_LOCATION_OPTIONS = [
  "Antananarivo",
  "Toamasina",
  "Antsirabe",
  "Fianarantsoa",
  "Mahajanga",
  "Toliara",
  "Antsiranana",
  "Nosy Be",
  "Sainte-Marie",
  "Morondava",
  "Tolagnaro",
  "Sambava",
  "Ambatondrazaka",
  "Ambositra",
  "Manakara",
] as const;

// Palette lock (4 tones): navy, primary, neutral surface, amber state.
const ESTIMATION_PALETTE = {
  hero: "bg-gradient-to-br from-[#071226] via-[#0D1E3E] to-[#1A3560] text-background",
  surface: "bg-card/95 border-border/60",
  subtle: "bg-secondary/15 border-border/60",
  accent: "border-primary/30 bg-primary/[0.08]",
} as const;

// Typography lock: fixed scale/weight/leading for this feature.
const ESTIMATION_TYPO = {
  display: "font-sans tracking-tight leading-[1.05]",
  h1: "font-sans text-4xl md:text-6xl tracking-tight leading-[1.05]",
  h2: "font-sans text-3xl md:text-4xl tracking-tight",
  h3: "font-sans text-xl md:text-2xl",
  valueHero: "font-sans text-5xl md:text-7xl tracking-tight leading-[0.98]",
  valueMetric: "font-sans text-2xl",
  body: "font-sans text-sm leading-relaxed text-muted-foreground",
  label: "font-sans text-xs uppercase tracking-wide text-muted-foreground",
  caption: "font-sans text-xs text-muted-foreground",
} as const;

const ESTIMATION_UI = {
  sectionCard:
    "rounded-3xl border-border/60 bg-card/95 shadow-md transition-all duration-300 ease-out hover:shadow-lg",
  inputLike:
    "h-11 rounded-xl border border-border/70 bg-background shadow-sm transition-all duration-200 ease-out focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20",
  primaryCta:
    "rounded-xl px-8 font-sans shadow-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:shadow-md",
  secondaryCta:
    "rounded-xl font-sans transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0",
} as const;

const VehicleEstimationPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEmbedded } = useYasContext();
  // En mode embedded YAS, on skippe la landing marketing : l'utilisateur a
  // cliqué « Estimer ma voiture » dans la mini-app, il connaît déjà l'intent
  // et la friction d'une page d'accueil intermédiaire est inutile.
  const [screen, setScreen] = useState<"landing" | "vehicle" | "condition" | "result">(
    isEmbedded ? "vehicle" : "landing",
  );
  const [form, setForm] = useState<EstimationFormState>(EMPTY_FORM);
  const [result, setResult] = useState<EstimationRunResult | null>(null);
  /** Avoid duplicate "result viewed" telemetry without an extra render (StrictMode-safe single fire per request id). */
  const resultViewedRequestRef = useRef<string | null>(null);

  // YAS tracking — mount = "started", screen=result = "completed".
  // Hooks no-op-safe en dehors du mode embedded YAS.
  useYasTrackerOnMount("yas_estimation_started", null);
  const trackEstimationCompleted = useYasTracker("yas_estimation_completed");
  const completedFiredRef = useRef(false);
  useEffect(() => {
    if (screen !== "result") return;
    if (completedFiredRef.current) return;
    completedFiredRef.current = true;
    trackEstimationCompleted({
      vehicle_make: form.makeName || null,
      vehicle_model: form.modelName || null,
      vehicle_year: form.year || null,
      city: form.city || null,
    });
    // trackEstimationCompleted reference is stable (returned fresh each render
    // but no-op-safe), and we use a ref to ensure single fire per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    const raw = localStorage.getItem(ESTIMATION_DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as EstimationInput;
      setForm((prev) => ({ ...prev, ...parsed }));
    } catch {
      localStorage.removeItem(ESTIMATION_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ESTIMATION_DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const {
    data: catalogPayload,
    isLoading: catalogLoading,
    isFetching: catalogFetching,
    refetch: refetchCatalog,
  } = useQuery({
    queryKey: ["estimation-vehicle-catalog"],
    queryFn: loadVehicleCatalog,
    staleTime: Infinity,
  });
  const vehicleCatalog = useMemo(() => catalogPayload?.entries ?? [], [catalogPayload]);

  const makeOptions = useMemo(() => {
    return vehicleCatalog.map((entry) => entry.make);
  }, [vehicleCatalog]);

  const modelOptions = useMemo(() => {
    if (!form.makeName.trim()) return [];
    const selected = vehicleCatalog.find((entry) => entry.make.toLowerCase() === form.makeName.trim().toLowerCase());
    return selected?.models ?? [];
  }, [form.makeName, vehicleCatalog]);

  const modelBodyTypeOptions = useMemo(() => {
    if (!form.makeName.trim() || !form.modelName.trim()) return [];
    return resolveModelBodyTypes(vehicleCatalog, form.makeName, form.modelName);
  }, [form.makeName, form.modelName, vehicleCatalog]);

  const hasBodyTypeSuggestion = modelBodyTypeOptions.length >= 1;
  const visibleBodyOptions = useMemo(() => {
    if (modelBodyTypeOptions.length <= 1) return ESTIMATION_BODY_OPTIONS;
    return ESTIMATION_BODY_OPTIONS.filter((option) => modelBodyTypeOptions.includes(option.value));
  }, [modelBodyTypeOptions]);

  useEffect(() => {
    if (!form.makeName.trim()) return;
    const makeExists = makeOptions.some((make) => make.toLowerCase() === form.makeName.trim().toLowerCase());
    if (!makeExists) {
      setForm((prev) => ({ ...prev, makeName: "", modelName: "" }));
      return;
    }
    if (form.modelName.trim() && !modelOptions.some((m) => m.toLowerCase() === form.modelName.trim().toLowerCase())) {
      setForm((prev) => ({ ...prev, modelName: "" }));
    }
  }, [form.makeName, form.modelName, makeOptions, modelOptions]);

  useEffect(() => {
    if (!form.modelName.trim()) return;
    if (modelBodyTypeOptions.length === 0) return;
    if (modelBodyTypeOptions.length === 1) {
      const onlyBody = modelBodyTypeOptions[0];
      if (form.bodyType !== onlyBody) {
        setForm((prev) => ({ ...prev, bodyType: onlyBody }));
      }
      return;
    }
    if (!modelBodyTypeOptions.includes(form.bodyType)) {
      setForm((prev) => ({ ...prev, bodyType: modelBodyTypeOptions[0] }));
    }
  }, [form.bodyType, form.modelName, modelBodyTypeOptions]);

  const runMutation = useMutation({
    mutationFn: async () =>
      runVehicleEstimation(
        { ...form, mileage: form.mileage ?? 0, year: form.year ?? currentYear },
        user?.id ?? null,
      ),
    onSuccess: (payload) => {
      setResult(payload);
      setScreen("result");
    },
    onError: (error) => {
      toast.error(t("estimation.unavailableTitle", "Estimation indisponible"), {
        description: describeEstimationErrorForUi(error, (key, defaultValue) =>
          defaultValue !== undefined ? t(key, defaultValue) : t(key),
        ),
      });
    },
  });

  const vehicleFieldErrors = useMemo(
    () =>
      getVehicleFieldErrors({
        form,
        currentYear,
        t: (key, defaultValue) => t(key, defaultValue),
      }),
    [form, t],
  );

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const canSubmit = Object.keys(vehicleFieldErrors).length === 0;
  const visibleFieldError = (key: keyof typeof vehicleFieldErrors): string | undefined =>
    submitAttempted ? vehicleFieldErrors[key] : undefined;

  const handleVehicleNext = () => {
    if (!canSubmit) {
      setSubmitAttempted(true);
      // Auto-focus le premier champ invalide pour aider l'utilisateur.
      // Ordre de priorité = ordre logique du formulaire.
      const order: (keyof typeof vehicleFieldErrors)[] = [
        "make",
        "model",
        "year",
        "city",
        "mileage",
      ];
      const first = order.find((k) => vehicleFieldErrors[k]);
      if (first) {
        // Les comboboxes (make/model/city) ont un trigger button avec id, les
        // inputs natifs (year/mileage) ont un id direct. On cible par id générique.
        const targetId =
          first === "make"
            ? "make"
            : first === "model"
              ? "model"
              : first === "year"
                ? "year"
                : first === "city"
                  ? "city"
                  : "mileage";
        const el = document.getElementById(targetId) as HTMLElement | null;
        el?.focus?.();
      }
      return;
    }
    setSubmitAttempted(false);
    setScreen("condition");
  };
  const presentation = result ? buildEstimationPresentation(result, t) : null;
  const canonical = typeof window !== "undefined"
    ? `${window.location.origin}/estimation`
    : "https://autonex.mg/estimation";
  const currentStepIndex = getCurrentEstimationStepIndex(screen);

  useEffect(() => {
    if (screen !== "result" || !result) return;
    if (resultViewedRequestRef.current === result.requestId) return;
    resultViewedRequestRef.current = result.requestId;
    void recordVehicleEstimationEvent(
      result.requestId,
      result.submissionSecret,
      "estimation_result_viewed",
      buildEstimationEventContext(result.outputV2, { resultId: result.resultId }),
      "record_event",
    ).catch(() => {
      /* telemetry must not affect UX */
    });
  }, [screen, result]);

  const publishFromEstimation = async () => {
    if (!result) return;
    try {
      await recordVehicleEstimationEvent(
        result.requestId,
        result.submissionSecret,
        "clicked_publish_after_estimation",
        buildEstimationEventContext(result.outputV2, {
          resultId: result.resultId,
          recommendedPrice: result.output.recommendedListingPrice,
        }),
        "record_event",
      );
    } catch {
      // Event tracking should not block navigation.
    }
    navigate("/publier", {
      state: {
        prefill: {
          make: form.makeName,
          model: form.modelName,
          year: form.year !== null ? String(form.year) : "",
          city: form.city,
          mileageKm: form.mileage ?? 0,
          priceMga: result.output.recommendedListingPrice,
          fuelType: form.fuelType,
          transmissionType: form.transmissionType,
          bodyType: form.bodyType,
        },
      },
    });
  };

  const trackEstimationEvent = async (
    requestId: string,
    submissionSecret: string,
    eventType:
      | "clicked_publish_after_estimation"
      | "clicked_refine_estimation"
      | "clicked_compare_after_estimation"
      | "viewed_similar_listings",
    outputV2: EstimationRunResult["outputV2"],
    metadata?: Record<string, unknown>,
  ) => {
    try {
      await recordVehicleEstimationEvent(
        requestId,
        submissionSecret,
        eventType,
        buildEstimationEventContext(outputV2, metadata ?? {}),
        "record_event",
      );
    } catch {
      // Analytics events are non-blocking by design.
    }
  };

  return (
    <>
      <Helmet>
        <title>Estimation AutoNex - Estimez la valeur de votre voiture</title>
        <meta
          name="description"
          content="Particulier ou professionnel, obtenez une estimation de marché de votre véhicule à Madagascar avant de le vendre, même sans annonce AutoNex."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <Header />
      <main className="container mx-auto max-w-6xl py-7 md:py-14">
        <YasBackButton />
        <div className="pointer-events-none absolute inset-x-0 top-24 -z-10 mx-auto h-64 max-w-5xl bg-gradient-to-r from-primary/15 via-transparent to-primary/15 blur-3xl" />
        {screen === "landing" && (
          <section className="space-y-8 md:space-y-10">
            <Card className={`relative overflow-hidden rounded-3xl shadow-md transition-all duration-500 ease-out hover:shadow-xl ${ESTIMATION_PALETTE.surface}`}>
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <CardContent className="grid gap-8 p-7 md:grid-cols-[1.4fr_1fr] md:p-11">
                <div className="space-y-6">
                  <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 font-sans normal-case text-primary">
                    {t("estimation.overline", "Outil de valorisation AutoNex")}
                  </Badge>
                  <div className="space-y-3">
                    <h1 className={ESTIMATION_TYPO.h1}>
                      {t("estimation.estimateVehicle", "Estimez la valeur de votre véhicule")}
                    </h1>
                    {!isEmbedded && (
                      <p className={`${ESTIMATION_TYPO.body} max-w-2xl md:text-base`}>
                        {t("estimation.landingLead", "En quelques étapes, obtenez une estimation claire, crédible et directement utile avant publication.")}
                      </p>
                    )}
                  </div>
                  {!isEmbedded && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="font-sans normal-case">{t("estimation.badgeFast", "Rapide")}</Badge>
                      <Badge variant="secondary" className="font-sans normal-case">{t("estimation.badgeTransparent", "Transparent")}</Badge>
                      <Badge variant="secondary" className="font-sans normal-case">{t("estimation.badgeUseful", "Utile avant publication")}</Badge>
                      <Badge variant="secondary" className="font-sans normal-case">{t("estimation.badgeMadagascar", "Pensé pour Madagascar")}</Badge>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      onClick={() => setScreen("vehicle")}
                      size="lg"
                      className="rounded-xl px-6 font-sans shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                    >
                      {t("estimation.start", "Commencer l'estimation")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    {!isEmbedded && (
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-xl px-5 font-sans transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0"
                        onClick={() => navigate("/recherche")}
                      >
                        {t("estimation.exploreListings", "Explorer les annonces")}
                      </Button>
                    )}
                  </div>
                </div>
                {!isEmbedded && (
                <div className={`rounded-2xl border bg-background/85 p-5 md:p-6 ${ESTIMATION_PALETTE.surface}`}>
                  <p className={ESTIMATION_TYPO.label}>{t("estimation.whyUseful", "Pourquoi c'est utile")}</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                      <TrendingUp className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-sans text-sm font-medium">{t("estimation.marketRangeTitle", "Fourchette de marché")}</p>
                        <p className="font-sans text-xs text-muted-foreground">{t("estimation.marketRangeDesc", "Une base crédible pour décider de votre positionnement prix.")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                      <Gauge className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-sans text-sm font-medium">{t("estimation.confidenceLevelTitle", "Niveau de confiance")}</p>
                        <p className="font-sans text-xs text-muted-foreground">{t("estimation.confidenceLevelDesc", "Une lecture immédiate de la solidité de l'évaluation.")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                      <Target className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-sans text-sm font-medium">{t("estimation.recommendedPriceTitle", "Prix conseillé de publication")}</p>
                        <p className="font-sans text-xs text-muted-foreground">{t("estimation.recommendedPriceDesc", "Prêt à être utilisé pour publier rapidement sur AutoNex.")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                      <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-sans text-sm font-medium">{t("estimation.readyNextTitle", "Prêt pour la suite")}</p>
                        <p className="font-sans text-xs text-muted-foreground">{t("estimation.readyNextDesc", "Après l'estimation, vous pouvez publier votre véhicule avec un prix recommandé.")}</p>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </CardContent>
            </Card>

            {!isEmbedded && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className={`rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-sans text-lg">{t("estimation.howItWorksTitle", "Comment ça fonctionne")}</CardTitle>
                </CardHeader>
                <CardContent className="font-sans text-sm text-muted-foreground">
                  {t("estimation.howItWorksDesc", "Décrivez votre véhicule, précisez son état, puis recevez un rapport d'estimation structuré en quelques secondes.")}
                </CardContent>
              </Card>
              <Card className={`rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-sans text-lg">{t("estimation.reliableTransparentTitle", "Fiable et transparent")}</CardTitle>
                </CardHeader>
                <CardContent className="font-sans text-sm text-muted-foreground">
                  {t("estimation.reliableTransparentDesc", "L'outil combine profils de référence et signaux de marché. Chaque estimation inclut sa fourchette et son niveau de confiance.")}
                </CardContent>
              </Card>
              <Card className={`rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-sans text-lg">{t("estimation.convertReadyTitle", "Pensé pour convertir")}</CardTitle>
                </CardHeader>
                <CardContent className="font-sans text-sm text-muted-foreground">
                  {t("estimation.convertReadyDesc", "Une fois la valeur obtenue, vous pouvez publier votre véhicule immédiatement avec un prix conseillé.")}
                </CardContent>
              </Card>
            </div>
            )}
          </section>
        )}

        {screen !== "landing" && (
          <EstimationProgressHeader
            currentStepIndex={currentStepIndex}
            screen={screen}
            steps={STEP_META}
            t={t}
          />
        )}

        {screen === "vehicle" && (
          <Card className={`${ESTIMATION_UI.sectionCard} overflow-hidden`}>
            <CardHeader className="border-b border-border/50 pb-5">
              <div className="space-y-3">
                <CardTitle className={ESTIMATION_TYPO.h2}>{t("estimation.vehicleIdentity", "Identité du véhicule")}</CardTitle>
                <p className={ESTIMATION_TYPO.body}>
                  {t(
                    "estimation.vehicleIdentityLead",
                    "Renseignez les informations clés du véhicule pour établir une base d'estimation fiable et exploitable.",
                  )}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-7 pt-6">
              <div className={cn("grid grid-cols-1 gap-6", !isEmbedded && "lg:grid-cols-[1.55fr_0.65fr]")}>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {catalogLoading && (
                      <div className="md:col-span-2">
                        <PremiumStatePanel
                          overline={t("estimation.catalogOverline", "Catalogue estimation")}
                          title={t("estimation.catalogLoadingTitle", "Chargement des références véhicules")}
                          description={t("estimation.catalogLoadingDesc", "Nous préparons les marques et modèles pour une saisie fiable.")}
                          icon={<WheelSpinner size="md" />}
                          className="py-6"
                        />
                      </div>
                    )}
                    {!catalogLoading && makeOptions.length === 0 && (
                      <div className="md:col-span-2">
                        <PremiumStatePanel
                          overline={t("estimation.catalogOverline")}
                          title={t("estimation.catalogUnavailableTitle")}
                          description={t("estimation.catalogUnavailableDesc")}
                          icon={<AlertCircle className="h-6 w-6 text-destructive" aria-hidden />}
                          className="py-6"
                          action={
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl font-sans"
                              disabled={catalogFetching}
                              onClick={() => void refetchCatalog()}
                            >
                              {catalogFetching ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
                              )}
                              {t("estimation.catalogRetry")}
                            </Button>
                          }
                        />
                      </div>
                    )}
                <div className="space-y-2">
                  <Label htmlFor="make">
                    {t("search.brand", "Marque")} <span className="text-destructive">*</span>
                  </Label>
                  <VehicleCatalogCombobox
                    id="make"
                    value={form.makeName}
                    options={makeOptions}
                    placeholder={t("estimation.selectBrand", "Sélectionner une marque")}
                    searchPlaceholder={t("estimation.searchBrand", "Rechercher une marque...")}
                    emptyLabel={t("estimation.noBrandFound", "Aucune marque trouvée")}
                    disabled={catalogLoading || makeOptions.length === 0}
                    hasError={Boolean(visibleFieldError("make"))}
                    onSelect={(value) => setForm((prev) => ({ ...prev, makeName: value, modelName: "" }))}
                  />
                  {visibleFieldError("make") && (
                    <p className="mt-1 font-sans text-xs text-destructive">{visibleFieldError("make")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">
                    {t("search.model", "Modèle")} <span className="text-destructive">*</span>
                  </Label>
                  <VehicleCatalogCombobox
                    id="model"
                    value={form.modelName}
                    options={modelOptions}
                    placeholder={form.makeName ? t("estimation.selectModel", "Sélectionner un modèle") : t("estimation.chooseBrandFirst", "Choisissez d'abord une marque")}
                    searchPlaceholder={t("estimation.searchModel", "Rechercher un modèle...")}
                    emptyLabel={form.makeName ? t("estimation.noModelFound", "Aucun modèle trouvé pour cette marque") : t("estimation.selectBrand", "Sélectionner une marque")}
                    disabled={!form.makeName.trim()}
                    hasError={Boolean(visibleFieldError("model"))}
                    onSelect={(value) => setForm((prev) => ({ ...prev, modelName: value }))}
                  />
                  {visibleFieldError("model") && (
                    <p className="mt-1 font-sans text-xs text-destructive">{visibleFieldError("model")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trim">
                    {t("estimation.trimLabel", "Version / Trim")}{" "}
                    <span className="font-sans text-xs text-muted-foreground">
                      ({t("estimation.optional", "optionnel")})
                    </span>
                  </Label>
                  <Input
                    id="trim"
                    type="text"
                    maxLength={60}
                    value={form.trim ?? ""}
                    placeholder={t("estimation.trimPlaceholder", "Ex: SE Plus, Vigo, GT Line, X20")}
                    className={ESTIMATION_UI.inputLike}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({ ...prev, trim: v.trim() === "" ? null : v }));
                    }}
                    data-testid="estimation-trim-input"
                  />
                  <p className="font-sans text-xs text-muted-foreground">
                    {t(
                      "estimation.trimHelper",
                      "Précisez la version exacte si vous la connaissez. Améliore la précision de l'estimation.",
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">{t("search.year", "Année")}</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1950}
                    max={currentYear}
                    value={form.year ?? ""}
                    aria-invalid={Boolean(visibleFieldError("year")) || undefined}
                    className={cn(
                      ESTIMATION_UI.inputLike,
                      visibleFieldError("year") && "border-destructive focus-visible:ring-destructive/40",
                    )}
                    onChange={(e) => setForm((prev) => ({ ...prev, year: parseNumberInput(e.target.value) }))}
                  />
                  {visibleFieldError("year") && (
                    <p className="mt-1 font-sans text-xs text-destructive">{visibleFieldError("year")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">
                    {t("estimation.cityRegion", "Ville / Région")} <span className="text-destructive">*</span>
                  </Label>
                  <VehicleCatalogCombobox
                    id="city"
                    value={form.city}
                    options={[...MADAGASCAR_LOCATION_OPTIONS]}
                    placeholder={t("estimation.selectCity", "Sélectionner une ville / région")}
                    searchPlaceholder={t("estimation.searchCity", "Rechercher une ville / région...")}
                    emptyLabel={t("estimation.noCityFound", "Aucune ville trouvée")}
                    hasError={Boolean(visibleFieldError("city"))}
                    onSelect={(value) => setForm((prev) => ({ ...prev, city: value }))}
                  />
                  {visibleFieldError("city") && (
                    <p className="mt-1 font-sans text-xs text-destructive">{visibleFieldError("city")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">{t("search.mileageKm", "Kilométrage")} (km)</Label>
                  <Input
                    id="mileage"
                    type="number"
                    min={0}
                    max={1500000}
                    value={form.mileage ?? ""}
                    aria-invalid={Boolean(visibleFieldError("mileage")) || undefined}
                    className={cn(
                      ESTIMATION_UI.inputLike,
                      visibleFieldError("mileage") && "border-destructive focus-visible:ring-destructive/40",
                    )}
                    onChange={(e) => setForm((prev) => ({ ...prev, mileage: parseNumberInput(e.target.value) }))}
                  />
                  {visibleFieldError("mileage") && (
                    <p className="mt-1 font-sans text-xs text-destructive">{visibleFieldError("mileage")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("search.fuel", "Carburant")}</Label>
                  <Select value={form.fuelType} onValueChange={(value) => setForm((prev) => ({ ...prev, fuelType: value as EstimationInput["fuelType"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_FUEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("search.transmission", "Boîte de vitesse")}</Label>
                  <Select value={form.transmissionType} onValueChange={(value) => setForm((prev) => ({ ...prev, transmissionType: value as EstimationInput["transmissionType"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_TRANSMISSION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("listing.bodyStyle", "Carrosserie")}</Label>
                  <Select value={form.bodyType} onValueChange={(value) => setForm((prev) => ({ ...prev, bodyType: value as EstimationInput["bodyType"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{visibleBodyOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {hasBodyTypeSuggestion && (
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "estimation.bodyStyleAutoHint",
                        "Carrosserie suggérée automatiquement pour ce modèle. Vous pouvez la modifier si besoin.",
                      )}
                    </p>
                  )}
                  {modelBodyTypeOptions.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "estimation.bodyStyleChoiceHint",
                        "Ce modèle existe en plusieurs carrosseries. Sélectionnez celle qui correspond à votre véhicule.",
                      )}
                    </p>
                  )}
                </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-secondary/10 p-4 md:p-5">
                    <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">{t("estimation.inputTipTitle", "Conseil de saisie")}</p>
                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                      {t("estimation.inputTipDesc", "Plus les informations sont précises, plus l'estimation sera resserrée et directement actionnable.")}
                    </p>
                  </div>
                </div>
                {!isEmbedded && (
                  <aside className={`rounded-2xl border bg-gradient-to-b p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 ${ESTIMATION_PALETTE.accent}`}>
                    <p className={ESTIMATION_TYPO.label}>{t("estimation.whyTheseInfo", "Pourquoi ces informations ?")}</p>
                    <h3 className={`mt-2 ${ESTIMATION_TYPO.h3}`}>{t("estimation.fairerEstimate", "Une estimation plus juste")}</h3>
                    <p className={`mt-2 ${ESTIMATION_TYPO.body}`}>
                      {t("estimation.fairerEstimateDesc", "Marque, modèle, année et kilométrage constituent le socle de valorisation le plus pertinent pour votre véhicule.")}
                    </p>
                    <div className="mt-4 space-y-2.5">
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <p className="font-sans text-xs font-medium">{t("estimation.quickJourneyTitle", "Parcours rapide")}</p>
                        <p className="font-sans text-xs text-muted-foreground">{t("estimation.quickJourneyDesc", "Environ 2 minutes pour compléter les informations essentielles.")}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <p className="font-sans text-xs font-medium">{t("estimation.actionableResultTitle", "Résultat actionnable")}</p>
                        <p className="font-sans text-xs text-muted-foreground">{t("estimation.actionableResultDesc", "Prix conseillé, fourchette et niveau de confiance immédiats.")}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <p className="font-sans text-xs font-medium">{t("estimation.readyAfterTitle", "Prêt pour la suite")}</p>
                        <p className="font-sans text-xs text-muted-foreground">{t("estimation.readyAfterDesc", "Vous pourrez publier ensuite sur AutoNex avec un cap prix clair.")}</p>
                      </div>
                    </div>
                  </aside>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                {!isEmbedded && (
                  <Button variant="outline" onClick={() => setScreen("landing")} className={`${ESTIMATION_UI.secondaryCta} w-full px-5 sm:w-auto focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2`}>{t("publish.previousStep", "Étape précédente")}</Button>
                )}
                <Button
                  onClick={handleVehicleNext}
                  className={`${ESTIMATION_UI.primaryCta} w-full min-w-[150px] sm:w-auto sm:ml-auto focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2`}
                >
                  {t("publish.continue", "Continuer")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {screen === "condition" && (
          <Card className={ESTIMATION_UI.sectionCard}>
            <CardHeader>
              <div className="space-y-2">
                <CardTitle className={ESTIMATION_TYPO.h2}>{t("estimation.conditionHistoryTitle", "État et historique")}</CardTitle>
                <p className={ESTIMATION_TYPO.body}>
                  {t("estimation.conditionHistoryDesc", "Affinez la valorisation avec le contexte d'usage pour obtenir un rapport plus juste.")}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_0.7fr]">
                <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("estimation.generalCondition", "État général")}</Label>
                  <Select value={form.conditionLabel} onValueChange={(value) => setForm((prev) => ({ ...prev, conditionLabel: value as EstimationInput["conditionLabel"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("estimation.maintenanceFollowed", "Entretien suivi")}</Label>
                  <Select value={form.maintenanceLevel} onValueChange={(value) => setForm((prev) => ({ ...prev, maintenanceLevel: value as EstimationInput["maintenanceLevel"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_MAINTENANCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("estimation.ownerCount", "Nombre de propriétaires")}</Label>
                  <Select value={form.ownerCountLabel} onValueChange={(value) => setForm((prev) => ({ ...prev, ownerCountLabel: value as EstimationInput["ownerCountLabel"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_OWNER_COUNT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("estimation.usage", "Usage")}</Label>
                  <Select value={form.usageType} onValueChange={(value) => setForm((prev) => ({ ...prev, usageType: value as EstimationInput["usageType"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_USAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-4 flex items-center justify-between gap-3 bg-background">
                <div>
                  <p className="font-sans text-sm font-medium">{t("estimation.accidentDeclaredTitle", "Accident déclaré")}</p>
                  <p className="font-sans text-xs text-muted-foreground">{t("estimation.accidentDeclaredDesc", "Impacte le prix estimé.")}</p>
                </div>
                <Button
                  type="button"
                  variant={form.accidentDeclared ? "destructive" : "outline"}
                  className="font-sans"
                  onClick={() => setForm((prev) => ({ ...prev, accidentDeclared: !prev.accidentDeclared }))}
                >
                  {form.accidentDeclared ? t("common.yes", "Oui") : t("common.no", "Non")}
                </Button>
              </div>

              <div className="rounded-xl border border-dashed border-border/80 bg-secondary/15 p-4">
                <p className="font-sans text-sm font-medium">{t("estimation.autonexTipTitle", "Conseil AutoNex")}</p>
                <p className="font-sans text-xs text-muted-foreground mt-1">
                  {t("estimation.autonexTipDesc", "Soyez le plus précis possible : cela renforce la crédibilité de l'estimation.")}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t("estimation.partialDataHint", "Le rapport reste disponible même avec des données partielles.")}</span>
                </div>
              </div>
                </div>
                <aside className={`rounded-2xl border bg-gradient-to-b p-5 shadow-sm lg:sticky lg:top-24 ${ESTIMATION_PALETTE.accent}`}>
                  <p className={ESTIMATION_TYPO.label}>{t("estimation.reportConfidence", "Confiance du rapport")}</p>
                  <h3 className={`mt-2 ${ESTIMATION_TYPO.h3}`}>{t("estimation.higherPrecision", "Précision renforcée")}</h3>
                  <p className={`mt-2 ${ESTIMATION_TYPO.body}`}>
                    {t("estimation.higherPrecisionDesc", "L'état, l'entretien et l'usage permettent d'ajuster la valeur avec plus de justesse.")}
                  </p>
                  <div className="mt-4 rounded-lg border border-border/60 bg-background/80 p-3">
                    <p className="font-sans text-xs font-medium">{t("estimation.practicalTipTitle", "Conseil pratique")}</p>
                    <p className="font-sans text-xs text-muted-foreground">{t("estimation.practicalTipDesc", "Si vous hésitez, choisissez l'option la plus prudente.")}</p>
                  </div>
                </aside>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => setScreen("vehicle")} className={`${ESTIMATION_UI.secondaryCta} w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2`}>{t("publish.previousStep", "Étape précédente")}</Button>
                <Button onClick={() => runMutation.mutate()} disabled={!canSubmit || runMutation.isPending} className={`${ESTIMATION_UI.primaryCta} w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2`}>
                  {runMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("estimation.generating", "Génération de l’estimation...")}
                    </>
                  ) : (
                    t("estimation.viewMyEstimate", "Voir mon estimation")
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {runMutation.isPending && screen !== "result" && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-6 animate-pulse">
            <div className="h-6 w-44 rounded bg-muted mb-3" />
            <div className="h-4 w-72 rounded bg-muted mb-2" />
            <div className="h-4 w-60 rounded bg-muted" />
          </div>
        )}

        {screen === "result" && result && presentation && (
          <>
            <section aria-label={t("estimation.resultSectionAria", "Résultat d'estimation véhicule")} className="space-y-3">
              <Suspense
                fallback={
                  <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <WheelSpinner size="lg" aria-hidden />
                    <p className="text-sm font-sans text-center">{t("states.pleaseWait", "Please wait")}</p>
                  </div>
                }
              >
                <EstimationResultReport
                  result={result}
                  presentation={presentation}
                  onPublish={() => void publishFromEstimation()}
                  onRefine={() => {
                  void trackEstimationEvent(result.requestId, result.submissionSecret, "clicked_refine_estimation", result.outputV2);
                    setScreen("vehicle");
                  }}
                onCompare={() => {
                  void trackEstimationEvent(result.requestId, result.submissionSecret, "clicked_compare_after_estimation", result.outputV2);
                  navigate("/recherche");
                }}
                  onRestart={() => {
                    setResult(null);
                    setScreen("vehicle");
                  }}
                  onViewComparable={(listingId) =>
                  void trackEstimationEvent(result.requestId, result.submissionSecret, "viewed_similar_listings", result.outputV2, { listingId })
                  }
                />
              </Suspense>
            </section>
            <div className="rounded-xl border border-border/80 bg-secondary/15 p-4 text-xs font-sans leading-relaxed text-muted-foreground" role="note" aria-label={t("estimation.usageFrameAria", "Cadre d'usage de l'estimation")}>
              {t("estimation.usageFrameText", "Cette estimation est une indication de marché basée sur les données disponibles. Elle ne constitue ni une valeur officielle, ni une expertise mécanique, ni un prix garanti.")}
            </div>
            <p className="px-0.5 text-xs leading-relaxed text-muted-foreground font-sans" aria-label={t("estimation.usageAdviceAria", "Conseil d'utilisation du rapport d'estimation")}>
              {t("estimation.usageAdviceText", "Utilisez ce rapport pour arbitrer votre timing de vente et préparer une annonce cohérente.")}
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
};

export default VehicleEstimationPage;
