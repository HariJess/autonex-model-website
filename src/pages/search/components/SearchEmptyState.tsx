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
    <div className="text-center py-16 md:py-20 px-2">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <Home className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="font-serif text-xl text-foreground mb-2">{title}</p>
      <p className="font-sans text-sm text-muted-foreground mb-4 max-w-md mx-auto">{description}</p>
      <Button variant="outline" className="font-sans" onClick={onReset}>
        {resetLabel}
      </Button>
    </div>
  );
}
