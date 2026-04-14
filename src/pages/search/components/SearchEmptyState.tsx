import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

type SearchEmptyStateProps = {
  title: string;
  description: string;
  resetLabel: string;
  onReset: () => void;
};

export function SearchEmptyState({ title, description, resetLabel, onReset }: SearchEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card text-center py-14 md:py-16 px-4 shadow-sm">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <Home className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="font-serif text-xl text-foreground mb-2">{title}</p>
      <p className="font-sans text-sm text-muted-foreground mb-5 max-w-md mx-auto">{description}</p>
      <Button variant="outline" className="font-sans" onClick={onReset}>
        {resetLabel}
      </Button>
    </div>
  );
}
