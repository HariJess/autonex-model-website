import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export type SearchActiveChip = {
  label: string;
  key: string;
};

type SearchActiveChipsProps = {
  chips: SearchActiveChip[];
  clearAllLabel: string;
  onRemoveChip: (key: string) => void;
  onClearAll: () => void;
};

export function SearchActiveChips({ chips, clearAllLabel, onRemoveChip, onClearAll }: SearchActiveChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 lg:gap-1.5">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          role="button"
          tabIndex={0}
          className="font-sans gap-1.5 cursor-pointer hover:bg-destructive/10 transition-colors touch-manipulation max-lg:min-h-10 max-lg:py-2 max-lg:px-2.5 max-lg:text-sm text-xs"
          onClick={() => onRemoveChip(chip.key)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onRemoveChip(chip.key);
            }
          }}
        >
          {chip.label}
          <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs font-sans text-muted-foreground h-6 max-lg:min-h-10 max-lg:px-3 touch-manipulation"
        onClick={onClearAll}
      >
        {clearAllLabel}
      </Button>
    </div>
  );
}
