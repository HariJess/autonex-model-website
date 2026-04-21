import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ListingReportError,
  useCreateListingReport,
  type ReportReason,
} from "@/hooks/useCreateListingReport";

type ReportListingModalProps = {
  listingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequireAuth?: () => void;
};

const OTHER_MIN_CHARS = 10;

export function ReportListingModal({
  listingId,
  open,
  onOpenChange,
  onRequireAuth,
}: ReportListingModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const mutation = useCreateListingReport();

  useEffect(() => {
    if (!open) {
      setReason(null);
      setDetails("");
      mutation.reset();
    }
  }, [open, mutation]);

  const detailsRequired = reason === "other";
  const detailsTrimmed = details.trim();
  const canSubmit =
    reason !== null &&
    (!detailsRequired || detailsTrimmed.length >= OTHER_MIN_CHARS) &&
    !mutation.isPending;

  const reasonOptions: { value: ReportReason; labelKey: string; fallback: string }[] = [
    { value: "scam", labelKey: "listing.report.reasons.scam", fallback: "Arnaque / Fraude" },
    { value: "inappropriate", labelKey: "listing.report.reasons.inappropriate", fallback: "Contenu inapproprié" },
    { value: "duplicate", labelKey: "listing.report.reasons.duplicate", fallback: "Doublon d'annonce" },
    { value: "wrong_price", labelKey: "listing.report.reasons.wrong_price", fallback: "Prix aberrant" },
    { value: "other", labelKey: "listing.report.reasons.other", fallback: "Autre" },
  ];

  const handleSubmit = () => {
    if (!canSubmit || reason === null) return;
    mutation.mutate(
      {
        listingId,
        reason,
        details: detailsRequired ? detailsTrimmed : detailsTrimmed || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            t(
              "listing.report.success",
              "Merci, votre signalement a été envoyé. Notre équipe l'examinera rapidement.",
            ),
          );
          onOpenChange(false);
        },
        onError: (err) => {
          if (err instanceof ListingReportError && err.code === "unauthenticated") {
            onOpenChange(false);
            onRequireAuth?.();
            return;
          }
          toast.error(mapReportError(err));
        },
      },
    );
  };

  function mapReportError(err: ListingReportError): string {
    switch (err.code) {
      case "already_reported":
        return t("listing.report.errors.alreadyReported", "Vous avez déjà signalé cette annonce.");
      case "cannot_report_own_listing":
        return t(
          "listing.report.errors.ownListing",
          "Vous ne pouvez pas signaler votre propre annonce.",
        );
      case "listing_not_active":
        return t("listing.report.errors.notActive", "Cette annonce n'est plus active.");
      case "listing_not_found":
        return t("listing.report.errors.notFound", "Annonce introuvable.");
      case "details_required":
        return t(
          "listing.report.errors.detailsRequired",
          "Les détails sont obligatoires quand la raison est « Autre ».",
        );
      case "invalid_reason":
        return t("listing.report.errors.invalidReason", "Raison de signalement invalide.");
      default:
        return t("listing.report.errors.default", "Une erreur est survenue. Veuillez réessayer.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {t("listing.report.title", "Signaler cette annonce")}
          </DialogTitle>
          <DialogDescription className="font-sans">
            {t(
              "listing.report.description",
              "Aidez-nous à maintenir la qualité des annonces AutoNex.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
            {reasonOptions.map((opt) => (
              <div key={opt.value} className="flex items-center gap-3">
                <RadioGroupItem value={opt.value} id={`report-reason-${opt.value}`} />
                <Label htmlFor={`report-reason-${opt.value}`} className="font-sans cursor-pointer">
                  {t(opt.labelKey, opt.fallback)}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="report-details" className="font-sans text-sm">
              {detailsRequired
                ? t("listing.report.detailsRequired", "Détails (obligatoire)")
                : t("listing.report.detailsOptional", "Détails (optionnel)")}
            </Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="font-sans"
              rows={3}
              maxLength={500}
              placeholder={t(
                "listing.report.detailsPlaceholder",
                "Décrivez ce qui vous semble problématique…",
              )}
            />
            {detailsRequired && detailsTrimmed.length > 0 && detailsTrimmed.length < OTHER_MIN_CHARS ? (
              <p className="text-xs text-destructive font-sans">
                {t("listing.report.detailsMinChars", "Minimum {{count}} caractères.", {
                  count: OTHER_MIN_CHARS,
                })}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-sans"
            disabled={mutation.isPending}
          >
            {t("common.cancel", "Annuler")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="font-sans"
          >
            {mutation.isPending
              ? t("common.loading", "Envoi…")
              : t("listing.report.submit", "Envoyer le signalement")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

