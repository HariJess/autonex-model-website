import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import LocationSelector from "@/components/LocationSelector";
import BudgetRangeSlider from "@/components/BudgetRangeSlider";
import { X } from "lucide-react";
import { LISTING_TYPES, LISTING_TYPES_WITHOUT_ROOM_FILTERS, type ListingType } from "@/types/listing";
import { listingTypesForTransaction } from "@/lib/listingRules";
import type { SearchFilters } from "@/types/search";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";
import { cn } from "@/lib/utils";
import {
  AUTO_SEARCH_VEHICLE_TYPE_OPTIONS,
  AUTO_BRAND_GROUPS,
  AUTO_SEARCH_CONDITION_OPTIONS,
  AUTO_SEARCH_DRIVETRAIN_OPTIONS,
  AUTO_SEARCH_FUEL_OPTIONS,
  AUTO_SEARCH_SELLER_OPTIONS,
  AUTO_SEARCH_TRANSMISSION_OPTIONS,
} from "@/data/automotiveCatalog";
import BrandLogo from "@/components/BrandLogo";

export type { SearchFilters };

const SURFACE_SLIDER_MAX = 1000;

const EQUIPMENTS = [
  "Boîte automatique", "Caméra de recul", "Bluetooth", "GPS intégré",
  "Toit ouvrant", "4x4", "Climatisation", "Faible kilométrage",
];
const FUEL_OPTIONS = [...AUTO_SEARCH_FUEL_OPTIONS];
const GEAR_OPTIONS = [...AUTO_SEARCH_TRANSMISSION_OPTIONS];
const DRIVE_OPTIONS = [...AUTO_SEARCH_DRIVETRAIN_OPTIONS];
const CONDITION_OPTIONS = AUTO_SEARCH_CONDITION_OPTIONS.map((label) => ({
  value: label.toLowerCase(),
  label,
}));
const SELLER_OPTIONS = AUTO_SEARCH_SELLER_OPTIONS.map((label) => ({
  value: label.toLowerCase(),
  label,
}));
const VEHICLE_TYPE_PREVIEW_IDS = new Set([
  "citadine",
  "berline",
  "suv_4x4",
  "pick_up",
  "utilitaire_leger",
  "moto",
]);

function summarizeTypeSelection(labels: string[]): string {
  if (labels.length === 0) return "Tous types";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]}, ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} +${labels.length - 2}`;
}

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (f: SearchFilters) => void;
  onClose?: () => void;
  isMobile?: boolean;
  /** Mobile sheet: commit draft to URL and close */
  onMobileApply?: () => void;
  /** Prefix radio/checkbox ids when two sidebars mount (desktop + sheet) */
  idPrefix?: string;
}

const FilterSidebar = ({ filters, onFiltersChange, onClose, isMobile, onMobileApply, idPrefix = "" }: FilterSidebarProps) => {
  const pid = idPrefix ? `${idPrefix}-` : "";
  const { t } = useTranslation();
  const [showAllVehicleTypes, setShowAllVehicleTypes] = useState(false);

  const update = (partial: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const toggleInArray = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const toggleInNumArray = (arr: number[], item: number) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const resetFilters = () => {
    onFiltersChange({ ...EMPTY_SEARCH_FILTERS });
  };

  const mobileApply = () => {
    onMobileApply?.();
  };

  const withoutRoomsSet = new Set<string>(LISTING_TYPES_WITHOUT_ROOM_FILTERS);
  const hasResidentialType =
    filters.types.length === 0 ||
    filters.types.some((tp) => !withoutRoomsSet.has(tp));

  const surfaceSliderRight =
    filters.surfaceMax === 0
      ? SURFACE_SLIDER_MAX
      : Math.min(filters.surfaceMax, SURFACE_SLIDER_MAX);

  const typeOptions = useMemo(() => AUTO_SEARCH_VEHICLE_TYPE_OPTIONS, []);
  const allowedListingTypes = useMemo(
    () => new Set(listingTypesForTransaction(filters.transaction)),
    [filters.transaction],
  );
  const selectedVehicleTypeIds = filters.vehicleTypes;
  const defaultOpenSections = useMemo(() => {
    return ["transaction", "type", "location", "budget"];
  }, []);
  const selectedTypesOutsidePreview = useMemo(
    () => typeOptions.filter((opt) => selectedVehicleTypeIds.includes(opt.id) && !VEHICLE_TYPE_PREVIEW_IDS.has(opt.id)),
    [typeOptions, selectedVehicleTypeIds],
  );
  const selectedVehicleTypeLabels = useMemo(
    () => typeOptions.filter((opt) => selectedVehicleTypeIds.includes(opt.id)).map((opt) => opt.label),
    [typeOptions, selectedVehicleTypeIds],
  );
  const hasHiddenVehicleTypes = typeOptions.some((opt) => !VEHICLE_TYPE_PREVIEW_IDS.has(opt.id));
  const visibleVehicleTypeOptions = useMemo(() => {
    if (showAllVehicleTypes) return typeOptions;
    const preview = typeOptions.filter((opt) => VEHICLE_TYPE_PREVIEW_IDS.has(opt.id));
    if (selectedTypesOutsidePreview.length > 0) {
      return [...preview, ...selectedTypesOutsidePreview];
    }
    return preview;
  }, [showAllVehicleTypes, typeOptions, selectedTypesOutsidePreview]);

  const setTransaction = (v: string) => {
    const tr = v === "all" ? "" : v;
    const allowed = new Set(listingTypesForTransaction(tr));
    const vehicleTypes = filters.vehicleTypes.filter((vehicleTypeId) => {
      const option = typeOptions.find((opt) => opt.id === vehicleTypeId);
      if (!option?.listingTypes?.length) return true;
      return option.listingTypes.some((tp) => allowed.has(tp as ListingType));
    });
    const types = filters.types.filter((t) => allowed.has(t as ListingType));
    onFiltersChange({ ...filters, transaction: tr, vehicleTypes, types });
  };

  const setVehicleTypes = (vehicleTypeIds: string[]) => {
    const mappedTypes = Array.from(
      new Set(
        typeOptions
          .filter((opt) => vehicleTypeIds.includes(opt.id))
          .flatMap((opt) => opt.listingTypes ?? [])
          .filter((tp) => allowedListingTypes.has(tp as ListingType)),
      ),
    );
    onFiltersChange({
      ...filters,
      vehicleTypes: vehicleTypeIds,
      types: mappedTypes,
    });
  };

  const filterBody = (
      <div className={cn("bg-gradient-to-br from-card via-card to-secondary/15 rounded-2xl border border-border/75 overflow-hidden", isMobile && "shadow-sm")}>
        <Accordion type="multiple" defaultValue={defaultOpenSections} className="w-full">
          <AccordionItem value="transaction" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>{t("search.transaction", "Transaction")}</AccordionTrigger>
            <AccordionContent className="pb-3">
              <RadioGroup value={filters.transaction || "all"} onValueChange={setTransaction}>
                <div className={cn("flex items-center gap-3", isMobile ? "min-h-11 py-1" : "py-0.5")}>
                  <RadioGroupItem value="all" id={`${pid}tr-all`} className={isMobile ? "shrink-0" : undefined} />
                  <Label htmlFor={`${pid}tr-all`} className="font-sans text-sm cursor-pointer flex-1 py-1">{t("search.allTransactions", "Toutes")}</Label>
                </div>
                {[
                  { value: "vente", label: t("transaction.sale", "Acheter") },
                  { value: "location", label: t("transaction.rent", "Location longue durée") },
                  { value: "location_vacances", label: t("transaction.vacation", "Location courte durée") },
                ].map((opt) => (
                  <div key={opt.value} className={cn("flex items-center gap-3", isMobile ? "min-h-11 py-1" : "py-0.5")}>
                    <RadioGroupItem value={opt.value} id={`${pid}tr-${opt.value}`} />
                    <Label htmlFor={`${pid}tr-${opt.value}`} className="font-sans text-sm cursor-pointer flex-1 py-1">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="type" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>{t("search.propertyType", "Type de véhicule")}</AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <div className="space-y-1">
                <label className={cn("flex items-center gap-3 cursor-pointer touch-manipulation", isMobile ? "min-h-11 py-1" : "py-0.5")}>
                  <Checkbox
                    checked={selectedVehicleTypeIds.length === 0}
                    onCheckedChange={() => setVehicleTypes([])}
                    className={isMobile ? "h-4 w-4" : undefined}
                  />
                  <span className="font-sans text-sm flex-1">Tous types</span>
                </label>
                {visibleVehicleTypeOptions.map((vehicleTypeOption) => (
                  <label key={vehicleTypeOption.id} className={cn("flex items-center gap-3 cursor-pointer touch-manipulation", isMobile ? "min-h-11 py-1" : "py-0.5")}>
                    <Checkbox
                      checked={selectedVehicleTypeIds.includes(vehicleTypeOption.id)}
                      onCheckedChange={() => {
                        const next = selectedVehicleTypeIds.includes(vehicleTypeOption.id)
                          ? selectedVehicleTypeIds.filter((id) => id !== vehicleTypeOption.id)
                          : [...selectedVehicleTypeIds, vehicleTypeOption.id];
                        setVehicleTypes(next);
                      }}
                      className={isMobile ? "h-4 w-4" : undefined}
                    />
                    <span className="font-sans text-sm flex-1">{vehicleTypeOption.label}</span>
                  </label>
                ))}
              </div>
              {!showAllVehicleTypes && selectedVehicleTypeLabels.length > 0 && (
                <p className="text-xs text-muted-foreground font-sans">
                  {selectedVehicleTypeLabels.length >= 3
                    ? `${selectedVehicleTypeLabels.length} types sélectionnés`
                    : `Sélection active: ${summarizeTypeSelection(selectedVehicleTypeLabels)}`}
                </p>
              )}
              {hasHiddenVehicleTypes && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-1 font-sans text-xs text-primary hover:text-primary"
                  onClick={() => setShowAllVehicleTypes((prev) => !prev)}
                >
                  {showAllVehicleTypes ? "Voir moins" : "Voir plus"}
                </Button>
              )}
              {filters.transaction && typeOptions.length < LISTING_TYPES.length && (
                <p className="text-xs text-muted-foreground font-sans pt-1">{t("search.terrainNotForRent", "Certaines catégories ne sont pas disponibles pour ce type d’annonce.")}</p>
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="brand" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>
              Marque
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              {AUTO_BRAND_GROUPS.map((group) => (
                <div key={group.group} className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-sans">{group.group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.brands.slice(0, 12).map((brand) => (
                      <Button
                        key={brand}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 gap-1.5 px-2.5 text-xs",
                          filters.brands.includes(brand) ? "border-primary bg-primary/10 text-primary" : "",
                        )}
                        onClick={() => update({ brands: toggleInArray(filters.brands, brand) })}
                      >
                        <BrandLogo
                          brand={brand}
                          className="h-6 w-8 rounded-sm bg-background"
                          imgClassName="max-h-4"
                          labelClassName="text-[9px]"
                        />
                        {brand}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              <Input
                value={filters.modelQuery}
                onChange={(e) => update({ modelQuery: e.target.value })}
                placeholder="Modèle (ex: RAV4, Hilux, NMAX...)"
                className="font-sans text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min={1950} max={2100} value={filters.yearMin || ""} onChange={(e) => update({ yearMin: Number(e.target.value) || 0 })} placeholder="Année min" className="font-sans text-sm" />
                <Input type="number" min={1950} max={2100} value={filters.yearMax || ""} onChange={(e) => update({ yearMax: Number(e.target.value) || 0 })} placeholder="Année max" className="font-sans text-sm" />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="location" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>{t("search.location", "Localisation")}</AccordionTrigger>
            <AccordionContent className="pb-3">
              <LocationSelector
                mode="apply"
                variant={isMobile ? "sheet" : "default"}
                hideApplyRow={isMobile}
                suppressApplyToast={isMobile}
                committed={{
                  ville: filters.ville,
                  arrondissements: filters.arrondissements,
                  quartiers: filters.quartiers,
                  quartierLibre: filters.quartierLibre,
                }}
                onCommit={(v) =>
                  update({
                    ville: v.ville,
                    arrondissements: v.arrondissements,
                    quartiers: v.quartiers,
                    quartierLibre: v.quartierLibre,
                  })
                }
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="budget" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>{t("search.budget", "Budget")}</AccordionTrigger>
            <AccordionContent className="pb-3">
              <BudgetRangeSlider
                transaction={filters.transaction}
                minValue={filters.priceMin}
                maxValue={filters.priceMax}
                onMinChange={(v) => update({ priceMin: v })}
                onMaxChange={(v) => update({ priceMax: v })}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="surface" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>{t("search.surface", "Kilométrage")}</AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-sans">
                  {t("search.surfaceHint", "Glissez le maximum à droite pour élargir le kilométrage.")}
                </p>
                <Slider
                  min={0}
                  max={SURFACE_SLIDER_MAX}
                  step={10}
                  value={[filters.surfaceMin, surfaceSliderRight]}
                  onValueChange={([min, max]) => {
                    const nextMax =
                      max >= SURFACE_SLIDER_MAX
                        ? filters.surfaceMax > SURFACE_SLIDER_MAX
                          ? filters.surfaceMax
                          : 0
                        : max;
                    update({ surfaceMin: min, surfaceMax: nextMax });
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={filters.surfaceMin || ""}
                    onChange={(e) => update({ surfaceMin: Number(e.target.value) || 0 })}
                    placeholder={t("search.min", "Min")}
                    className={cn("font-sans text-sm", isMobile && "min-h-12")}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={filters.surfaceMax || ""}
                    onChange={(e) => update({ surfaceMax: Number(e.target.value) || 0 })}
                    placeholder={t("search.max", "Max")}
                    className={cn("font-sans text-sm", isMobile && "min-h-12")}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {hasResidentialType && (
            <AccordionItem value="rooms" className="border-b border-border px-4">
              <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>{t("listing.rooms", "Version")}</AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="flex flex-wrap gap-2">
                  {[{ label: "Base", value: 0 }, { label: "Confort", value: 1 }, { label: "Premium", value: 2 }, { label: "Sport", value: 3 }, { label: "4x4", value: 4 }, { label: "Luxe", value: 5 }].map((r) => (
                    <Button
                      key={r.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "font-sans touch-manipulation",
                        isMobile ? "min-h-11 px-4 text-sm" : "text-xs h-8 px-3",
                        filters.rooms.includes(r.value) ? "border-primary bg-primary/10 text-primary" : "",
                      )}
                      onClick={() => update({ rooms: toggleInNumArray(filters.rooms, r.value) })}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {hasResidentialType && (
            <AccordionItem value="bathrooms" className="border-b border-border px-4">
              <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>{t("listing.bathrooms", "Portes")}</AccordionTrigger>
              <AccordionContent className="pb-3">
                <p className="text-xs text-muted-foreground font-sans mb-2">{t("search.bathroomsHint", "« 4+ » inclut les véhicules avec au moins 4 portes.")}</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((b) => (
                    <Button
                      key={b}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "font-sans touch-manipulation",
                        isMobile ? "min-h-11 min-w-[2.75rem] px-3 text-sm" : "text-xs h-8 px-3",
                        filters.bathrooms.includes(b) ? "border-primary bg-primary/10 text-primary" : "",
                      )}
                      onClick={() => update({ bathrooms: toggleInNumArray(filters.bathrooms, b) })}
                    >
                      {b}{b === 4 ? "+" : ""}
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="equipment" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>{t("listing.features", "Équipements")}</AccordionTrigger>
            <AccordionContent className="pb-3 space-y-1">
              <p className="text-xs text-muted-foreground font-sans mb-2">{t("search.equipmentHint", "Correspondance sur les équipements renseignés dans l’annonce (recherche souple).")}</p>
              {EQUIPMENTS.map((eq) => (
                <label key={eq} className={cn("flex items-center gap-3 cursor-pointer touch-manipulation", isMobile ? "min-h-11 py-1" : "py-0.5")}>
                  <Checkbox
                    checked={filters.equipments.includes(eq)}
                    onCheckedChange={() => update({ equipments: toggleInArray(filters.equipments, eq) })}
                    className={isMobile ? "h-4 w-4" : undefined}
                  />
                  <span className="font-sans text-sm">{eq}</span>
                </label>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="fuel" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>
              Carburant
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="flex flex-wrap gap-2">
                {FUEL_OPTIONS.map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("font-sans touch-manipulation", filters.fuels.includes(opt) ? "border-primary bg-primary/10 text-primary" : "")}
                    onClick={() => update({ fuels: toggleInArray(filters.fuels, opt) })}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="gear" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>
              Boîte
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="flex flex-wrap gap-2">
                {GEAR_OPTIONS.map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("font-sans touch-manipulation", filters.transmissions.includes(opt) ? "border-primary bg-primary/10 text-primary" : "")}
                    onClick={() => update({ transmissions: toggleInArray(filters.transmissions, opt) })}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="drive" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>
              Motricité
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="flex flex-wrap gap-2">
                {DRIVE_OPTIONS.map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("font-sans touch-manipulation", filters.drivetrains.includes(opt) ? "border-primary bg-primary/10 text-primary" : "")}
                    onClick={() => update({ drivetrains: toggleInArray(filters.drivetrains, opt) })}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="condition" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>
              État
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="flex flex-wrap gap-2">
                {CONDITION_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("font-sans touch-manipulation", filters.conditions.includes(opt.value) ? "border-primary bg-primary/10 text-primary" : "")}
                    onClick={() => update({ conditions: toggleInArray(filters.conditions, opt.value) })}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="seller" className="border-b border-border px-4">
            <AccordionTrigger className={cn("font-serif text-sm font-semibold py-3", isMobile && "py-4 min-h-[3rem] touch-manipulation")}>
              Vendeur
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="flex flex-wrap gap-2">
                {SELLER_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("font-sans touch-manipulation", filters.sellerTypes.includes(opt.value) ? "border-primary bg-primary/10 text-primary" : "")}
                    onClick={() => update({ sellerTypes: toggleInArray(filters.sellerTypes, opt.value) })}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
  );

  if (isMobile && onMobileApply) {
    return (
      <div className="flex flex-col flex-1 min-h-0 h-full">
        <div className="shrink-0 px-4 pt-3 pb-3 border-b border-border/80 bg-background">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-lg leading-tight">{t("search.filters")}</h3>
              <p className="text-xs text-muted-foreground font-sans mt-1.5 leading-relaxed">
                {t(
                  "search.mobileFiltersDraftHint",
                  "Ajustez vos critères puis appuyez sur Appliquer. Fermer sans appliquer annule les changements.",
                )}
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 touch-manipulation -mr-1" onClick={onClose} aria-label={t("common.close", "Fermer")}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 touch-pan-y [-webkit-overflow-scrolling:touch]">
          {filterBody}
        </div>

        <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgba(0,0,0,0.06)]">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-12 font-sans touch-manipulation"
              onClick={resetFilters}
            >
              {t("search.resetAllFilters", "Réinitialiser")}
            </Button>
            <Button
              type="button"
              className="flex-1 min-h-12 font-sans gradient-primary border-0 touch-manipulation"
              style={{ color: "#FAFAFA" }}
              onClick={mobileApply}
            >
              {t("search.applyFilters", "Appliquer")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-wide text-muted-foreground">Recherche AutoNex</p>
          <h3 className="font-serif font-bold text-lg">{t("search.filters")}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs font-sans text-muted-foreground h-8 rounded-lg" onClick={resetFilters}>
            {t("common.clear", "Effacer")}
          </Button>
        </div>
      </div>
      {filterBody}
    </div>
  );
};

export default FilterSidebar;
