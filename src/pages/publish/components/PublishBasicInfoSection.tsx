import { useFormContext } from "react-hook-form";
import LocationPicker from "@/components/LocationPicker";
import PublishLocationMap from "@/components/PublishLocationMap";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleTypeCombobox } from "@/components/listings/VehicleTypeCombobox";
import type { TransactionType } from "@/types/listing";
import { AUTO_SEARCH_VEHICLE_TYPE_OPTIONS } from "@/data/automotiveCatalog";
import { normalizeVehicleType } from "@/data/vehicleTypes";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import type { PublishFormValues } from "@/pages/publish/publishFormSchema";

type PublishBasicInfoSectionProps = {
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
    sell: string;
    rent: string;
    shortTermRental: string;
    transactionHint: string;
    transactionType: string;
    listingLocationTitle: string;
    listingLocationHint: string;
  };
};

/**
 * Step 0 of the publish flow — transaction kind, vehicle type, location.
 *
 * Phase 6.4.b: form-aware via useFormContext. The 12 fields it reads/writes
 * (transaction, listingType, isNewProgram, internalRef, location quartet,
 * pin coords, plus vehicleBodyStyle/vehicleFuel for cascade resets) are all
 * accessed through the parent FormProvider — no value props from PublishPage.
 *
 * Cascade handlers (transaction → reset listingType + vehicleBodyStyle if
 * incompatible; vehicleType → set listingType + fuel + electric/hybrid) live
 * here too, since they are 100% form-local.
 */
export function PublishBasicInfoSection({ labels }: PublishBasicInfoSectionProps) {
  const form = useFormContext<PublishFormValues>();
  const transaction = form.watch("transaction");
  const listingType = form.watch("listingType");
  const isNewProgram = form.watch("isNewProgram");
  const internalRef = form.watch("internalRef");
  const ville = form.watch("ville");
  const arrondissement = form.watch("arrondissement");
  const quartier = form.watch("quartier");
  const quartierLibre = form.watch("quartierLibre");
  const pinLat = form.watch("pinLat");
  const pinLng = form.watch("pinLng");
  const handleTransactionChange = (v: TransactionType) => {
    form.setValue("transaction", v);
    // Legacy rule: the immobilier value "terrain" (land) cannot be rented.
    // Kept for backward compat with existing listings; free-text vehicle
    // types (pickup, suv, moto, …) are preserved across transaction changes.
    const currentListingType = form.getValues("listingType");
    if (
      currentListingType === "terrain" &&
      (v === "location" || v === "location_vacances")
    ) {
      form.setValue("listingType", "");
    }
  };

  return (
    <div className="space-y-5 form-surface">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-sans">{labels.transactionType} *</Label>
          <Select value={transaction} onValueChange={(v) => handleTransactionChange(v as TransactionType)}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder={labels.select} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vente">{labels.sell}</SelectItem>
              <SelectItem value="location">{labels.rent}</SelectItem>
              <SelectItem value="location_vacances">{labels.shortTermRental}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground font-sans">{labels.transactionHint}</p>
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.propertyType} *</Label>
          <VehicleTypeCombobox
            value={listingType}
            onChange={(next) => {
              const normalized = normalizeVehicleType(next);
              form.setValue("listingType", normalized);
              // Mirror into vehicleBodyStyle so downstream code using body-style
              // (search, SEO, cascades) keeps a value. Preserves match with
              // AUTO_SEARCH_VEHICLE_TYPE_OPTIONS ids when they line up.
              form.setValue("vehicleBodyStyle", normalized);
              // Best-effort fuel preset when the chosen type maps to a catalog
              // option with fuels (électrique / hybride).
              const option = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.find((entry) => entry.id === normalized);
              if (option?.fuels?.length) {
                form.setValue("vehicleFuel", option.fuels[0]);
                form.setValue("vehicleIsElectric", option.fuels.includes("Électrique"));
                form.setValue(
                  "vehicleIsHybrid",
                  option.fuels.some((fuelOption) => fuelOption.includes("Hybride")),
                );
              }
            }}
            disabled={!transaction}
            placeholder={labels.select}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-border/90 bg-muted/30 px-4 py-3.5 shadow-sm">
        <div className="min-w-0">
          <p className="font-sans font-semibold text-sm text-foreground">{labels.newProgram}</p>
          <p className="text-xs text-muted-foreground font-sans mt-0.5">{labels.newProgramHint}</p>
        </div>
        <Switch
          checked={isNewProgram}
          onCheckedChange={(v) => form.setValue("isNewProgram", v)}
          className="shrink-0"
        />
      </div>
      <div className="space-y-2">
        <Label className="font-sans">{labels.internalRef}</Label>
        <Input
          value={internalRef}
          onChange={(e) => form.setValue("internalRef", e.target.value)}
          className="font-sans"
          maxLength={80}
          placeholder="REF-2026-042"
        />
      </div>
      <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 px-4 py-4">
        <div>
          <p className="font-sans font-semibold text-sm text-foreground">{labels.listingLocationTitle} *</p>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            {labels.listingLocationHint}
          </p>
        </div>
        <LocationPicker
          ville={ville}
          arrondissement={arrondissement}
          quartier={quartier}
          quartierLibre={quartierLibre}
          onVilleChange={(v) => form.setValue("ville", v)}
          onArrondissementChange={(v) => form.setValue("arrondissement", v)}
          onQuartierChange={(v) => form.setValue("quartier", v)}
          onQuartierLibreChange={(v) => form.setValue("quartierLibre", v)}
        />
      </div>
      <div className="border-t-2 border-border/80 pt-6 mt-1">
        <div className="form-surface-muted space-y-3">
          <h3 className="font-sans font-semibold text-base text-foreground">{labels.mapTitle} *</h3>
          <p className="text-xs text-muted-foreground font-sans">{labels.mapPublicHint}</p>
          {!ville ? (
            <p className="text-sm text-muted-foreground font-sans">{labels.mapNeedVille}</p>
          ) : pinLat != null && pinLng != null && isValidListingCoordinates(pinLat, pinLng) ? (
            <PublishLocationMap
              key={ville}
              lat={pinLat}
              lng={pinLng}
              onPositionChange={(la, ln) => {
                form.setValue("pinLat", la);
                form.setValue("pinLng", ln);
              }}
            />
          ) : (
            <p className="text-sm text-destructive font-sans">{labels.mapNoCoordsForCity}</p>
          )}
        </div>
      </div>
    </div>
  );
}
