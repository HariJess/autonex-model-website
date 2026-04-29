import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getSortedModelsForBrand,
  getVehicleModelLabel,
  normalizeVehicleModel,
} from "@/data/vehicleModelsCatalog";

export type VehicleModelComboboxProps = {
  brand: string | null | undefined;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

/**
 * Lot 9.3 — Combobox Modèle véhicule.
 *
 * Pattern identique à `VehicleTypeCombobox` : liste de suggestions riche
 * (500+ modèles via `src/data/vehicleModelsCatalog.ts`), filtrée par la
 * marque sélectionnée. Saisie libre autorisée si la marque n'est pas
 * cataloguée ou si le modèle n'est pas dans la liste (camping-car,
 * véhicule spécial, etc.).
 *
 * Désactivé tant qu'aucune marque n'est sélectionnée.
 */
export function VehicleModelCombobox({
  brand,
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  id,
}: VehicleModelComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const resolvedPlaceholder = placeholder ?? t("vehicleCombobox.modelPlaceholder", "Choisissez ou tapez un modèle");

  const sortedModels = getSortedModelsForBrand(brand);
  const popular = sortedModels.filter((m) => m.popular);
  const rest = sortedModels.filter((m) => !m.popular);

  const handleSelect = (selectedValue: string) => {
    onChange(normalizeVehicleModel(selectedValue));
    setOpen(false);
    setInputValue("");
  };

  const handleCustomSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onChange(normalizeVehicleModel(trimmed));
    setOpen(false);
    setInputValue("");
  };

  const displayValue = value ? getVehicleModelLabel(brand, value) : "";
  const isBrandSelected = Boolean(brand && brand.trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !isBrandSelected}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          {displayValue || (isBrandSelected ? resolvedPlaceholder : t("vehicleCombobox.selectBrandFirst", "Sélectionnez d'abord une marque"))}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={t("vehicleCombobox.searchOrType", "Rechercher ou taper…")}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim()) {
                e.preventDefault();
                handleCustomSubmit();
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 px-3 text-sm text-center">
                <p className="text-muted-foreground mb-2">{t("vehicleCombobox.noSuggestion", "Aucune suggestion trouvée")}</p>
                {inputValue.trim() && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleCustomSubmit}
                  >
                    {t("vehicleCombobox.useFreeText", "Utiliser « {{value}} »", { value: inputValue.trim() })}
                  </Button>
                )}
              </div>
            </CommandEmpty>
            {popular.length > 0 && (
              <CommandGroup heading={t("vehicleCombobox.popularModels", "Modèles populaires")}>
                {popular.map((model) => (
                  <CommandItem
                    key={model.value}
                    value={model.label}
                    onSelect={() => handleSelect(model.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === model.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {model.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {rest.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("vehicleCombobox.otherModels", "Autres modèles")}>
                  {rest.map((model) => (
                    <CommandItem
                      key={model.value}
                      value={model.label}
                      onSelect={() => handleSelect(model.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === model.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {model.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
