import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCreditBalance } from "@/features/credits/hooks/useCreditBalance";
import { LISTING_RENEWAL_CREDIT_COST, formatAriary } from "@/config/monetization";
import { formatNumber } from "@/features/credits/lib/creditFormatting";
import type { MyListingRow } from "@/features/listings/hooks/useMyListings";

interface RenewListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: MyListingRow | null;
}

/**
 * Modal "Renouveler une annonce" — appelle la RPC renew_listing(uuid).
 * - Lit le solde courant via useCreditBalance.
 * - Désactive le bouton si solde < 15 000 + lien "Recharger".
 * - Toast success/erreur + invalide les queries my-listings + credit-balance.
 */
export function RenewListingModal({ open, onOpenChange, listing }: RenewListingModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { total: balanceTotal, isLoading: balanceLoading } = useCreditBalance();
  const [submitting, setSubmitting] = useState(false);

  const cost = LISTING_RENEWAL_CREDIT_COST;
  const balanceAfter = balanceTotal - cost;
  const insufficient = !balanceLoading && balanceAfter < 0;

  const renewMutation = useMutation({
    mutationFn: async (listingId: string) => {
      // RPC créée par migration PROMPT 4 (20260505100000), pas encore typée
      // par le types regen — cast jusqu'au prochain `npx supabase gen types`.
      const { data, error } = await (
        supabase.rpc as unknown as (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      )("renew_listing", { p_listing_id: listingId });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success(t("myListings.renewModal.success", "Annonce renouvelée pour 30 jours"));
      void queryClient.invalidateQueries({ queryKey: ["my-listings-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
      void queryClient.invalidateQueries({ queryKey: ["credits-balance-ledger"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      const msg = err.message.includes("insufficient_credits")
        ? t("myListings.renewModal.errorInsufficient", "Solde insuffisant.")
        : err.message.includes("not_owner")
        ? t("myListings.renewModal.errorNotOwner", "Vous n'êtes pas propriétaire de cette annonce.")
        : err.message;
      toast.error(msg);
    },
  });

  const handleConfirm = async () => {
    if (!listing || insufficient) return;
    setSubmitting(true);
    try {
      await renewMutation.mutateAsync(listing.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="renew-modal">
        <DialogHeader>
          <DialogTitle>
            {t("myListings.renewModal.title", "Renouveler {{title}}", {
              title: listing?.title ?? "",
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            {t("myListings.renewModal.subtitle", "Renouvellement pour 30 jours")}
          </p>

          <dl className="space-y-2 rounded-lg bg-muted/40 p-3">
            <div className="flex justify-between" data-testid="renew-modal-cost">
              <dt className="text-muted-foreground">{t("myListings.renewModal.cost", "Coût")}</dt>
              <dd className="font-semibold">{formatNumber(cost)} crédits</dd>
            </div>
            <div className="flex justify-between" data-testid="renew-modal-balance-current">
              <dt className="text-muted-foreground">
                {t("myListings.renewModal.balanceCurrent", "Solde actuel")}
              </dt>
              <dd className="font-medium">
                {balanceLoading ? "…" : `${formatNumber(balanceTotal)} crédits`}
              </dd>
            </div>
            <div
              className={`flex justify-between border-t border-border pt-2 ${
                insufficient ? "text-red-600 dark:text-red-400" : "text-foreground"
              }`}
              data-testid="renew-modal-balance-after"
            >
              <dt>{t("myListings.renewModal.balanceAfter", "Solde après")}</dt>
              <dd className="font-bold">
                {balanceLoading
                  ? "…"
                  : `${formatNumber(Math.max(balanceAfter, 0))} crédits`}
              </dd>
            </div>
          </dl>

          {insufficient ? (
            <div
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
              data-testid="renew-modal-insufficient"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold">
                  {t("myListings.renewModal.insufficient", "Solde insuffisant")}
                </p>
                <Button asChild variant="link" className="h-auto p-0 text-red-800 dark:text-red-200">
                  <Link to="/credits">→ {t("myListings.renewModal.recharge", "Recharger")}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-1.5 text-sm text-muted-foreground" data-testid="renew-modal-benefits">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                {t("myListings.renewModal.benefits.active", "Votre annonce repassera en Active")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                {t("myListings.renewModal.benefits.duration", "Visible 30 jours supplémentaires")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                {t("myListings.renewModal.benefits.metrics", "Compteur de vues conservé")}
              </li>
            </ul>
          )}

          {listing && listing.price_mga ? (
            <p className="text-xs text-muted-foreground">
              {t("myListings.renewModal.priceContext", "Prix de l'annonce : {{price}}", {
                price: formatAriary(listing.price_mga),
              })}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            data-testid="renew-modal-cancel"
          >
            {t("myListings.renewModal.cancel", "Annuler")}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={insufficient || balanceLoading || submitting || !listing}
            data-testid="renew-modal-confirm"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {t("myListings.renewModal.confirm", "Confirmer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
