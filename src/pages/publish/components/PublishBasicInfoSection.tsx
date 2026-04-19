import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import LocationPicker from "@/components/LocationPicker";
import PublishLocationMap from "@/components/PublishLocationMap";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TransactionType, ListingType } from "@/types/listing";
import {
  AUTO_SEARCH_VEHICLE_TYPE_OPTIONS,
  inferVehicleTypeOptionIdFromFilters,
} from "@/data/automotiveCatalog";
import { listingTypesForTransaction } from "@/lib/listingRules";
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
  const vehicleBodyStyle = form.watch("vehicleBodyStyle");
  const vehicleFuel = form.watch("vehicleFuel");

  const typeOptions = useMemo(() => listingTypesForTransaction(transaction), [transaction]);

  const vehicleTypeOptions = useMemo(() => {
    const allowed = new Set(typeOptions);
    return AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.filter((option) => {
      if (!option.listingTypes?.length) return true;
      return option.listingTypes.some((listingTypeOption) => allowed.has(listingTypeOption as ListingType));
    });
  }, [typeOptions]);

  const vehicleTypeId = useMemo(() => {
    if (vehicleBodyStyle && vehicleTypeOptions.some((opt) => opt.id === vehicleBodyStyle)) {
      return vehicleBodyStyle;
    }
    const inferred = inferVehicleTypeOptionIdFromFilters({
      types: listingType ? [listingType] : [],
      modelQuery: vehicleBodyStyle,
      fuels: vehicleFuel ? [vehicleFuel] : [],
    });
    if (inferred && vehicleTypeOptions.some((opt) => opt.id === inferred)) {
      return inferred;
    }
    return "";
  }, [vehicleBodyStyle, vehicleTypeOptions, listingType, vehicleFuel]);

  const handleTransactionChange = (v: TransactionType) => {
    form.setValue("transaction", v);
    const currentListingType = form.getValues("listingType");
    const allowed = new Set(listingTypesForTransaction(v));
    form.setValue(
      "listingType",
      allowed.has(currentListingType as ListingType) ? currentListingType : "",
    );
    const currentBodyStyle = form.getValues("vehicleBodyStyle");
    if (currentBodyStyle) {
      const nextOptions = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.filter((option) => {
        if (!option.listingTypes?.length) return true;
        const allowedInner = new Set(listingTypesForTransaction(v));
        return option.listingTypes.some((listingTypeOption) =>
          allowedInner.has(listingTypeOption as ListingType),
        );
      });
      form.setValue(
        "vehicleBodyStyle",
        nextOptions.some((option) => option.id === currentBodyStyle) ? currentBodyStyle : "",
      );
    }
  };

  const handleVehicleTypeChange = (vehicleTypeIdInput: string) => {
    const option = AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.find((entry) => entry.id === vehicleTypeIdInput);
    const allowed = new Set(typeOptions);
    const mappedType =
      option?.listingTypes?.find((entry) => allowed.has(entry as ListingType)) ?? null;

    form.setValue("vehicleBodyStyle", vehicleTypeIdInput);
    if (mappedType) {
      form.setValue("listingType", mappedType as ListingType);
    } else if (!listingType) {
      form.setValue("listingType", typeOptions[0] ?? "");
    }
    if (option?.fuels?.length) {
      form.setValue("vehicleFuel", option.fuels[0]);
      const isElectric = option.fuels.includes("Électrique");
      const isHybrid = option.fuels.some((fuelOption) => fuelOption.includes("Hybride"));
      form.setValue("vehicleIsElectric", isElectric);
      form.setValue("vehicleIsHybrid", isHybrid);
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
          <Select value={vehicleTypeId} onValueChange={handleVehicleTypeChange} disabled={!transaction}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder={labels.select} />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypeOptions.map((typeOption) => (
                <SelectItem key={typeOption.id} value={typeOption.id}>
                  {typeOption.label}
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
          <p className="font-serif font-semibold text-sm text-foreground">{labels.listingLocationTitle} *</p>
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
          <h3 className="font-serif font-semibold text-base text-foreground">{labels.mapTitle} *</h3>
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
