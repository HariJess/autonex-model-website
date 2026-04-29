import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useValidatePromoCode } from "@/hooks/credits/usePromoCode";
import { mapDbError } from "@/lib/admin/dbErrorMessages";
import type { PromoValidationResult } from "@/types/promo";

const CODE_PATTERN = /^[A-Z0-9-]+$/;
const DEBOUNCE_MS = 400;

interface PromoCodeInputProps {
  /** Currently selected credit pack id. Disables the input when empty. */
  selectedPackId: string;
  /** Controlled raw input (already normalised to UPPERCASE by this component). */
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  /** Last successful validation — kept by the parent so submit can read it. */
  validation: PromoValidationResult | null;
  onValidationChange: (result: PromoValidationResult | null) => void;
  /** Nominal pack price for the summary. */
  packPriceMga: number;
  /** Nominal pack credits for the summary. */
  packCredits: number;
}

export function PromoCodeInput({
  selectedPackId,
  promoCode,
  onPromoCodeChange,
  validation,
  onValidationChange,
  packPriceMga,
  packCredits,
}: PromoCodeInputProps) {
  const { t } = useTranslation();
  const validate = useValidatePromoCode();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmed = useMemo(() => promoCode.trim().toUpperCase(), [promoCode]);
  const codeSyntaxValid = trimmed.length > 0 && CODE_PATTERN.test(trimmed);
  const showSummary = validation?.valid === true;

  // Debounced validation. Re-runs when code OR pack changes.
  useEffect(() => {
    if (!selectedPackId || trimmed.length === 0) {
      onValidationChange(null);
      setErrorMessage(null);
      return;
    }
    if (!codeSyntaxValid) {
      onValidationChange(null);
      setErrorMessage(t("credits.promoInvalidSyntax", "Code invalide (A-Z, 0-9, tirets)"));
      return;
    }

    const handle = window.setTimeout(() => {
      validate.mutate(
        { code: trimmed, creditPackId: selectedPackId },
        {
          onSuccess: (result) => {
            onValidationChange(result);
            if (result.valid) {
              setErrorMessage(null);
            } else {
              setErrorMessage(mapDbError(result.error_code ?? "", t("credits.promoInvalid", "Code invalide.")));
            }
          },
          onError: (err) => {
            onValidationChange(null);
            setErrorMessage(mapDbError(err, t("credits.promoValidationError", "Erreur de validation du code.")));
          },
        },
      );
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, selectedPackId, codeSyntaxValid]);

  const clearCode = () => {
    onPromoCodeChange("");
    onValidationChange(null);
    setErrorMessage(null);
  };

  const finalPrice = showSummary ? validation.final_price_mga : packPriceMga;
  const finalCredits = showSummary ? validation.final_credits : packCredits;
  const discountMga = showSummary ? validation.discount_mga : 0;
  const bonusCredits = showSummary ? validation.bonus_credits : 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="promo-code-input" className="font-sans text-sm">
        {t("credits.promoLabel", "Avez-vous un code promo ?")}
      </Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            id="promo-code-input"
            placeholder="LAUNCH20"
            value={promoCode}
            onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
            disabled={!selectedPackId}
            autoComplete="off"
            spellCheck={false}
            className="font-sans pr-10"
            maxLength={50}
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            {validate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : showSummary ? (
              <Check className="h-4 w-4 text-green-600" aria-label={t("credits.promoValid", "Code valide")} />
            ) : null}
          </div>
        </div>
        {promoCode ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="font-sans"
            onClick={clearCode}
            aria-label={t("credits.promoRemove", "Retirer le code promo")}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="text-xs text-destructive font-sans">{errorMessage}</p>
      ) : null}

      {selectedPackId && (showSummary || errorMessage === null) ? (
        <PurchaseSummary
          applied={showSummary}
          packPriceMga={packPriceMga}
          packCredits={packCredits}
          finalPrice={finalPrice}
          finalCredits={finalCredits}
          discountMga={discountMga}
          bonusCredits={bonusCredits}
          appliedCode={showSummary ? trimmed : null}
        />
      ) : null}
    </div>
  );
}

interface PurchaseSummaryProps {
  applied: boolean;
  packPriceMga: number;
  packCredits: number;
  finalPrice: number;
  finalCredits: number;
  discountMga: number;
  bonusCredits: number;
  appliedCode: string | null;
}

function PurchaseSummary({
  applied,
  packPriceMga,
  packCredits,
  finalPrice,
  finalCredits,
  discountMga,
  bonusCredits,
  appliedCode,
}: PurchaseSummaryProps) {
  const { t } = useTranslation();
  const fmt = (n: number) => new Intl.NumberFormat("fr-MG").format(n);

  if (!applied) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm font-sans space-y-0.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("credits.price", "Prix")}</span>
          <span className="font-medium">{fmt(packPriceMga)} Ar</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("credits.creditsReceived", "Crédits reçus")}</span>
          <span className="font-medium">{packCredits}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-sans space-y-1">
      {discountMga > 0 ? (
        <>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("credits.initialPrice", "Prix initial")}</span>
            <span className="text-muted-foreground line-through">
              {fmt(packPriceMga)} Ar
            </span>
          </div>
          <div className="flex justify-between text-green-700">
            <span>{t("credits.discountApplied", "Réduction ({{code}})", { code: appliedCode })}</span>
            <span>−{fmt(discountMga)} Ar</span>
          </div>
          <div className="flex justify-between font-semibold pt-1 border-t border-green-200">
            <span>{t("credits.totalToPay", "Total à payer")}</span>
            <span>{fmt(finalPrice)} Ar</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("credits.creditsReceived", "Crédits reçus")}</span>
            <span>{finalCredits}</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("credits.price", "Prix")}</span>
            <span className="font-medium">{fmt(packPriceMga)} Ar</span>
          </div>
          <div className="flex justify-between text-green-700">
            <span>{t("credits.bonusApplied", "Bonus ({{code}})", { code: appliedCode })}</span>
            <span>{t("credits.bonusCreditsLine", "+{{count}} crédits", { count: bonusCredits })}</span>
          </div>
          <div className="flex justify-between font-semibold pt-1 border-t border-green-200">
            <span>{t("credits.creditsReceived", "Crédits reçus")}</span>
            <span>
              {packCredits} + {bonusCredits} = {finalCredits}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
