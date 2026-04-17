import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

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
  const [showAllMobileChips, setShowAllMobileChips] = useState(false);
  const mobileChipCap = 4;
  const hiddenChipCount = Math.max(0, chips.length - mobileChipCap);
  const visibleMobileChips = useMemo(
    () => (showAllMobileChips ? chips : chips.slice(0, mobileChipCap)),
    [chips, showAllMobileChips],
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-2.5 px-0 py-0">
      {visibleMobileChips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          onClick={() => onRemoveChip(chip.key)}
          aria-label={`Retirer le filtre ${chip.label}`}
        >
          <Badge
            variant="secondary"
            className="font-sans gap-1.5 cursor-pointer hover:bg-destructive/10 transition-colors touch-manipulation max-lg:min-h-10 max-lg:py-2 max-lg:px-2.5 max-lg:text-[13px] text-xs border border-border/65 bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            {chip.label}
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Badge>
        </button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs font-sans text-muted-foreground h-8 rounded-lg max-lg:min-h-10 max-lg:px-3 touch-manipulation"
        onClick={onClearAll}
      >
        {clearAllLabel}
      </Button>
      {hiddenChipCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden text-xs font-sans text-muted-foreground h-8 rounded-lg min-h-10 px-3 touch-manipulation"
          onClick={() => setShowAllMobileChips((prev) => !prev)}
        >
          {showAllMobileChips ? "Voir moins" : `+${hiddenChipCount}`}
        </Button>
      )}
    </div>
  );
}
