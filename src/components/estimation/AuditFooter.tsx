import { BookOpen, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { EstimationAuditV2 } from "@/types/estimation";

/**
 * PROMPT 10B — Footer méthodologie au pied du rapport d'estimation.
 *
 * Toujours visible : lien vers `/estimation/methodologie` + disclaimer permanent.
 * Visible UNIQUEMENT en V2 (audit présent) : bloc détails techniques (rangeMethod,
 * transactionFactorAvg, version, capApplied).
 */

export type AuditFooterProps = {
  audit?: EstimationAuditV2;
  className?: string;
};

const RANGE_METHOD_LABELS: Record<EstimationAuditV2["rangeMethod"], string> = {
  percentile_p10_p90: "P10 / P90 réels (≥8 comparables)",
  percentile_p25_p75: "P25 / P75 (5-7 comparables)",
  synthetic_spread: "Fourchette synthétique (<5 comparables)",
};

export function AuditFooter({ audit, className }: AuditFooterProps) {
  const { t } = useTranslation();

  return (
    <footer
      className={cn(
        "rounded-xl border border-border/60 bg-card/85 px-4 py-4 space-y-3",
        className,
      )}
      data-testid="audit-footer"
    >
      <Link
        to="/estimation/methodologie"
        className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded"
        data-testid="audit-footer-methodology-link"
      >
        <BookOpen className="h-4 w-4" aria-hidden />
        {t(
          "estimation.audit.methodologyLink",
          "Comment cette estimation est calculée",
        )}
      </Link>

      {audit && (
        <div
          className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 pt-2 border-t border-border/50"
          data-testid="audit-footer-details"
        >
          <p className="font-sans text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("estimation.audit.rangeMethod", "Fourchette")}
              {" : "}
            </span>
            <span data-testid="audit-range-method">{RANGE_METHOD_LABELS[audit.rangeMethod]}</span>
          </p>
          <p className="font-sans text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("estimation.audit.factorAvg", "Facteur transaction moyen")}
              {" : "}
            </span>
            <span className="tabular-nums" data-testid="audit-factor-avg">
              {audit.transactionFactorAvg.toFixed(2)}
            </span>
          </p>
          <p className="font-sans text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("estimation.audit.engineVersion", "Version moteur")}
              {" : "}
            </span>
            <code className="font-mono text-[11px]" data-testid="audit-engine-version">
              {audit.transactionFactorVersion}
            </code>
          </p>
          {audit.capApplied && (
            <p
              className="font-sans text-xs text-amber-700 dark:text-amber-400"
              data-testid="audit-cap-applied"
            >
              <Info className="inline h-3 w-3 mr-1" aria-hidden />
              {t(
                "estimation.audit.capApplied",
                "Plafond d'ajustement appliqué (cap +12%)",
              )}
            </p>
          )}
        </div>
      )}

      <p
        className="font-sans text-xs leading-relaxed text-muted-foreground border-t border-border/50 pt-3"
        data-testid="audit-footer-disclaimer"
      >
        {t(
          "estimation.audit.disclaimer",
          "Cette estimation est indicative. Les transactions réelles peuvent varier selon l'état précis du véhicule, la négociation, et le contexte du marché à un instant donné.",
        )}
      </p>
    </footer>
  );
}

export default AuditFooter;
