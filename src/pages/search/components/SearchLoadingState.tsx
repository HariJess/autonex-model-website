import { Loader2 } from "lucide-react";

type SearchLoadingStateProps = {
  loadingLabel: string;
};

export function SearchLoadingState({ loadingLabel }: SearchLoadingStateProps) {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}
