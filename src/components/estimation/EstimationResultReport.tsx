import { AlertCircle, ArrowRight, CarFront, CheckCircle2, ChevronRight, ShieldCheck, Sparkles, Target, TrendingUp, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAriary } from "@/lib/estimation/constants";
import { confidenceLabelFr, type EstimationPresentation } from "@/lib/estimation/presentation";
import type { EstimationRunResult } from "@/types/estimation";

function confidenceBadgeClass(label: "high" | "medium" | "low"): string {
  if (label === "high") return "bg-success text-white";
  if (label === "medium") return "bg-amber-500 text-black";
  return "bg-destructive text-white";
}

function formatAriaryGroups(value: number): string[] {
  return Math.max(0, Math.round(value)).toLocaleString("fr-FR").split(/\s+/u).filter(Boolean);
}

type Props = {
  result: EstimationRunResult;
  presentation: EstimationPresentation;
  onPublish: () => void;
  onRefine: () => void;
  onCompare: () => void;
  onRestart: () => void;
  onViewComparable: (listingId: string) => void;
};

export default function EstimationResultReport({
  result,
  presentation,
  onPublish,
  onRefine,
  onCompare,
  onRestart,
  onViewComparable,
}: Props) {
  const v2 = result.outputV2;
  const values = v2.values;
  const confidence = v2.confidence;
  const evidence = v2.evidence;
  const insights = v2.insights;
  const comparables = v2.comparables;
  const showIndicative = presentation.indicativeRequired || presentation.confidenceBand === "low" || comparables.length === 0;
  const estimatedGroups = formatAriaryGroups(values.estimatedValue);

  return (
    <section className="space-y-5 md:space-y-7" aria-label="Rapport d'estimation AutoNex">
      <Card className="relative overflow-hidden rounded-3xl border-0 shadow-2xl bg-gradient-to-br from-[#071226] via-[#0D1E3E] to-[#1A3560] text-background">
        <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <CardContent className="p-7 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="font-sans normal-case border-background/30 bg-background/10 text-background">
              {presentation.claimLabel}
            </Badge>
            <Badge className={confidenceBadgeClass(presentation.confidenceBand)}>
              Confiance {confidenceLabelFr(presentation.confidenceBand)}
            </Badge>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-[1.55fr_0.95fr] md:items-end">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-background/65">Valeur de marché estimée</p>
                <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                  <h2 className="font-serif text-5xl leading-[0.94] text-white md:text-7xl">
                    <span className="inline-flex flex-wrap items-end gap-x-3">
                      {estimatedGroups.map((group, index) => (
                        <span key={`estimated-group-${index}`} className="tabular-nums tracking-tight">
                          {group}
                        </span>
                      ))}
                    </span>
                  </h2>
                  <span className="pb-1 font-sans text-base font-semibold text-background/75 md:text-lg">Ar</span>
                </div>
              </div>

              <div className="rounded-2xl border border-background/30 bg-background/12 px-4 py-3">
                <p className="font-sans text-[11px] uppercase tracking-wide text-background/60">Fourchette de valorisation ({presentation.rangeToneLabel})</p>
                <p className="mt-1 font-sans text-sm font-medium text-background/90 md:text-base">
                  {formatAriary(values.lowEstimate)} <span className="px-1.5 text-background/55">-</span> {formatAriary(values.highEstimate)}
                </p>
              </div>

              <p className="max-w-2xl font-sans text-sm leading-relaxed text-background/72">{presentation.claimMessage}</p>
            </div>
            <div className="rounded-2xl border border-background/30 bg-background/[0.14] p-5 backdrop-blur-sm shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <p className="font-sans text-[11px] uppercase tracking-[0.12em] text-background/65">Indice de confiance</p>
                <Badge variant="outline" className="border-background/30 bg-background/10 text-[10px] font-sans normal-case text-background/85">
                  {presentation.summaryLevel}
                </Badge>
              </div>
              <div className="mt-3 flex items-end gap-2">
                {presentation.showExactConfidence ? (
                  <>
                    <p className="font-serif text-5xl leading-none tabular-nums">{presentation.confidenceDisplayValue}</p>
                    <p className="pb-1 font-sans text-sm text-background/68">/100</p>
                  </>
                ) : (
                  <p className="font-serif text-2xl leading-none text-background/90">Affichage prudent</p>
                )}
              </div>
              <p className="mt-2 font-sans text-xs leading-relaxed text-background/68">
                {!presentation.showExactConfidence
                  ? "Le score exact est volontairement dé-emphasé pour rester cohérent avec le niveau d'évidence disponible."
                  : presentation.confidenceInterpretation}
              </p>
              <div className="mt-4 h-1.5 w-full rounded-full bg-background/20">
                <div className="h-full rounded-full bg-background/90 transition-all duration-500 ease-out" style={{ width: `${Math.max(8, Math.min(100, confidence.confidenceScore))}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.1] via-primary/[0.04] to-transparent px-4 py-3.5 md:px-5">
          <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-primary/80">Lecture du rapport</p>
          <p className="mt-1 font-serif text-xl text-foreground md:text-2xl">{presentation.evidenceHeadline}</p>
          <p className="mt-1 font-sans text-sm text-muted-foreground">{presentation.evidenceSummaryLine}</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-3.5 shadow-sm md:p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.3fr_1.1fr_1.1fr_0.9fr] md:gap-0 md:divide-x md:divide-border/55">
            <div className="rounded-lg px-3 py-3 md:rounded-none md:px-4">
              <p className="text-[11px] font-sans uppercase tracking-wide text-muted-foreground">Prix conseillé d'annonce</p>
              <p className="mt-1 font-serif text-2xl">{formatAriary(values.recommendedListingPrice)}</p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">Positionnement conseillé pour publier sur AutoNex.</p>
            </div>
            <div className="rounded-lg px-3 py-3 md:rounded-none md:px-4">
              <p className="text-[11px] font-sans uppercase tracking-wide text-muted-foreground">Prix de vente rapide</p>
              <p className="mt-1 font-serif text-2xl">{formatAriary(values.quickSalePrice)}</p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">Repère pour accélérer la conversion.</p>
            </div>
            <div className="rounded-lg px-3 py-3 md:rounded-none md:px-4">
              <p className="text-[11px] font-sans uppercase tracking-wide text-muted-foreground">Base marché</p>
              <p className="mt-1 font-serif text-2xl">{formatAriary(v2.anchors.finalBaseAnchor)}</p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">Ancrage principal avant ajustements véhicule.</p>
            </div>
            <div className="rounded-lg px-3 py-3 md:rounded-none md:px-4">
              <p className="text-[11px] font-sans uppercase tracking-wide text-muted-foreground">Niveau global</p>
              <p className="mt-1 font-serif text-2xl">{presentation.summaryLevel}</p>
            </div>
          </div>
        </div>
      </section>

      {showIndicative && (
        <div
          className="rounded-2xl border border-amber-400/40 bg-amber-100/50 px-4 py-4 text-sm font-sans text-amber-900"
          role="note"
          aria-label="Avertissement de lecture indicative"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium">Estimation indicative</p>
              <p className="mt-1 text-xs md:text-sm">
                {insights.disclaimers[0]?.label ?? result.output.estimationNote ?? "Les données disponibles sont plus limitées ; la fourchette est volontairement plus large."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className="rounded-xl border border-border/55 bg-secondary/10 px-4 py-3.5 text-sm font-sans text-muted-foreground"
        role="region"
        aria-label="Résumé de la qualité d'évidence"
      >
        <p className="font-medium text-foreground">Qualité d'évidence</p>
        <p className="mt-1 text-xs">{presentation.evidenceSummaryLine}</p>
        <p className="mt-1">
          {evidence.comparableCountUsed} comparables retenus, dont {evidence.comparableCountStrong} solides, avec une similarité médiane de {Math.round(evidence.comparableSimilarityMedian)} / 100.
        </p>
      </div>

      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Analyse des facteurs</p>
          <p className="font-sans text-xs text-muted-foreground">Ce qui influence la valeur</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/[0.06] to-background shadow-sm transition-all duration-300 ease-out hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Facteurs qui renforcent la valeur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.pricingFactorsPositive.length === 0 ? (
              <div className="rounded-xl border border-emerald-200/30 bg-emerald-500/5 p-3">
                <p className="text-sm font-sans text-muted-foreground">Aucun levier majeur de surcote n'est détecté pour l'instant.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {insights.pricingFactorsPositive.map((item) => (
                  <Badge key={item.id} variant="secondary" className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 font-sans normal-case text-foreground">
                    {item.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/[0.04] to-background shadow-sm transition-all duration-300 ease-out hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-destructive" />
              Points de vigilance prix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.pricingFactorsNegative.length === 0 ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-sm font-sans text-muted-foreground">Aucun facteur de décote marqué n'est relevé à ce stade.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {insights.pricingFactorsNegative.map((item) => (
                  <Badge key={item.id} variant="outline" className="rounded-full border-destructive/35 px-3 py-1 font-sans normal-case">
                    {item.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </section>

      <Card className="rounded-2xl border border-border/60 shadow-sm bg-background/80">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Lecture d'évidence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights.evidenceNotes.length > 0 ? (
            insights.evidenceNotes.map((note) => (
              <div key={note.id} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm font-sans">{note.label}</div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground font-sans">Pas de note d'évidence complémentaire pour ce cas.</p>
          )}
          {insights.disclaimers.length > 0 && (
            <div className="rounded-lg border border-amber-400/35 bg-amber-100/40 px-3 py-2 text-sm font-sans text-amber-900">
              {insights.disclaimers[0].label}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3.5" role="region" aria-label="Support de comparables marché">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-secondary/20 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-[1.35fr_0.65fr] md:items-center">
            <div>
              <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Support marché</p>
              <p className="mt-1 font-serif text-2xl text-foreground">{presentation.marketSupportHeadline}</p>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                {comparables.length > 0 ? presentation.comparablesIntro : presentation.comparablesEmptyMessage}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="h-6 px-2.5 font-sans normal-case">
                  Support {presentation.marketSupportLabel}
                </Badge>
                <span className="font-sans text-xs text-muted-foreground">AutoNex</span>
              </div>
              <p className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground">{presentation.marketSupportSummary}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-border/55 bg-background/65 px-3 py-2.5">
            <p className="font-sans text-xs text-muted-foreground">{presentation.comparableSelectionHint}</p>
            {presentation.marketSupportCaution && (
              <p className="mt-1.5 font-sans text-xs text-amber-800">{presentation.marketSupportCaution}</p>
            )}
          </div>
        </div>

        <Card className="rounded-2xl border border-border/60 bg-card/95 shadow-sm transition-all duration-300 ease-out hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Annonces comparables retenues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-gradient-to-br from-secondary/20 to-background p-8">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/80">
                    <Sparkles className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <p className="font-serif text-xl">{presentation.comparablesEmptyTitle}</p>
                  <p className="mt-2 font-sans text-sm text-muted-foreground">{presentation.comparablesEmptyMessage}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {comparables.map((item) => (
                  <Link
                    key={item.listingId}
                    to={`/annonce/${item.listingId}`}
                    onClick={() => onViewComparable(item.listingId)}
                    className="group rounded-xl border border-border/70 bg-background/80 p-3.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
                    aria-label={`Voir l'annonce comparable ${item.title}`}
                  >
                    <div className="aspect-[16/10] rounded-lg overflow-hidden bg-muted mb-2.5">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground"><CarFront className="h-6 w-6" /></div>
                      )}
                    </div>
                    <p className="font-sans text-sm font-semibold line-clamp-2">{item.title}</p>
                    <p className="mt-1 font-serif text-base">{formatAriary(item.price)}</p>
                    <p className="mt-1.5 font-sans text-xs text-muted-foreground">{item.year} • {item.mileage.toLocaleString("fr-FR")} km • {item.city || "Madagascar"}</p>
                    <div className="mt-2.5 rounded-lg border border-border/50 bg-secondary/20 px-2.5 py-2">
                      <div className="flex items-center justify-between">
                        <p className="font-sans text-[11px] uppercase tracking-wide text-muted-foreground">Pertinence marché</p>
                        <p className="font-sans text-xs font-semibold text-foreground">{Math.round(item.score)} / 100</p>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted/80">
                        <div
                          className="h-full rounded-full bg-primary/75 transition-all duration-500 ease-out"
                          style={{ width: `${Math.max(6, Math.min(100, Math.round(item.score)))}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 inline-flex items-center text-[11px] font-sans text-primary/90 transition-colors group-hover:text-primary">
                      Voir l'annonce <ChevronRight className="ml-1 h-3 w-3" />
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.11] via-primary/[0.05] to-background shadow-md">
        <CardContent className="p-5 md:p-8">
          <div className="grid gap-4 md:gap-5 md:grid-cols-[1.35fr_0.65fr] md:items-start">
            <div>
              <p className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Prochaine meilleure action
              </p>
              <p className="mt-2 font-serif text-2xl leading-tight md:text-3xl">{presentation.actionHeadline}</p>
              <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">{presentation.actionDescription}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/75 px-3 py-3 md:px-3.5">
              <p className="font-sans text-[11px] uppercase tracking-wide text-muted-foreground">Lecture finale</p>
              <p className="mt-1 font-sans text-sm text-foreground">{presentation.marketSupportHeadline}</p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">{presentation.marketSupportSummary}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2.5 md:mt-6 md:grid-cols-2 xl:grid-cols-4">
            <Button onClick={onPublish} size="lg" className="rounded-xl px-8 font-sans shadow-lg w-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2">
              Publier cette voiture
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onRefine} className="rounded-xl font-sans w-full transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2">
              Affiner l'estimation
            </Button>
            <Button
              variant="ghost"
              onClick={onCompare}
              aria-label="Voir plus d'annonces similaires sur AutoNex"
              className="rounded-xl font-sans w-full justify-start md:justify-center transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2"
            >
              Comparer les annonces
            </Button>
            <Button variant="ghost" onClick={onRestart} className="rounded-xl font-sans w-full justify-start md:justify-center transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2">
              Refaire une estimation
            </Button>
          </div>

          <div className="mt-3.5 flex items-start gap-2 rounded-lg border border-border/55 bg-background/65 px-3 py-2.5">
            <Shield className="mt-0.5 h-4 w-4 text-primary/80" />
            <p className="font-sans text-xs leading-relaxed text-muted-foreground">{presentation.ctaFootnote}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
