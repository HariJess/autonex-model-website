import { useTranslation } from "react-i18next";
import { useMemo } from "react";
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
import { LISTING_TYPES, LISTING_TYPE_LABELS, LISTING_TYPES_WITHOUT_ROOM_FILTERS, type ListingType } from "@/types/listing";
import { listingTypesForTransaction } from "@/lib/listingRules";
import type { SearchFilters } from "@/types/search";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";

export type { SearchFilters };

const SURFACE_SLIDER_MAX = 1000;

const EQUIPMENTS = [
  "Piscine", "Parking", "Jardin", "Climatisation",
  "Sécurité 24h", "Meublé", "Vue mer", "Ascenseur",
];

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (f: SearchFilters) => void;
  onClose?: () => void;
  isMobile?: boolean;
  /** Prefix radio/checkbox ids when two sidebars mount (desktop + sheet) */
  idPrefix?: string;
}

const FilterSidebar = ({ filters, onFiltersChange, onClose, isMobile, idPrefix = "" }: FilterSidebarProps) => {
  const pid = idPrefix ? `${idPrefix}-` : "";
  const { t } = useTranslation();

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

  const withoutRoomsSet = new Set<string>(LISTING_TYPES_WITHOUT_ROOM_FILTERS);
  const hasResidentialType =
    filters.types.length === 0 ||
    filters.types.some((tp) => !withoutRoomsSet.has(tp));

  const surfaceSliderRight =
    filters.surfaceMax === 0
      ? SURFACE_SLIDER_MAX
      : Math.min(filters.surfaceMax, SURFACE_SLIDER_MAX);

  const typeOptions = useMemo(
    () => listingTypesForTransaction(filters.transaction),
    [filters.transaction]
  );

  const setTransaction = (v: string) => {
    const tr = v === "all" ? "" : v;
    const allowed = new Set(listingTypesForTransaction(tr));
    const types = filters.types.filter((t) => allowed.has(t as ListingType));
    onFiltersChange({ ...filters, transaction: tr, types });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="font-serif font-bold text-lg">{t("search.filters")}</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs font-sans text-muted-foreground h-7" onClick={resetFilters}>
            {t("common.clear", "Effacer")}
          </Button>
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label={t("common.close", "Fermer")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Accordion type="multiple" defaultValue={["transaction", "type", "location", "budget"]} className="w-full">
          <AccordionItem value="transaction" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">{t("search.transaction", "Transaction")}</AccordionTrigger>
            <AccordionContent className="pb-3">
              <RadioGroup value={filters.transaction || "all"} onValueChange={setTransaction}>
                <div className="flex items-center gap-2 py-0.5">
                  <RadioGroupItem value="all" id={`${pid}tr-all`} />
                  <Label htmlFor={`${pid}tr-all`} className="font-sans text-sm cursor-pointer flex-1">{t("search.allTransactions", "Toutes")}</Label>
                </div>
                {[
                  { value: "vente", label: t("transaction.sale", "Vente") },
                  { value: "location", label: t("transaction.rent", "Location") },
                  { value: "location_vacances", label: t("transaction.vacation", "Location vacances") },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2 py-0.5">
                    <RadioGroupItem value={opt.value} id={`${pid}tr-${opt.value}`} />
                    <Label htmlFor={`${pid}tr-${opt.value}`} className="font-sans text-sm cursor-pointer flex-1">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="type" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">{t("search.propertyType", "Type de bien")}</AccordionTrigger>
            <AccordionContent className="pb-3 space-y-1">
              {typeOptions.map((typeVal) => (
                <label key={typeVal} className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <Checkbox
                    checked={filters.types.includes(typeVal)}
                    onCheckedChange={() => update({ types: toggleInArray(filters.types, typeVal) })}
                  />
                  <span className="font-sans text-sm flex-1">{LISTING_TYPE_LABELS[typeVal]}</span>
                </label>
              ))}
              {filters.transaction && typeOptions.length < LISTING_TYPES.length && (
                <p className="text-xs text-muted-foreground font-sans pt-1">{t("search.terrainNotForRent", "Le terrain n’est pas proposé à la location.")}</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="location" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">{t("search.location", "Localisation")}</AccordionTrigger>
            <AccordionContent className="pb-3">
              <LocationSelector
                mode="apply"
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
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">{t("search.budget", "Budget")}</AccordionTrigger>
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
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">{t("search.surface", "Surface (m²)")}</AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-sans">
                  {t("search.surfaceHint", "Glissez le maximum à droite pour ne pas plafonner la surface.")}
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
                    className="font-sans text-sm"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={filters.surfaceMax || ""}
                    onChange={(e) => update({ surfaceMax: Number(e.target.value) || 0 })}
                    placeholder={t("search.max", "Max")}
                    className="font-sans text-sm"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {hasResidentialType && (
            <AccordionItem value="rooms" className="border-b border-border px-4">
              <AccordionTrigger className="font-serif text-sm font-semibold py-3">{t("listing.rooms", "Chambres")}</AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {[{ label: "Studio", value: 0 }, { label: "1", value: 1 }, { label: "2", value: 2 }, { label: "3", value: 3 }, { label: "4", value: 4 }, { label: "5+", value: 5 }].map((r) => (
                    <Button
                      key={r.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`font-sans text-xs h-8 px-3 ${filters.rooms.includes(r.value) ? "border-primary bg-primary/10 text-primary" : ""}`}
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
              <AccordionTrigger className="font-serif text-sm font-semibold py-3">{t("listing.bathrooms", "Salles de bain")}</AccordionTrigger>
              <AccordionContent className="pb-3">
                <p className="text-xs text-muted-foreground font-sans mb-2">{t("search.bathroomsHint", "« 4+ » inclut les biens avec au moins 4 salles de bain.")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4].map((b) => (
                    <Button
                      key={b}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`font-sans text-xs h-8 px-3 ${filters.bathrooms.includes(b) ? "border-primary bg-primary/10 text-primary" : ""}`}
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
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">{t("listing.features", "Équipements")}</AccordionTrigger>
            <AccordionContent className="pb-3 space-y-1">
              <p className="text-xs text-muted-foreground font-sans mb-2">{t("search.equipmentHint", "Correspondance sur les équipements renseignés dans l’annonce (recherche souple).")}</p>
              {EQUIPMENTS.map((eq) => (
                <label key={eq} className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <Checkbox checked={filters.equipments.includes(eq)} onCheckedChange={() => update({ equipments: toggleInArray(filters.equipments, eq) })} />
                  <span className="font-sans text-sm">{eq}</span>
                </label>
              ))}
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
};

export default FilterSidebar;
