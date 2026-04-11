import { useTranslation } from "react-i18next";
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
import { LISTING_TYPES, LISTING_TYPE_LABELS } from "@/types/listing";

const TYPES_WITHOUT_ROOMS = ["terrain", "local_commercial", "bureau"];

const EQUIPMENTS = [
  "Piscine", "Parking", "Jardin", "Climatisation",
  "Sécurité 24h", "Meublé", "Vue mer", "Ascenseur",
];



export interface SearchFilters {
  transaction: string;
  types: string[];
  ville: string;
  arrondissement: string;
  quartiers: string[];
  quartierLibre: string;
  priceMin: number;
  priceMax: number;
  surfaceMin: number;
  surfaceMax: number;
  rooms: number[];
  bathrooms: number[];
  equipments: string[];
  proximities: string[];
}

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (f: SearchFilters) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

const FilterSidebar = ({ filters, onFiltersChange, onClose, isMobile }: FilterSidebarProps) => {
  const { t } = useTranslation();

  const update = (partial: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const toggleInArray = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const toggleInNumArray = (arr: number[], item: number) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const resetFilters = () => {
    onFiltersChange({
      transaction: "", types: [], ville: "", arrondissement: "",
      quartiers: [], quartierLibre: "", priceMin: 0, priceMax: 0,
      surfaceMin: 0, surfaceMax: 0, rooms: [], bathrooms: [],
      equipments: [], proximities: [],
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="font-serif font-bold text-lg">Filtres</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs font-sans text-muted-foreground h-7" onClick={resetFilters}>
            Effacer
          </Button>
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Accordion type="multiple" defaultValue={["transaction", "type", "location", "budget"]} className="w-full">
          {/* Transaction */}
          <AccordionItem value="transaction" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">Transaction</AccordionTrigger>
            <AccordionContent className="pb-3">
              <RadioGroup value={filters.transaction} onValueChange={(v) => update({ transaction: v })}>
                {[
                  { value: "vente", label: "Vente" },
                  { value: "location", label: "Location" },
                  { value: "location_vacances", label: "Location vacances" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2 py-0.5">
                    <RadioGroupItem value={opt.value} id={`tr-${opt.value}`} />
                    <Label htmlFor={`tr-${opt.value}`} className="font-sans text-sm cursor-pointer flex-1">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          {/* Type — using canonical types */}
          <AccordionItem value="type" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">Type de bien</AccordionTrigger>
            <AccordionContent className="pb-3 space-y-1">
              {LISTING_TYPES.map((typeVal) => (
                <label key={typeVal} className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <Checkbox
                    checked={filters.types.includes(typeVal)}
                    onCheckedChange={() => update({ types: toggleInArray(filters.types, typeVal) })}
                  />
                  <span className="font-sans text-sm flex-1">{LISTING_TYPE_LABELS[typeVal]}</span>
                </label>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Location */}
          <AccordionItem value="location" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">Localisation</AccordionTrigger>
            <AccordionContent className="pb-3">
              <LocationSelector
                selectedVille={filters.ville}
                selectedArr={filters.arrondissement}
                selectedQuartiers={filters.quartiers}
                quartierLibre={filters.quartierLibre}
                onVilleChange={(v) => update({ ville: v })}
                onArrChange={(a) => update({ arrondissement: a })}
                onQuartiersChange={(q) => update({ quartiers: q })}
                onQuartierLibreChange={(q) => update({ quartierLibre: q })}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Budget */}
          <AccordionItem value="budget" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">Budget</AccordionTrigger>
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

          {/* Surface */}
          <AccordionItem value="surface" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">Surface (m²)</AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                <Slider min={0} max={1000} step={10} value={[filters.surfaceMin, filters.surfaceMax || 1000]} onValueChange={([min, max]) => update({ surfaceMin: min, surfaceMax: max })} />
                <div className="flex gap-2">
                  <Input type="number" value={filters.surfaceMin || ""} onChange={(e) => update({ surfaceMin: Number(e.target.value) })} placeholder="Min" className="font-sans text-sm" />
                  <Input type="number" value={filters.surfaceMax || ""} onChange={(e) => update({ surfaceMax: Number(e.target.value) })} placeholder="Max" className="font-sans text-sm" />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Rooms — only for residential types */}
          {!filters.types.some(t => TYPES_WITHOUT_ROOMS.includes(t)) && (
          <AccordionItem value="rooms" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">Chambres</AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="flex flex-wrap gap-1.5">
                {[{ label: "Studio", value: 0 }, { label: "1", value: 1 }, { label: "2", value: 2 }, { label: "3", value: 3 }, { label: "4", value: 4 }, { label: "5+", value: 5 }].map((r) => (
                  <Button key={r.value} variant="outline" size="sm" className={`font-sans text-xs h-8 px-3 ${filters.rooms.includes(r.value) ? "border-primary bg-primary/10 text-primary" : ""}`} onClick={() => update({ rooms: toggleInNumArray(filters.rooms, r.value) })}>
                    {r.label}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Bathrooms — only for residential types */}
          {!filters.types.some(t => TYPES_WITHOUT_ROOMS.includes(t)) && (
          <AccordionItem value="bathrooms" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">Salles de bain</AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4].map((b) => (
                  <Button key={b} variant="outline" size="sm" className={`font-sans text-xs h-8 px-3 ${filters.bathrooms.includes(b) ? "border-primary bg-primary/10 text-primary" : ""}`} onClick={() => update({ bathrooms: toggleInNumArray(filters.bathrooms, b) })}>
                    {b}{b === 4 ? "+" : ""}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Equipment */}
          <AccordionItem value="equipment" className="border-b border-border px-4">
            <AccordionTrigger className="font-serif text-sm font-semibold py-3">Équipements</AccordionTrigger>
            <AccordionContent className="pb-3 space-y-1">
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
