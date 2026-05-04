import {
  AlertTriangle,
  Calendar,
  Car,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EstimationOutputV2 } from "@/types/estimation";

/**
 * PROMPT 10B — Section "Pourquoi ce prix ?".
 *
 * Affiche les 6 ajustements véhicule appliqués par l'engine (avec delta %),
 * triés par impact non-zéro en premier, et le total. Si le cap d'ajustement
 * a été appliqué, badge "Cap appliqué" + tooltip explicatif.
 */

export type AdjustmentsBreakdownProps = {
  adjustments: EstimationOutputV2["adjustments"];
  positiveLabels?: string[];
  negativeLabels?: string[];
  className?: string;
};

type AdjustmentLine = {
  key: string;
  labelKey: string;
  labelDefault: string;
  deltaPct: number;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

function formatDelta(deltaPct: number): string {
  const sign = deltaPct > 0 ? "+" : deltaPct < 0 ? "" : "";
  return `${sign}${deltaPct.toFixed(1)}%`;
}

function deltaColorClass(deltaPct: number): string {
  if (deltaPct > 0.05) return "text-emerald-600 dark:text-emerald-400";
  if (deltaPct < -0.05) return "text-destructive";
  return "text-muted-foreground";
}

export function AdjustmentsBreakdown({
  adjustments,
  positiveLabels,
  negativeLabels,
  className,
}: AdjustmentsBreakdownProps) {
  const { t } = useTranslation();

  const lines: AdjustmentLine[] = [
    {
      key: "mileage",
      labelKey: "estimation.adjustments.mileage",
      labelDefault: "Kilométrage",
      deltaPct: adjustments.mileageAdjustment.deltaPct,
      icon: Gauge,
    },
    {
      key: "condition",
      labelKey: "estimation.adjustments.condition",
      labelDefault: "État général",
      deltaPct: adjustments.conditionAdjustment.deltaPct,
      icon: Car,
    },
    {
      key: "maintenance",
      labelKey: "estimation.adjustments.maintenance",
      labelDefault: "Entretien",
      deltaPct: adjustments.maintenanceAdjustment.deltaPct,
      icon: Wrench,
    },
    {
      key: "accident",
      labelKey: "estimation.adjustments.accident",
      labelDefault: "Historique accident",
      deltaPct: adjustments.accidentAdjustment.deltaPct,
      icon: ShieldAlert,
    },
    {
      key: "ownership",
      labelKey: "estimation.adjustments.ownership",
      labelDefault: "Nombre de propriétaires",
      deltaPct: adjustments.ownershipAdjustment.deltaPct,
      icon: ShieldCheck,
    },
    {
      key: "usage",
      labelKey: "estimation.adjustments.usage",
      labelDefault: "Usage du véhicule",
      deltaPct: adjustments.usageAdjustment.deltaPct,
      icon: Calendar,
    },
  ];

  // Tri : non-zéro d'abord (par |delta| décroissant), zéros à la fin
  const sortedLines = [...lines].sort((a, b) => {
    const aZero = Math.abs(a.deltaPct) < 0.05;
    const bZero = Math.abs(b.deltaPct) < 0.05;
    if (aZero && !bZero) return 1;
    if (!aZero && bZero) return -1;
    return Math.abs(b.deltaPct) - Math.abs(a.deltaPct);
  });

  // Skip 0% lines pour ne pas polluer (mais garder un fallback si tout est 0)
  const visibleLines = sortedLines.filter((l) => Math.abs(l.deltaPct) >= 0.05);
  const linesToRender = visibleLines.length > 0 ? visibleLines : sortedLines.slice(0, 3);

  const totalDeltaPct = adjustments.totalDeltaPct;
  const capApplied = adjustments.adjustmentCapApplied;

  // Match positive/negative labels by line key (best-effort, library naive)
  const positiveLabelByKey = new Map<string, string>();
  const negativeLabelByKey = new Map<string, string>();
  for (const label of positiveLabels ?? []) {
    const lc = label.toLowerCase();
    if (lc.includes("kilom")) positiveLabelByKey.set("mileage", label);
    else if (lc.includes("état") || lc.includes("etat")) positiveLabelByKey.set("condition", label);
    else if (lc.includes("entret")) positiveLabelByKey.set("maintenance", label);
    else if (lc.includes("propri")) positiveLabelByKey.set("ownership", label);
  }
  for (const label of negativeLabels ?? []) {
    const lc = label.toLowerCase();
    if (lc.includes("kilom")) negativeLabelByKey.set("mileage", label);
    else if (lc.includes("état") || lc.includes("etat")) negativeLabelByKey.set("condition", label);
    else if (lc.includes("acci")) negativeLabelByKey.set("accident", label);
    else if (lc.includes("propri")) negativeLabelByKey.set("ownership", label);
    else if (lc.includes("intens") || lc.includes("usag")) negativeLabelByKey.set("usage", label);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={cn(
          "rounded-2xl border-border/60 bg-card/95 shadow-sm",
          className,
        )}
        data-testid="adjustments-breakdown"
      >
        <CardContent className="p-5 md:p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("estimation.adjustments.sectionLabel", "Pourquoi ce prix ?")}
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              {t(
                "estimation.adjustments.sectionHint",
                "Ajustements véhicule appliqués sur la valeur médiane",
              )}
            </p>
          </div>

          <ul className="divide-y divide-border/50" data-testid="adjustments-list">
            {linesToRender.map((line) => {
              const Icon = line.icon;
              const colorClass = deltaColorClass(line.deltaPct);
              const labelOverride =
                line.deltaPct > 0
                  ? positiveLabelByKey.get(line.key)
                  : line.deltaPct < 0
                  ? negativeLabelByKey.get(line.key)
                  : undefined;
              const displayLabel = labelOverride ?? t(line.labelKey, line.labelDefault);
              return (
                <li
                  key={line.key}
                  className="flex items-center justify-between gap-3 py-2.5"
                  data-testid={`adjustment-line-${line.key}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                    <p className="font-sans text-sm text-foreground truncate">{displayLabel}</p>
                  </div>
                  <span
                    className={cn("font-sans text-sm font-semibold tabular-nums", colorClass)}
                    data-testid={`adjustment-delta-${line.key}`}
                  >
                    {formatDelta(line.deltaPct)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2">
              <p className="font-sans text-sm font-medium text-foreground">
                {t("estimation.adjustments.total", "Ajustement global")}
              </p>
              {capApplied && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="h-5 px-2 font-sans text-[10px] normal-case border-amber-400/45 bg-amber-100/40 text-amber-900 cursor-help"
                      data-testid="adjustment-cap-badge"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" aria-hidden />
                      {t("estimation.adjustments.capBadge", "Cap appliqué")}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-sans text-xs">
                      {t(
                        "estimation.adjustments.capTooltip",
                        "Ajustement borné à ±20% pour rester réaliste face au marché.",
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <span
              className={cn(
                "font-sans text-base font-bold tabular-nums",
                deltaColorClass(totalDeltaPct),
              )}
              data-testid="adjustment-total"
            >
              {formatDelta(totalDeltaPct)}
            </span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default AdjustmentsBreakdown;
