import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUTO_BRANDS } from "@/data/automotiveCatalog";
import { resolveBrandAsset } from "@/data/brandAssets";
import { EXTERIOR_COLOR_OPTIONS } from "@/lib/vehicleAttributes";
import { LISTING_EQUIPMENT_OPTIONS } from "@/data/listing-equipment";
import { LISTING_TYPES_WITH_TRIM_AND_DOORS_FIELDS, type ListingType } from "@/types/listing";
import { useState } from "react";
import { Check, ChevronDown, ChevronsUpDown } from "lucide-react";
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

const BODY_STYLE_OPTIONS = [
  { value: "citadine", label: "Citadine" },
  { value: "berline", label: "Berline" },
  { value: "suv_4x4", label: "SUV / 4x4" },
  { value: "crossover", label: "Crossover" },
  { value: "pick_up", label: "Pick-up" },
  { value: "coupe", label: "Coupé" },
  { value: "cabriolet", label: "Cabriolet" },
  { value: "utilitaire_leger", label: "Utilitaire léger" },
  { value: "van_fourgon", label: "Van / Fourgon" },
  { value: "minibus_bus", label: "Minibus / Bus" },
  { value: "camion", label: "Camion" },
  { value: "moto", label: "Moto" },
  { value: "scooter", label: "Scooter" },
  { value: "quad", label: "Quad" },
  { value: "buggy", label: "Buggy" },
  { value: "electrique", label: "Électrique" },
  { value: "hybride", label: "Hybride" },
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
    listingSurface: string;
    listingRooms: string;
    listingBathrooms: string;
    toilets: string;
    listingFeatures: string;
    priceDealHint?: string;
  };
  /**
   * Legacy mirror callback (parent-owned). When the user edits km / doors /
   * seats, the parent updates the legacy DB columns surface / bathrooms /
   * toilets. The function lives in PublishPage so the legacy mapping logic
   * stays in a single place (see docs/AUTONEX_LEGACY_SCHEMA.md).
   */
  onApplyVehicleLegacyMirror: (inputs: {
    mileageKmInput?: string;
    doorsInput?: string;
    seatsInput?: string;
  }) => void;
};

/**
 * Step 1 of the publish flow — title, description, pricing, vehicle attributes,
 * equipment selection.
 *
 * Phase 6.4.c: form-aware via useFormContext. Reads/writes 27 form fields
 * directly through the parent FormProvider; only `labels` and the legacy
 * mirror callback are passed as props.
 *
 * The two `useState` (showAdvancedDetails, showAllEquipment) are local UI
 * state (collapse panes), unrelated to the form schema.
 */
export function PublishDetailsSection({ labels, onApplyVehicleLegacyMirror }: PublishDetailsSectionProps) {
  const { t } = useTranslation();
  const form = useFormContext<PublishFormValues>();
  const title = form.watch("title");
  const description = form.watch("description");
  const priceMga = form.watch("priceMga");
  const surface = form.watch("surface");
  const rooms = form.watch("rooms");
  const bathrooms = form.watch("bathrooms");
  const toilets = form.watch("toilets");
  const make = form.watch("vehicleMake");
  const model = form.watch("vehicleModel");
  const year = form.watch("vehicleYear");
  const fuel = form.watch("vehicleFuel");
  const transmission = form.watch("vehicleTransmission");
  const drivetrain = form.watch("vehicleDrivetrain");
  const condition = form.watch("vehicleCondition");
  const sellerType = form.watch("vehicleSellerType");
  const rentalMode = form.watch("vehicleRentalMode");
  const bodyStyle = form.watch("vehicleBodyStyle");
  const doors = form.watch("vehicleDoors");
  const seats = form.watch("vehicleSeats");
  const exteriorColor = form.watch("vehicleExteriorColor");
  const engineDisplacement = form.watch("vehicleEngineDisplacement");
  const interiorColor = form.watch("vehicleInteriorColor");
  const availabilityStatus = form.watch("vehicleAvailabilityStatus");
  const whatsappPhone = form.watch("vehicleWhatsappPhone");
  const isElectric = form.watch("vehicleIsElectric");
  const isHybrid = form.watch("vehicleIsHybrid");
  const selectedFeatures = form.watch("selectedFeatures");
  const customFeaturesInput = form.watch("customFeaturesInput");
  const listingType = form.watch("listingType");

  const showRooms =
    listingType === "" || LISTING_TYPES_WITH_TRIM_AND_DOORS_FIELDS.includes(listingType as ListingType);

  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showAllEquipment, setShowAllEquipment] = useState(false);
  const [makeOpen, setMakeOpen] = useState(false);
  const hasCustomExteriorColor =
    exteriorColor.trim().length > 0 &&
    !EXTERIOR_COLOR_OPTIONS.some((option) => option.value === exteriorColor.trim().toLowerCase());

  const toggleFeature = (f: string) => {
    if (!LISTING_EQUIPMENT_OPTIONS.includes(f)) return;
    const current = form.getValues("selectedFeatures");
    form.setValue(
      "selectedFeatures",
      current.includes(f) ? current.filter((x) => x !== f) : [...current, f],
    );
  };

  return (
    <div className="space-y-5 form-surface">
      <section className="space-y-3 rounded-xl border border-border/75 bg-gradient-to-br from-card to-secondary/15 p-4">
        <div>
          <p className="font-serif text-base text-foreground">{t("publish.essentialInfoTitle", "Informations essentielles")}</p>
          <p className="mt-1 hidden sm:block font-sans text-[13px] text-muted-foreground leading-relaxed">
            {t("publish.essentialInfoDesc", "Commencez par les champs qui influencent le plus la compréhension et la conversion.")}
          </p>
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.listingTitle} *</Label>
          <Input value={title} onChange={(e) => form.setValue("title", e.target.value)} className="font-sans" maxLength={120} />
          <p className="hidden sm:block text-[13px] text-muted-foreground font-sans leading-relaxed">{t("publish.titleExample", "Exemple: Toyota RAV4 2021 — automatique, 68 000 km")}</p>
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.descriptionFr} *</Label>
          <Textarea
            value={description}
            onChange={(e) => form.setValue("description", e.target.value)}
            className="font-sans"
            rows={6}
            maxLength={5000}
            placeholder={t("publish.descriptionPlaceholderLong", "Rédigez une description complète en français…")}
          />
          <p className="text-[13px] text-muted-foreground font-sans">{t("publish.descriptionCounter", "{{count}}/5000 — min. 40 caractères", { count: description.trim().length })}</p>
          <p className="hidden sm:block text-[13px] text-muted-foreground font-sans leading-relaxed">{t("publish.descriptionHint", "Incluez de préférence: carburant, boîte, état général et historique d’entretien.")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-4">
          <div className="space-y-2">
            <Label className="font-sans">Prix (Ar) *</Label>
            <NumberInput value={priceMga} onChange={(raw) => form.setValue("priceMga", raw)} className="font-sans" />
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
            <Label className="font-sans">{labels.listingSurface} (km)</Label>
            <NumberInput
              value={surface}
              onChange={(raw) => onApplyVehicleLegacyMirror({ mileageKmInput: raw })}
              className="font-sans"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
        <div>
          <p className="font-serif font-semibold text-sm">{t("publish.vehicleIdentityTitle", "Identité véhicule")}</p>
          <p className="hidden sm:block text-[13px] text-muted-foreground font-sans mt-1 leading-relaxed">
            {t("publish.vehicleIdentityDesc", "Choisissez une marque référencée AutoNex, puis précisez le modèle.")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
          <div className="space-y-2">
            <Label className="font-sans">Marque *</Label>
            <Popover open={makeOpen} onOpenChange={setMakeOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={makeOpen}
                  className={cn(
                    "w-full justify-between font-sans font-normal",
                    !make && "text-muted-foreground",
                  )}
                >
                  {make ? (
                    <span className="flex items-center gap-2 min-w-0">
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
                    <span>{t("publish.brandPlaceholder", "Ex: Toyota, Nissan, Hyundai...")}</span>
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
                  <CommandList className="max-h-[300px]">
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
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label className="font-sans">Modèle *</Label>
            <Input
              type="text"
              value={model}
              onChange={(e) => form.setValue("vehicleModel", e.target.value)}
              className="font-sans"
              disabled={!make}
              placeholder={
                make
                  ? t("publish.modelPlaceholderWithBrand", "Modèle {{brand}}", { brand: make })
                  : t("publish.modelPlaceholderNoBrand", "Choisissez d'abord une marque")
              }
              autoComplete="off"
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
      <section className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
        <div>
          <p className="font-serif font-semibold text-sm">{t("publish.mainFeaturesTitle", "Caractéristiques principales")}</p>
          <p className="hidden sm:block text-[13px] text-muted-foreground font-sans mt-1 leading-relaxed">
            {t("publish.mainFeaturesDesc", "Ces éléments aident les acheteurs à filtrer rapidement votre annonce.")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
          <div className="space-y-2">
            <Label className="font-sans">Portes</Label>
            <Input
              type="number"
              min={0}
              value={doors}
              onChange={(e) => {
                form.setValue("vehicleDoors", e.target.value);
                onApplyVehicleLegacyMirror({ doorsInput: e.target.value });
              }}
              className="font-sans"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-sans">Places</Label>
            <Input
              type="number"
              min={0}
              value={seats}
              onChange={(e) => {
                form.setValue("vehicleSeats", e.target.value);
                onApplyVehicleLegacyMirror({ seatsInput: e.target.value });
              }}
              className="font-sans"
            />
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4 rounded-xl border border-border/70 bg-background/70 p-4">
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
          <Label className="font-sans">Type vendeur</Label>
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
        </div>
      </div>
      <section className="rounded-xl border border-border/70 bg-background/70">
        <button
          type="button"
          onClick={() => setShowAdvancedDetails((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          aria-expanded={showAdvancedDetails}
        >
          <div>
            <p className="font-serif text-sm text-foreground">{t("publish.advancedInfoTitle", "Informations avancées (optionnel)")}</p>
            <p className="mt-0.5 hidden sm:block font-sans text-[13px] text-muted-foreground leading-relaxed">
              {t("publish.advancedInfoDesc", "Ajoutez ces détails pour affiner la qualité de votre annonce.")}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvancedDetails ? "rotate-180" : ""}`} />
        </button>
        {showAdvancedDetails && (
          <div className="space-y-4 border-t border-border/70 px-4 py-4">
            {showRooms && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="font-sans">{labels.listingRooms}</Label>
                  <Input value={rooms} onChange={(e) => form.setValue("rooms", e.target.value)} className="font-sans" />
                </div>
                <div className="space-y-2">
                  <Label className="font-sans">{labels.listingBathrooms}</Label>
                  <Input value={bathrooms} onChange={(e) => form.setValue("bathrooms", e.target.value)} className="font-sans" />
                </div>
                <div className="space-y-2">
                  <Label className="font-sans">{labels.toilets}</Label>
                  <Input value={toilets} onChange={(e) => form.setValue("toilets", e.target.value)} className="font-sans" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-4">
              <div className="space-y-2">
                <Label className="font-sans">Carrosserie</Label>
                <Select value={bodyStyle || EMPTY_OPTION} onValueChange={(v) => form.setValue("vehicleBodyStyle", v === EMPTY_OPTION ? "" : v)}>
                  <SelectTrigger className="font-sans">
                    <SelectValue placeholder={t("publish.selectBodyStyle", "Sélectionner une carrosserie")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_OPTION}>Non précisé</SelectItem>
                    {BODY_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
                <Label className="font-sans">{t("publish.engineDisplacement", "Cylindrée (L)")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  step="0.1"
                  value={engineDisplacement}
                  onChange={(e) => form.setValue("vehicleEngineDisplacement", e.target.value)}
                  className="font-sans"
                  placeholder={t("publish.engineDisplacementPlaceholder", "Ex: 1.5")}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-sans">{t("publish.interiorColor", "Couleur intérieure")}</Label>
                <Input value={interiorColor} onChange={(e) => form.setValue("vehicleInteriorColor", e.target.value)} className="font-sans" />
              </div>
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
              <div className="space-y-2">
                <Label className="font-sans">WhatsApp (optionnel)</Label>
                <Input
                  value={whatsappPhone}
                  onChange={(e) => form.setValue("vehicleWhatsappPhone", e.target.value)}
                  className="font-sans"
                  placeholder="+261..."
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border/70 px-4 py-3">
              <label className="inline-flex items-center gap-2 font-sans text-sm">
                <Switch checked={isElectric} onCheckedChange={(v) => form.setValue("vehicleIsElectric", v)} />
                Électrique
              </label>
              <label className="inline-flex items-center gap-2 font-sans text-sm">
                <Switch checked={isHybrid} onCheckedChange={(v) => form.setValue("vehicleIsHybrid", v)} />
                Hybride
              </label>
            </div>
          </div>
        )}
      </section>
      <div className="space-y-2">
        <Label className="font-sans">{labels.listingFeatures}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(showAllEquipment ? LISTING_EQUIPMENT_OPTIONS : LISTING_EQUIPMENT_OPTIONS.slice(0, 8)).map((f) => (
            <label key={f} className="flex min-h-11 items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 cursor-pointer font-sans text-sm touch-manipulation">
              <Checkbox checked={selectedFeatures.includes(f)} onCheckedChange={() => toggleFeature(f)} />
              {f}
            </label>
          ))}
        </div>
        {LISTING_EQUIPMENT_OPTIONS.length > 8 && (
          <button
            type="button"
            className="sm:hidden text-xs font-sans text-primary"
            onClick={() => setShowAllEquipment((prev) => !prev)}
          >
            {showAllEquipment ? t("search.showLess", "Voir moins") : t("search.showMore", "Voir plus")}
          </button>
        )}
      </div>
      <div className="space-y-2">
        <Label className="font-sans">{t("publish.otherFeaturesTitle", "Autres caractéristiques (optionnel)")}</Label>
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
  );
}
