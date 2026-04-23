import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type HeroModelComboboxProps = {
  value: string;
  options: string[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  /** Template string containing `{{query}}` — rendered when the typed query doesn't match any option. */
  freeTextLabel: string;
  disabled?: boolean;
  className?: string;
  onSelect: (value: string) => void;
};

/**
 * Combobox for the Hero "Modèle" field.
 *
 * Reads its option list from outside (derived from the selected brand(s) upstream)
 * and supports free-text entry: if the user types a model that isn't in the list,
 * a dedicated item offers to use the typed string as-is. Distinct from
 * `VehicleCatalogCombobox` (estimation flow, prod-used) which has no free-text path.
 */
export function HeroModelCombobox({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  freeTextLabel,
  disabled,
  className,
  onSelect,
}: HeroModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim();
  const normalizedQueryLower = normalizedQuery.toLowerCase();

  // Ensure the current `value` (possibly a previous free-text entry) stays visible
  // in the list even if it isn't in the upstream option set.
  const effectiveOptions = useMemo(() => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return options;
    const alreadyIn = options.some((opt) => opt.toLowerCase() === trimmedValue.toLowerCase());
    return alreadyIn ? options : [trimmedValue, ...options];
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    if (!normalizedQueryLower) return effectiveOptions;
    return effectiveOptions.filter((opt) =>
      opt.toLowerCase().includes(normalizedQueryLower),
    );
  }, [effectiveOptions, normalizedQueryLower]);

  const hasExactMatch =
    normalizedQueryLower.length > 0 &&
    effectiveOptions.some((opt) => opt.toLowerCase() === normalizedQueryLower);
  const showFreeTextItem = normalizedQuery.length > 0 && !hasExactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-sans text-sm h-9 font-normal",
            className,
          )}
        >
          <span className={cn("truncate text-left", value ? "text-foreground" : "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            className="font-sans"
          />
          <CommandList>
            {filteredOptions.length === 0 && !showFreeTextItem && (
              <CommandEmpty>{emptyLabel}</CommandEmpty>
            )}
            {filteredOptions.map((opt) => (
              <CommandItem
                key={opt}
                value={opt}
                onSelect={() => {
                  onSelect(opt);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                {opt}
              </CommandItem>
            ))}
            {showFreeTextItem && (
              <CommandItem
                key={`__free-text__${normalizedQuery}`}
                value={`__free-text__${normalizedQuery}`}
                className="text-primary"
                onSelect={() => {
                  onSelect(normalizedQuery);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {freeTextLabel.replace("{{query}}", normalizedQuery)}
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
