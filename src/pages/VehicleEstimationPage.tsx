import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CarFront, CheckCircle2, ChevronRight, Gauge, Loader2, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
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
import { loadVehicleCatalog } from "@/lib/estimation/vehicleCatalog";
import VehicleCatalogCombobox from "@/components/estimation/VehicleCatalogCombobox";
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

function confidenceBadgeClass(label: "high" | "medium" | "low"): string {
  if (label === "high") return "bg-success text-white";
  if (label === "medium") return "bg-amber-500 text-black";
  return "bg-destructive text-white";
}

const STEP_META = [
  { id: "vehicle", label: "Véhicule", helper: "Informations principales" },
  { id: "condition", label: "État", helper: "Historique et usage" },
  { id: "result", label: "Résultat", helper: "Rapport estimatif" },
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [screen, setScreen] = useState<"landing" | "vehicle" | "condition" | "result">("landing");
  const [form, setForm] = useState<EstimationInput>(EMPTY_FORM);
  const [result, setResult] = useState<EstimationRunResult | null>(null);

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
  const vehicleCatalog = catalogPayload?.entries ?? [];

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
        title: "Estimation indisponible",
        description: error instanceof Error ? error.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    },
  });

  const vehicleStepErrors = useMemo(() => {
    const errors: string[] = [];
    if (!form.makeName.trim()) errors.push("La marque est obligatoire.");
    if (!form.modelName.trim()) errors.push("Le modèle est obligatoire.");
    if (!Number.isFinite(form.year) || form.year < 1950 || form.year > currentYear) {
      errors.push("L'annee doit etre comprise entre 1950 et l'annee en cours.");
    }
    if (!form.city.trim()) errors.push("La ville / region est obligatoire.");
    if (!Number.isFinite(form.mileage) || form.mileage < 0 || form.mileage > 1_500_000) {
      errors.push("Le kilometrage doit etre entre 0 et 1 500 000 km.");
    }
    return errors;
  }, [form]);

  const canSubmit = vehicleStepErrors.length === 0;
  const canonical = typeof window !== "undefined"
    ? `${window.location.origin}/estimation`
    : "https://autonex.mg/estimation";
  const currentStepIndex =
    screen === "landing" ? 0 : screen === "vehicle" ? 1 : screen === "condition" ? 2 : 3;

  const publishFromEstimation = async () => {
    if (!result) return;
    try {
      await insertEstimationEvent(result.requestId, "clicked_publish_after_estimation", {
        recommendedPrice: result.output.recommendedListingPrice,
      });
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
      | "viewed_similar_listings",
    metadata?: Record<string, unknown>,
  ) => {
    try {
      await insertEstimationEvent(requestId, eventType, metadata ?? {});
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
      <main className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="pointer-events-none absolute inset-x-0 top-24 -z-10 mx-auto h-64 max-w-5xl bg-gradient-to-r from-primary/15 via-transparent to-primary/15 blur-3xl" />
        {screen === "landing" && (
          <section className="space-y-8 md:space-y-10">
            <Card className={`relative overflow-hidden rounded-3xl shadow-md transition-all duration-500 ease-out hover:shadow-xl ${ESTIMATION_PALETTE.surface}`}>
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <CardContent className="grid gap-8 p-7 md:grid-cols-[1.4fr_1fr] md:p-11">
                <div className="space-y-6">
                  <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 font-sans normal-case text-primary">
                    Outil de valorisation AutoNex
                  </Badge>
                  <div className="space-y-3">
                    <h1 className={ESTIMATION_TYPO.h1}>
                      Estimez la valeur de votre véhicule
                    </h1>
                    <p className={`${ESTIMATION_TYPO.body} max-w-2xl md:text-base`}>
                      En quelques étapes, obtenez une estimation claire, crédible et directement utile avant publication.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="font-sans normal-case">Rapide</Badge>
                    <Badge variant="secondary" className="font-sans normal-case">Transparent</Badge>
                    <Badge variant="secondary" className="font-sans normal-case">Utile avant publication</Badge>
                    <Badge variant="secondary" className="font-sans normal-case">Pensé pour Madagascar</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      onClick={() => setScreen("vehicle")}
                      size="lg"
                      className="rounded-xl px-6 font-sans shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                    >
                      Commencer l'estimation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-xl px-5 font-sans transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0"
                      onClick={() => navigate("/recherche")}
                    >
                      Explorer les annonces
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
                  <CardTitle className="font-serif text-lg">Comment ca fonctionne</CardTitle>
                </CardHeader>
                <CardContent className="font-sans text-sm text-muted-foreground">
                  Decrivez votre vehicule, precisez son etat, puis recevez un rapport d'estimation structure en quelques secondes.
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
          <div className="mb-6 rounded-2xl border border-border/40 bg-background/80 px-3 py-2.5 md:mb-8 md:px-4 md:py-3">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Progression</p>
              <p className="font-sans text-xs text-muted-foreground">Étape {currentStepIndex} / 3</p>
            </div>
            <div className="mb-2.5 h-1 w-full overflow-hidden rounded-full bg-muted/70">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.max(8, (currentStepIndex / 3) * 100)}%` }}
              />
            </div>
            <div className="grid gap-1.5 md:grid-cols-3">
              {STEP_META.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = step.id === screen;
                const isDone = currentStepIndex > stepNumber;
                return (
                  <div
                    key={step.id}
                    className={`rounded-lg px-2.5 py-1.5 transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10"
                        : isDone
                          ? "bg-emerald-50/60"
                          : "bg-transparent opacity-75"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-medium ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : isDone
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground/90"
                        }`}
                      >
                        {stepNumber}
                      </span>
                      <p className={`font-sans text-[11px] font-medium ${isActive ? "text-primary" : isDone ? "text-emerald-800" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </div>
                    <p className="mt-0.5 pl-6 font-sans text-[10px] text-muted-foreground/90">{step.helper}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {screen === "vehicle" && (
          <Card className={ESTIMATION_UI.sectionCard}>
            <CardHeader>
              <div className="space-y-2">
                <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 font-sans normal-case text-primary">Étape 1</Badge>
                <CardTitle className={ESTIMATION_TYPO.h2}>Identité du véhicule</CardTitle>
                <p className={ESTIMATION_TYPO.body}>
                  Renseignez les informations essentielles. Nous transformons ces données en une valorisation claire et actionnable.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {vehicleStepErrors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  {vehicleStepErrors.map((error) => (
                    <p key={error} className="font-sans text-sm text-destructive">{error}</p>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_0.7fr]">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {!catalogLoading && makeOptions.length === 0 && (
                  <div className="md:col-span-2 rounded-lg border border-amber-400/30 bg-amber-100/30 p-3">
                    <p className="font-sans text-sm text-amber-900">
                      Le catalogue visible n'est pas disponible. Verifiez la configuration UI du catalogue.
                    </p>
                  </div>
                )}
                {!catalogLoading && catalogPayload?.source === "ui-curated" && (
                  <div className="md:col-span-2 rounded-lg border border-border/70 bg-secondary/20 p-3">
                    <p className="font-sans text-xs text-muted-foreground">
                      Catalogue visible propre charge (source UI curatee).
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="make">Marque</Label>
                  <VehicleCatalogCombobox
                    value={form.makeName}
                    options={makeOptions}
                    placeholder="Selectionner une marque"
                    searchPlaceholder="Rechercher une marque..."
                    emptyLabel="Aucune marque trouvee"
                    disabled={catalogLoading || makeOptions.length === 0}
                    onSelect={(value) => setForm((prev) => ({ ...prev, makeName: value, modelName: "" }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modèle</Label>
                  <VehicleCatalogCombobox
                    value={form.modelName}
                    options={modelOptions}
                    placeholder={form.makeName ? "Sélectionner un modèle" : "Choisissez d'abord une marque"}
                    searchPlaceholder="Rechercher un modèle..."
                    emptyLabel={form.makeName ? "Aucun modèle trouvé pour cette marque" : "Sélectionnez une marque"}
                    disabled={!form.makeName.trim()}
                    onSelect={(value) => setForm((prev) => ({ ...prev, modelName: value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Annee</Label>
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
                  <Label htmlFor="city">Ville / Région</Label>
                  <VehicleCatalogCombobox
                    value={form.city}
                    options={[...MADAGASCAR_LOCATION_OPTIONS]}
                    placeholder="Sélectionner une ville / région"
                    searchPlaceholder="Rechercher une ville / région..."
                    emptyLabel="Aucune ville trouvée"
                    onSelect={(value) => setForm((prev) => ({ ...prev, city: value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Kilométrage (km)</Label>
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
                  <Label>Carburant</Label>
                  <Select value={form.fuelType} onValueChange={(value) => setForm((prev) => ({ ...prev, fuelType: value as EstimationInput["fuelType"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_FUEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Boîte</Label>
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
                <aside className={`rounded-2xl border bg-gradient-to-b p-5 shadow-sm lg:sticky lg:top-24 ${ESTIMATION_PALETTE.accent}`}>
                  <p className={ESTIMATION_TYPO.label}>Pourquoi ces informations ?</p>
                  <h3 className={`mt-2 ${ESTIMATION_TYPO.h3}`}>Une estimation mieux orientée</h3>
                  <p className={`mt-2 ${ESTIMATION_TYPO.body}`}>
                    Marque, modèle, kilométrage et configuration technique créent la base de valorisation la plus pertinente.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                      <p className="font-sans text-xs font-medium">Étape rapide</p>
                      <p className="font-sans text-xs text-muted-foreground">Moins de 2 minutes pour compléter.</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                      <p className="font-sans text-xs font-medium">Resultat actionnable</p>
                      <p className="font-sans text-xs text-muted-foreground">Prix conseillé + fourchette claire.</p>
                    </div>
                  </div>
                </aside>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
                <Button variant="outline" onClick={() => setScreen("landing")} className={ESTIMATION_UI.secondaryCta}>Retour</Button>
                <Button disabled={!canSubmit} onClick={() => setScreen("condition")} className={ESTIMATION_UI.secondaryCta}>
                  Continuer
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
                <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 font-sans normal-case text-primary">Étape 2</Badge>
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
                  <Label>État général</Label>
                  <Select value={form.conditionLabel} onValueChange={(value) => setForm((prev) => ({ ...prev, conditionLabel: value as EstimationInput["conditionLabel"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Entretien suivi</Label>
                  <Select value={form.maintenanceLevel} onValueChange={(value) => setForm((prev) => ({ ...prev, maintenanceLevel: value as EstimationInput["maintenanceLevel"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_MAINTENANCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre de propriétaires</Label>
                  <Select value={form.ownerCountLabel} onValueChange={(value) => setForm((prev) => ({ ...prev, ownerCountLabel: value as EstimationInput["ownerCountLabel"] }))}>
                    <SelectTrigger className={ESTIMATION_UI.inputLike}><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_OWNER_COUNT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Usage</Label>
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
                  {form.accidentDeclared ? "Oui" : "Non"}
                </Button>
              </div>

              <div className="rounded-xl border border-dashed border-border/80 bg-secondary/15 p-4">
                <p className="font-sans text-sm font-medium">Conseil AutoNex</p>
                <p className="font-sans text-xs text-muted-foreground mt-1">
                  Soyez le plus precis possible : cela renforce la credibilite de l'estimation.
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Le rapport reste disponible même avec des données partielles.</span>
                </div>
              </div>
                </div>
                <aside className={`rounded-2xl border bg-gradient-to-b p-5 shadow-sm lg:sticky lg:top-24 ${ESTIMATION_PALETTE.accent}`}>
                  <p className={ESTIMATION_TYPO.label}>Confiance du rapport</p>
                  <h3 className={`mt-2 ${ESTIMATION_TYPO.h3}`}>Precision renforcee</h3>
                  <p className={`mt-2 ${ESTIMATION_TYPO.body}`}>
                    L'état, l'entretien et l'usage permettent d'ajuster la valeur avec plus de justesse.
                  </p>
                  <div className="mt-4 rounded-lg border border-border/60 bg-background/80 p-3">
                    <p className="font-sans text-xs font-medium">Conseil pratique</p>
                    <p className="font-sans text-xs text-muted-foreground">Si vous hésitez, choisissez l'option la plus prudente.</p>
                  </div>
                </aside>
              </div>

              <div className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
                <Button variant="outline" onClick={() => setScreen("vehicle")} className={ESTIMATION_UI.secondaryCta}>Retour</Button>
                <Button onClick={() => runMutation.mutate()} disabled={!canSubmit || runMutation.isPending} className={ESTIMATION_UI.secondaryCta}>
                  {runMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Calcul en cours...
                    </>
                  ) : (
                    "Voir mon estimation"
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

        {screen === "result" && result && (
          <section className="space-y-6 md:space-y-7">
            <Card className={`relative overflow-hidden rounded-3xl border-0 shadow-2xl ${ESTIMATION_PALETTE.hero}`}>
              <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <CardContent className="p-7 md:p-9">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-sans normal-case border-background/30 bg-background/10 text-background">
                    Rapport d'estimation AutoNex
                  </Badge>
                  <Badge className={confidenceBadgeClass(result.output.confidenceLabel)}>
                    Confiance {result.output.confidenceLabel === "high" ? "élevée" : result.output.confidenceLabel === "medium" ? "moyenne" : "faible"}
                  </Badge>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-[1.55fr_0.95fr] md:items-end">
                  <div>
                    <p className="font-sans text-xs uppercase tracking-wide text-background/70">Valeur estimée</p>
                    <h2 className={`mt-1 ${ESTIMATION_TYPO.valueHero}`}>
                      {formatAriary(result.output.adjustedPrice)}
                    </h2>
                    <div className="mt-3 inline-flex rounded-full border border-background/25 bg-background/10 px-3 py-1.5">
                      <p className="font-sans text-xs text-background/80">
                        Fourchette : {formatAriary(result.output.lowRangePrice)} - {formatAriary(result.output.highRangePrice)}
                      </p>
                    </div>
                    <p className="mt-2 font-sans text-xs text-background/60">
                      Estimation orientée décision, basée sur les caractéristiques déclarées de votre véhicule.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-background/20 bg-background/10 p-5 backdrop-blur-sm shadow-inner">
                    <p className="font-sans text-xs text-background/70">Score de confiance</p>
                    <p className="mt-1 font-serif text-4xl">{result.output.confidenceScore}/100</p>
                    <p className="mt-1 font-sans text-xs text-background/65">Niveau de robustesse de l'évaluation.</p>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-background/20">
                      <div
                        className="h-full rounded-full bg-background/90"
                        style={{ width: `${Math.max(8, Math.min(100, result.output.confidenceScore))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`rounded-2xl shadow-sm transition-all duration-300 ease-out hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
              <CardContent className="grid grid-cols-1 gap-4 divide-y divide-border/60 p-5 md:grid-cols-4 md:divide-x md:divide-y-0 md:p-6">
                <div className="md:px-1">
                  <p className="text-xs font-sans text-muted-foreground">Prix conseillé d'annonce</p>
                  <p className={`mt-1 ${ESTIMATION_TYPO.valueMetric}`}>{formatAriary(result.output.recommendedListingPrice)}</p>
                </div>
                <div className="md:px-3">
                  <p className="text-xs font-sans text-muted-foreground">Prix vente rapide</p>
                  <p className={`mt-1 ${ESTIMATION_TYPO.valueMetric}`}>{formatAriary(result.output.quickSalePrice)}</p>
                </div>
                <div className="md:px-3">
                  <p className="text-xs font-sans text-muted-foreground">Base de marché</p>
                  <p className={`mt-1 ${ESTIMATION_TYPO.valueMetric}`}>{formatAriary(result.output.marketBasePrice)}</p>
                </div>
                <div className="md:px-3">
                  <p className="text-xs font-sans text-muted-foreground">Niveau global</p>
                  <p className={`mt-1 ${ESTIMATION_TYPO.valueMetric}`}>
                    {result.output.confidenceLabel === "high" ? "Élevé" : result.output.confidenceLabel === "medium" ? "Moyen" : "Prudent"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {(result.output.confidenceLabel === "low" || !result.output.hasComparables) && (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-100/50 px-4 py-4 text-sm font-sans text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <div>
                    <p className="font-medium">Estimation indicative</p>
                    <p className="mt-1 text-xs md:text-sm">
                      {result.output.estimationNote ??
                        "Les données disponibles pour ce modèle sont plus limitées ; la fourchette est donc volontairement plus large."}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!result.output.usedReferenceProfile && (
              <div className="rounded-xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm font-sans text-muted-foreground">
                Votre véhicule est bien reconnu. Les données comparables étant plus rares pour ce profil,
                la fourchette est volontairement plus prudente.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={`rounded-2xl bg-card/95 shadow-sm transition-all duration-300 ease-out hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
                <CardHeader>
                  <CardTitle className="font-serif text-xl flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Facteurs positifs</CardTitle>
                  <p className="font-sans text-xs text-muted-foreground">Elements qui soutiennent la valeur de votre vehicule.</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.output.positiveFactors.length === 0 ? (
                    <p className="rounded-lg bg-secondary/20 p-3 text-sm text-muted-foreground font-sans">Aucun facteur majeur de surcote détecté à ce stade.</p>
                  ) : (
                    result.output.positiveFactors.map((factor) => (
                      <Badge key={factor} variant="secondary" className="mr-2 mb-2 font-sans normal-case">{factor}</Badge>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className={`rounded-2xl bg-card/95 shadow-sm transition-all duration-300 ease-out hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
                <CardHeader>
                  <CardTitle className="font-serif text-xl flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-destructive" /> Facteurs de décote</CardTitle>
                  <p className="font-sans text-xs text-muted-foreground">Points à surveiller pour optimiser votre prix de mise en vente.</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.output.negativeFactors.length === 0 ? (
                    <p className="rounded-lg bg-secondary/20 p-3 text-sm text-muted-foreground font-sans">Aucun facteur pénalisant majeur détecté.</p>
                  ) : (
                    result.output.negativeFactors.map((factor) => (
                      <Badge key={factor} variant="outline" className="mr-2 mb-2 font-sans normal-case">{factor}</Badge>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className={`rounded-2xl bg-card/95 shadow-sm transition-all duration-300 ease-out hover:shadow-md ${ESTIMATION_PALETTE.surface}`}>
              <CardHeader>
                <CardTitle className="font-serif text-xl">Annonces AutoNex similaires</CardTitle>
                <p className="font-sans text-xs text-muted-foreground">
                  {result.output.comparables.length > 0
                    ? `${result.output.comparables.length} annonce(s) utile(s) pour comparer votre positionnement.`
                    : "Aucune annonce strictement comparable pour l'instant."}
                </p>
              </CardHeader>
              <CardContent>
                {result.output.comparables.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/15 p-7 text-center">
                    <p className="font-serif text-lg">Comparaison en cours d'enrichissement</p>
                    <p className="font-sans text-sm text-muted-foreground">
                      Nous n'avons pas encore suffisamment d'annonces strictement comparables pour ce modèle.
                      Votre estimation reste pleinement exploitable pour decider de votre positionnement.
                    </p>
                    <p className="mt-2 font-sans text-xs text-muted-foreground">
                      Publier sur AutoNex vous permet aussi d'enrichir vos repères de marche.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.output.comparables.map((item) => (
                      <Link
                        key={item.listingId}
                        to={`/annonce/${item.listingId}`}
                        onClick={() =>
                          void trackEstimationEvent(result.requestId, "viewed_similar_listings", {
                            listingId: item.listingId,
                          })
                        }
                        className="rounded-xl border border-border/80 p-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="aspect-[4/3] rounded-md overflow-hidden bg-muted mb-2">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground"><CarFront className="h-6 w-6" /></div>
                          )}
                        </div>
                        <p className="font-sans text-sm font-semibold line-clamp-2">{item.title}</p>
                        <p className="font-serif text-base mt-1">{formatAriary(item.price)}</p>
                        <p className="font-sans text-xs text-muted-foreground mt-1">{item.year} • {item.mileage.toLocaleString("fr-FR")} km • {item.city || "Madagascar"}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`rounded-2xl bg-gradient-to-r shadow-md ${ESTIMATION_PALETTE.accent}`}>
              <CardContent className="p-6 md:p-7">
                <p className="font-serif text-xl">Prêt à passer à l'action ?</p>
                <p className="mt-1 font-sans text-sm text-muted-foreground">
                  Utilisez cette estimation pour publier votre annonce avec un prix cohérent et attractif.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button onClick={() => void publishFromEstimation()} size="lg" className={ESTIMATION_UI.primaryCta}>
                    Publier cette voiture sur AutoNex
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (result) {
                        try {
                          await insertEstimationEvent(result.requestId, "clicked_refine_estimation");
                        } catch {
                          // Non-blocking analytics
                        }
                      }
                      setScreen("vehicle");
                    }}
                    className={ESTIMATION_UI.secondaryCta}
                  >
                    Affiner l'estimation
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/recherche")} className={ESTIMATION_UI.secondaryCta}>
                    Comparer avec des annonces similaires
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setResult(null);
                      setScreen("vehicle");
                    }}
                    className={ESTIMATION_UI.secondaryCta}
                  >
                    Refaire une estimation
                  </Button>
                </div>
                <p className="mt-3 font-sans text-xs text-muted-foreground">
                  Conseil : publier avec le prix conseillé accélère souvent les premiers contacts qualifiés.
                </p>
              </CardContent>
            </Card>
            <div className="rounded-xl border border-border/80 bg-secondary/15 p-4 text-xs font-sans text-muted-foreground">
              Cette estimation est une indication de marché basée sur les données disponibles. Elle ne constitue ni une valeur officielle,
              ni une expertise mécanique, ni un prix garanti.
            </div>
            <p className="text-xs text-muted-foreground font-sans">
              Utilisez ce rapport pour arbitrer votre timing de vente et préparer une annonce cohérente.
            </p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
};

export default VehicleEstimationPage;
