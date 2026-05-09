import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BadgeCheck, Clock, ShieldAlert, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMyVerification } from "@/hooks/verification/useMyVerification";
import { useMySellerBadge } from "@/hooks/verification/useMySellerBadge";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Card adaptive selon les 4 états utilisateur :
 *   1. approved (badge actif)   → variant vert + date expiration
 *   2. pending (en review)      → variant orange + spinner subtle
 *   3. rejected (refusé)        → variant rouge + raison + CTA Re-soumettre
 *   4. none (jamais soumis)     → variant primary + CTA Devenir vérifié
 *
 * Affichée typiquement sur Dashboard. Click CTA → /verification.
 */
export function VerificationStatusCard() {
  const { t } = useTranslation();
  const { data: verification, isPending: verifLoading } = useMyVerification();
  const { data: badge, isPending: badgeLoading } = useMySellerBadge();

  if (verifLoading || badgeLoading) {
    return (
      <Card className="rounded-2xl border-border" data-testid="verification-status-card-loading">
        <CardContent className="py-5">
          <div className="h-16 animate-pulse rounded bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  // 1. Approved — badge actif
  if (badge && new Date(badge.expires_at).getTime() > Date.now()) {
    return (
      <Card
        data-testid="verification-status-card"
        data-variant="approved"
        className="rounded-2xl border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
      >
        <CardContent className="py-5 flex items-start gap-3">
          <BadgeCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-medium text-emerald-900 dark:text-emerald-200">
              {t("verification.statusCard.approved.title", "Vendeur vérifié ✓")}
            </p>
            <p className="mt-1 font-sans text-xs text-emerald-800/80 dark:text-emerald-300/70 leading-relaxed">
              {t(
                "verification.statusCard.approved.body",
                "Votre badge est actif jusqu'au {{date}}.",
                { date: formatDate(badge.expires_at) },
              )}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="font-sans">
            <Link to="/verification">{t("verification.statusCard.approved.cta", "Détails")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 2. Pending
  if (verification?.status === "pending" || verification?.status === "reviewing") {
    return (
      <Card
        data-testid="verification-status-card"
        data-variant="pending"
        className="rounded-2xl border-orange-200 bg-orange-50/50 dark:border-orange-900/40 dark:bg-orange-950/20"
      >
        <CardContent className="py-5 flex items-start gap-3">
          <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-medium text-orange-900 dark:text-orange-200">
              {t("verification.statusCard.pending.title", "Vérification en cours")}
            </p>
            <p className="mt-1 font-sans text-xs text-orange-800/80 dark:text-orange-300/70 leading-relaxed">
              {t(
                "verification.statusCard.pending.body",
                "Réponse sous 48h. Soumis le {{date}}.",
                { date: formatDate(verification.submitted_at) },
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Rejected
  if (verification?.status === "rejected") {
    return (
      <Card
        data-testid="verification-status-card"
        data-variant="rejected"
        className="rounded-2xl border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
      >
        <CardContent className="py-5 flex items-start gap-3">
          <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-medium text-red-900 dark:text-red-200">
              {t("verification.statusCard.rejected.title", "Vérification refusée")}
            </p>
            {verification.rejection_reason && (
              <p className="mt-1 font-sans text-xs text-red-800/80 dark:text-red-300/70 leading-relaxed">
                <span className="font-medium">
                  {t("verification.statusCard.rejected.reasonLabel", "Raison :")}
                </span>{" "}
                {verification.rejection_reason}
              </p>
            )}
          </div>
          <Button asChild size="sm" variant="default" className="font-sans">
            <Link to="/verification">{t("verification.statusCard.rejected.cta", "Re-soumettre")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 4. None (jamais soumis OU expired)
  return (
    <Card
      data-testid="verification-status-card"
      data-variant="none"
      className="rounded-2xl border-border bg-gradient-to-br from-card to-secondary/15"
    >
      <CardContent className="py-5 flex items-start gap-3">
        <Sparkles className="h-6 w-6 text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-medium text-foreground">
            {t("verification.statusCard.none.title", "Devenez vendeur vérifié")}
          </p>
          <p className="mt-1 font-sans text-xs text-muted-foreground leading-relaxed">
            {t(
              "verification.statusCard.none.subtitle",
              "Renforcez la confiance des acheteurs. Plus de contacts sur vos annonces.",
            )}
          </p>
        </div>
        <Button asChild size="sm" className="font-sans gap-1.5">
          <Link to="/verification">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {t("verification.statusCard.none.cta", "Commencer")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
