import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CarFront, CheckCircle2, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
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
    if (!form.modelName.trim()) errors.push("Le modele est obligatoire.");
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

  return (
    <>
      <Helmet>
        <title>Estimation AutoNex - Estimez la valeur de votre voiture</title>
        <meta
          name="description"
          content="Particulier ou professionnel, obtenez une estimation de marche de votre vehicule a Madagascar avant de le vendre, meme sans annonce AutoNex."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-6 md:py-8">
        {screen === "landing" && (
          <section className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <Badge variant="outline" className="w-fit font-sans normal-case">Estimation de marche</Badge>
                <CardTitle className="font-serif text-3xl md:text-4xl">Estimez la valeur de votre voiture</CardTitle>
                <p className="text-muted-foreground font-sans text-sm md:text-base max-w-3xl">
                  Estimez la valeur de marche de votre voiture, meme si elle n'est pas encore en vente sur AutoNex.
                </p>
                <p className="text-xs font-sans text-muted-foreground max-w-3xl">
                  Aucune annonce AutoNex n'est necessaire pour demarrer.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/80 bg-secondary/15 p-4">
                    <p className="font-sans text-sm font-semibold">Fourchette estimee</p>
                    <p className="font-sans text-xs text-muted-foreground mt-1">Jamais un prix exact absolu.</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-secondary/15 p-4">
                    <p className="font-sans text-sm font-semibold">Niveau de confiance</p>
                    <p className="font-sans text-xs text-muted-foreground mt-1">Indicateur clair selon les donnees trouvees.</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-secondary/15 p-4">
                    <p className="font-sans text-sm font-semibold">Comparables recents</p>
                    <p className="font-sans text-xs text-muted-foreground mt-1">Annonces AutoNex similaires en enrichissement, si disponibles.</p>
                  </div>
                </div>
                <Button onClick={() => setScreen("vehicle")} className="font-sans">
                  Commencer l'estimation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Comment ca marche ?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground font-sans">
                  Nous calculons d'abord une estimation indicative a partir de votre vehicule, puis nous l'enrichissons avec des annonces similaires AutoNex si elles existent.
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Pourquoi ce n'est pas officiel ?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground font-sans">
                  Cette estimation est indicative et ne remplace ni expertise mecanique, ni valeur douaniere, ni prix garanti.
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Facteurs de prix</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground font-sans">
                  Kilometrage, etat, entretien, nombre de proprietaires, usage, et signaux du marche local.
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {screen !== "landing" && (
          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className={screen === "vehicle" ? "text-primary" : ""}>Vehicule</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className={screen === "condition" ? "text-primary" : ""}>Etat</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className={screen === "result" ? "text-primary" : ""}>Resultat</span>
          </div>
        )}

        {screen === "vehicle" && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Etape 1 - Identite du vehicule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {vehicleStepErrors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  {vehicleStepErrors.map((error) => (
                    <p key={error} className="font-sans text-sm text-destructive">{error}</p>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="model">Modele</Label>
                  <VehicleCatalogCombobox
                    value={form.modelName}
                    options={modelOptions}
                    placeholder={form.makeName ? "Selectionner un modele" : "Choisissez d'abord une marque"}
                    searchPlaceholder="Rechercher un modele..."
                    emptyLabel={form.makeName ? "Aucun modele trouve pour cette marque" : "Selectionnez une marque"}
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
                    onChange={(e) => setForm((prev) => ({ ...prev, year: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville / Region</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Ex: Antananarivo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Kilometrage (km)</Label>
                  <Input
                    id="mileage"
                    type="number"
                    min={0}
                    max={1500000}
                    value={form.mileage}
                    onChange={(e) => setForm((prev) => ({ ...prev, mileage: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carburant</Label>
                  <Select value={form.fuelType} onValueChange={(value) => setForm((prev) => ({ ...prev, fuelType: value as EstimationInput["fuelType"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_FUEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Boite</Label>
                  <Select value={form.transmissionType} onValueChange={(value) => setForm((prev) => ({ ...prev, transmissionType: value as EstimationInput["transmissionType"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_TRANSMISSION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Carrosserie</Label>
                  <Select value={form.bodyType} onValueChange={(value) => setForm((prev) => ({ ...prev, bodyType: value as EstimationInput["bodyType"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_BODY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setScreen("landing")} className="font-sans">Retour</Button>
                <Button disabled={!canSubmit} onClick={() => setScreen("condition")} className="font-sans">
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {screen === "condition" && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Etape 2 - Etat et historique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Etat general</Label>
                  <Select value={form.conditionLabel} onValueChange={(value) => setForm((prev) => ({ ...prev, conditionLabel: value as EstimationInput["conditionLabel"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Entretien suivi</Label>
                  <Select value={form.maintenanceLevel} onValueChange={(value) => setForm((prev) => ({ ...prev, maintenanceLevel: value as EstimationInput["maintenanceLevel"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_MAINTENANCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre de proprietaires</Label>
                  <Select value={form.ownerCountLabel} onValueChange={(value) => setForm((prev) => ({ ...prev, ownerCountLabel: value as EstimationInput["ownerCountLabel"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_OWNER_COUNT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Usage</Label>
                  <Select value={form.usageType} onValueChange={(value) => setForm((prev) => ({ ...prev, usageType: value as EstimationInput["usageType"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTIMATION_USAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-sm font-medium">Accident declare</p>
                  <p className="font-sans text-xs text-muted-foreground">Impacte le prix estime.</p>
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
                <p className="font-sans text-sm font-medium">Ajouter plus de details pour ameliorer la precision</p>
                <p className="font-sans text-xs text-muted-foreground mt-1">
                  Cette option sera enrichie dans les prochaines versions (photos, historique detaille, VIN).
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setScreen("vehicle")} className="font-sans">Retour</Button>
                <Button onClick={() => runMutation.mutate()} disabled={!canSubmit || runMutation.isPending} className="font-sans">
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
          <section className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-sans normal-case">Estimation indicative</Badge>
                  <Badge className={confidenceBadgeClass(result.output.confidenceLabel)}>
                    Confiance {result.output.confidenceLabel === "high" ? "elevee" : result.output.confidenceLabel === "medium" ? "moyenne" : "faible"}
                  </Badge>
                </div>
                <CardTitle className="font-serif text-3xl">Votre estimation: {formatAriary(result.output.adjustedPrice)}</CardTitle>
                <p className="font-sans text-sm text-muted-foreground">
                  Fourchette estimee: {formatAriary(result.output.lowRangePrice)} - {formatAriary(result.output.highRangePrice)}
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/80 p-4">
                  <p className="text-xs font-sans text-muted-foreground">Prix conseille d'annonce</p>
                  <p className="font-serif text-xl mt-1">{formatAriary(result.output.recommendedListingPrice)}</p>
                </div>
                <div className="rounded-xl border border-border/80 p-4">
                  <p className="text-xs font-sans text-muted-foreground">Vente rapide</p>
                  <p className="font-serif text-xl mt-1">{formatAriary(result.output.quickSalePrice)}</p>
                </div>
                <div className="rounded-xl border border-border/80 p-4">
                  <p className="text-xs font-sans text-muted-foreground">Score de confiance</p>
                  <p className="font-serif text-xl mt-1">{result.output.confidenceScore}/100</p>
                </div>
              </CardContent>
            </Card>

            {(result.output.confidenceLabel === "low" || !result.output.hasComparables) && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-100/60 px-4 py-3 text-sm font-sans text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                {result.output.estimationNote ??
                  "Nous avons peu de vehicules comparables pour ce modele. L'estimation reste indicative."}
              </div>
            )}
            {!result.output.usedReferenceProfile && (
              <div className="rounded-xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm font-sans text-muted-foreground">
                Nous avons identifie votre vehicule, mais les donnees de marche disponibles pour ce modele sont plus limitees.
                L'estimation fournie reste indicative et la fourchette est plus large.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-serif text-xl flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Facteurs positifs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.output.positiveFactors.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-sans">Aucun facteur majeur de surcote detecte.</p>
                  ) : (
                    result.output.positiveFactors.map((factor) => (
                      <Badge key={factor} variant="secondary" className="mr-2 mb-2 font-sans normal-case">{factor}</Badge>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-serif text-xl flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-destructive" /> Facteurs de decote</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.output.negativeFactors.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-sans">Aucun facteur penalisant majeur detecte.</p>
                  ) : (
                    result.output.negativeFactors.map((factor) => (
                      <Badge key={factor} variant="outline" className="mr-2 mb-2 font-sans normal-case">{factor}</Badge>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="font-serif text-xl">Annonces AutoNex similaires (si disponibles)</CardTitle>
              </CardHeader>
              <CardContent>
                {result.output.comparables.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-secondary/15 p-5 text-center">
                    <p className="font-sans text-sm text-muted-foreground">
                      Nous n'avons pas encore assez d'annonces similaires sur AutoNex pour ce modele, mais voici une estimation indicative basee sur les caracteristiques de votre vehicule.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.output.comparables.map((item) => (
                      <Link
                        key={item.listingId}
                        to={`/annonce/${item.listingId}`}
                        onClick={() => void insertEstimationEvent(result.requestId, "viewed_similar_listings", { listingId: item.listingId })}
                        className="rounded-xl border border-border/80 p-3 hover:border-primary/40 transition"
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

            <div className="rounded-xl border border-border/80 bg-secondary/15 p-4 text-xs font-sans text-muted-foreground">
              Cette estimation est une indication de marche basee sur les donnees disponibles sur AutoNex. Elle ne constitue ni
              une valeur officielle, ni une expertise mecanique, ni un prix garanti.
            </div>
            <p className="text-xs text-muted-foreground font-sans">
              Vous pouvez utiliser cette estimation pour decider si vous souhaitez vendre maintenant ou publier une annonce sur AutoNex.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void publishFromEstimation()} className="font-sans">
                Publier cette voiture avec ce prix conseille
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
                className="font-sans"
              >
                Affiner l'estimation
              </Button>
              <Button variant="ghost" onClick={() => navigate("/recherche")} className="font-sans">
                Comparer avec des annonces similaires
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setResult(null);
                  setScreen("vehicle");
                }}
                className="font-sans"
              >
                Refaire une estimation
              </Button>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
};

export default VehicleEstimationPage;
