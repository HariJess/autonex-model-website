import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type VehicleCatalogComboboxProps = {
  value: string;
  options: string[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
};

export default function VehicleCatalogCombobox({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  onSelect,
}: VehicleCatalogComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalized = value.trim().toLowerCase();
  const selected = useMemo(
    () => options.find((option) => option.toLowerCase() === normalized) ?? "",
    [normalized, options],
  );
  const normalizeSearch = (input: string) =>
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const filteredOptions = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return options;
    return options.filter((option) => {
      const normalizedOption = normalizeSearch(option);
      const collapsedOption = normalizedOption.replace(/\s+/g, "");
      const collapsedQuery = q.replace(/\s+/g, "");
      return normalizedOption.includes(q) || collapsedOption.includes(collapsedQuery);
    });
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-2 border-input bg-card px-3 font-normal"
          disabled={disabled}
        >
          <span className="truncate text-left">{selected || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {filteredOptions.map((option) => (
              <CommandItem
                key={option}
                value={option}
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
