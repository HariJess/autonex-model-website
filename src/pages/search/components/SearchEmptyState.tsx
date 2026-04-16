import { Button } from "@/components/ui/button";
import { CarFront } from "lucide-react";
import { PremiumStatePanel } from "@/components/ui/premium-state";

type SearchEmptyStateProps = {
  title: string;
  description: string;
  resetLabel: string;
  onReset: () => void;
};

export function SearchEmptyState({ title, description, resetLabel, onReset }: SearchEmptyStateProps) {
  return (
    <PremiumStatePanel
      overline="Recherche AutoNex"
      title={title}
      description={description}
      icon={<CarFront className="h-8 w-8 text-muted-foreground" />}
      action={
        <Button variant="outline" className="rounded-xl font-sans border-border/70" onClick={onReset}>
          {resetLabel}
        </Button>
      }
    />
  );
}
