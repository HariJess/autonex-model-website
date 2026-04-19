import { usePurchaseCredits } from "@/hooks/credits/usePurchaseCredits";
import { CreditPacksGrid } from "@/pages/credits/components/CreditPacksGrid";
import { CreditPurchaseForm } from "@/pages/credits/components/CreditPurchaseForm";
import { CreditsTransactionsHistory } from "@/pages/credits/components/CreditsTransactionsHistory";

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
 * Wires usePurchaseCredits() to the 3 UI building blocks (packs grid +
 * payment form + optional history). Consumed by:
 *   - CreditsPage (variant="standalone") on the dedicated /credits route
 *   - PublishStepVisibility (variant="fallback-in-publish") inside the
 *     "Acheter des crédits" collapse when the seller can't afford the
 *     publication
 *
 * The two variants share 100% of the purchase logic via the hook —
 * zero duplication. Surrounding chrome (page header, hero, collapse
 * wrapper) is the parent's responsibility, not this component's.
 */
export function CreditsPurchaseFlow({
  variant,
  onPurchaseSubmitted,
  showTransactionsHistory,
  showTermsLink = true,
}: CreditsPurchaseFlowProps) {
  const purchase = usePurchaseCredits({
    onSuccess: onPurchaseSubmitted,
  });

  const historyVisible = showTransactionsHistory ?? variant === "standalone";

  return (
    <div className="space-y-5">
      <CreditPacksGrid
        creditPacks={purchase.creditPacks}
        selectedPackId={purchase.selectedPackId}
        onSelectPack={purchase.setSelectedPackId}
      />

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

      {historyVisible && <CreditsTransactionsHistory />}
    </div>
  );
}
