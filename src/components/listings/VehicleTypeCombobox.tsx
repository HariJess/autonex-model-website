import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
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
  getSortedVehicleTypes,
  getVehicleTypeLabel,
  normalizeVehicleType,
} from "@/data/vehicleTypes";

export type VehicleTypeComboboxProps = {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

export function VehicleTypeCombobox({
  value,
  onChange,
  placeholder = "Choisissez ou tapez un type",
  className,
  disabled = false,
  id,
}: VehicleTypeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const sortedTypes = getSortedVehicleTypes();
  const popular = sortedTypes.filter((t) => t.popular);
  const rest = sortedTypes.filter((t) => !t.popular);

  const handleSelect = (selectedValue: string) => {
    onChange(normalizeVehicleType(selectedValue));
    setOpen(false);
    setInputValue("");
  };

  const handleCustomSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onChange(normalizeVehicleType(trimmed));
    setOpen(false);
    setInputValue("");
  };

  const displayValue = value ? getVehicleTypeLabel(value) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {displayValue || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Rechercher ou taper…"
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
                <p className="text-muted-foreground mb-2">Aucune suggestion trouvée</p>
                {inputValue.trim() && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleCustomSubmit}
                  >
                    Utiliser « {inputValue.trim()} »
                  </Button>
                )}
              </div>
            </CommandEmpty>
            {popular.length > 0 && (
              <CommandGroup heading="Suggestions populaires">
                {popular.map((type) => (
                  <CommandItem
                    key={type.value}
                    value={type.label}
                    onSelect={() => handleSelect(type.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === type.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {type.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {rest.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Autres types">
                  {rest.map((type) => (
                    <CommandItem
                      key={type.value}
                      value={type.label}
                      onSelect={() => handleSelect(type.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === type.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {type.label}
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
