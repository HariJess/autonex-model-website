import { Building2, Users, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
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
 * PROMPT 10B — 3 cards Argus-grade (Reprise pro / Entre particuliers / En concession).
 *
 * Mode V2 : 3 cards distinctes avec emphase sur la centrale (Entre particuliers).
 * Mode V1 (legacy fallback) : 1 seule card "Valeur de marché estimée" (= comportement
 * UI avant refonte, pas de regression visible si le backend renvoie un legacy output).
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
  key: "trade_in_pro" | "private_market" | "dealer_retail";
  title: string;
  subtitle: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  emphasis: "primary" | "secondary";
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

  // V2 mode : 3 cards
  const tradeInPro = values.tradeInPro ?? 0;
  const privateMarket = values.privateMarket ?? values.estimatedValue;
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
        "× 0.78 du prix médian = ce que paie un dealer en rachat",
      ),
      icon: Wrench,
      emphasis: "secondary",
    },
    {
      key: "private_market",
      title: t("estimation.argus.privateMarket.title", "Entre particuliers"),
      subtitle: t(
        "estimation.argus.privateMarket.subtitle",
        "Prix attendu pour une vente directe entre particuliers.",
      ),
      tooltip: t(
        "estimation.argus.privateMarket.tooltip",
        "× 1.00 = prix de transaction médian observé sur le marché",
      ),
      icon: Users,
      emphasis: "primary",
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
        "× 1.15 du prix médian = retail avec marge et garantie",
      ),
      icon: Building2,
      emphasis: "secondary",
    },
  ];

  const valueByKey: Record<CardSpec["key"], number> = {
    trade_in_pro: tradeInPro,
    private_market: privateMarket,
    dealer_retail: dealerRetail,
  };

  return (
    <TooltipProvider delayDuration={200}>
      <section
        className={cn(
          "grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4",
          className,
        )}
        aria-label={t(
          "estimation.argus.sectionAria",
          "Trois valeurs Argus-grade : reprise pro, entre particuliers, en concession",
        )}
        data-testid="argus-values-v2"
      >
        {specs.map((spec) => {
          const Icon = spec.icon;
          const value = valueByKey[spec.key];
          const isPrimary = spec.emphasis === "primary";
          return (
            <Tooltip key={spec.key}>
              <TooltipTrigger asChild>
                <Card
                  className={cn(
                    "rounded-2xl shadow-sm transition-all duration-200 ease-out hover:shadow-md cursor-help",
                    isPrimary
                      ? "border-2 border-primary/45 bg-primary/[0.06] md:scale-[1.03] md:-mt-1"
                      : "border border-border/60 bg-card/90",
                  )}
                  data-testid={`argus-card-${spec.key}`}
                  data-emphasis={spec.emphasis}
                >
                  <CardContent
                    className={cn(
                      "flex flex-col gap-2 p-4 md:p-5",
                      isPrimary && "md:p-6",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            isPrimary ? "text-primary" : "text-muted-foreground",
                          )}
                          aria-hidden
                        />
                        <p
                          className={cn(
                            "font-sans text-[11px] uppercase tracking-[0.14em]",
                            isPrimary ? "text-primary/85" : "text-muted-foreground",
                          )}
                        >
                          {spec.title}
                        </p>
                      </div>
                      {isPrimary && (
                        <Badge
                          variant="default"
                          className="h-5 px-2 font-sans text-[10px] normal-case"
                        >
                          {t("estimation.argus.recommended", "Recommandé")}
                        </Badge>
                      )}
                    </div>
                    <p
                      className={cn(
                        "font-sans tabular-nums font-bold tracking-tight",
                        isPrimary
                          ? "text-3xl md:text-4xl text-primary"
                          : "text-2xl md:text-2xl text-foreground",
                      )}
                    >
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
