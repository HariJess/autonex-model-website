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
    <div className="flex flex-wrap items-center gap-2 mb-4 lg:gap-1.5 rounded-xl border border-border/65 bg-gradient-to-r from-card to-secondary/20 px-2.5 sm:px-3 py-2.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          onClick={() => onRemoveChip(chip.key)}
          aria-label={`Retirer le filtre ${chip.label}`}
        >
          <Badge
            variant="secondary"
            className="font-sans gap-1.5 cursor-pointer hover:bg-destructive/10 transition-colors touch-manipulation max-lg:min-h-10 max-lg:py-2 max-lg:px-2.5 max-lg:text-[13px] text-xs border border-border/70 bg-background/80"
          >
            {chip.label}
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Badge>
        </button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs font-sans text-muted-foreground h-6 rounded-lg max-lg:min-h-10 max-lg:px-3 touch-manipulation"
        onClick={onClearAll}
      >
        {clearAllLabel}
      </Button>
    </div>
  );
}
