import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePurchaseCredits } from "@/hooks/credits/usePurchaseCredits";
import {
  mapVpiCheckoutErrorToI18nKey,
  useVpiCheckout,
  type VpiPaymentMode,
} from "@/hooks/payments/useVpiCheckout";
import { usePaymentFlags } from "@/hooks/usePaymentFlags";
import { CreditPacksGrid } from "@/pages/credits/components/CreditPacksGrid";
import { CreditPurchaseForm } from "@/pages/credits/components/CreditPurchaseForm";
import { CreditsTransactionsHistory } from "@/pages/credits/components/CreditsTransactionsHistory";
import { PromoCodeInput } from "@/components/credits/PromoCodeInput";

type CreditsPurchaseFlowProps = {
  /**
   * "standalone" — pleine page /credits (transactions history visible by default).
   * "fallback-in-publish" — bloc compact rendu dans PublishStepVisibility step 3
   * quand le solde utilisateur est insuffisant (pas d'historique, intégration
   * dans le wrapper collapse parent qui gère son propre titre).
   */
  variant: "standalone" | "fallback-in-publish";
  /** Optional caller-side reaction after a successful purchase submission. */
  onPurchaseSubmitted?: () => void;
  /** Default: true on standalone, false on fallback-in-publish. */
  showTransactionsHistory?: boolean;
  /** Default: true on both variants. */
  showTermsLink?: boolean;
};

/**
 * Shared credit purchase flow orchestrator.
 *
 * Wires usePurchaseCredits() + useVpiCheckout() to the UI building blocks
 * (packs grid + promo + VPI quick-pay buttons + optional legacy manual form +
 * optional history). Consumed by:
 *   - CreditsPage (variant="standalone") on the dedicated /credits route
 *   - PublishStepVisibility (variant="fallback-in-publish") inside the
 *     "Acheter des crédits" collapse when the seller can't afford publication
 *
 * Payment paths:
 *   - VPI (Vanilla Pay) always visible: 2 buttons (Mobile Money / Carte bancaire)
 *     redirect to the hosted checkout, return flow handled by /paiement/retour.
 *   - Legacy manual form gated by VITE_ENABLE_MANUAL_PAYMENT (default false).
 */
export function CreditsPurchaseFlow({
  variant,
  onPurchaseSubmitted,
  showTransactionsHistory,
  showTermsLink = true,
}: CreditsPurchaseFlowProps) {
  const { t } = useTranslation();
  const purchase = usePurchaseCredits({
    onSuccess: onPurchaseSubmitted,
  });
  const checkout = useVpiCheckout();
  const { isManualPaymentEnabled } = usePaymentFlags();

  const historyVisible = showTransactionsHistory ?? variant === "standalone";

  const handleVpiPay = (paymentMode: VpiPaymentMode) => {
    if (!purchase.selectedPackId || checkout.isPending) return;
    checkout.mutate(
      {
        creditPackId: purchase.selectedPackId,
        paymentMode,
        promoCode: purchase.promoCode || null,
      },
      {
        onSuccess: (data) => {
          window.location.assign(data.checkout_url);
        },
        onError: (err) => {
          toast.error(t(mapVpiCheckoutErrorToI18nKey(err.message)));
        },
      },
    );
  };

  const vpiDisabled = !purchase.selectedPackId || checkout.isPending;
  const activeMode: VpiPaymentMode | null = checkout.isPending
    ? checkout.variables?.paymentMode ?? null
    : null;

  const renderVpiButtonLabel = (mode: VpiPaymentMode, labelKey: string, fallback: string) => {
    if (activeMode === mode) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>
            {t("payment.vanilla.processingPayment", "Initialisation du paiement...")}
          </span>
        </>
      );
    }
    return t(labelKey, fallback);
  };

  return (
    <div className="space-y-5">
      <CreditPacksGrid
        creditPacks={purchase.creditPacks}
        selectedPackId={purchase.selectedPackId}
        onSelectPack={purchase.setSelectedPackId}
      />

      {purchase.selectedPack ? (
        <PromoCodeInput
          selectedPackId={purchase.selectedPackId}
          promoCode={purchase.promoCode}
          onPromoCodeChange={purchase.setPromoCode}
          validation={purchase.promoValidation}
          onValidationChange={purchase.setPromoValidation}
          packPriceMga={purchase.selectedPack.price_mga}
          packCredits={purchase.selectedPack.credits_amount}
        />
      ) : null}

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="font-serif text-base text-foreground">
            {t("payment.vanilla.sectionTitle", "Paiement rapide")}
          </h3>
          <p className="font-sans text-xs text-muted-foreground leading-relaxed">
            {t(
              "payment.vanilla.sectionSubtitle",
              "Payez en quelques secondes avec Mobile Money ou votre carte bancaire",
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            type="button"
            className="w-full font-sans min-h-11 touch-manipulation gap-2"
            disabled={vpiDisabled}
            onClick={() => handleVpiPay("mobile_money")}
            aria-busy={activeMode === "mobile_money"}
          >
            {renderVpiButtonLabel(
              "mobile_money",
              "payment.vanilla.mobileMoneyButton",
              "Mobile Money (MVola, Orange, Airtel)",
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full font-sans min-h-11 touch-manipulation gap-2"
            disabled={vpiDisabled}
            onClick={() => handleVpiPay("international")}
            aria-busy={activeMode === "international"}
          >
            {renderVpiButtonLabel(
              "international",
              "payment.vanilla.cardButton",
              "Carte bancaire (Visa, Mastercard)",
            )}
          </Button>
        </div>
      </section>

      {isManualPaymentEnabled && (
        <CreditPurchaseForm
          paymentMethod={purchase.paymentMethod}
          onPaymentMethodChange={purchase.setPaymentMethod}
          paymentMethods={purchase.paymentMethods}
          proofFile={purchase.proofFile}
          onProofFileChange={purchase.setProofFile}
          submitting={purchase.submitting}
          canSubmit={purchase.canSubmit}
          onSubmit={purchase.submit}
          showTermsLink={showTermsLink}
        />
      )}

      {historyVisible && <CreditsTransactionsHistory />}
    </div>
  );
}
