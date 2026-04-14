import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import {
  BOOST_CREDIT_COSTS,
  BOOST_DURATION_DAYS,
  BOOST_LABELS_FR,
  BOOST_ORDER,
  BOOST_VISIBILITY_FR,
  totalBoostCredits,
  type PurchasableBoostType,
} from "@/config/monetization";
import {
  purchaseListingBoostsErrorMessage,
  purchasableBoostTypesForListing,
  type ListingBoostPartition,
} from "@/lib/listingBoosts";
import { invalidateCreditsBalanceQueries } from "@/lib/creditsBalance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Listing = Tables<"listings">;

type DashboardBoostPurchaseDialogProps = {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partition: ListingBoostPartition | undefined;
  creditsBalance: number;
  creditsBalancePending: boolean;
  userId: string | undefined;
};

export function DashboardBoostPurchaseDialog({
  listing,
  open,
  onOpenChange,
  partition,
  creditsBalance,
  creditsBalancePending,
  userId,
}: DashboardBoostPurchaseDialogProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<PurchasableBoostType>>(new Set());

  const available = useMemo(() => purchasableBoostTypesForListing(partition), [partition]);

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, listing?.id]);

  const selectedList = useMemo(() => BOOST_ORDER.filter((k) => selected.has(k)), [selected]);
  const total = totalBoostCredits(selectedList);
  const canAfford = !creditsBalancePending && creditsBalance >= total;
  const nothingSelected = selectedList.length === 0;

  const purchase = useMutation({
    mutationFn: async (types: PurchasableBoostType[]) => {
      if (!listing?.id) throw new Error("listing_missing");
      const { data, error } = await supabase.rpc("purchase_listing_boosts", {
        p_listing_id: listing.id,
        p_boost_types: types,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async () => {
      toast.success("Boosts activés. Votre annonce bénéficie tout de suite de la visibilité choisie.");
      onOpenChange(false);
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ["my-listings", userId] });
        await queryClient.invalidateQueries({ queryKey: ["my-listing-boosts", userId] });
        invalidateCreditsBalanceQueries(queryClient, userId);
        await queryClient.invalidateQueries({ queryKey: ["db-listings"] });
        await queryClient.invalidateQueries({ queryKey: ["featured-boost-listing-ids"] });
      }
      if (listing?.id) {
        await queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
      }
    },
    onError: (err: Error) => {
      toast.error(purchaseListingBoostsErrorMessage(err.message));
    },
  });

  const toggle = (k: PurchasableBoostType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            Booster l’annonce
          </DialogTitle>
          <DialogDescription className="font-sans text-left space-y-2">
            <span className="block">
              Achat de visibilité uniquement : aucun frais de republication, pas de nouvelle modération du contenu
              pour une annonce déjà en ligne.
            </span>
            {listing?.title ? (
              <span className="block font-medium text-foreground">« {listing.title} »</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground font-sans">
            Tous les boosts disponibles sont déjà actifs pour cette annonce. Revenez après expiration d’un boost pour en
            racheter un du même type.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-sans">
              Cochez une ou plusieurs options. Le total en crédits est indiqué avant confirmation.
            </p>
            <ul className="space-y-3">
              {available.map((k) => (
                <li key={k} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`boost-${k}`}
                      checked={selected.has(k)}
                      onCheckedChange={() => toggle(k)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <Label htmlFor={`boost-${k}`} className="font-sans text-sm font-semibold cursor-pointer">
                        {BOOST_LABELS_FR[k]}
                      </Label>
                      <p className="text-xs text-muted-foreground font-sans leading-snug">{BOOST_VISIBILITY_FR[k]}</p>
                      <p className="text-xs font-sans">
                        <span className="font-medium text-foreground">{BOOST_CREDIT_COSTS[k]} crédits</span>
                        <span className="text-muted-foreground"> · {BOOST_DURATION_DAYS[k]} jours</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-lg bg-muted/50 p-3 font-sans text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{total} crédits</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Solde disponible</span>
                <span>{creditsBalancePending ? "…" : `${creditsBalance} crédits`}</span>
              </div>
              {!creditsBalancePending && !canAfford && !nothingSelected ? (
                <p className="text-xs text-destructive pt-1">Solde insuffisant pour ce panier.</p>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="font-sans" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            className="font-sans gradient-primary border-0"
            style={{ color: "#FAFAFA" }}
            disabled={
              available.length === 0 ||
              nothingSelected ||
              !canAfford ||
              creditsBalancePending ||
              purchase.isPending
            }
            onClick={() => purchase.mutate(selectedList)}
          >
            {purchase.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Confirmation…
              </>
            ) : (
              `Confirmer (${total} crédits)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
