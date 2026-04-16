import { Button } from "@/components/ui/button";
import { CarFront } from "lucide-react";

type SearchEmptyStateProps = {
  title: string;
  description: string;
  resetLabel: string;
  onReset: () => void;
};

export function SearchEmptyState({ title, description, resetLabel, onReset }: SearchEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border/75 bg-gradient-to-br from-card via-card to-secondary/20 text-center py-14 md:py-16 px-4 shadow-sm">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-border/60 bg-background/80 flex items-center justify-center">
        <CarFront className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Recherche AutoNex</p>
      <p className="font-serif text-xl text-foreground mt-2 mb-2">{title}</p>
      <p className="font-sans text-sm text-muted-foreground mb-5 max-w-md mx-auto leading-relaxed">{description}</p>
      <Button variant="outline" className="rounded-xl font-sans border-border/70" onClick={onReset}>
        {resetLabel}
      </Button>
    </div>
  );
}
