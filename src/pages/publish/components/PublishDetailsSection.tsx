import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
          <Input value={condition} onChange={(e) => onConditionChange(e.target.value)} className="font-sans" placeholder="neuf / occasion / importé" />
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
          <Input value={fuel} onChange={(e) => onFuelChange(e.target.value)} className="font-sans" placeholder="Essence, Diesel..." />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Boîte</Label>
          <Input value={transmission} onChange={(e) => onTransmissionChange(e.target.value)} className="font-sans" placeholder="Manuelle / Automatique" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Motricité</Label>
          <Input value={drivetrain} onChange={(e) => onDrivetrainChange(e.target.value)} className="font-sans" placeholder="4x2 / 4x4 / AWD" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Type vendeur</Label>
          <Input value={sellerType} onChange={(e) => onSellerTypeChange(e.target.value)} className="font-sans" placeholder="particulier / concessionnaire" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        <div className="space-y-2">
          <Label className="font-sans">Carrosserie</Label>
          <Input value={bodyStyle} onChange={(e) => onBodyStyleChange(e.target.value)} className="font-sans" placeholder="SUV, berline, pick-up..." />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">Mode location</Label>
          <Input value={rentalMode} onChange={(e) => onRentalModeChange(e.target.value)} className="font-sans" placeholder="court terme / longue durée" />
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
          <Input value={availabilityStatus} onChange={(e) => onAvailabilityStatusChange(e.target.value)} className="font-sans" placeholder="disponible / réservé" />
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

