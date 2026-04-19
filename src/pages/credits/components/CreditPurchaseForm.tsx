import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ManualPaymentMethod } from "@/hooks/credits/usePurchaseCredits";

type CreditPurchaseFormProps = {
  paymentMethod: string;
  onPaymentMethodChange: (id: string) => void;
  paymentMethods: ManualPaymentMethod[];
  proofFile: File | null;
  onProofFileChange: (f: File | null) => void;
  submitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  /** Show the T&C link below the submit button. Default true. */
  showTermsLink?: boolean;
};

/**
 * Manual payment + proof upload form for the credit purchase flow.
 * Stateless — all state lives in the parent (usePurchaseCredits hook).
 *
 * P11.b uses href="#" for the T&C link (TODO: P-tcs-credits-clauses).
 */
export function CreditPurchaseForm({
  paymentMethod,
  onPaymentMethodChange,
  paymentMethods,
  proofFile,
  onProofFileChange,
  submitting,
  canSubmit,
  onSubmit,
  showTermsLink = true,
}: CreditPurchaseFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground font-sans leading-relaxed">
        {t(
          "publish.buyCreditsHint",
          "Paiement manuel : transmettez le montant puis joignez une preuve. Aucun crédit n'est ajouté avant validation.",
        )}
      </p>

      <div className="space-y-2">
        <Label className="font-sans">{t("publish.paymentMethod", "Mode de paiement")}</Label>
        <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
          <SelectTrigger className="font-sans min-h-11">
            <SelectValue placeholder={t("common.select")} />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="font-sans">
          {t("publish.proofFile", "Preuve de paiement (fichier)")}
        </Label>
        <Input
          type="file"
          accept="image/*,.pdf"
          className="font-sans min-h-11"
          onChange={(e) => onProofFileChange(e.target.files?.[0] ?? null)}
        />
        {proofFile && (
          <p className="text-xs text-muted-foreground font-sans">{proofFile.name}</p>
        )}
      </div>

      {showTermsLink && (
        <p className="text-[12px] text-muted-foreground font-sans leading-relaxed">
          {t(
            "credits.termsAcknowledgement",
            "En achetant, vous acceptez les ",
          )}
          {/* TODO P-tcs-credits-clauses: replace href="#" with the live T&C URL once drafted. */}
          <a href="#" className="text-primary underline">
            {t("credits.termsLinkLabel", "Conditions d'utilisation des crédits")}
          </a>
          {t(
            "credits.termsHintSuffix",
            " — crédits non remboursables, expiration 12 mois.",
          )}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full font-sans min-h-11 touch-manipulation"
        disabled={submitting || !canSubmit}
        onClick={onSubmit}
      >
        {submitting
          ? t("common.loading")
          : t("publish.submitCreditRequest", "Enregistrer la demande d'achat")}
      </Button>
    </div>
  );
}
