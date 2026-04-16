import { Loader2 } from "lucide-react";
import { PremiumStatePanel, PremiumStateSkeletonGrid } from "@/components/ui/premium-state";

type SearchLoadingStateProps = {
  loadingLabel: string;
};

export function SearchLoadingState({ loadingLabel }: SearchLoadingStateProps) {
  return (
    <div className="space-y-4 py-4">
      <PremiumStatePanel
        overline="Recherche AutoNex"
        title="Analyse du marché en cours"
        description={loadingLabel}
        icon={<Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />}
        className="py-8 md:py-9"
        role="status"
        ariaLive="polite"
      />
      <PremiumStateSkeletonGrid count={6} />
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}
