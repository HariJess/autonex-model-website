import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Gift, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreditBalance } from "@/features/credits/hooks/useCreditBalance";
import { formatNumber } from "@/features/credits/lib/creditFormatting";
import { LISTING_PUBLISH_CREDIT_COST } from "@/config/monetization";

/**
 * Bannière welcome affichée sur /dashboard pour les nouveaux users qui n'ont
 * pas encore commencé à dépenser leurs crédits offerts.
 *
 * Conditions d'affichage (toutes doivent être true) :
 *   - User authentifié (géré par useCreditBalance qui retourne 0 si pas user)
 *   - granted > 80,000 (= n'a pas encore beaucoup dépensé)
 *   - granted > 0 (= a un grant actif)
 *   - non dismiss via localStorage flag
 *
 * Dismiss persiste dans localStorage (flag `autonex.welcomeBannerDismissed`).
 * Pas de re-show même si solde redevient élevé après reset.
 */

const DISMISS_STORAGE_KEY = "autonex.welcomeBannerDismissed";
const ACTIVE_GRANT_THRESHOLD = 80_000;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const expiry = new Date(iso).getTime();
  const diffMs = expiry - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function persistDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, "true");
  } catch {
    // localStorage indispo (mode privé strict) → on ignore, banner réapparaîtra au reload
  }
}

export function CreditWelcomeBanner() {
  const { t } = useTranslation();
  const { granted, grantedReceived, grantedExpiresAt } = useCreditBalance();
  // Lazy init pour éviter l'accès localStorage côté SSR
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  // Sync entre tabs : si l'user dismiss dans un autre onglet, on reflète ici.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISMISS_STORAGE_KEY && e.newValue === "true") {
        setDismissed(true);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Conditions d'affichage strictes
  if (dismissed) return null;
  if (granted <= 0) return null;
  if (granted < ACTIVE_GRANT_THRESHOLD) return null;

  const daysLeft = daysUntil(grantedExpiresAt);
  const listingsCount = Math.floor(granted / LISTING_PUBLISH_CREDIT_COST);
  // PROMPT 4.3 : logique adaptative reçu vs restant.
  // Si granted >= grantedReceived, le user n'a rien consommé encore (premier login).
  // Sinon, il a déjà commencé → on affiche le restant + le total reçu.
  const hasNotStartedSpending = grantedReceived > 0 && granted >= grantedReceived;

  const handleDismiss = () => {
    persistDismissed();
    setDismissed(true);
  };

  return (
    <Card className="relative border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:border-amber-500/30 dark:from-amber-950/40 dark:to-background">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("credits.welcome.dismiss", "Fermer")}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          <Gift className="h-6 w-6" />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {hasNotStartedSpending
                ? t("credits.welcome.title", "Bienvenue sur AutoNex !")
                : t("credits.welcome.titleRemaining", "Vos crédits offerts")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasNotStartedSpending
                ? t("credits.welcome.bodyInitial", {
                    defaultValue:
                      "Vous avez reçu {{amount}} crédits offerts ({{listings}} annonces gratuites). Expirent dans {{days}} jours.",
                    amount: formatNumber(grantedReceived),
                    listings: listingsCount,
                    days: daysLeft ?? "—",
                  })
                : t("credits.welcome.bodyRemaining", {
                    defaultValue:
                      "Il vous reste {{remaining}} crédits offerts (sur {{received}} reçus). Soit {{listings}} annonces gratuites. Expirent dans {{days}} jours.",
                    remaining: formatNumber(granted),
                    received: formatNumber(grantedReceived),
                    listings: listingsCount,
                    days: daysLeft ?? "—",
                  })}
            </p>
          </div>

          <Button asChild className="gradient-primary border-0">
            <Link to="/publier">{t("credits.welcome.cta", "Publier ma première annonce")}</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
