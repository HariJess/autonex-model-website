import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
];

const AVAILABILITY_OPTIONS = [
  { value: "disponible", label: "Disponible" },
  { value: "reserve", label: "Réservé" },
  { value: "vendu", label: "Vendu" },
  { value: "en_arrivage", label: "En arrivage" },
];

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
  interiorColor: string;
  availabilityStatus: string;
  whatsappPhone: string;
  isElectric: boolean;
  isHybrid: boolean;
  selectedFeatures: string[];
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
  onInteriorColorChange: (value: string) => void;
  onAvailabilityStatusChange: (value: string) => void;
  onWhatsappPhoneChange: (value: string) => void;
  onElectricChange: (value: boolean) => void;
  onHybridChange: (value: boolean) => void;
  onToggleFeature: (feature: string) => void;
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
  interiorColor,
  availabilityStatus,
  whatsappPhone,
  isElectric,
  isHybrid,
  selectedFeatures,
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
  onInteriorColorChange,
  onAvailabilityStatusChange,
  onWhatsappPhoneChange,
  onElectricChange,
  onHybridChange,
  onToggleFeature,
}: PublishDetailsSectionProps) {
  return (
    <div className="space-y-4.5 form-surface">
      <div className="space-y-2">
        <Label className="font-sans">{labels.listingTitle} *</Label>
        <Input value={title} onChange={(e) => onTitleChange(e.target.value)} className="font-sans" maxLength={120} />
        <p className="text-xs text-muted-foreground font-sans">Exemple: Toyota RAV4 2021 — automatique, 68 000 km</p>
      </div>
      <div className="space-y-2">
        <Label className="font-sans">{labels.descriptionFr} *</Label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="font-sans"
          rows={6}
          maxLength={5000}
          placeholder="Rédigez une description complète en français…"
        />
        <p className="text-xs text-muted-foreground font-sans">{description.trim().length}/5000 — min. 40 caractères</p>
        <p className="text-xs text-muted-foreground font-sans">Incluez de préférence: carburant, boîte, état général et historique d’entretien.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        <div className="space-y-2">
          <Label className="font-sans">Marque *</Label>
          <Input value={make} onChange={(e) => onMakeChange(e.target.value)} className="font-sans" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Modèle *</Label>
          <Input value={model} onChange={(e) => onModelChange(e.target.value)} className="font-sans" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Année</Label>
          <Input type="number" min={1950} max={2100} value={year} onChange={(e) => onYearChange(e.target.value)} className="font-sans" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">État</Label>
          <Select value={condition || EMPTY_OPTION} onValueChange={(v) => onConditionChange(v === EMPTY_OPTION ? "" : v)}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder="Sélectionner un état" />
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
      <div className={`grid ${showRooms ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"} gap-3.5 md:gap-4`}>
        <div className="space-y-2">
          <Label className="font-sans">Prix (Ar) *</Label>
          <Input type="number" value={priceMga} onChange={(e) => onPriceMgaChange(e.target.value)} className="font-sans" min={0} />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.listingSurface} (km)</Label>
          <Input type="number" value={surface} onChange={(e) => onSurfaceChange(e.target.value)} className="font-sans" min={0} />
        </div>
        {showRooms && (
          <>
            <div className="space-y-2">
              <Label className="font-sans">{labels.listingRooms}</Label>
              <Input type="number" value={rooms} onChange={(e) => onRoomsChange(e.target.value)} className="font-sans" min={0} placeholder="0=Base, 1=Confort..." />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{labels.listingBathrooms}</Label>
              <Input type="number" value={bathrooms} onChange={(e) => onBathroomsChange(e.target.value)} className="font-sans" min={0} placeholder="Nombre de portes" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{labels.toilets}</Label>
              <Input type="number" value={toilets} onChange={(e) => onToiletsChange(e.target.value)} className="font-sans" min={0} />
            </div>
          </>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        <div className="space-y-2">
          <Label className="font-sans">Carburant</Label>
          <Select value={fuel || EMPTY_OPTION} onValueChange={(v) => onFuelChange(v === EMPTY_OPTION ? "" : v)}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder="Sélectionner un carburant" />
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
              <SelectValue placeholder="Sélectionner une boîte" />
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
              <SelectValue placeholder="Sélectionner une motricité" />
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
              <SelectValue placeholder="Sélectionner un vendeur" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        <div className="space-y-2">
          <Label className="font-sans">Carrosserie</Label>
          <Select value={bodyStyle || EMPTY_OPTION} onValueChange={(v) => onBodyStyleChange(v === EMPTY_OPTION ? "" : v)}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder="Sélectionner une carrosserie" />
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
              <SelectValue placeholder="Sélectionner un mode" />
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
        <div className="space-y-2">
          <Label className="font-sans">Portes</Label>
          <Input type="number" min={0} value={doors} onChange={(e) => onDoorsChange(e.target.value)} className="font-sans" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Places</Label>
          <Input type="number" min={0} value={seats} onChange={(e) => onSeatsChange(e.target.value)} className="font-sans" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="font-sans">Couleur extérieure</Label>
          <Input value={exteriorColor} onChange={(e) => onExteriorColorChange(e.target.value)} className="font-sans" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Couleur intérieure</Label>
          <Input value={interiorColor} onChange={(e) => onInteriorColorChange(e.target.value)} className="font-sans" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Disponibilité</Label>
          <Select value={availabilityStatus || EMPTY_OPTION} onValueChange={(v) => onAvailabilityStatusChange(v === EMPTY_OPTION ? "" : v)}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder="Sélectionner une disponibilité" />
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
    </div>
  );
}

