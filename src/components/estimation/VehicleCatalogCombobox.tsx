import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isCatalogOptionMatch } from "@/lib/estimation/catalogSearch";
import { cn } from "@/lib/utils";

type VehicleCatalogComboboxProps = {
  /** id appliqué au bouton trigger (matche `htmlFor` du Label & permet focus programmatique). */
  id?: string;
  value: string;
  options: string[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  /** Si vrai, le trigger affiche une bordure rouge — utilisé pour la validation inline. */
  hasError?: boolean;
  onSelect: (value: string) => void;
};

export default function VehicleCatalogCombobox({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  hasError,
  onSelect,
}: VehicleCatalogComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalized = value.trim().toLowerCase();
  const selected = useMemo(
    () => options.find((option) => option.toLowerCase() === normalized) ?? "",
    [normalized, options],
  );
  const filteredOptions = useMemo(() => {
    return options.filter((option) => isCatalogOptionMatch(option, query));
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={hasError || undefined}
          className={cn(
            "h-11 w-full justify-between rounded-xl border bg-background px-3 font-normal shadow-sm transition focus-visible:ring-2 focus-visible:ring-offset-1",
            hasError
              ? "border-destructive hover:border-destructive focus-visible:ring-destructive/40"
              : "border-border/70 hover:border-primary/30 focus-visible:ring-primary/30",
          )}
          disabled={disabled}
        >
          <span className="truncate text-left">{selected || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] rounded-xl border-border/70 p-0 shadow-lg" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            className="font-sans"
          />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {filteredOptions.map((option) => (
              <CommandItem
                key={option}
                value={option}
                className="transition-colors duration-150 ease-out"
                onSelect={() => {
                  onSelect(option);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", selected === option ? "opacity-100" : "opacity-0")} />
                {option}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
