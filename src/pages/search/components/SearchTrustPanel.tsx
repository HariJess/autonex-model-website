import { BadgeCheck, ShieldCheck, SlidersHorizontal } from "lucide-react";

type SearchTrustPanelProps = {
  hasExactResults: boolean;
  hasSimilarFallback: boolean;
  activeFilterCount: number;
  exactCount: number;
  similarCount: number;
};

export function SearchTrustPanel({
  hasExactResults,
  hasSimilarFallback,
  activeFilterCount,
  exactCount,
  similarCount,
}: SearchTrustPanelProps) {
  const headline = hasExactResults
    ? `Résultats prioritaires: ${exactCount} annonce${exactCount > 1 ? "s" : ""} strictement alignée${exactCount > 1 ? "s" : ""}`
    : hasSimilarFallback
      ? `Aucun match strict: ${similarCount} alternatives proches proposées`
      : "Aucun résultat pour les critères actuels";

  const summary = hasExactResults
    ? "Les annonces affichées correspondent à vos filtres principaux. Les résultats restent triés pour maximiser la pertinence de navigation."
    : hasSimilarFallback
      ? "Nous avons élargi certains critères secondaires pour vous proposer des options crédibles sans masquer l'absence de match exact."
      : "Élargissez légèrement vos filtres pour relancer une sélection plus représentative du marché AutoNex.";

  return (
    <div className="mb-4 rounded-2xl border border-border/70 bg-gradient-to-r from-background via-background to-secondary/20 p-3.5 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Confiance de navigation</p>
          <p className="mt-1 font-sans text-lg leading-snug text-foreground">{headline}</p>
          <p className="mt-1.5 max-w-3xl font-sans text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/75 px-3 py-2.5">
          <p className="font-sans text-[11px] uppercase tracking-wide text-muted-foreground">Filtres actifs</p>
          <p className="mt-1 font-sans text-sm font-semibold text-foreground">{activeFilterCount}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="font-sans text-[11px] text-muted-foreground">Annonces vérifiées par statut de publication</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          <span className="font-sans text-[11px] text-muted-foreground">Lecture guidée par vos critères</span>
        </div>
        {hasSimilarFallback && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-100/45 px-2.5 py-1">
            <BadgeCheck className="h-3.5 w-3.5 text-amber-800" />
            <span className="font-sans text-[11px] text-amber-900">Mode alternatives proches activé</span>
          </div>
        )}
      </div>
    </div>
  );
}
