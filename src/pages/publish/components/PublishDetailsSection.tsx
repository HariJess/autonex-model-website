import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AUTO_BRANDS } from "@/data/automotiveCatalog";
import { EXTERIOR_COLOR_OPTIONS } from "@/lib/vehicleAttributes";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

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

const BRAND_MODEL_HINTS: Record<string, string[]> = {
  Toyota: ["Hilux", "RAV4", "Land Cruiser", "Corolla", "Yaris"],
  Nissan: ["Navara", "Patrol", "X-Trail", "Qashqai", "Sunny"],
  Hyundai: ["Tucson", "Santa Fe", "i10", "i20", "Creta"],
  Kia: ["Sportage", "Sorento", "Picanto", "Seltos"],
  Suzuki: ["Swift", "Vitara", "Jimny", "Ertiga"],
  Mitsubishi: ["L200", "Pajero", "Outlander"],
  Ford: ["Ranger", "Everest", "Focus"],
  Renault: ["Duster", "Kwid", "Clio"],
  Peugeot: ["208", "3008", "Boxer"],
  Volkswagen: ["Polo", "Golf", "Amarok", "Tiguan"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "Sprinter"],
  BMW: ["X3", "X5", "320i"],
  Audi: ["A3", "A4", "Q5"],
  Honda: ["CR-V", "Civic", "HR-V"],
};

type PublishDetailsSectionProps = {
  showRooms: boolean;
  title: string;
  description: string;
  priceMga: string;
  surface: string;
  rooms: string;
  bathrooms: string;
  toilets: string;
  make: string;
  model: string;
  year: string;
  fuel: string;
  transmission: string;
  drivetrain: string;
  condition: string;
  sellerType: string;
  rentalMode: string;
  bodyStyle: string;
  doors: string;
  seats: string;
  exteriorColor: string;
  engineDisplacement: string;
  interiorColor: string;
  availabilityStatus: string;
  whatsappPhone: string;
  isElectric: boolean;
  isHybrid: boolean;
  selectedFeatures: string[];
  customFeaturesInput: string;
  equipmentOptions: string[];
  labels: {
    listingTitle: string;
    descriptionFr: string;
    listingSurface: string;
    listingRooms: string;
    listingBathrooms: string;
    toilets: string;
    listingFeatures: string;
  };
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriceMgaChange: (value: string) => void;
  onSurfaceChange: (value: string) => void;
  onRoomsChange: (value: string) => void;
  onBathroomsChange: (value: string) => void;
  onToiletsChange: (value: string) => void;
  onMakeChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onFuelChange: (value: string) => void;
  onTransmissionChange: (value: string) => void;
  onDrivetrainChange: (value: string) => void;
  onConditionChange: (value: string) => void;
  onSellerTypeChange: (value: string) => void;
  onRentalModeChange: (value: string) => void;
  onBodyStyleChange: (value: string) => void;
  onDoorsChange: (value: string) => void;
  onSeatsChange: (value: string) => void;
  onExteriorColorChange: (value: string) => void;
  onEngineDisplacementChange: (value: string) => void;
  onInteriorColorChange: (value: string) => void;
  onAvailabilityStatusChange: (value: string) => void;
  onWhatsappPhoneChange: (value: string) => void;
  onElectricChange: (value: boolean) => void;
  onHybridChange: (value: boolean) => void;
  onToggleFeature: (feature: string) => void;
  onCustomFeaturesInputChange: (value: string) => void;
};

export function PublishDetailsSection({
  showRooms,
  title,
  description,
  priceMga,
  surface,
  rooms,
  bathrooms,
  toilets,
  make,
  model,
  year,
  fuel,
  transmission,
  drivetrain,
  condition,
  sellerType,
  rentalMode,
  bodyStyle,
  doors,
  seats,
  exteriorColor,
  engineDisplacement,
  interiorColor,
  availabilityStatus,
  whatsappPhone,
  isElectric,
  isHybrid,
  selectedFeatures,
  customFeaturesInput,
  equipmentOptions,
  labels,
  onTitleChange,
  onDescriptionChange,
  onPriceMgaChange,
  onSurfaceChange,
  onRoomsChange,
  onBathroomsChange,
  onToiletsChange,
  onMakeChange,
  onModelChange,
  onYearChange,
  onFuelChange,
  onTransmissionChange,
  onDrivetrainChange,
  onConditionChange,
  onSellerTypeChange,
  onRentalModeChange,
  onBodyStyleChange,
  onDoorsChange,
  onSeatsChange,
  onExteriorColorChange,
  onEngineDisplacementChange,
  onInteriorColorChange,
  onAvailabilityStatusChange,
  onWhatsappPhoneChange,
  onElectricChange,
  onHybridChange,
  onToggleFeature,
  onCustomFeaturesInputChange,
}: PublishDetailsSectionProps) {
  const { t } = useTranslation();
  const modelSuggestions = BRAND_MODEL_HINTS[make] ?? [];
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const hasCustomExteriorColor =
    exteriorColor.trim().length > 0 &&
    !EXTERIOR_COLOR_OPTIONS.some((option) => option.value === exteriorColor.trim().toLowerCase());

  return (
    <div className="space-y-5 form-surface">
      <section className="space-y-3 rounded-xl border border-border/75 bg-gradient-to-br from-card to-secondary/15 p-4">
        <div>
          <p className="font-serif text-base text-foreground">{t("publish.essentialInfoTitle", "Informations essentielles")}</p>
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            {t("publish.essentialInfoDesc", "Commencez par les champs qui influencent le plus la compréhension et la conversion.")}
          </p>
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.listingTitle} *</Label>
        <Input value={title} onChange={(e) => onTitleChange(e.target.value)} className="font-sans" maxLength={120} />
        <p className="text-xs text-muted-foreground font-sans">{t("publish.titleExample", "Exemple: Toyota RAV4 2021 — automatique, 68 000 km")}</p>
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.descriptionFr} *</Label>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="font-sans"
            rows={6}
            maxLength={5000}
            placeholder={t("publish.descriptionPlaceholderLong", "Rédigez une description complète en français…")}
          />
          <p className="text-xs text-muted-foreground font-sans">{t("publish.descriptionCounter", "{{count}}/5000 — min. 40 caractères", { count: description.trim().length })}</p>
          <p className="text-xs text-muted-foreground font-sans">{t("publish.descriptionHint", "Incluez de préférence: carburant, boîte, état général et historique d’entretien.")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-4">
          <div className="space-y-2">
            <Label className="font-sans">Prix (Ar) *</Label>
            <Input type="number" value={priceMga} onChange={(e) => onPriceMgaChange(e.target.value)} className="font-sans" min={0} />
          </div>
          <div className="space-y-2">
            <Label className="font-sans">{labels.listingSurface} (km)</Label>
            <Input type="number" value={surface} onChange={(e) => onSurfaceChange(e.target.value)} className="font-sans" min={0} />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
        <div>
          <p className="font-serif font-semibold text-sm">{t("publish.vehicleIdentityTitle", "Identité véhicule")}</p>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            {t("publish.vehicleIdentityDesc", "Choisissez une marque référencée AutoNex, puis précisez le modèle.")}
          </p>
        </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        <div className="space-y-2">
          <Label className="font-sans">Marque *</Label>
          <Input
            list="publish-brand-options"
            value={make}
            onChange={(e) => onMakeChange(e.target.value)}
            className="font-sans"
            placeholder={t("publish.brandPlaceholder", "Ex: Toyota, Nissan, Hyundai...")}
          />
          <datalist id="publish-brand-options">
            {AUTO_BRANDS.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Modèle *</Label>
          <Input
            list="publish-model-hints"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="font-sans"
            placeholder={make ? t("publish.modelPlaceholderWithBrand", "Modèle {{brand}}", { brand: make }) : t("publish.modelPlaceholder", "Ex: RAV4, Hilux, Ranger...")}
          />
          <datalist id="publish-model-hints">
            {modelSuggestions.map((modelHint) => (
              <option key={modelHint} value={modelHint} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Année</Label>
          <Input type="number" min={1950} max={2100} value={year} onChange={(e) => onYearChange(e.target.value)} className="font-sans" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">État</Label>
          <Select value={condition || EMPTY_OPTION} onValueChange={(v) => onConditionChange(v === EMPTY_OPTION ? "" : v)}>
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
          <p className="text-xs text-muted-foreground font-sans mt-1">
            {t("publish.mainFeaturesDesc", "Ces éléments aident les acheteurs à filtrer rapidement votre annonce.")}
          </p>
        </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        <div className="space-y-2">
          <Label className="font-sans">Portes</Label>
          <Input type="number" min={0} value={doors} onChange={(e) => onDoorsChange(e.target.value)} className="font-sans" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Places</Label>
          <Input type="number" min={0} value={seats} onChange={(e) => onSeatsChange(e.target.value)} className="font-sans" />
        </div>
      </div>
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4 rounded-xl border border-border/70 bg-background/70 p-4">
        <div className="space-y-2">
          <Label className="font-sans">Carburant</Label>
          <Select value={fuel || EMPTY_OPTION} onValueChange={(v) => onFuelChange(v === EMPTY_OPTION ? "" : v)}>
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
          <Select value={transmission || EMPTY_OPTION} onValueChange={(v) => onTransmissionChange(v === EMPTY_OPTION ? "" : v)}>
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
          <Select value={drivetrain || EMPTY_OPTION} onValueChange={(v) => onDrivetrainChange(v === EMPTY_OPTION ? "" : v)}>
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
          <Select value={sellerType || EMPTY_OPTION} onValueChange={(v) => onSellerTypeChange(v === EMPTY_OPTION ? "" : v)}>
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
            <p className="mt-0.5 font-sans text-xs text-muted-foreground">
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
                  <Input value={rooms} onChange={(e) => onRoomsChange(e.target.value)} className="font-sans" />
                </div>
                <div className="space-y-2">
                  <Label className="font-sans">{labels.listingBathrooms}</Label>
                  <Input value={bathrooms} onChange={(e) => onBathroomsChange(e.target.value)} className="font-sans" />
                </div>
                <div className="space-y-2">
                  <Label className="font-sans">{labels.toilets}</Label>
                  <Input value={toilets} onChange={(e) => onToiletsChange(e.target.value)} className="font-sans" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-4">
              <div className="space-y-2">
                <Label className="font-sans">Carrosserie</Label>
                <Select value={bodyStyle || EMPTY_OPTION} onValueChange={(v) => onBodyStyleChange(v === EMPTY_OPTION ? "" : v)}>
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
                <Select value={rentalMode || EMPTY_OPTION} onValueChange={(v) => onRentalModeChange(v === EMPTY_OPTION ? "" : v)}>
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
                <Select value={exteriorColor || EMPTY_OPTION} onValueChange={(v) => onExteriorColorChange(v === EMPTY_OPTION ? "" : v)}>
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
                  onChange={(e) => onEngineDisplacementChange(e.target.value)}
                  className="font-sans"
                  placeholder={t("publish.engineDisplacementPlaceholder", "Ex: 1.5")}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-sans">{t("publish.interiorColor", "Couleur intérieure")}</Label>
                <Input value={interiorColor} onChange={(e) => onInteriorColorChange(e.target.value)} className="font-sans" />
              </div>
              <div className="space-y-2">
                <Label className="font-sans">Disponibilité</Label>
                <Select value={availabilityStatus || EMPTY_OPTION} onValueChange={(v) => onAvailabilityStatusChange(v === EMPTY_OPTION ? "" : v)}>
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
                <Input value={whatsappPhone} onChange={(e) => onWhatsappPhoneChange(e.target.value)} className="font-sans" placeholder="+261..." />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border/70 px-4 py-3">
              <label className="inline-flex items-center gap-2 font-sans text-sm">
                <Switch checked={isElectric} onCheckedChange={onElectricChange} />
                Électrique
              </label>
              <label className="inline-flex items-center gap-2 font-sans text-sm">
                <Switch checked={isHybrid} onCheckedChange={onHybridChange} />
                Hybride
              </label>
            </div>
          </div>
        )}
      </section>
      <div className="space-y-2">
        <Label className="font-sans">{labels.listingFeatures}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {equipmentOptions.map((f) => (
            <label key={f} className="flex items-center gap-2 cursor-pointer font-sans text-sm">
              <Checkbox checked={selectedFeatures.includes(f)} onCheckedChange={() => onToggleFeature(f)} />
              {f}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="font-sans">{t("publish.otherFeaturesTitle", "Autres caractéristiques (optionnel)")}</Label>
        <Textarea
          value={customFeaturesInput}
          onChange={(e) => onCustomFeaturesInputChange(e.target.value)}
          className="font-sans"
          rows={3}
          placeholder={t("publish.otherFeaturesPlaceholder", "Ex: Suspension adaptative, sièges ventilés, affichage tête haute...")}
        />
        <p className="text-xs text-muted-foreground font-sans">
          {t("publish.otherFeaturesHint", "Séparez les éléments par des virgules pour ajouter plusieurs caractéristiques.")}
        </p>
      </div>
    </div>
  );
}

