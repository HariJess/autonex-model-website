import { ArrowRight, CarFront, ChevronRight, Target, TrendingUp, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatAriary } from "@/lib/estimation/constants";
import { confidenceLabelFr, type EstimationPresentation } from "@/lib/estimation/presentation";
import type { EstimationRunResult } from "@/types/estimation";
import ArgusValuesCard from "@/components/estimation/ArgusValuesCard";
import AdjustmentsBreakdown from "@/components/estimation/AdjustmentsBreakdown";
import DataFreshnessBadge from "@/components/estimation/DataFreshnessBadge";
import AuditFooter from "@/components/estimation/AuditFooter";
import { useDataFreshness } from "@/lib/estimation/dataFreshnessHelper";

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
  const { t } = useTranslation();
  const v2 = result.outputV2;
  const values = v2.values;
  const confidence = v2.confidence;
  const evidence = v2.evidence;
  const insights = v2.insights;
  const comparables = v2.comparables;
  const estimatedGroups = formatAriaryGroups(values.estimatedValue);
  // PROMPT 10B — V2 detection : audit field présent => engine V2 (3 cards Argus)
  const isV2 = Boolean(v2.audit);
  const { data: freshness } = useDataFreshness();

  return (
    <section className="space-y-5 md:space-y-7" aria-label={t("estimation.report.sectionAria", "Rapport d'estimation AutoNex")}>
      <Card className="relative overflow-hidden rounded-3xl border-0 shadow-2xl bg-gradient-to-br from-[#071226] via-[#0D1E3E] to-[#1A3560] text-background">
        <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <CardContent className="p-7 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="font-sans normal-case border-background/30 bg-background/10 text-background">
              {presentation.claimLabel}
            </Badge>
            <Badge className={confidenceBadgeClass(presentation.confidenceBand)}>
              {t("estimation.report.confidenceBadge", "Confiance {{level}}", { level: confidenceLabelFr(presentation.confidenceBand, t) })}
            </Badge>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-[1.55fr_0.95fr] md:items-end">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-background/65">{t("estimation.report.estimatedMarketValue", "Valeur de marché estimée")}</p>
                <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                  <h2 className="font-sans text-5xl leading-[0.94] text-white md:text-7xl">
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
                <p className="font-sans text-[11px] uppercase tracking-wide text-background/60">{t("estimation.report.valuationRange", "Fourchette de valorisation ({{tone}})", { tone: presentation.rangeToneLabel })}</p>
                <p className="mt-1 font-sans text-sm font-medium text-background/90 md:text-base">
                  {formatAriary(values.lowEstimate)} <span className="px-1.5 text-background/55">-</span> {formatAriary(values.highEstimate)}
                </p>
              </div>

              <p className="max-w-2xl font-sans text-sm leading-relaxed text-background/72">{presentation.claimMessage}</p>
            </div>
            <div className="rounded-2xl border border-background/30 bg-background/[0.14] p-5 backdrop-blur-sm shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <p className="font-sans text-[11px] uppercase tracking-[0.12em] text-background/65">{t("estimation.report.confidenceIndex", "Indice de confiance")}</p>
                <Badge variant="outline" className="border-background/30 bg-background/10 text-[10px] font-sans normal-case text-background/85">
                  {presentation.summaryLevel}
                </Badge>
              </div>
              <div className="mt-3 flex items-end gap-2">
                {presentation.showExactConfidence ? (
                  <>
                    <p className="font-sans text-5xl leading-none tabular-nums">{presentation.confidenceDisplayValue}</p>
                    <p className="pb-1 font-sans text-sm text-background/68">/100</p>
                  </>
                ) : (
                  <p className="font-sans text-2xl leading-none text-background/90">{t("estimation.report.cautiousDisplay", "Affichage prudent")}</p>
                )}
              </div>
              <p className="mt-2 font-sans text-xs leading-relaxed text-background/68">
                {!presentation.showExactConfidence
                  ? t("estimation.report.exactScoreDeemphasized", "Le score exact est volontairement dé-emphasé pour rester cohérent avec le niveau d'évidence disponible.")
                  : presentation.confidenceInterpretation}
              </p>
              <div className="mt-4 h-1.5 w-full rounded-full bg-background/20">
                <div className="h-full rounded-full bg-background/90 transition-all duration-500 ease-out" style={{ width: `${Math.max(8, Math.min(100, confidence.confidenceScore))}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PROMPT 10B — Argus 3 cards (V2) ou 1 card (V1 fallback) */}
      <ArgusValuesCard
        values={{
          tradeInPro: values.tradeInPro,
          privateMarket: values.privateMarket,
          dealerRetail: values.dealerRetail,
          estimatedValue: values.estimatedValue,
        }}
        isV2={isV2}
      />

      {/* PROMPT 10B — Indicateur fraîcheur des données */}
      <DataFreshnessBadge
        comparableCountUsed={evidence.comparableCountUsed}
        comparableSourceBreakdown={v2.audit?.comparableSourceBreakdown}
        lastDataUpdate={freshness?.lastUpdateIso ?? null}
      />

      {/* PROMPT 10C — Section D "Lecture du rapport" supprimée (redondance C+I+K). */}
      <section className="space-y-3">
        <div className="rounded-2xl border border-border/60 bg-card/90 p-3.5 shadow-sm md:p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.3fr_1.1fr_1.1fr_0.9fr] md:gap-0 md:divide-x md:divide-border/55">
            <div className="rounded-lg px-3 py-3 md:rounded-none md:px-4">
              <p className="text-[11px] font-sans uppercase tracking-wide text-muted-foreground">{t("estimation.report.recommendedListingPrice", "Prix conseillé d'annonce")}</p>
              <p className="mt-1 font-sans text-2xl">{formatAriary(values.recommendedListingPrice)}</p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">{t("estimation.report.positioningHint", "Positionnement conseillé pour publier sur AutoNex.")}</p>
            </div>
            <div className="rounded-lg px-3 py-3 md:rounded-none md:px-4">
              <p className="text-[11px] font-sans uppercase tracking-wide text-muted-foreground">{t("estimation.report.quickSalePrice", "Prix de vente rapide")}</p>
              <p className="mt-1 font-sans text-2xl">{formatAriary(values.quickSalePrice)}</p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">{t("estimation.report.fastConversionMarker", "Repère pour accélérer la conversion.")}</p>
            </div>
            <div className="rounded-lg px-3 py-3 md:rounded-none md:px-4">
              <p className="text-[11px] font-sans uppercase tracking-wide text-muted-foreground">{t("estimation.report.medianComparables", "Valeur médiane des comparables")}</p>
              <p className="mt-1 font-sans text-2xl">{formatAriary(v2.anchors.finalBaseAnchor)}</p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">{t("estimation.report.anchorBeforeAdjustments", "Ancrage principal avant ajustements véhicule.")}</p>
            </div>
            <div className="rounded-lg px-3 py-3 md:rounded-none md:px-4">
              <p className="text-[11px] font-sans uppercase tracking-wide text-muted-foreground">{t("estimation.report.reliabilityLevel", "Niveau de fiabilité")}</p>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="mt-1 font-sans text-2xl cursor-help" data-testid="reliability-level">
                      {presentation.summaryLevel}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-sans text-xs">
                      {t(
                        "estimation.report.reliabilityTooltip",
                        "Niveau de fiabilité dérivé du tier (A/B/C/D) — voir la page méthodologie pour le détail.",
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </section>

      {/* PROMPT 10C — Sections F (bandeau "Estimation indicative") + G ("Qualité d'évidence") supprimées (redondance C+J+K+disclaimer audit). */}

      {/* PROMPT 10B — Breakdown détaillé des 6 ajustements véhicule (V2) */}
      <AdjustmentsBreakdown
        adjustments={v2.adjustments}
        positiveLabels={insights.pricingFactorsPositive.map((p) => p.label)}
        negativeLabels={insights.pricingFactorsNegative.map((n) => n.label)}
      />

      {/* PROMPT 10C — Sections supprimées (redondance avec H + C + audit) :
          - I "Analyse des facteurs" (bulles vertes/rouges) : déjà couvert par AdjustmentsBreakdown (H)
          - J "Lecture d'évidence" : texte EN dans UI FR + 4ème répétition warning
          - K "Support marché — Appui marché faible" : 6ème répétition du même message */}

      {/* PROMPT 10C — Section L conditionnalisée : visible uniquement si comparables.length > 0 */}
      {comparables.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card/95 shadow-sm transition-all duration-300 ease-out hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("estimation.report.comparablesRetained", "Annonces comparables retenues")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {comparables.map((item) => (
                <Link
                  key={item.listingId}
                  to={`/annonce/${item.listingId}`}
                  onClick={() => onViewComparable(item.listingId)}
                  data-testid="comparable-card"
                  className="group rounded-xl border border-border/70 bg-background/80 p-3.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
                  aria-label={t("estimation.report.viewComparableAria", "Voir l'annonce comparable {{title}}", { title: item.title })}
                >
                  <div className="aspect-[16/10] rounded-lg overflow-hidden bg-muted mb-2.5">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground"><CarFront className="h-6 w-6" /></div>
                    )}
                  </div>
                  <p className="font-sans text-sm font-semibold line-clamp-2">{item.title}</p>
                  <p className="mt-1 font-sans text-base">{formatAriary(item.price)}</p>
                  <p className="mt-1.5 font-sans text-xs text-muted-foreground">{item.year} • {item.mileage.toLocaleString("fr-FR")} km • {item.city || "Madagascar"}</p>
                  <div className="mt-2.5 rounded-lg border border-border/50 bg-secondary/20 px-2.5 py-2">
                    <div className="flex items-center justify-between">
                      <p className="font-sans text-[11px] uppercase tracking-wide text-muted-foreground">{t("estimation.report.marketRelevance", "Pertinence marché")}</p>
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
                    {t("estimation.report.viewListing", "Voir l'annonce")} <ChevronRight className="ml-1 h-3 w-3" />
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.11] via-primary/[0.05] to-background shadow-md">
        <CardContent className="p-5 md:p-8">
          {/* PROMPT 10C — Sous-card N "Lecture finale" supprimée (jargon technique
              redondant avec presentation.actionHeadline + AuditFooter).
              Layout simplifié : 1 colonne pleine largeur. */}
          <div>
            <p className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              {t("estimation.report.nextBestAction", "Prochaine meilleure action")}
            </p>
            <p className="mt-2 font-sans text-2xl leading-tight md:text-3xl">{presentation.actionHeadline}</p>
            <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">{presentation.actionDescription}</p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2.5 md:mt-6 md:grid-cols-2 xl:grid-cols-4">
            <Button onClick={onPublish} size="lg" className="rounded-xl px-8 font-sans shadow-lg w-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2">
              {t("estimation.report.publishThisCar", "Publier cette voiture")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onRefine} className="rounded-xl font-sans w-full transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2">
              {t("estimation.report.refineEstimation", "Affiner l'estimation")}
            </Button>
            <Button
              variant="ghost"
              onClick={onCompare}
              aria-label={t("estimation.report.compareAria", "Voir plus d'annonces similaires sur AutoNex")}
              className="rounded-xl font-sans w-full justify-start md:justify-center transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2"
            >
              {t("estimation.report.compareListings", "Comparer les annonces")}
            </Button>
            <Button variant="ghost" onClick={onRestart} className="rounded-xl font-sans w-full justify-start md:justify-center transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2">
              {t("estimation.report.restartEstimation", "Refaire une estimation")}
            </Button>
          </div>

          <div className="mt-3.5 flex items-start gap-2 rounded-lg border border-border/55 bg-background/65 px-3 py-2.5">
            <Shield className="mt-0.5 h-4 w-4 text-primary/80" />
            <p className="font-sans text-xs leading-relaxed text-muted-foreground">{presentation.ctaFootnote}</p>
          </div>
        </CardContent>
      </Card>

      {/* PROMPT 10B — Footer méthodologie + audit V2 + disclaimer */}
      <AuditFooter audit={v2.audit} />
    </section>
  );
}
