import { Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * PROMPT 10B — Badge "Calculé sur N comparables — Données du DD/MM/YYYY".
 *
 * Affiché en bandeau discret sous les 3 cards Argus. Bâtit la confiance en
 * exposant explicitement la fraîcheur de la donnée + ventilation par source.
 *
 * Si `comparableCountUsed === 0` ou `lastDataUpdate === null`, fallback sur un
 * message neutre (cas profil de référence sans comparables réels).
 */

export type DataFreshnessBadgeProps = {
  comparableCountUsed: number;
  comparableSourceBreakdown?: { marketClean: number; autonexActive: number };
  lastDataUpdate: string | null;
  className?: string;
};

const FRENCH_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatDateFr(iso: string | null): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, "0");
  const month = FRENCH_MONTHS[d.getMonth()] ?? "";
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function DataFreshnessBadge({
  comparableCountUsed,
  comparableSourceBreakdown,
  lastDataUpdate,
  className,
}: DataFreshnessBadgeProps) {
  const { t } = useTranslation();
  const formattedDate = formatDateFr(lastDataUpdate);

  if (comparableCountUsed === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/60 bg-secondary/15 px-3 py-2.5",
          className,
        )}
        role="note"
        data-testid="data-freshness-empty"
      >
        <div className="flex items-start gap-2">
          <Database className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            {t(
              "estimation.freshness.noComparables",
              "Aucun comparable direct trouvé. Estimation calculée à partir d'un profil de référence du modèle.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const market = comparableSourceBreakdown?.marketClean ?? 0;
  const autonex = comparableSourceBreakdown?.autonexActive ?? 0;
  const hasBreakdown = market + autonex > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-secondary/15 px-3 py-2.5",
        className,
      )}
      role="note"
      data-testid="data-freshness-badge"
    >
      <div className="flex items-start gap-2">
        <Database className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        <p className="font-sans text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("estimation.freshness.calculatedOn", "Calculé sur {{count}} comparables", {
              count: comparableCountUsed,
            })}
          </span>
          {hasBreakdown && (
            <>
              {" "}
              <span data-testid="data-freshness-breakdown">
                {t(
                  "estimation.freshness.breakdown",
                  "({{market}} du marché public, {{autonex}} AutoNex)",
                  { market, autonex },
                )}
              </span>
            </>
          )}
          {formattedDate && (
            <>
              .{" "}
              <span data-testid="data-freshness-date">
                {t("estimation.freshness.lastUpdate", "Données mises à jour le {{date}}.", {
                  date: formattedDate,
                })}
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default DataFreshnessBadge;
