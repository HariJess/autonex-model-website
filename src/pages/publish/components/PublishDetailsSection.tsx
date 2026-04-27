import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUTO_BRANDS, getVehicleMakeLabel } from "@/data/automotiveCatalog";
import { resolveBrandAsset } from "@/data/brandAssets";
import { EXTERIOR_COLOR_OPTIONS, INTERIOR_COLOR_OPTIONS } from "@/lib/vehicleAttributes";
import {
  LISTING_EQUIPMENT_GROUPS,
  classifyEquipmentValues,
  getEquipmentOptionLabel,
  type ListingEquipmentIconName,
} from "@/data/listing-equipment";
import { VehicleModelCombobox } from "@/components/listings/VehicleModelCombobox";
import {
  getModelsForBrand,
  getVehicleModelLabel,
} from "@/data/vehicleModelsCatalog";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Armchair,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Leaf,
  Navigation,
  Package,
  Plus,
  Shield,
  Smartphone,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import type { PublishFormValues } from "@/pages/publish/publishFormSchema";

const EMPTY_OPTION = "__empty__";

const FUEL_OPTIONS = [
  { value: "Essence", label: "Essence" },
  { value: "Diesel", label: "Diesel" },
  { value: "Hybride", label: "Hybride" },
  { value: "Hybride rechargeable", label: "Hybride rechargeable" },
  { value: "Électrique", label: "Électrique" },
];

const TRANSMISSION_OPTIONS = [
  { value: "Boîte manuelle", label: "Manuelle" },
  { value: "Boîte automatique", label: "Automatique" },
];

const DRIVETRAIN_OPTIONS = [
  { value: "4x2", label: "4x2" },
  { value: "4x4", label: "4x4" },
  { value: "Traction", label: "Traction" },
  { value: "Propulsion", label: "Propulsion" },
  { value: "AWD", label: "AWD" },
];

const CONDITION_OPTIONS = [
  { value: "neuf", label: "Neuf" },
  { value: "occasion", label: "Occasion" },
];

const SELLER_OPTIONS = [
  { value: "particulier", label: "Particulier" },
  { value: "concessionnaire", label: "Concessionnaire" },
];

const RENTAL_MODE_OPTIONS = [
  { value: "none", label: "Aucune location" },
  { value: "short_term", label: "Courte durée" },
  { value: "long_term", label: "Longue durée" },
];

const AVAILABILITY_OPTIONS = [
  { value: "disponible", label: "Disponible" },
  { value: "reserve", label: "Réservé" },
  { value: "vendu", label: "Vendu" },
  { value: "en_arrivage", label: "En arrivage" },
];

type PublishDetailsSectionProps = {
  labels: {
    listingTitle: string;
    descriptionFr: string;
    mileageKmLabel: string;
    doorsLabel: string;
    seatsLabel: string;
    listingFeatures: string;
    priceDealHint?: string;
  };
};

/**
 * Step 1 of the publish flow — title, description, pricing, vehicle attributes,
 * equipment selection.
 *
 * Phase 6.4.c: form-aware via useFormContext. Reads/writes 27 form fields
 * directly through the parent FormProvider; only `labels` are passed as props.
 *
 * The two `useState` (showAdvancedDetails, showAllEquipment) are local UI
 * state (collapse panes), unrelated to the form schema.
 */
export function PublishDetailsSection({ labels }: PublishDetailsSectionProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const form = useFormContext<PublishFormValues>();
  const title = form.watch("title");
  const description = form.watch("description");
  const priceMga = form.watch("priceMga");
  const mileageKmInput = form.watch("mileageKmInput");
  const make = form.watch("vehicleMake");
  const model = form.watch("vehicleModel");
  const year = form.watch("vehicleYear");
  const fuel = form.watch("vehicleFuel");
  const transmission = form.watch("vehicleTransmission");
  const drivetrain = form.watch("vehicleDrivetrain");
  const condition = form.watch("vehicleCondition");
  const sellerType = form.watch("vehicleSellerType");
  const rentalMode = form.watch("vehicleRentalMode");
  const doors = form.watch("vehicleDoors");
  const seats = form.watch("vehicleSeats");
  const exteriorColor = form.watch("vehicleExteriorColor");
  const engineDisplacement = form.watch("vehicleEngineDisplacement");
  const interiorColor = form.watch("vehicleInteriorColor");
  const availabilityStatus = form.watch("vehicleAvailabilityStatus");
  const selectedFeatures = form.watch("selectedFeatures");
  const customFeaturesInput = form.watch("customFeaturesInput");
  const listingType = form.watch("listingType");
  const transaction = form.watch("transaction");

  const isRentalTransaction = transaction === "location" || transaction === "location_vacances";
  const isAdmin = profile?.role === "admin";
  const sellerTypeLabel =
    sellerType === "concessionnaire"
      ? t("publish.sellerTypeConcessionnaire", "Concessionnaire")
      : t("publish.sellerTypeParticulier", "Particulier");

  // Bug A2 — Reset rentalMode quand on repasse en « Vente ».
  useEffect(() => {
    if (!isRentalTransaction && form.getValues("vehicleRentalMode")) {
      form.setValue("vehicleRentalMode", "", { shouldDirty: true });
    }
  }, [isRentalTransaction, form]);

  // Bug A6 + A7 — `vehicleFuel` est la source unique de vérité ; les booléens
  // `isElectric` et `isHybrid` sont dérivés automatiquement (anciens Switches
  // retirés de l'UI, colonnes DB conservées pour rétrocompat).
  useEffect(() => {
    if (fuel === "Électrique") {
      form.setValue("vehicleIsElectric", true);
      form.setValue("vehicleIsHybrid", false);
    } else if (fuel === "Hybride" || fuel === "Hybride rechargeable") {
      form.setValue("vehicleIsElectric", false);
      form.setValue("vehicleIsHybrid", true);
    } else {
      form.setValue("vehicleIsElectric", false);
      form.setValue("vehicleIsHybrid", false);
    }
  }, [fuel, form]);

  // Lot 9.2 — Bug A5 : `listingType` (source de vérité, Lot 8) est mirroré vers
  // la colonne DB legacy `body_style` pour back-compat. Le Select Carrosserie
  // a été retiré de l'UI ; la colonne DB reste alignée automatiquement.
  // TODO (lot futur) : supprimer la colonne `body_style` une fois les drafts legacy migrés.
  useEffect(() => {
    if (listingType && form.getValues("vehicleBodyStyle") !== listingType) {
      form.setValue("vehicleBodyStyle", listingType);
    }
  }, [listingType, form]);

  // Lot 9.3 — Reset automatique du modèle quand la marque change et que le
  // modèle courant n'existe pas dans le nouveau catalogue (évite « Mazda
  // MX-5 » qui reste en mémoire après passage à « Toyota »).
  useEffect(() => {
    if (!make) return;
    const currentModel = form.getValues("vehicleModel");
    if (!currentModel) return;
    const models = getModelsForBrand(make);
    if (models.length === 0) return; // marque custom, on ne touche pas
    const matches = models.some((m) => m.value === currentModel.toLowerCase());
    if (!matches) {
      form.setValue("vehicleModel", "", { shouldDirty: true });
    }
  }, [make, form]);

  const [showEquipmentSection, setShowEquipmentSection] = useState(false);
  const [showComplementaryInfo, setShowComplementaryInfo] = useState(false);
  const [makeOpen, setMakeOpen] = useState(false);
  // Lot 9.2 — Auto-title intelligent : activé par défaut sur un brouillon
  // vierge, désactivé dès qu'un titre est déjà présent (édition manuelle ou
  // hydratation d'un draft existant). Le bouton « Régénérer » le réactive.
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(() => {
    return form.getValues("title").trim().length === 0;
  });
  const [useCustomBrand, setUseCustomBrand] = useState(() => {
    const initial = form.getValues("vehicleMake").trim();
    return initial.length > 0 && !AUTO_BRANDS.includes(initial);
  });
  // Bug A4 — Cylindrée en cm³ (convention malgache) par défaut, convertible
  // en L à la volée. Le form continue de stocker en litres (colonne DB
  // `engine_displacement_l`).
  const [displacementUnit, setDisplacementUnit] = useState<"cc" | "L">("cc");
  const [useCustomInteriorColor, setUseCustomInteriorColor] = useState(() => {
    const initial = form.getValues("vehicleInteriorColor").trim();
    return (
      initial.length > 0 &&
      !INTERIOR_COLOR_OPTIONS.some((opt) => opt.value === initial.toLowerCase())
    );
  });

  const engineDisplacementDisplay = useMemo(() => {
    if (!engineDisplacement) return "";
    const n = Number(engineDisplacement);
    if (!Number.isFinite(n) || n <= 0) return engineDisplacement;
    return displacementUnit === "cc" ? String(Math.round(n * 1000)) : String(n);
  }, [engineDisplacement, displacementUnit]);

  const engineDisplacementEquivalence = useMemo(() => {
    if (!engineDisplacement) return null;
    const n = Number(engineDisplacement);
    if (!Number.isFinite(n) || n <= 0) return null;
    const cc = Math.round(n * 1000);
    const litres = Math.round(n * 10) / 10;
    return `${cc} cc · ${litres.toFixed(1)} L`;
  }, [engineDisplacement]);

  const handleEngineDisplacementChange = (raw: string) => {
    if (!raw) {
      form.setValue("vehicleEngineDisplacement", "");
      return;
    }
    const normalized = raw.replace(",", ".");
    const n = Number(normalized);
    if (!Number.isFinite(n)) {
      // Conserve la saisie brute pour que la validation la rattrape.
      form.setValue("vehicleEngineDisplacement", normalized);
      return;
    }
    const litres = displacementUnit === "cc" ? n / 1000 : n;
    form.setValue("vehicleEngineDisplacement", String(litres));
  };

  // Lot 9.2 + 9.3 — Auto-title avec capitalisation officielle :
  // « {Marque officielle} {Modèle officiel} {Version} {Année} ».
  // Utilise getVehicleMakeLabel / getVehicleModelLabel pour convertir
  // « toyota » → « Toyota » et « rav4 » → « RAV4 ».
  const computedAutoTitle = useMemo(() => {
    const parts = [
      getVehicleMakeLabel(make).trim(),
      getVehicleModelLabel(make, model).trim(),
      year.trim(),
    ].filter(Boolean);
    return parts.join(" ").slice(0, 120);
  }, [make, model, year]);

  // Sync automatique : quand le flag est actif ET qu'au moins une source est
  // renseignée, on met à jour le titre. Ne clobbers plus le titre s'il a été
  // édité manuellement (flag = false).
  useEffect(() => {
    if (!autoTitleEnabled) return;
    if (!computedAutoTitle) return;
    if (computedAutoTitle === title) return;
    form.setValue("title", computedAutoTitle);
  }, [autoTitleEnabled, computedAutoTitle, title, form]);

  const handleTitleChange = (value: string) => {
    form.setValue("title", value);
    // L'utilisateur édite manuellement : désactiver l'auto-title si la valeur
    // diverge de ce que le système génèrerait.
    if (autoTitleEnabled && value !== computedAutoTitle) {
      setAutoTitleEnabled(false);
    }
  };

  const handleRegenerateTitle = () => {
    setAutoTitleEnabled(true);
    if (computedAutoTitle) {
      form.setValue("title", computedAutoTitle);
    }
  };

  // Hydration: when the form is reset with a brand outside AUTO_BRANDS
  // (e.g. edit mode loading a legacy listing with "BYD", "Xiaomi"…), switch
  // to custom-brand mode so the user sees the value in an editable input
  // instead of an empty dropdown trigger. Never auto-switches back to false:
  // the "Back to list" button owns that transition.
  useEffect(() => {
    if (useCustomBrand) return;
    const trimmed = make.trim();
    if (trimmed.length > 0 && !AUTO_BRANDS.includes(trimmed)) {
      setUseCustomBrand(true);
    }
  }, [make, useCustomBrand]);

  const capitalizeBrand = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const hasCustomExteriorColor =
    exteriorColor.trim().length > 0 &&
    !EXTERIOR_COLOR_OPTIONS.some((option) => option.value === exteriorColor.trim().toLowerCase());

  // Lot 9.4 — Plus de contrôle strict sur LISTING_EQUIPMENT_OPTIONS : les
  // valeurs legacy (Lot < 9.4, ex: "Climatisation") peuvent encore transiter
  // par selectedFeatures jusqu'à ce qu'elles soient migrées vers leur clé
  // snake_case. Le rendu UI les affiche dans « Autres (conservées) ».
  const toggleFeature = (f: string) => {
    const current = form.getValues("selectedFeatures");
    form.setValue(
      "selectedFeatures",
      current.includes(f) ? current.filter((x) => x !== f) : [...current, f],
    );
  };

  // Lot 9.4 — Icônes Lucide par groupe d'équipements (cf `iconName` du catalogue).
  const EQUIPMENT_ICONS: Record<ListingEquipmentIconName, LucideIcon> = {
    Armchair,
    Smartphone,
    Shield,
    Navigation,
    Sun,
    Package,
    Leaf,
  };

  // Classification sélection courante (Lot 9.4) : sépare les valeurs connues
  // (migrées vers snake_case) des valeurs legacy inconnues à préserver dans
  // la section « Autres (conservées) ». Memoisé pour éviter de recalculer à
  // chaque render.
  const classifiedEquipment = useMemo(
    () => classifyEquipmentValues(selectedFeatures),
    [selectedFeatures],
  );

  // 🔬 DEBUG TEMPORAIRE — à retirer après diagnostic Étape 2 stale
  // eslint-disable-next-line no-console
  console.log("[step2-debug] PublishDetailsSection render", {
    watch_title: form.watch("title"),
    watch_description: form.watch("description"),
    watch_priceMga: form.watch("priceMga"),
    getValues_title: form.getValues("title"),
    getValues_description: form.getValues("description"),
    getValues_priceMga: form.getValues("priceMga"),
    title_local_var: title,
    description_local_var: description,
    priceMga_local_var: priceMga,
  });

  return (
    <div className="space-y-5 form-surface">
      <section className="space-y-3 rounded-xl border border-border/75 bg-gradient-to-br from-card to-secondary/15 p-4">
        <div>
          <p className="font-serif text-base text-foreground">{t("publish.essentialInfoTitle", "Informations essentielles")}</p>
          <p className="mt-1 hidden sm:block font-sans text-[13px] text-muted-foreground leading-relaxed">
            {t("publish.essentialInfoDesc", "Commencez par les champs qui influencent le plus la compréhension et la conversion.")}
          </p>
        </div>
        <div className="space-y-2" data-field-error="title">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Label className="font-sans">{labels.listingTitle} *</Label>
            {!autoTitleEnabled && computedAutoTitle && (
              <button
                type="button"
                onClick={handleRegenerateTitle}
                className="inline-flex items-center gap-1 text-xs font-sans text-primary hover:underline"
              >
                {t("publish.regenerateAutoTitle", "Régénérer automatiquement")}
              </button>
            )}
          </div>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={() => void form.trigger("title")}
            className="font-sans"
            maxLength={120}
          />
          {form.formState.errors.title ? (
            <p className="text-xs font-sans text-destructive" role="alert">
              {String(form.formState.errors.title.message ?? "")}
            </p>
          ) : (
            <p className="hidden sm:block text-[13px] text-muted-foreground font-sans leading-relaxed">
              {autoTitleEnabled
                ? t("publish.titleAutoHint", "Généré automatiquement à partir de la marque, du modèle, de la version et de l’année.")
                : t("publish.titleExample", "Exemple: Toyota RAV4 2021 — automatique, 68 000 km")}
            </p>
          )}
        </div>
        <div className="space-y-2" data-field-error="description">
          <Label className="font-sans">{labels.descriptionFr} *</Label>
          <Textarea
            value={description}
            onChange={(e) => form.setValue("description", e.target.value)}
            onBlur={() => void form.trigger("description")}
            className="font-sans"
            rows={6}
            maxLength={5000}
            placeholder={t("publish.descriptionPlaceholderLong", "Rédigez une description complète en français…")}
          />
          <p className="text-[13px] text-muted-foreground font-sans">{t("publish.descriptionCounter", "{{count}}/5000 caractères", { count: description.trim().length })}</p>
          {form.formState.errors.description ? (
            <p className="text-xs font-sans text-destructive" role="alert">
              {String(form.formState.errors.description.message ?? "")}
            </p>
          ) : (
            <p className="hidden sm:block text-[13px] text-muted-foreground font-sans leading-relaxed">{t("publish.descriptionHint", "Incluez de préférence: carburant, boîte, état général et historique d’entretien.")}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-4">
          <div className="space-y-2" data-field-error="priceMga">
            <Label className="font-sans">Prix (Ar) *</Label>
            <NumberInput
              value={priceMga}
              onChange={(raw) => form.setValue("priceMga", raw)}
              onBlur={() => void form.trigger("priceMga")}
              className="font-sans"
            />
            {form.formState.errors.priceMga ? (
              <p className="text-xs font-sans text-destructive" role="alert">
                {String(form.formState.errors.priceMga.message ?? "")}
              </p>
            ) : null}
            {labels.priceDealHint ? (
              <p className="text-xs text-muted-foreground font-sans">{labels.priceDealHint}</p>
            ) : null}
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <Checkbox
                id="negotiable"
                checked={form.watch("negotiable")}
                onCheckedChange={(v) => form.setValue("negotiable", v === true)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium font-sans">
                  {t("listings.negotiable.label", "Prix négociable")}
                </span>
                <span className="block text-xs text-muted-foreground font-sans">
                  {t(
                    "listings.negotiable.description",
                    "Afficher un badge pour indiquer que vous acceptez la négociation",
                  )}
                </span>
              </span>
            </label>
          </div>
          <div className="space-y-2">
            <Label className="font-sans">{labels.mileageKmLabel} (km)</Label>
            <NumberInput
              value={mileageKmInput}
              onChange={(raw) => form.setValue("mileageKmInput", raw)}
              className="font-sans"
            />
          </div>
        </div>
      </section>

      {/* Bloc 2 — Identité véhicule (visible par défaut) */}
      <section className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
        <div>
          <p className="font-serif font-semibold text-sm">{t("publish.vehicleIdentityTitle", "Identité du véhicule")}</p>
          <p className="hidden sm:block text-[13px] text-muted-foreground font-sans mt-1 leading-relaxed">
            {t("publish.vehicleIdentityDesc", "Marque, modèle, année et version de votre véhicule.")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3.5 md:gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-2">
            <Label className="font-sans">Marque *</Label>
            {useCustomBrand ? (
              <>
                <Input
                  type="text"
                  value={make}
                  autoFocus
                  placeholder={t("publish.brandCustomPlaceholder", "Tapez la marque")}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^\p{L}\p{N}\s-]/gu, "");
                    form.setValue("vehicleMake", sanitized);
                  }}
                  onBlur={(e) => {
                    const capitalized = capitalizeBrand(e.target.value);
                    if (capitalized !== e.target.value) {
                      form.setValue("vehicleMake", capitalized);
                    }
                  }}
                  className="font-sans"
                  maxLength={40}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomBrand(false);
                    form.setValue("vehicleMake", "");
                    form.setValue("vehicleModel", "");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-sans text-primary hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  {t("publish.brandBackToList", "Choisir dans la liste")}
                </button>
              </>
            ) : (
              <Popover open={makeOpen} onOpenChange={setMakeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={makeOpen}
                    className={cn(
                      "w-full min-w-0 justify-between font-sans font-normal",
                      !make && "text-muted-foreground",
                    )}
                  >
                    {make ? (
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        {(() => {
                          const asset = resolveBrandAsset(make);
                          if (asset?.logoPath) {
                            return (
                              <img
                                src={asset.logoPath}
                                alt=""
                                className="h-4 w-6 object-contain shrink-0"
                                loading="lazy"
                              />
                            );
                          }
                          return null;
                        })()}
                        <span className="truncate">{make}</span>
                      </span>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-left">
                        {t("publish.brandPlaceholder", "Choisissez une marque")}
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder={t("publish.brandSearchPlaceholder", "Rechercher une marque…")}
                      className="h-9 font-sans"
                    />
                    <CommandList className="max-h-[280px]">
                      <CommandEmpty>
                        {t("publish.brandNoMatch", "Aucune marque trouvée.")}
                      </CommandEmpty>
                      <CommandGroup>
                        {AUTO_BRANDS.map((brand) => {
                          const asset = resolveBrandAsset(brand);
                          const isSelected = make === brand;
                          return (
                            <CommandItem
                              key={brand}
                              value={brand}
                              onSelect={(value) => {
                                const next = value === make ? "" : AUTO_BRANDS.find((b) => b.toLowerCase() === value.toLowerCase()) ?? value;
                                form.setValue("vehicleMake", next);
                                if (next !== make) {
                                  form.setValue("vehicleModel", "");
                                }
                                setMakeOpen(false);
                              }}
                              className="font-sans"
                            >
                              {asset?.logoPath ? (
                                <img src={asset.logoPath} alt="" className="mr-2 h-4 w-6 object-contain shrink-0" loading="lazy" />
                              ) : (
                                <span className="mr-2 h-4 w-6 shrink-0 inline-flex items-center justify-center rounded border border-border/70 bg-muted/50 text-[10px] font-serif font-bold text-muted-foreground">
                                  {brand.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <span className="flex-1 truncate">{brand}</span>
                              <Check className={cn("ml-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                    <CommandSeparator />
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          form.setValue("vehicleMake", "");
                          form.setValue("vehicleModel", "");
                          setMakeOpen(false);
                          setUseCustomBrand(true);
                        }}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm italic text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                      >
                        <Plus className="mr-2 h-4 w-4 shrink-0" />
                        <span>{t("publish.brandOtherOption", "Autre marque…")}</span>
                      </button>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="space-y-2">
            <Label className="font-sans">Modèle *</Label>
            <VehicleModelCombobox
              brand={make}
              value={model}
              onChange={(next) => form.setValue("vehicleModel", next)}
              placeholder={t("publish.modelPlaceholderWithBrand", "Modèle")}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-sans">Année</Label>
            <Input
              type="number"
              min={1950}
              max={2100}
              value={year}
              onChange={(e) => form.setValue("vehicleYear", e.target.value)}
              className="font-sans"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-sans">État</Label>
            <Select value={condition || EMPTY_OPTION} onValueChange={(v) => form.setValue("vehicleCondition", v === EMPTY_OPTION ? "" : v)}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder={t("publish.selectCondition", "Sélectionner un état")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_OPTION}>Non précisé</SelectItem>
                {CONDITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
      {/* Bloc 3 — Motorisation (visible par défaut) */}
      <section className="space-y-3 rounded-xl border border-border/75 bg-background/70 p-4">
        <div>
          <p className="font-serif font-semibold text-sm">{t("publish.motorizationTitle", "Motorisation")}</p>
          <p className="hidden sm:block text-[13px] text-muted-foreground font-sans mt-1 leading-relaxed">
            {t("publish.motorizationDesc", "Carburant, boîte, motricité et cylindrée.")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
          <div className="space-y-2">
            <Label className="font-sans">Carburant</Label>
            <Select value={fuel || EMPTY_OPTION} onValueChange={(v) => form.setValue("vehicleFuel", v === EMPTY_OPTION ? "" : v)}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder={t("publish.selectFuel", "Sélectionner un carburant")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_OPTION}>Non précisé</SelectItem>
                {FUEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-sans">Boîte</Label>
            <Select value={transmission || EMPTY_OPTION} onValueChange={(v) => form.setValue("vehicleTransmission", v === EMPTY_OPTION ? "" : v)}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder={t("publish.selectTransmission", "Sélectionner une boîte")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_OPTION}>Non précisé</SelectItem>
                {TRANSMISSION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-sans">Motricité</Label>
            <Select value={drivetrain || EMPTY_OPTION} onValueChange={(v) => form.setValue("vehicleDrivetrain", v === EMPTY_OPTION ? "" : v)}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder={t("publish.selectDrivetrain", "Sélectionner une motricité")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_OPTION}>Non précisé</SelectItem>
                {DRIVETRAIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-sans">{t("publish.engineDisplacement", "Cylindrée")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={displacementUnit === "cc" ? 50 : 0.05}
                max={displacementUnit === "cc" ? 20000 : 20}
                step={displacementUnit === "cc" ? "10" : "0.1"}
                value={engineDisplacementDisplay}
                onChange={(e) => handleEngineDisplacementChange(e.target.value)}
                className="font-sans flex-1"
                placeholder={
                  displacementUnit === "cc"
                    ? t("publish.engineDisplacementPlaceholderCc", "Ex : 1500")
                    : t("publish.engineDisplacementPlaceholderL", "Ex : 1.5")
                }
              />
              <Select value={displacementUnit} onValueChange={(v) => setDisplacementUnit(v as "cc" | "L")}>
                <SelectTrigger className="font-sans w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cc">cm³</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {engineDisplacementEquivalence && (
              <p className="text-xs text-muted-foreground font-sans">
                {t("publish.engineDisplacementEquivalence", "Équivalent : {{value}}", { value: engineDisplacementEquivalence })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bloc 4 — Carrosserie et configuration (visible par défaut) */}
      <section className="space-y-3 rounded-xl border border-border/75 bg-background/70 p-4">
        <div>
          <p className="font-serif font-semibold text-sm">{t("publish.configTitle", "Carrosserie et configuration")}</p>
          <p className="hidden sm:block text-[13px] text-muted-foreground font-sans mt-1 leading-relaxed">
            {t("publish.configDesc", "Portes, places et couleurs.")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
          <div className="space-y-2">
            <Label className="font-sans">{labels.doorsLabel}</Label>
            <Input
              type="number"
              min={0}
              value={doors}
              onChange={(e) => {
                form.setValue("vehicleDoors", e.target.value);
                form.setValue("doorsInput", e.target.value);
              }}
              className="font-sans"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-sans">{labels.seatsLabel}</Label>
            <Input
              type="number"
              min={0}
              value={seats}
              onChange={(e) => {
                form.setValue("vehicleSeats", e.target.value);
                form.setValue("seatsInput", e.target.value);
              }}
              className="font-sans"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-sans">{t("publish.exteriorColor", "Couleur extérieure")}</Label>
            <Select value={exteriorColor || EMPTY_OPTION} onValueChange={(v) => form.setValue("vehicleExteriorColor", v === EMPTY_OPTION ? "" : v)}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder={t("publish.selectExteriorColor", "Sélectionner une couleur")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_OPTION}>{t("publish.notSpecified", "Non précisé")}</SelectItem>
                {hasCustomExteriorColor && (
                  <SelectItem value={exteriorColor}>{exteriorColor}</SelectItem>
                )}
                {EXTERIOR_COLOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey, option.fallback)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-sans">{t("publish.interiorColor", "Couleur intérieure")}</Label>
            {useCustomInteriorColor ? (
              <div className="flex gap-2">
                <Input
                  value={interiorColor}
                  onChange={(e) => form.setValue("vehicleInteriorColor", e.target.value)}
                  className="font-sans flex-1"
                  placeholder={t("publish.interiorColorCustomPlaceholder", "Tapez une couleur")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUseCustomInteriorColor(false);
                    form.setValue("vehicleInteriorColor", "");
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Select
                value={interiorColor || EMPTY_OPTION}
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setUseCustomInteriorColor(true);
                    form.setValue("vehicleInteriorColor", "");
                    return;
                  }
                  form.setValue("vehicleInteriorColor", v === EMPTY_OPTION ? "" : v);
                }}
              >
                <SelectTrigger className="font-sans">
                  <SelectValue placeholder={t("publish.selectInteriorColor", "Sélectionner une couleur")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_OPTION}>{t("publish.notSpecified", "Non précisé")}</SelectItem>
                  {INTERIOR_COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey, option.fallback)}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">{t("publish.interiorColorOther", "Autre…")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </section>

      {/* Bloc 5 — État et disponibilité (visible par défaut) */}
      <section className="space-y-3 rounded-xl border border-border/75 bg-background/70 p-4">
        <div>
          <p className="font-serif font-semibold text-sm">{t("publish.availabilityTitle", "État et disponibilité")}</p>
        </div>
        <div className={cn("grid grid-cols-1 gap-3.5 md:gap-4", isRentalTransaction ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          <div className="space-y-2">
            <Label className="font-sans">Disponibilité</Label>
            <Select value={availabilityStatus || EMPTY_OPTION} onValueChange={(v) => form.setValue("vehicleAvailabilityStatus", v === EMPTY_OPTION ? "" : v)}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder={t("publish.selectAvailability", "Sélectionner une disponibilité")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_OPTION}>Non précisé</SelectItem>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isRentalTransaction && (
            <div className="space-y-2">
              <Label className="font-sans">Mode location</Label>
              <Select value={rentalMode || EMPTY_OPTION} onValueChange={(v) => form.setValue("vehicleRentalMode", v === EMPTY_OPTION ? "" : v)}>
                <SelectTrigger className="font-sans">
                  <SelectValue placeholder={t("publish.selectRentalMode", "Sélectionner un mode")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_OPTION}>Non précisé</SelectItem>
                  {RENTAL_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label className="font-sans">{t("publish.sellerTypeLabel", "Type vendeur")}</Label>
            {isAdmin ? (
              <Select value={sellerType || EMPTY_OPTION} onValueChange={(v) => form.setValue("vehicleSellerType", v === EMPTY_OPTION ? "" : v)}>
                <SelectTrigger className="font-sans">
                  <SelectValue placeholder={t("publish.selectSellerType", "Sélectionner un vendeur")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_OPTION}>Non précisé</SelectItem>
                  {SELLER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-sans text-muted-foreground" aria-readonly="true">
                  {sellerTypeLabel}
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  {t(
                    "publish.sellerTypeAutoHint",
                    "Défini automatiquement selon votre profil.",
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Bloc 6 — Équipements (Lot 9.4 : 7 groupes en accordéon) */}
      <section className="rounded-xl border border-border/70 bg-background/70">
        <button
          type="button"
          onClick={() => setShowEquipmentSection((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          aria-expanded={showEquipmentSection}
        >
          <div>
            <p className="font-serif text-sm text-foreground">{t("publish.equipmentTitle", "Équipements (optionnel)")}</p>
            <p className="mt-0.5 hidden sm:block font-sans text-[13px] text-muted-foreground leading-relaxed">
              {t("publish.equipmentDesc", "Ajouter des équipements augmente la visibilité de votre annonce.")}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showEquipmentSection ? "rotate-180" : ""}`} />
        </button>
        {showEquipmentSection && (
          <div className="border-t border-border/70 px-2 py-2">
            <Accordion type="multiple" defaultValue={["confort", "securite", "technologie"]}>
              {LISTING_EQUIPMENT_GROUPS.map((group) => {
                const Icon = group.iconName ? EQUIPMENT_ICONS[group.iconName] : null;
                const selectedInGroup = group.options.filter((o) =>
                  selectedFeatures.includes(o.value),
                ).length;
                return (
                  <AccordionItem key={group.id} value={group.id} className="border-border/60">
                    <AccordionTrigger className="px-2 py-3 hover:no-underline [&>svg]:shrink-0">
                      <div className="flex items-center gap-3 flex-1 pr-3 text-left">
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="font-sans font-medium text-sm text-foreground">{group.label}</span>
                        {selectedInGroup > 0 && (
                          <span className="ml-auto text-[11px] font-sans px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {selectedInGroup} sélectionné{selectedInGroup > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-1 pb-3 px-2">
                      {group.description && (
                        <p className="hidden sm:block text-[12px] font-sans text-muted-foreground mb-2">
                          {group.description}
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {group.options.map((option) => (
                          <label
                            key={option.value}
                            className="flex min-h-11 items-center gap-3 rounded-md border border-border/60 bg-background/60 px-3 py-1.5 cursor-pointer font-sans text-sm touch-manipulation hover:bg-muted/40"
                          >
                            <Checkbox
                              checked={selectedFeatures.includes(option.value)}
                              onCheckedChange={() => toggleFeature(option.value)}
                            />
                            <span className="truncate">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              {classifiedEquipment.legacyUnknown.length > 0 && (
                <AccordionItem value="legacy-preserved" className="border-border/60">
                  <AccordionTrigger className="px-2 py-3 hover:no-underline [&>svg]:shrink-0">
                    <div className="flex items-center gap-3 flex-1 pr-3 text-left">
                      <span className="font-sans font-medium text-sm text-foreground">
                        {t("publish.equipmentLegacyTitle", "Autres (conservées)")}
                      </span>
                      <span className="ml-auto text-[11px] font-sans px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {classifiedEquipment.legacyUnknown.length}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-3 px-2">
                    <p className="hidden sm:block text-[12px] font-sans text-muted-foreground mb-2">
                      {t(
                        "publish.equipmentLegacyDesc",
                        "Valeurs héritées d'une ancienne version du catalogue. Décochez-les pour les retirer de l'annonce.",
                      )}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {classifiedEquipment.legacyUnknown.map((value) => (
                        <label
                          key={value}
                          className="flex min-h-11 items-center gap-3 rounded-md border border-border/60 bg-background/60 px-3 py-1.5 cursor-pointer font-sans text-sm touch-manipulation hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={true}
                            onCheckedChange={() => toggleFeature(value)}
                          />
                          <span className="truncate">{getEquipmentOptionLabel(value)}</span>
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}
      </section>

      {/* Bloc 7 — Informations complémentaires (collapsible) */}
      <section className="rounded-xl border border-border/70 bg-background/70">
        <button
          type="button"
          onClick={() => setShowComplementaryInfo((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          aria-expanded={showComplementaryInfo}
        >
          <div>
            <p className="font-serif text-sm text-foreground">{t("publish.complementaryTitle", "Informations complémentaires (optionnel)")}</p>
            <p className="mt-0.5 hidden sm:block font-sans text-[13px] text-muted-foreground leading-relaxed">
              {t("publish.complementaryDesc", "Notes libres et caractéristiques additionnelles.")}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showComplementaryInfo ? "rotate-180" : ""}`} />
        </button>
        {showComplementaryInfo && (
          <div className="space-y-3 border-t border-border/70 px-4 py-4">
            <div className="space-y-2">
              <Label className="font-sans">{t("publish.otherFeaturesTitle", "Autres caractéristiques")}</Label>
              <Textarea
                value={customFeaturesInput}
                onChange={(e) => form.setValue("customFeaturesInput", e.target.value)}
                className="font-sans"
                rows={3}
                placeholder={t("publish.otherFeaturesPlaceholder", "Ex: Suspension adaptative, sièges ventilés, affichage tête haute...")}
              />
              <p className="text-[13px] text-muted-foreground font-sans leading-relaxed">
                {t("publish.otherFeaturesHint", "Séparez les éléments par des virgules pour ajouter plusieurs caractéristiques.")}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
