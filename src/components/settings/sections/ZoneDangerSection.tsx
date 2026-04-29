import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowDownToLine, Loader2, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  useDeletionStatus,
  useExportData,
} from "@/hooks/useAccountDeletion";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";

export function ZoneDangerSection() {
  const { t } = useTranslation();
  const { data: status, isLoading } = useDeletionStatus();
  const exportMutation = useExportData();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-sans text-2xl font-bold text-destructive" id="section-zone-danger-heading">
          {t("account.dangerZone.title", "Zone de danger")}
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          {t("account.dangerZone.subtitle", "Export RGPD de vos données et suppression définitive du compte.")}
        </p>
      </header>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      ) : status?.is_pending ? (
        <Alert role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("account.dangerZone.pendingTitle", "Demande de suppression en cours")}</AlertTitle>
          <AlertDescription>
            {t("account.dangerZone.pendingDescription", "Utilisez le bouton « Annuler la suppression » dans la bannière ci-dessus pour revenir en arrière avant la date de suppression programmée.")}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Card 1 — Export RGPD */}
          <section className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2 shrink-0">
                <ArrowDownToLine className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-sans text-base font-semibold">{t("account.dangerZone.exportTitle", "Télécharger mes données")}</h3>
                <p className="mt-1 text-sm font-sans text-muted-foreground">
                  {t("account.dangerZone.exportDescription", "Téléchargez une copie complète de toutes les données que nous conservons sur vous, au format JSON. Conforme à l'article 20 du RGPD (droit à la portabilité).")}
                </p>
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="font-sans"
                data-testid="danger-export-button"
              >
                {exportMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                    {t("account.dangerZone.exportPreparing", "Préparation…")}
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="h-4 w-4 mr-2" aria-hidden />
                    {t("account.dangerZone.exportButton", "Télécharger mes données")}
                  </>
                )}
              </Button>
            </div>
          </section>

          {/* Card 2 — Suppression définitive */}
          <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 md:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-destructive/10 p-2 shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-sans text-base font-semibold text-destructive">{t("account.dangerZone.deleteTitle", "Supprimer mon compte")}</h3>
                <p className="mt-1 text-sm font-sans text-foreground/90">
                  {t("account.dangerZone.deleteDescription", "Cette action demandera la suppression définitive de votre compte AutoNex. Un délai de 30 jours vous permettra de revenir sur votre décision. Passé ce délai, vos données personnelles seront anonymisées définitivement, conformément au RGPD. Vos annonces actives seront retirées immédiatement.")}
                </p>
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                className="font-sans"
                data-testid="danger-delete-button"
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden />
                {t("account.dangerZone.deleteTitle", "Supprimer mon compte")}
              </Button>
            </div>
          </section>

          <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
        </>
      )}
    </div>
  );
}
