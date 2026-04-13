import LocationPicker from "@/components/LocationPicker";
import PublishLocationMap from "@/components/PublishLocationMap";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ListingType, TransactionType } from "@/types/listing";
import { LISTING_TYPE_LABELS } from "@/types/listing";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";

type PublishBasicInfoSectionProps = {
  transaction: TransactionType | "";
  listingType: ListingType | "";
  typeOptions: ListingType[];
  isNewProgram: boolean;
  internalRef: string;
  ville: string;
  arrondissement: string;
  quartier: string;
  quartierLibre: string;
  pinLat: number | null;
  pinLng: number | null;
  labels: {
    propertyType: string;
    newProgram: string;
    newProgramHint: string;
    internalRef: string;
    mapTitle: string;
    mapPublicHint: string;
    mapNeedVille: string;
    mapNoCoordsForCity: string;
    select: string;
    sale: string;
    rental: string;
    vacationRental: string;
  };
  onTransactionChange: (value: TransactionType) => void;
  onListingTypeChange: (value: ListingType) => void;
  onNewProgramChange: (value: boolean) => void;
  onInternalRefChange: (value: string) => void;
  onVilleChange: (value: string) => void;
  onArrondissementChange: (value: string) => void;
  onQuartierChange: (value: string) => void;
  onQuartierLibreChange: (value: string) => void;
  onMapPositionChange: (lat: number, lng: number) => void;
};

export function PublishBasicInfoSection({
  transaction,
  listingType,
  typeOptions,
  isNewProgram,
  internalRef,
  ville,
  arrondissement,
  quartier,
  quartierLibre,
  pinLat,
  pinLng,
  labels,
  onTransactionChange,
  onListingTypeChange,
  onNewProgramChange,
  onInternalRefChange,
  onVilleChange,
  onArrondissementChange,
  onQuartierChange,
  onQuartierLibreChange,
  onMapPositionChange,
}: PublishBasicInfoSectionProps) {
  return (
    <div className="space-y-5 form-surface">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-sans">Transaction *</Label>
          <Select value={transaction} onValueChange={(v) => onTransactionChange(v as TransactionType)}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder={labels.select} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vente">{labels.sale}</SelectItem>
              <SelectItem value="location">{labels.rental}</SelectItem>
              <SelectItem value="location_vacances">{labels.vacationRental}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.propertyType} *</Label>
          <Select value={listingType} onValueChange={(v) => onListingTypeChange(v as ListingType)} disabled={!transaction}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder={labels.select} />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {LISTING_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-border/90 bg-muted/30 px-4 py-3.5 shadow-sm">
        <div className="min-w-0">
          <p className="font-sans font-semibold text-sm text-foreground">{labels.newProgram}</p>
          <p className="text-xs text-muted-foreground font-sans mt-0.5">{labels.newProgramHint}</p>
        </div>
        <Switch checked={isNewProgram} onCheckedChange={onNewProgramChange} className="shrink-0" />
      </div>
      <div className="space-y-2">
        <Label className="font-sans">{labels.internalRef}</Label>
        <Input value={internalRef} onChange={(e) => onInternalRefChange(e.target.value)} className="font-sans" maxLength={80} placeholder="REF-2026-042" />
      </div>
      <LocationPicker
        ville={ville}
        arrondissement={arrondissement}
        quartier={quartier}
        quartierLibre={quartierLibre}
        onVilleChange={onVilleChange}
        onArrondissementChange={onArrondissementChange}
        onQuartierChange={onQuartierChange}
        onQuartierLibreChange={onQuartierLibreChange}
      />
      <div className="border-t-2 border-border/80 pt-6 mt-1">
        <div className="form-surface-muted space-y-3">
          <h3 className="font-serif font-semibold text-base text-foreground">{labels.mapTitle}</h3>
          <p className="text-xs text-muted-foreground font-sans">{labels.mapPublicHint}</p>
          {!ville ? (
            <p className="text-sm text-muted-foreground font-sans">{labels.mapNeedVille}</p>
          ) : pinLat != null && pinLng != null && isValidListingCoordinates(pinLat, pinLng) ? (
            <PublishLocationMap key={ville} lat={pinLat} lng={pinLng} onPositionChange={onMapPositionChange} />
          ) : (
            <p className="text-sm text-destructive font-sans">{labels.mapNoCoordsForCity}</p>
          )}
        </div>
      </div>
    </div>
  );
}

