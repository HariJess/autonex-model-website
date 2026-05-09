import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Clock, ListChecks, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useMyRateLimitStatus, type RateLimitStatus } from "@/hooks/useMyRateLimitStatus";

/**
 * RateLimitStatusCard (PROMPT 8 V1).
 *
 * Card non-dismissable affichée sur Dashboard. 4 variants :
 *   1. allowed=true → état normal (compteurs actifs/24h + progress bar)
 *   2. rate_limit_active_listings → bandeau orange + CTA upgrade verified
 *   3. rate_limit_publish_24h → bandeau orange (réessayer plus tard)
 *   4. rate_limit_cooldown → bandeau jaune + countdown live (1s tick)
 *
 * Skip render si le user est admin (allowed=true + active_listings_limit=999
 * — sentinelle de can_publish_listing) — affichage muet.
 */
export function RateLimitStatusCard() {
  const { data, isPending } = useMyRateLimitStatus();

  if (isPending) {
    return (
      <Card className="rounded-2xl border-border" data-testid="rate-limit-card-loading">
        <CardContent className="py-5">
          <div className="h-12 animate-pulse rounded bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Admin sentinel : limite 999 = exempt — pas la peine d'afficher.
  if (data.allowed && data.active_listings_limit >= 999) return null;

  if (data.reason === "rate_limit_active_listings") {
    return <ActiveListingsExceeded data={data} />;
  }
  if (data.reason === "rate_limit_publish_24h") {
    return <Publishes24hExceeded data={data} />;
  }
  if (data.reason === "rate_limit_cooldown") {
    return <CooldownActive data={data} />;
  }
  return <NormalState data={data} />;
}

// ─── Variant 1 : Normal ────────────────────────────────────────────────

function NormalState({ data }: { data: RateLimitStatus }) {
  const { t } = useTranslation();
  const activePct = Math.min(100, (data.active_listings_count / data.active_listings_limit) * 100);

  return (
    <Card
      className="rounded-2xl border-border"
      data-testid="rate-limit-card"
      data-variant="normal"
    >
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p className="font-sans text-sm font-medium text-foreground">
            {t("rateLimit.title", "Limites de publication")}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-sans text-xs text-muted-foreground">
              {t("rateLimit.activeListings.label", "Annonces actives")}
            </span>
            <span
              className="font-sans text-sm font-medium text-foreground"
              data-testid="rate-limit-active-count"
            >
              {t("rateLimit.activeListings.usage", "{{count}} / {{limit}}", {
                count: data.active_listings_count,
                limit: data.active_listings_limit,
              })}
            </span>
          </div>
          <Progress
            value={activePct}
            aria-label={t("rateLimit.activeListings.label", "Annonces actives")}
          />
        </div>

        <p className="font-sans text-xs text-muted-foreground">
          {t("rateLimit.publishes24h.usage", "Publications 24h : {{count}} / {{limit}}", {
            count: data.publishes_24h_count,
            limit: data.publishes_24h_limit,
          })}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Variant 2 : rate_limit_active_listings ────────────────────────────

function ActiveListingsExceeded({ data }: { data: RateLimitStatus }) {
  const { t } = useTranslation();
  // Affiche CTA "Devenir vérifié" si user n'est pas déjà au cap verified (5)
  // ni au cap agency (20) — soit limit < 5 (= non-verified, limit=3).
  const showVerifyCta = data.active_listings_limit < 5;

  return (
    <Card
      className="rounded-2xl border-orange-200 bg-orange-50/40 dark:border-orange-900/40 dark:bg-orange-950/20"
      data-testid="rate-limit-card"
      data-variant="rate_limit_active_listings"
    >
      <CardContent className="py-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="font-sans text-sm font-medium text-orange-900 dark:text-orange-200">
            {t("rateLimit.exceeded.activeLimit.title", "Limite d'annonces atteinte")}
          </p>
          <p className="font-sans text-xs text-orange-800/80 dark:text-orange-300/70 leading-relaxed">
            {t(
              "rateLimit.exceeded.activeLimit.body",
              "Vous avez {{count}} / {{limit}} annonces actives. Vendez ou attendez l'expiration d'une annonce pour publier à nouveau.",
              {
                count: data.active_listings_count,
                limit: data.active_listings_limit,
              },
            )}
          </p>
          {showVerifyCta && (
            <Button asChild size="sm" variant="outline" className="font-sans gap-1.5">
              <Link to="/verification">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {t(
                  "rateLimit.exceeded.activeLimit.upgradeCta",
                  "Devenir vendeur vérifié (5 annonces)",
                )}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Variant 3 : rate_limit_publish_24h ────────────────────────────────

function Publishes24hExceeded({ data }: { data: RateLimitStatus }) {
  const { t } = useTranslation();
  return (
    <Card
      className="rounded-2xl border-orange-200 bg-orange-50/40 dark:border-orange-900/40 dark:bg-orange-950/20"
      data-testid="rate-limit-card"
      data-variant="rate_limit_publish_24h"
    >
      <CardContent className="py-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-sans text-sm font-medium text-orange-900 dark:text-orange-200">
            {t("rateLimit.exceeded.publish24h.title", "Limite quotidienne atteinte")}
          </p>
          <p className="font-sans text-xs text-orange-800/80 dark:text-orange-300/70 leading-relaxed">
            {t(
              "rateLimit.exceeded.publish24h.body",
              "Vous avez publié {{count}} annonces dans les 24 dernières heures. La limite est de {{limit}}/jour. Réessayez plus tard.",
              {
                count: data.publishes_24h_count,
                limit: data.publishes_24h_limit,
              },
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Variant 4 : rate_limit_cooldown ────────────────────────────────────

function CooldownActive({ data }: { data: RateLimitStatus }) {
  const { t } = useTranslation();
  // Countdown tick local pour décrémenter chaque seconde sans refetch RPC
  const [remaining, setRemaining] = useState(data.cooldown_remaining_seconds);

  useEffect(() => {
    setRemaining(data.cooldown_remaining_seconds);
  }, [data.cooldown_remaining_seconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  if (remaining <= 0) {
    // Le cooldown est expiré côté UI mais RPC pas encore re-fetched —
    // afficher état normal en attendant.
    return <NormalState data={data} />;
  }

  return (
    <Card
      className={cn(
        "rounded-2xl border-amber-200 bg-amber-50/40",
        "dark:border-amber-900/40 dark:bg-amber-950/20",
      )}
      data-testid="rate-limit-card"
      data-variant="rate_limit_cooldown"
    >
      <CardContent className="py-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-sans text-sm font-medium text-amber-900 dark:text-amber-200">
            {t("rateLimit.cooldown.title", "Patientez quelques secondes")}
          </p>
          <p
            className="font-sans text-xs text-amber-800/80 dark:text-amber-300/70 leading-relaxed"
            data-testid="rate-limit-cooldown-countdown"
          >
            {t("rateLimit.cooldown.body", "Vous pourrez publier à nouveau dans {{seconds}} secondes.", {
              seconds: remaining,
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
