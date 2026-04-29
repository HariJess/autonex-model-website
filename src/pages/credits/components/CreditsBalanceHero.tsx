import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Coins } from "lucide-react";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";
import { usePricing, type PricingMap } from "@/hooks/usePricing";

/**
 * Builds 1-3 user-actionable scenarios from the credits balance, using
 * live pricing from credit_pricing (so projection stays accurate if the
 * admin updates a price).
 *
 * Per Phase 11.b decision A1: projection in services ("X annonces + Y
 * boosts featured"), NOT a money-equivalent ratio ("≈ X MGA"), to avoid
 * a misleading single-ratio when the dégressif credit_packs pricing
 * varies 100-125 MGA/credit.
 *
 * NOTE i18n pluralization: scenario unit names are hardcoded French for
 * P11.b. Full fr/en/mg coverage will land alongside the broader credits
 * UX overhaul (P11.f). Acceptable trade-off for MVP.
 */
function buildBalanceProjection(
  balance: number,
  prices: PricingMap,
  t: TFunction,
): string {
  const PUBLISH = prices.publish_listing;
  if (balance < PUBLISH) {
    return t(
      "credits.balance.insufficient",
      "Pas encore assez pour publier une annonce ({{count}} crédits requis).",
      { count: PUBLISH },
    );
  }

  const URGENT = prices.boost_urgent;
  const FEATURED = prices.boost_featured;
  const TOP = prices.boost_top;

  const formatPublishes = (n: number) => `${n} ${n > 1 ? "annonces publiées" : "annonce publiée"}`;
  const formatUrgents = (n: number) => `${n} ${n > 1 ? "boosts urgents" : "boost urgent"}`;
  const formatFeatures = (n: number) => `${n} ${n > 1 ? "boosts featured" : "boost featured"}`;
  const formatTops = (n: number) => `${n} ${n > 1 ? "boosts top" : "boost top"}`;

  const parts: string[] = [];

  // Scenario 1: max publishes + best boost the remainder allows
  const publishes = Math.floor(balance / PUBLISH);
  const remainder = balance - publishes * PUBLISH;
  let mainScenario = formatPublishes(publishes);
  if (remainder >= FEATURED) {
    mainScenario += ` + ${formatFeatures(Math.floor(remainder / FEATURED))}`;
  } else if (remainder >= URGENT) {
    mainScenario += ` + ${formatUrgents(Math.floor(remainder / URGENT))}`;
  }
  parts.push(mainScenario);

  // Scenario 2: all urgents (entry-level boost focus)
  const urgents = Math.floor(balance / URGENT);
  if (urgents >= 2) {
    parts.push(formatUrgents(urgents));
  }

  // Scenario 3: all tops (premium boost focus)
  const tops = Math.floor(balance / TOP);
  if (tops >= 1) {
    parts.push(formatTops(tops));
  }

  return t("credits.balance.scenariosWith", "Avec ce solde : {{scenarios}}", {
    scenarios: parts.slice(0, 3).join(" OU "),
  });
}

/**
 * Hero card on /credits: shows the user's current balance and a concrete
 * projection of what services it can buy. Live values from useCreditsBalance
 * + usePricing.
 */
export function CreditsBalanceHero() {
  const { t } = useTranslation();
  const { data: balance = 0, isPending: balanceLoading } = useCreditsBalance();
  const { prices, isLoading: pricingLoading } = usePricing();

  const projection =
    balanceLoading || pricingLoading
      ? null
      : buildBalanceProjection(balance, prices, t);

  return (
    <Card className="rounded-2xl border-border bg-gradient-to-br from-card to-secondary/15">
      <CardContent className="py-6">
        <div className="flex items-start gap-4">
          <Coins className="h-10 w-10 text-primary mt-1 flex-shrink-0" />
          <div className="space-y-2 min-w-0">
            <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {t("credits.balanceLabel", "Votre solde")}
            </p>
            <p className="font-sans text-3xl md:text-4xl text-foreground">
              <span data-testid="credits-balance">
                {balanceLoading ? "…" : balance.toLocaleString("fr-FR")}
              </span>{" "}
              <span className="text-base text-muted-foreground">
                {t("credits.unit", "crédits")}
              </span>
            </p>
            {projection && (
              <p className="font-sans text-sm text-foreground leading-relaxed">
                {projection}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
