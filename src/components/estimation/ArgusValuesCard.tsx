import { Building2, Wrench, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatAriary } from "@/lib/estimation/constants";
import { cn } from "@/lib/utils";

/**
 * PROMPT 10D — 2 cards Argus (Reprise pro / En concession).
 *
 * La card "Entre particuliers" a été supprimée (doublon sémantique avec la
 * valeur centrale du hero principal).
 *
 * Mode V1 (legacy fallback) : 1 seule card "Valeur de marché estimée".
 */

export type ArgusValuesCardValues = {
  tradeInPro?: number;
  privateMarket?: number;
  dealerRetail?: number;
  estimatedValue: number;
};

export type ArgusValuesCardProps = {
  values: ArgusValuesCardValues;
  isV2: boolean;
  className?: string;
};

type CardSpec = {
  key: "trade_in_pro" | "dealer_retail";
  title: string;
  subtitle: string;
  tooltip: string;
  icon: LucideIcon;
};

export function ArgusValuesCard({ values, isV2, className }: ArgusValuesCardProps) {
  const { t } = useTranslation();

  if (!isV2) {
    return (
      <Card
        className={cn(
          "rounded-2xl border-border/60 bg-card/95 shadow-sm",
          className,
        )}
        data-testid="argus-values-legacy"
      >
        <CardContent className="p-5 md:p-6">
          <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {t("estimation.argus.legacy.label", "Valeur de marché estimée")}
          </p>
          <p className="mt-2 font-sans text-3xl md:text-4xl font-semibold tabular-nums text-foreground">
            {formatAriary(values.estimatedValue)}
          </p>
        </CardContent>
      </Card>
    );
  }

  const tradeInPro = values.tradeInPro ?? 0;
  const dealerRetail = values.dealerRetail ?? 0;

  const specs: CardSpec[] = [
    {
      key: "trade_in_pro",
      title: t("estimation.argus.tradeInPro.title", "Reprise pro"),
      subtitle: t(
        "estimation.argus.tradeInPro.subtitle",
        "Prix typique payé par un concessionnaire en rachat. Inclut sa marge.",
      ),
      tooltip: t(
        "estimation.argus.tradeInPro.tooltip",
        "Prix typique payé par un concessionnaire qui rachète votre voiture pour la revendre.",
      ),
      icon: Wrench,
    },
    {
      key: "dealer_retail",
      title: t("estimation.argus.dealerRetail.title", "En concession"),
      subtitle: t(
        "estimation.argus.dealerRetail.subtitle",
        "Prix retail typique en concession, avec garantie et services.",
      ),
      tooltip: t(
        "estimation.argus.dealerRetail.tooltip",
        "Prix retail typique en concession, incluant la marge et la garantie.",
      ),
      icon: Building2,
    },
  ];

  const valueByKey: Record<CardSpec["key"], number> = {
    trade_in_pro: tradeInPro,
    dealer_retail: dealerRetail,
  };

  return (
    <TooltipProvider delayDuration={200}>
      <section
        className={cn(
          "grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4",
          className,
        )}
        aria-label={t(
          "estimation.argus.sectionAria",
          "Valeurs Argus-grade : reprise pro et en concession",
        )}
        data-testid="argus-values-v2"
      >
        {specs.map((spec) => {
          const Icon = spec.icon;
          const value = valueByKey[spec.key];
          return (
            <Tooltip key={spec.key}>
              <TooltipTrigger asChild>
                <Card
                  className="rounded-2xl border border-border/60 bg-card/90 shadow-sm transition-all duration-200 ease-out hover:shadow-md cursor-help"
                  data-testid={`argus-card-${spec.key}`}
                  data-emphasis="secondary"
                >
                  <CardContent className="flex flex-col gap-2 p-4 md:p-5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {spec.title}
                      </p>
                    </div>
                    <p className="font-sans tabular-nums font-bold tracking-tight text-2xl md:text-2xl text-foreground">
                      {formatAriary(value)}
                    </p>
                    <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                      {spec.subtitle}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-sans text-xs">{spec.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </section>
    </TooltipProvider>
  );
}

export default ArgusValuesCard;
