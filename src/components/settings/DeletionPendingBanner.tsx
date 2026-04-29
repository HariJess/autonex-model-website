import { AlertCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCancelDeletion, useDeletionStatus } from "@/hooks/useAccountDeletion";

function formatFrenchDate(d: Date | null): string {
  if (!d) return "";
  return format(d, "d MMMM yyyy", { locale: fr });
}

/**
 * Rendered at the top of SettingsLayout, so it shows on every section
 * (Profil / Sécurité / Notifications / Zone de danger). Returns null when
 * the account is in its normal state so the layout doesn't reserve space
 * for nothing.
 */
export function DeletionPendingBanner() {
  const { t } = useTranslation();
  const { data, isLoading } = useDeletionStatus();
  const cancelMutation = useCancelDeletion();

  if (isLoading || !data) return null;

  if (data.is_anonymized) {
    return (
      <Alert variant="destructive" className="mb-6" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("account.deletionBanner.anonymizedTitle", "Compte anonymisé")}</AlertTitle>
        <AlertDescription>
          {t("account.deletionBanner.anonymizedDescription", "Ce compte a été anonymisé. Aucune action n'est possible.")}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data.is_pending) return null;

  const formatted = formatFrenchDate(data.deletion_scheduled_for);

  return (
    <Alert
      variant="destructive"
      className="mb-6"
      role="alert"
      data-testid="deletion-pending-banner"
    >
      <Clock className="h-4 w-4" aria-hidden />
      <AlertTitle>
        {formatted
          ? t("account.deletionBanner.pendingTitleWithDate", { date: formatted })
          : t("account.deletionBanner.pendingTitleWithoutDate", "Votre compte est programmé pour suppression")}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {t("account.deletionBanner.pendingDescription", "Vous pouvez annuler cette demande à tout moment avant cette date. Vos annonces actives ont été retirées de la plateforme.")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="font-sans"
        >
          {cancelMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
              {t("account.deletionBanner.cancelling", "Annulation…")}
            </>
          ) : (
            t("account.deletionBanner.cancelButton", "Annuler la suppression")
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
