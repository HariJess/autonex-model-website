import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { BadgeCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { YasBackButton } from "@/features/yas-app/components/YasBackButton";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import { useMyVerification } from "@/hooks/verification/useMyVerification";
import { useMySellerBadge } from "@/hooks/verification/useMySellerBadge";
import { VerificationFlow } from "@/components/verification/VerificationFlow";

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
 * Route /verification (auth-gated).
 *
 * 3 variants selon état :
 *   - badge actif → ApprovedView (grand badge + date expiration)
 *   - status pending → PendingView (bandeau orange "en cours de review")
 *   - rejected ou none → VerificationFlow (multi-step submission/re-submission)
 */
const VerificationPage = () => {
  const { t } = useTranslation();
  const { data: verification, isPending: verifLoading } = useMyVerification();
  const { data: badge, isPending: badgeLoading } = useMySellerBadge();

  const loading = verifLoading || badgeLoading;
  const hasActiveBadge =
    badge && new Date(badge.expires_at).getTime() > Date.now();
  const isPending =
    verification?.status === "pending" || verification?.status === "reviewing";

  return (
    <>
      <Helmet>
        <title>
          {t("verification.title", "Vendeur vérifié")} — AutoNex
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      <main className="container mx-auto max-w-2xl py-6 md:py-8 space-y-5">
        <YasBackButton />
        <header className="space-y-1">
          <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("verification.overline", "Identité")}
          </p>
          <h1 className="font-sans text-2xl md:text-3xl text-foreground">
            {t("verification.title", "Vendeur vérifié")}
          </h1>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {t("verification.subtitle", "Renforcez la confiance de vos acheteurs")}
          </p>
        </header>

        {loading && (
          <div className="flex justify-center py-12">
            <WheelSpinner size="md" />
          </div>
        )}

        {!loading && hasActiveBadge && badge && (
          <Card
            className="rounded-2xl border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
            data-testid="verification-page-approved"
          >
            <CardContent className="py-8 text-center space-y-3">
              <BadgeCheck className="h-12 w-12 mx-auto text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <p className="font-sans text-lg font-semibold text-emerald-900 dark:text-emerald-200">
                {t("verification.statusCard.approved.title", "Vendeur vérifié ✓")}
              </p>
              <p className="font-sans text-sm text-emerald-800/80 dark:text-emerald-300/70">
                {t(
                  "verification.statusCard.approved.body",
                  "Votre badge est actif jusqu'au {{date}}.",
                  { date: formatDate(badge.expires_at) },
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !hasActiveBadge && isPending && verification && (
          <Card
            className="rounded-2xl border-orange-200 bg-orange-50/40 dark:border-orange-900/40 dark:bg-orange-950/20"
            data-testid="verification-page-pending"
          >
            <CardContent className="py-6 space-y-2 text-center">
              <p className="font-sans text-base font-semibold text-orange-900 dark:text-orange-200">
                {t("verification.statusCard.pending.title", "Vérification en cours")}
              </p>
              <p className="font-sans text-sm text-orange-800/80 dark:text-orange-300/70">
                {t(
                  "verification.statusCard.pending.body",
                  "Réponse sous 48h. Soumis le {{date}}.",
                  { date: formatDate(verification.submitted_at) },
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !hasActiveBadge && !isPending && (
          <VerificationFlow
            lastRejection={
              verification?.status === "rejected" ? verification : null
            }
          />
        )}
      </main>
      <Footer />
    </>
  );
};

export default VerificationPage;
