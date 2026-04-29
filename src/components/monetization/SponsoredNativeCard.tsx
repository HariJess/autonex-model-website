import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SponsoredPill } from "./MonetizationLabels";

interface SponsoredNativeCardProps {
  className?: string;
  enabled?: boolean;
}

/** Carte type « native » dans les grilles d’annonces, sobre et assortie à la marque. */
export function SponsoredNativeCard({ className, enabled = true }: SponsoredNativeCardProps) {
  if (!enabled) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-primary/25 bg-gradient-to-b from-primary/[0.04] to-card p-5 flex flex-col justify-between min-h-[280px]",
        className,
      )}
    >
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SponsoredPill />
          <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden />
        </div>
        <p className="font-sans font-semibold text-lg text-foreground leading-snug">
          Campagne partenaire
        </p>
        <p className="mt-2 text-sm text-muted-foreground font-sans leading-relaxed">
          Format natif réservé aux marques et services partenaires sélectionnés par AutoNex.
        </p>
      </div>
    </div>
  );
}
