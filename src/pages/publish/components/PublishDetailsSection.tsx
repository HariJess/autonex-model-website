import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  onToggleFeature,
}: PublishDetailsSectionProps) {
  return (
    <div className="space-y-4 form-surface">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className={`grid ${showRooms ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"} gap-4`}>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

