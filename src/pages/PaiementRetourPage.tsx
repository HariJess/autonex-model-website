import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BetaPaymentBanner } from "@/components/payments/BetaPaymentBanner";
import { usePollingStatus } from "@/hooks/payments/useVpiCheckStatus";
import { captureVpiMessage } from "@/lib/monitoring";

/**
 * Route: /paiement/retour?tx=<uuid>
 *
 * Landing page hit after the Vanilla Pay hosted checkout (or the
 * vpi-dry-run-checkout helper in staging) redirects the user back. Polls
 * vpi-check-status every 3s until the transaction reaches a terminal state
 * (approved | failed | rejected | cancelled) or the 5-minute timeout elapses.
 */
const PaiementRetourPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txId = searchParams.get("tx");

  const { status, isLoading, error, isTimedOut, isTerminal } = usePollingStatus(txId);

  // Track anomalous arrivals (bug in redirect URL, email share of the URL, etc.).
  useEffect(() => {
    if (!txId) {
      captureVpiMessage(
        "VPI return page without tx_id",
        "warning",
        "return_missing_tx",
      );
    }
  }, [txId]);

  const goToCredits = () => navigate("/credits");
  const goToDashboard = () => navigate("/dashboard");

  const renderBody = () => {
    if (!txId) {
      return (
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <XCircle className="h-10 w-10 text-destructive" aria-hidden />
          <p className="text-center font-sans text-sm text-muted-foreground">
            {t(
              "payment.vanilla.missingTxId",
              "Référence de transaction manquante. Retournez à la page des crédits.",
            )}
          </p>
          <Button onClick={goToCredits}>
            {t("payment.vanilla.viewCreditsButton", "Voir mes crédits")}
          </Button>
        </CardContent>
      );
    }

    if (isTerminal && status === "approved") {
      return (
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden />
          <h2 className="font-serif text-lg text-foreground">
            {t("payment.vanilla.successHeading", "Paiement confirmé")}
          </h2>
          <p className="text-center font-sans text-sm text-muted-foreground leading-relaxed">
            {t(
              "payment.vanilla.successMessage",
              "Vos crédits ont été ajoutés à votre compte.",
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={goToCredits}>
              {t("payment.vanilla.viewCreditsButton", "Voir mes crédits")}
            </Button>
            <Button variant="outline" onClick={goToDashboard}>
              {t("payment.vanilla.backToDashboardButton", "Retour au tableau de bord")}
            </Button>
          </div>
        </CardContent>
      );
    }

    if (
      isTerminal &&
      (status === "failed" || status === "rejected" || status === "cancelled")
    ) {
      return (
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <XCircle className="h-10 w-10 text-destructive" aria-hidden />
          <h2 className="font-serif text-lg text-foreground">
            {t("payment.vanilla.failureHeading", "Paiement non abouti")}
          </h2>
          <p className="text-center font-sans text-sm text-muted-foreground leading-relaxed">
            {t(
              "payment.vanilla.failureMessage",
              "Votre paiement n'a pas pu être finalisé. Aucun débit n'a été effectué.",
            )}
          </p>
          <Button onClick={goToCredits}>
            {t("payment.vanilla.retryButton", "Réessayer")}
          </Button>
        </CardContent>
      );
    }

    if (isTimedOut) {
      return (
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <Clock className="h-10 w-10 text-muted-foreground" aria-hidden />
          <h2 className="font-serif text-lg text-foreground">
            {t("payment.vanilla.pendingHeading", "Paiement en cours")}
          </h2>
          <p className="text-center font-sans text-sm text-muted-foreground leading-relaxed">
            {t(
              "payment.vanilla.pollingTimeout",
              "Le délai de vérification est dépassé. Vérifiez votre historique sur /credits.",
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={goToCredits}>
              {t("payment.vanilla.retryButton", "Réessayer")}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/contact">
                {t("payment.vanilla.contactSupport", "Contacter le support")}
              </Link>
            </Button>
          </div>
        </CardContent>
      );
    }

    if (error && !status) {
      return (
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          <XCircle className="h-10 w-10 text-destructive" aria-hidden />
          <p className="text-center font-sans text-sm text-muted-foreground">
            {t(
              "payment.vanilla.unexpectedError",
              "Une erreur inattendue est survenue. Réessayez dans un instant.",
            )}
          </p>
          <Button onClick={goToCredits}>
            {t("payment.vanilla.retryButton", "Réessayer")}
          </Button>
        </CardContent>
      );
    }

    // Default: pending / initial polling state.
    const isInitial = isLoading && !status;
    return (
      <CardContent className="flex flex-col items-center gap-4 pt-4">
        <WheelSpinner size="xl" aria-hidden />
        <h2 className="font-serif text-lg text-foreground">
          {isInitial
            ? t("payment.vanilla.checkingStatus", "Vérification en cours...")
            : t("payment.vanilla.pendingHeading", "Paiement en cours")}
        </h2>
        {!isInitial && (
          <p className="text-center font-sans text-sm text-muted-foreground leading-relaxed">
            {t(
              "payment.vanilla.pendingMessage",
              "Votre paiement est en cours de traitement. Cette page se met à jour automatiquement.",
            )}
          </p>
        )}
      </CardContent>
    );
  };

  return (
    <>
      <Helmet>
        <title>
          {t("payment.vanilla.returnPageTitle", "Retour de paiement")} — AutoNex
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      <main className="container mx-auto max-w-xl py-12 space-y-4">
        <BetaPaymentBanner />
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-xl text-foreground">
              {t("payment.vanilla.returnPageTitle", "Retour de paiement")}
            </CardTitle>
            <p className="mt-1 font-sans text-sm text-muted-foreground">
              {t(
                "payment.vanilla.returnPageIntro",
                "Nous vérifions le statut de votre paiement...",
              )}
            </p>
          </CardHeader>
          {renderBody()}
        </Card>
      </main>
      <Footer />
    </>
  );
};

export default PaiementRetourPage;
