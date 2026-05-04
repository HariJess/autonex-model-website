import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useVerificationDocsSignedUrls } from "@/hooks/admin/useVerificationDocsSignedUrls";
import { useApproveVerification } from "@/hooks/admin/useApproveVerification";
import {
  useRejectVerification,
  type RejectionCategory,
} from "@/hooks/admin/useRejectVerification";
import type { AdminVerificationRow } from "@/hooks/admin/useAdminVerifications";

const REJECTION_CATEGORIES: RejectionCategory[] = [
  "blurry",
  "wrong_doc",
  "fraud_suspect",
  "expired_doc",
  "other",
];

type AdminVerificationReviewDrawerProps = {
  verification: AdminVerificationRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminVerificationReviewDrawer({
  verification,
  open,
  onOpenChange,
}: AdminVerificationReviewDrawerProps) {
  const { t } = useTranslation();
  const { data: urls, isPending: urlsLoading } = useVerificationDocsSignedUrls(
    open ? verification : null,
  );
  const approve = useApproveVerification();
  const reject = useRejectVerification();
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectCategory, setRejectCategory] = useState<RejectionCategory | "">("");

  const isReviewable =
    verification.status === "pending" || verification.status === "reviewing";

  const handleApprove = () => {
    approve.mutate(
      { verificationId: verification.id },
      {
        onSuccess: () => {
          setShowApproveConfirm(false);
          onOpenChange(false);
        },
      },
    );
  };

  const handleReject = () => {
    if (rejectReason.trim().length < 10) return;
    reject.mutate(
      {
        verificationId: verification.id,
        reason: rejectReason,
        category: (rejectCategory || null) as RejectionCategory | null,
      },
      {
        onSuccess: () => {
          setRejectMode(false);
          setRejectReason("");
          setRejectCategory("");
          onOpenChange(false);
        },
      },
    );
  };

  const submitting = approve.isPending || reject.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl overflow-y-auto"
        data-testid="admin-verification-drawer"
      >
        <SheetHeader>
          <SheetTitle className="font-sans">
            {t("admin.verifications.drawer.title", "Examiner la vérification")}
          </SheetTitle>
          <SheetDescription className="font-sans text-xs">
            ID: {verification.id.slice(0, 8)}… · {t(`admin.verifications.statusFilter.${verification.status}`, verification.status)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Documents */}
          <section>
            <p className="font-sans text-sm font-medium text-foreground mb-2">
              {t("admin.verifications.drawer.docs.title", "Documents")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <DocPreview
                label={t("admin.verifications.drawer.docs.cinFront", "CIN Recto")}
                url={urls?.cin_front ?? null}
                loading={urlsLoading}
                testId="admin-verification-doc-cin-front"
              />
              <DocPreview
                label={t("admin.verifications.drawer.docs.cinBack", "CIN Verso")}
                url={urls?.cin_back ?? null}
                loading={urlsLoading}
                testId="admin-verification-doc-cin-back"
              />
              <DocPreview
                label={t("admin.verifications.drawer.docs.selfie", "Selfie")}
                url={urls?.selfie ?? null}
                loading={urlsLoading}
                testId="admin-verification-doc-selfie"
              />
            </div>
          </section>

          {/* Métadonnées */}
          <section className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
            <p className="font-sans text-sm font-medium text-foreground">
              {t("admin.verifications.drawer.metadata.title", "Informations soumises")}
            </p>
            <p className="font-sans text-xs">
              <span className="text-muted-foreground">Nom: </span>
              <span className="text-foreground font-medium">{verification.full_name}</span>
            </p>
            <p className="font-sans text-xs">
              <span className="text-muted-foreground">CIN: </span>
              <span className="text-foreground font-medium">{verification.cin_number}</span>
            </p>
            {verification.date_of_birth && (
              <p className="font-sans text-xs">
                <span className="text-muted-foreground">Naissance: </span>
                <span className="text-foreground">{verification.date_of_birth}</span>
              </p>
            )}
            <p className="font-sans text-xs">
              <span className="text-muted-foreground">Crédits: </span>
              <span className="text-foreground">{verification.credits_spent}</span>
            </p>
          </section>

          {/* Rejection display si déjà rejeté */}
          {verification.status === "rejected" && verification.rejection_reason && (
            <section className="rounded-lg border border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20 p-3 space-y-1">
              <p className="font-sans text-xs font-medium text-red-900 dark:text-red-200">
                Rejet précédent :
              </p>
              <p className="font-sans text-xs text-red-800 dark:text-red-300">
                {verification.rejection_reason}
              </p>
              {verification.rejection_category && (
                <p className="font-sans text-[10px] text-red-700 dark:text-red-400">
                  Catégorie: {verification.rejection_category}
                </p>
              )}
            </section>
          )}

          {/* Actions */}
          {isReviewable && !rejectMode && (
            <section className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setShowApproveConfirm(true)}
                disabled={submitting}
                data-testid="admin-verification-approve-btn"
                className="flex-1 font-sans gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t("admin.verifications.drawer.actions.approve", "Approuver")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectMode(true)}
                disabled={submitting}
                data-testid="admin-verification-reject-btn"
                className="flex-1 font-sans gap-1.5 text-destructive border-destructive/40"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                {t("admin.verifications.drawer.actions.reject", "Rejeter")}
              </Button>
            </section>
          )}

          {rejectMode && (
            <section className="rounded-lg border border-destructive/30 bg-red-50/30 dark:bg-red-950/10 p-3 space-y-3">
              <div>
                <Label className="font-sans text-xs">
                  {t("admin.verifications.drawer.reject.categoryLabel", "Catégorie du rejet")}
                </Label>
                <Select value={rejectCategory} onValueChange={(v) => setRejectCategory(v as RejectionCategory)}>
                  <SelectTrigger
                    className="mt-1 font-sans h-9"
                    data-testid="admin-verification-reject-category"
                  >
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECTION_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="font-sans">
                        {t(`admin.verifications.drawer.reject.categories.${c}`, c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reject-reason" className="font-sans text-xs">
                  {t("admin.verifications.drawer.reject.reasonLabel", "Raison (visible par l'utilisateur)")}
                </Label>
                <Textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  data-testid="admin-verification-reject-reason"
                  className="mt-1 font-sans text-sm min-h-[80px]"
                  placeholder={t(
                    "admin.verifications.drawer.reject.reasonPlaceholder",
                    "Expliquez précisément le motif du rejet...",
                  )}
                />
                <p className="mt-1 font-sans text-[10px] text-muted-foreground">
                  Min 10 caractères ({rejectReason.trim().length}/10)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRejectMode(false);
                    setRejectReason("");
                    setRejectCategory("");
                  }}
                  disabled={submitting}
                  className="font-sans"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={submitting || rejectReason.trim().length < 10}
                  aria-busy={submitting}
                  data-testid="admin-verification-reject-confirm"
                  className="font-sans gap-1.5"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {t("admin.verifications.drawer.reject.confirmCta", "Confirmer le rejet")}
                </Button>
              </div>
            </section>
          )}
        </div>

        {/* Approve confirmation */}
        <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-sans">
                {t("admin.verifications.drawer.approve.confirmTitle", "Approuver cette vérification ?")}
              </AlertDialogTitle>
              <AlertDialogDescription className="font-sans">
                {t(
                  "admin.verifications.drawer.approve.confirmDesc",
                  "L'utilisateur recevra le badge Vendeur vérifié pour 365 jours.",
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-sans">Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApprove}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                ) : null}
                {t("admin.verifications.drawer.actions.approve", "Approuver")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

type DocPreviewProps = {
  label: string;
  url: string | null;
  loading: boolean;
  testId: string;
};

function DocPreview({ label, url, loading, testId }: DocPreviewProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-muted/30" data-testid={testId}>
      <div className="aspect-square bg-muted/50 flex items-center justify-center">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            <img
              src={url}
              alt={label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </a>
        ) : (
          <p className="font-sans text-xs text-muted-foreground p-2 text-center">
            URL indisponible
          </p>
        )}
      </div>
      <p className="px-2 py-1.5 font-sans text-[10px] text-muted-foreground border-t border-border">
        {label}
      </p>
    </div>
  );
}
