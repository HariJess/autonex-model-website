import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, ChevronRight, Gauge, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ESTIMATION_BODY_OPTIONS,
  ESTIMATION_CONDITION_OPTIONS,
  ESTIMATION_FUEL_OPTIONS,
  ESTIMATION_MAINTENANCE_OPTIONS,
  ESTIMATION_OWNER_COUNT_OPTIONS,
  ESTIMATION_TRANSMISSION_OPTIONS,
  ESTIMATION_USAGE_OPTIONS,
  formatAriary,
} from "@/lib/estimation/constants";
import { runVehicleEstimation } from "@/lib/estimation/api";
import { insertEstimationEvent } from "@/lib/estimation/repository";
import { buildEstimationPresentation } from "@/lib/estimation/presentation";
import { buildEstimationEventContext } from "@/lib/estimation/telemetry";
import { loadVehicleCatalog } from "@/lib/estimation/vehicleCatalog";
import VehicleCatalogCombobox from "@/components/estimation/VehicleCatalogCombobox";
import EstimationResultReport from "@/components/estimation/EstimationResultReport";
import { PremiumStatePanel } from "@/components/ui/premium-state";
import type { EstimationInput, EstimationRunResult } from "@/types/estimation";

const ESTIMATION_DRAFT_KEY = "autonex:estimation:draft:v1";
const currentYear = new Date().getFullYear();

const EMPTY_FORM: EstimationInput = {
  makeName: "",
  modelName: "",
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
  display: "font-serif tracking-tight leading-[1.05]",
  h1: "font-serif text-4xl md:text-6xl tracking-tight leading-[1.05]",
  h2: "font-serif text-3xl md:text-4xl tracking-tight",
  h3: "font-serif text-xl md:text-2xl",
  valueHero: "font-serif text-5xl md:text-7xl tracking-tight leading-[0.98]",
  valueMetric: "font-serif text-2xl",
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
  const { toast } = useToast();
  const { user } = useAuth();
  const [screen, setScreen] = useState<"landing" | "vehicle" | "condition" | "result">("landing");
  const [form, setForm] = useState<EstimationInput>(EMPTY_FORM);
  const [result, setResult] = useState<EstimationRunResult | null>(null);
  const [resultViewedForRequest, setResultViewedForRequest] = useState<string | null>(null);

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

  const runMutation = useMutation({
    mutationFn: async () => runVehicleEstimation(form, user?.id ?? null),
    onSuccess: (payload) => {
      setResult(payload);
      setScreen("result");
    },
    onError: (error) => {
      toast({
        title: t("estimation.unavailableTitle", "Estimation indisponible"),
        description:
          error instanceof Error
            ? `${error.message} Réessayez dans quelques instants.`
            : t("states.genericErrorRetry", "Une erreur est survenue. Réessayez dans quelques instants."),
        variant: "destructive",
      });
    },
  });

  const vehicleStepErrors = useMemo(() => {
    const errors: string[] = [];
    if (!form.makeName.trim()) errors.push(t("estimation.errorMakeRequired", "La marque est obligatoire."));
    if (!form.modelName.trim()) errors.push(t("estimation.errorModelRequired", "Le modèle est obligatoire."));
    if (!Number.isFinite(form.year) || form.year < 1950 || form.year > currentYear) {
      errors.push(t("estimation.errorYearRange", "L'année doit être comprise entre 1950 et l'année en cours."));
    }
    if (!form.city.trim()) errors.push(t("estimation.errorCityRequired", "La ville / region est obligatoire."));
    if (!Number.isFinite(form.mileage) || form.mileage < 0 || form.mileage > 1_500_000) {
      errors.push(t("estimation.errorMileageRange", "Le kilometrage doit etre entre 0 et 1 500 000 km."));
    }
    return errors;
  }, [form]);

  const canSubmit = vehicleStepErrors.length === 0;
  const presentation = result ? buildEstimationPresentation(result) : null;
  const canonical = typeof window !== "undefined"
    ? `${window.location.origin}/estimation`
    : "https://autonex.mg/estimation";
  const currentStepIndex =
    screen === "landing" ? 0 : screen === "vehicle" ? 1 : screen === "condition" ? 2 : 3;

  useEffect(() => {
    if (screen !== "result" || !result) return;
    if (resultViewedForRequest === result.requestId) return;
    setResultViewedForRequest(result.requestId);
    void insertEstimationEvent(
      result.requestId,
      "estimation_result_viewed",
      buildEstimationEventContext(result.outputV2, { resultId: result.resultId }),
    );
  }, [screen, result, resultViewedForRequest]);

  const publishFromEstimation = async () => {
    if (!result) return;
    try {
      await insertEstimationEvent(
        result.requestId,
        "clicked_publish_after_estimation",
        buildEstimationEventContext(result.outputV2, {
          resultId: result.resultId,
          recommendedPrice: result.output.recommendedListingPrice,
        }),
      );
    } catch {
      // Event tracking should not block navigation.
    }
    navigate("/publier", {
      state: {
        prefill: {
          make: form.makeName,
          model: form.modelName,
          year: String(form.year),
          city: form.city,
          mileageKm: form.mileage,
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
    eventType:
      | "clicked_publish_after_estimation"
      | "clicked_refine_estimation"
      | "clicked_compare_after_estimation"
      | "viewed_similar_listings",
    outputV2: EstimationRunResult["outputV2"],
    metadata?: Record<string, unknown>,
  ) => {
    try {
      await insertEstimationEvent(requestId, eventType, buildEstimationEventContext(outputV2, metadata ?? {}));
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
      <main className="container mx-auto max-w-6xl px-4 py-7 md:py-14">
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
                    <p className={`${ESTIMATION_TYPO.body} max-w-2xl md:text-base`}>
                      {t("estimation.landingLead", "En quelques étapes, obtenez une estimation claire, crédible et directement utile avant publication.")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="font-sans normal-case">{t("estimation.badgeFast", "Rapide")}</Badge>
                    <Badge variant="secondary" className="font-sans normal-case">{t("estimation.badgeTransparent", "Transparent")}</Badge>
                    <Badge variant="secondary" className="font-sans normal-case">{t("estimation.badgeUseful", "Utile avant publication")}</Badge>
                    <Badge variant="secondary" className="font-sans normal-case">{t("estimation.badgeMadagascar", "Pensé pour Madagascar")}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      onClick={() => setScreen("vehicle")}
                      size="lg"
                      className="rounded-xl px-6 font-sans shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                    >
                      {t("estimation.start", "Commencer l'estimation")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-xl px-5 font-sans transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0"
                      onClick={() => navigate("/recherche")}
                    >
                      {t("estimation.exploreListings", "Explorer les annonces")}
                    </Button>
                  </div>
                </div>
                <div className={`rounded-2xl border bg-background/85 p-5 md:p-6 ${ESTIMATION_PALETTE.surface}`}>
                  <p className={ESTIMATION_TYPO.label}>Pourquoi c'est utile</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                      <TrendingUp className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-sans text-sm font-medium">Fourchette de marché</p>
                        <p className="font-sans text-xs text-muted-foreground">Une base crédible pour décider de votre positionnement prix.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                      <Gauge className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-sans text-sm font-medium">Niveau de confiance</p>
                        <p className="font-sans text-xs text-muted-foreground">Une lecture immédiate de la solidité de l'évaluation.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                      <Target className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-sans text-sm font-medium">Prix conseillé de publication</p>
                        <p className="font-sans text-xs text-muted-foreground">Prêt à être utilisé pour publier rapidement sur AutoNex.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                      <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-sans text-sm font-medium">Prêt pour la suite</p>
                        <p className="font-sans text-xs text-muted-foreground">Après l'estimation, vous pouvez publier votre véhicule avec un prix recommandé.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className={`rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-lg">Comment ça fonctionne</CardTitle>
                </CardHeader>
                <CardContent className="font-sans text-sm text-muted-foreground">
                  Décrivez votre véhicule, précisez son état, puis recevez un rapport d'estimation structuré en quelques secondes.
                </CardContent>
              </Card>
              <Card className={`rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-lg">Fiable et transparent</CardTitle>
                </CardHeader>
                <CardContent className="font-sans text-sm text-muted-foreground">
                  L'outil combine profils de référence et signaux de marché. Chaque estimation inclut sa fourchette et son niveau de confiance.
                </CardContent>
              </Card>
              <Card className={`rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-lg">Pensé pour convertir</CardTitle>
                </CardHeader>
                <CardContent className="font-sans text-sm text-muted-foreground">
                  Une fois la valeur obtenue, vous pouvez publier votre véhicule immédiatement avec un prix conseillé.
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {screen !== "landing" && (
          <div className="mb-5 rounded-3xl border border-border/65 bg-gradient-to-br from-background/95 via-background to-secondary/25 px-4 py-4 shadow-sm md:mb-8 md:px-6 md:py-5">
            <div className="mb-3.5 flex items-center justify-between md:mb-4">
              <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("estimation.progress", "Progression estimation")}</p>
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-1">
                <p className="font-sans text-[11px] font-medium text-primary">{t("publish.stepCounter", "Étape {{current}} / {{total}}", { current: currentStepIndex, total: 3 })}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-1.5 rounded-full bg-secondary/60 p-[2px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary/60 to-primary/45 transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(8, ((currentStepIndex - 1) / 2) * 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {STEP_META.map((step, index) => {
                  const stepNumber = index + 1;
                  const isActive = step.id === screen;
                  const isDone = currentStepIndex > stepNumber;
                  const isUpcoming = !isDone && !isActive;
                  return (
                    <div
                      key={step.id}
                      className={`relative rounded-2xl border px-2.5 pb-2.5 pt-2.5 transition-all duration-200 md:px-4 md:pb-3 ${
                        isActive
                          ? "border-primary/45 bg-gradient-to-br from-primary/[0.14] via-primary/[0.08] to-background shadow-[0_14px_36px_rgba(25,78,134,0.2)]"
                          : isDone
                            ? "border-foreground/25 bg-foreground/[0.06]"
                            : "border-border/70 bg-background/85"
                      }`}
                    >
                      <div className="mb-1.5 flex items-center gap-1.5 md:mb-2 md:gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold md:h-8 md:w-8 md:text-xs ${
                            isActive
                              ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-[0_6px_16px_rgba(25,78,134,0.35)]"
                              : isDone
                                ? "bg-foreground/85 text-background"
                                : "bg-secondary text-secondary-foreground/80"
                          }`}
                        >
                          {isDone ? <Check className="h-3.5 w-3.5 md:h-4 md:w-4" /> : stepNumber}
                        </div>
                        <p
                          className={`font-sans text-sm ${
                            isActive
                              ? "font-semibold text-primary"
                              : isDone
                                ? "font-semibold text-foreground"
                                : "font-medium text-muted-foreground"
                          }`}
                        >
                          {t(step.labelKey, step.labelDefault)}
                        </p>
                      </div>
                      <p className={`font-sans text-[11px] leading-snug md:text-xs ${isUpcoming ? "text-muted-foreground/80" : "text-muted-foreground"}`}>
                        {t(step.helperKey, step.helperDefault)}
                      </p>
                      {isActive && (
                        <div className="mt-2 h-0.5 w-10 rounded-full bg-primary/70" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {screen === "vehicle" && (
          <Card className={`${ESTIMATION_UI.sectionCard} overflow-hidden`}>
            <CardHeader className="border-b border-border/50 pb-5">
              <div className="space-y-3">
                  <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 px-2.5 py-0.5 font-sans normal-case text-primary">{t("estimation.stepOne", "Étape 1")}</Badge>
                <CardTitle className={ESTIMATION_TYPO.h2}>{t("estimation.vehicleIdentity", "Identité du véhicule")}</CardTitle>
                <p className={ESTIMATION_TYPO.body}>
                  Renseignez les informations clés du véhicule pour établir une base d'estimation fiable et exploitable.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-7 pt-6">
              {vehicleStepErrors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  {vehicleStepErrors.map((error) => (
                    <p key={error} className="font-sans text-sm text-destructive">{error}</p>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.55fr_0.65fr]">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {catalogLoading && (
                      <div className="md:col-span-2">
                        <PremiumStatePanel
                          overline="Catalogue estimation"
                          title="Chargement des références véhicules"
                          description="Nous préparons les marques et modèles pour une saisie fiable."
                          icon={<Loader2 className="h-5 w-5 animate-spin text-primary" />}
                          className="py-6"
                        />
                      </div>
                    )}
                    {!catalogLoading && makeOptions.length === 0 && (
                      <div className="md:col-span-2">
                        <PremiumStatePanel
                          overline="Catalogue estimation"
                          title="Références véhicules indisponibles"
                          description="Le catalogue est momentanément indisponible. Relancez l’estimation dans quelques instants."
                          className="py-6"
                        />
                      </div>
                    )}
                    {!catalogLoading && catalogPayload?.source === "ui-curated" && (
                      <div className="md:col-span-2 rounded-xl border border-border/70 bg-secondary/20 p-3">
                        <p className="font-sans text-xs text-muted-foreground">
                          Référentiel estimation prêt (source UI curatée).
                        </p>
                      </div>
                    )}
                <div className="space-y-2">
                  <Label htmlFor="make">{t("search.brand", "Marque")}</Label>
                  <VehicleCatalogCombobox
                    value={form.makeName}
                    options={makeOptions}
                    placeholder={t("estimation.selectBrand", "Sélectionner une marque")}
                    searchPlaceholder={t("estimation.searchBrand", "Rechercher une marque...")}
                    emptyLabel={t("estimation.noBrandFound", "Aucune marque trouvée")}
                    disabled={catalogLoading || makeOptions.length === 0}
                    onSelect={(value) => setForm((prev) => ({ ...prev, makeName: value, modelName: "" }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">{t("search.model", "Modèle")}</Label>
                  <VehicleCatalogCombobox
                    value={form.modelName}
                    options={modelOptions}
                    placeholder={form.makeName ? t("estimation.selectModel", "Sélectionner un modèle") : t("estimation.chooseBrandFirst", "Choisissez d'abord une marque")}
                    searchPlaceholder={t("estimation.searchModel", "Rechercher un modèle...")}
                    emptyLabel={form.makeName ? t("estimation.noModelFound", "Aucun modèle trouvé pour cette marque") : t("estimation.selectBrand", "Sélectionner une marque")}
                    disabled={!form.makeName.trim()}
                    onSelect={(value) => setForm((prev) => ({ ...prev, modelName: value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">{t("search.year", "Année")}</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1950}
                    max={currentYear}
                    value={form.year}
                    className={ESTIMATION_UI.inputLike}
                    onChange={(e) => setForm((prev) => ({ ...prev, year: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t("estimation.cityRegion", "Ville / Région")}</Label>
                  <VehicleCatalogCombobox
                    value={form.city}
                    options={[...MADAGASCAR_LOCATION_OPTIONS]}
                    placeholder={t("estimation.selectCity", "Sélectionner une ville / région")}
                    searchPlaceholder={t("estimation.searchCity", "Rechercher une ville / région...")}
                    emptyLabel={t("estimation.noCityFound", "Aucune ville trouvée")}
                    onSelect={(value) => setForm((prev) => ({ ...prev, city: value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">{t("search.surface", "Kilométrage")} (km)</Label>
                  <Input
                    id="mileage"
                    type="number"
                    min={0}
                    max={1500000}
                    value={form.mileage}
                    className={ESTIMATION_UI.inputLike}
                    onChange={(e) => setForm((prev) => ({ ...prev, mileage: Number(e.target.value) }))}
                  />
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
                  <Label>Carrosserie</Label>
                  <Select value={form.bodyType} onValueChange={(value) => setForm((prev) => ({ ...prev, bodyType: value as EstimationInput["bodyType"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_BODY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-secondary/10 p-4 md:p-5">
                    <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Conseil de saisie</p>
                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                      Plus les informations sont précises, plus l'estimation sera resserrée et directement actionnable.
                    </p>
                  </div>
                </div>
                <aside className={`rounded-2xl border bg-gradient-to-b p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 ${ESTIMATION_PALETTE.accent}`}>
                  <p className={ESTIMATION_TYPO.label}>Pourquoi ces informations ?</p>
                  <h3 className={`mt-2 ${ESTIMATION_TYPO.h3}`}>Une estimation plus juste</h3>
                  <p className={`mt-2 ${ESTIMATION_TYPO.body}`}>
                    Marque, modèle, année et kilométrage constituent le socle de valorisation le plus pertinent pour votre véhicule.
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                      <p className="font-sans text-xs font-medium">Parcours rapide</p>
                      <p className="font-sans text-xs text-muted-foreground">Environ 2 minutes pour compléter les informations essentielles.</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                      <p className="font-sans text-xs font-medium">Résultat actionnable</p>
                      <p className="font-sans text-xs text-muted-foreground">Prix conseillé, fourchette et niveau de confiance immédiats.</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                      <p className="font-sans text-xs font-medium">Prêt pour la suite</p>
                      <p className="font-sans text-xs text-muted-foreground">Vous pourrez publier ensuite sur AutoNex avec un cap prix clair.</p>
                    </div>
                  </div>
                </aside>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" onClick={() => setScreen("landing")} className={`${ESTIMATION_UI.secondaryCta} w-full px-5 sm:w-auto focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2`}>{t("publish.previousStep", "Étape précédente")}</Button>
                <Button
                  disabled={!canSubmit}
                  onClick={() => setScreen("condition")}
                  className={`${ESTIMATION_UI.primaryCta} w-full min-w-[150px] sm:w-auto focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2`}
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
                <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 font-sans normal-case text-primary">{t("estimation.stepTwo", "Étape 2")}</Badge>
                <CardTitle className={ESTIMATION_TYPO.h2}>État et historique</CardTitle>
                <p className={ESTIMATION_TYPO.body}>
                  Affinez la valorisation avec le contexte d'usage pour obtenir un rapport plus juste.
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
                  <p className="font-sans text-sm font-medium">Accident déclaré</p>
                  <p className="font-sans text-xs text-muted-foreground">Impacte le prix estimé.</p>
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
                <p className="font-sans text-sm font-medium">Conseil AutoNex</p>
                <p className="font-sans text-xs text-muted-foreground mt-1">
                  Soyez le plus précis possible : cela renforce la crédibilité de l'estimation.
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Le rapport reste disponible même avec des données partielles.</span>
                </div>
              </div>
                </div>
                <aside className={`rounded-2xl border bg-gradient-to-b p-5 shadow-sm lg:sticky lg:top-24 ${ESTIMATION_PALETTE.accent}`}>
                  <p className={ESTIMATION_TYPO.label}>Confiance du rapport</p>
                  <h3 className={`mt-2 ${ESTIMATION_TYPO.h3}`}>Précision renforcée</h3>
                  <p className={`mt-2 ${ESTIMATION_TYPO.body}`}>
                    L'état, l'entretien et l'usage permettent d'ajuster la valeur avec plus de justesse.
                  </p>
                  <div className="mt-4 rounded-lg border border-border/60 bg-background/80 p-3">
                    <p className="font-sans text-xs font-medium">Conseil pratique</p>
                    <p className="font-sans text-xs text-muted-foreground">Si vous hésitez, choisissez l'option la plus prudente.</p>
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
            <section aria-label="Résultat d'estimation véhicule" className="space-y-3">
              <EstimationResultReport
                result={result}
                presentation={presentation}
                onPublish={() => void publishFromEstimation()}
                onRefine={() => {
                void trackEstimationEvent(result.requestId, "clicked_refine_estimation", result.outputV2);
                  setScreen("vehicle");
                }}
              onCompare={() => {
                void trackEstimationEvent(result.requestId, "clicked_compare_after_estimation", result.outputV2);
                navigate("/recherche");
              }}
                onRestart={() => {
                  setResult(null);
                  setScreen("vehicle");
                }}
                onViewComparable={(listingId) =>
                void trackEstimationEvent(result.requestId, "viewed_similar_listings", result.outputV2, { listingId })
                }
              />
            </section>
            <div className="rounded-xl border border-border/80 bg-secondary/15 p-4 text-xs font-sans leading-relaxed text-muted-foreground" role="note" aria-label="Cadre d'usage de l'estimation">
              Cette estimation est une indication de marché basée sur les données disponibles. Elle ne constitue ni une valeur officielle,
              ni une expertise mécanique, ni un prix garanti.
            </div>
            <p className="px-0.5 text-xs leading-relaxed text-muted-foreground font-sans" aria-label="Conseil d'utilisation du rapport d'estimation">
              Utilisez ce rapport pour arbitrer votre timing de vente et préparer une annonce cohérente.
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
};

export default VehicleEstimationPage;
