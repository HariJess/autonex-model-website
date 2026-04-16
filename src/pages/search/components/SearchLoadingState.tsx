import { Loader2 } from "lucide-react";

type SearchLoadingStateProps = {
  loadingLabel: string;
};

export function SearchLoadingState({ loadingLabel }: SearchLoadingStateProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        <span>{loadingLabel}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((skeleton) => (
          <div key={skeleton} className="overflow-hidden rounded-2xl border border-border/70 bg-card/90">
            <div className="aspect-[4/3] animate-pulse bg-muted/70" />
            <div className="space-y-2 p-3.5">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted/70" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}
