import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumStatePanel } from "@/components/ui/premium-state";

type SearchErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

export function SearchErrorState({ title, message, onRetry }: SearchErrorStateProps) {
  return (
    <PremiumStatePanel
      overline="Statut recherche"
      title={title}
      description={message}
      icon={<AlertCircle className="h-6 w-6 text-muted-foreground" />}
      action={
        onRetry ? (
          <Button variant="outline" className="rounded-xl border-border/70 font-sans focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Relancer la recherche
          </Button>
        ) : undefined
      }
    />
  );
}
