import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Coins } from "lucide-react";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";
import { usePricing, type PricingMap } from "@/hooks/usePricing";
import { formatNumber } from "@/features/credits/lib/creditFormatting";

/**
 * Hero card on /credits: shows the user's current balance and a concrete
 * breakdown of what services it can buy.
 *
 * PROMPT 3.5 refonte : la projection devient une LISTE À PUCES avec
 * calculs corrects (au lieu d'une chaîne "X annonces OU Y boosts" qui
 * était mathématiquement floue). Chaque option utilise une clé i18n
 * dédiée et passe par les pricings live (publish_listing, boost_bump,
 * boost_featured, boost_top).
 *
 * Si balance = 0 → message "Rechargez pour publier vos annonces…".
 * Sinon, on affiche les options atteignables (skip celles dont count = 0).
 */
type ProjectionLine = {
  key: string;
  i18nKey: string;
  fallback: string;
  count: number;
};

function buildBalanceProjectionLines(balance: number, prices: PricingMap): ProjectionLine[] {
  if (balance <= 0) return [];
  const PUBLISH = prices.publish_listing;
  // boost_daily_bump est la clé legacy (5000 crédits, 7 jours). PROMPT 1 a aussi
  // INSERT 'boost_bump' au même prix, mais PricingMap ne l'expose pas encore
  // côté types front. On lit la valeur legacy qui est sync (même prix).
  const BUMP = prices.boost_daily_bump;
  const FEATURED = prices.boost_featured;
  const TOP = prices.boost_top;

  const lines: ProjectionLine[] = [];
  if (PUBLISH > 0) {
    lines.push({
      key: "listings",
      i18nKey: "credits.balance.canDo.listings",
      fallback: "Publier {{count}} annonce(s) 30j",
      count: Math.floor(balance / PUBLISH),
    });
  }
  if (BUMP > 0) {
    lines.push({
      key: "bumps",
      i18nKey: "credits.balance.canDo.bumps",
      fallback: "OU activer {{count}} boost(s) Remontée",
      count: Math.floor(balance / BUMP),
    });
  }
  if (FEATURED > 0) {
    lines.push({
      key: "featured",
      i18nKey: "credits.balance.canDo.featured",
      fallback: "OU {{count}} boost(s) À la une 7j",
      count: Math.floor(balance / FEATURED),
    });
  }
  if (TOP > 0) {
    lines.push({
      key: "topAd",
      i18nKey: "credits.balance.canDo.topAd",
      fallback: "OU {{count}} Top Annonce 30j",
      count: Math.floor(balance / TOP),
    });
  }

  // Skip les options inatteignables (count = 0). Garde au minimum la 1re ligne
  // pour montrer que le solde permet quelque chose si balance >= PUBLISH.
  return lines.filter((l) => l.count > 0);
}

export function CreditsBalanceHero() {
  const { t } = useTranslation();
  const { data: balance = 0, isPending: balanceLoading } = useCreditsBalance();
  const { prices, isLoading: pricingLoading } = usePricing();

  const ready = !balanceLoading && !pricingLoading;
  const lines = ready ? buildBalanceProjectionLines(balance, prices) : [];
  const PUBLISH = prices.publish_listing;
  const showInsufficient = ready && balance > 0 && balance < PUBLISH;
  const showEmpty = ready && balance === 0;

  return (
    <Card className="rounded-2xl border-border bg-gradient-to-br from-card to-secondary/15">
      <CardContent className="py-6">
        <div className="flex items-start gap-4">
          <Coins className="h-10 w-10 text-primary mt-1 flex-shrink-0" />
          <div className="space-y-3 min-w-0 flex-1">
            <div>
              <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {t("credits.balanceLabel", "Votre solde")}
              </p>
              <p className="font-sans text-3xl md:text-4xl text-foreground">
                <span data-testid="credits-balance">
                  {balanceLoading ? "…" : formatNumber(balance)}
                </span>{" "}
                <span className="text-base text-muted-foreground">
                  {t("credits.unit", "crédits")}
                </span>
              </p>
            </div>

            {showEmpty && (
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                {t(
                  "credits.balance.empty",
                  "Rechargez pour publier vos annonces et activer des boosts.",
                )}
              </p>
            )}

            {showInsufficient && (
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                {t(
                  "credits.balance.insufficient",
                  "Pas encore assez pour publier une annonce ({{count}} crédits requis).",
                  { count: PUBLISH },
                )}
              </p>
            )}

            {lines.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-sans text-sm font-medium text-foreground">
                  {t("credits.balance.canDo.title", "Avec ce solde, vous pouvez :")}
                </p>
                <ul className="space-y-1 font-sans text-sm text-muted-foreground" data-testid="balance-projection">
                  {lines.map((line) => (
                    <li key={line.key} className="flex items-start gap-2">
                      <span aria-hidden="true" className="text-primary mt-0.5">•</span>
                      <span>{t(line.i18nKey, line.fallback, { count: line.count })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
