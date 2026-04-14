import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SearchErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

export function SearchErrorState({ title, message, onRetry }: SearchErrorStateProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-8 md:p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-serif text-xl text-foreground mb-2">{title}</p>
      <p className="font-sans text-sm text-muted-foreground max-w-md mx-auto">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-5 font-sans" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      )}
    </div>
  );
}
