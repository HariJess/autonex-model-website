import { useEffect, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatAriary } from "@/config/monetization";
import { formatNumber } from "@/features/credits/lib/creditFormatting";
import type { MyListingRow } from "@/features/listings/hooks/useMyListings";

interface MarkSoldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: MyListingRow | null;
}

/**
 * Modal "Marquer vendue" — appelle la RPC mark_listing_sold(uuid, numeric|null).
 * Champ "prix de vente" optionnel (utilisé pour analytics market price futur).
 */
export function MarkSoldModal({ open, onOpenChange, listing }: MarkSoldModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // PROMPT 4.1 : 2 states synchronisés pour formatting NBSP en temps réel.
  // - displayValue : ce qu'on affiche dans l'input (avec NBSP entre milliers)
  // - numericValue : valeur number transmise à la RPC (null si vide)
  const [displayValue, setDisplayValue] = useState("");
  const [numericValue, setNumericValue] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset le champ quand le modal se ferme/réouvre
  useEffect(() => {
    if (!open) {
      setDisplayValue("");
      setNumericValue(null);
      setSubmitting(false);
    }
  }, [open]);

  // Format temps réel : strip non-digits → parse → reformat NBSP via formatNumber.
  // Edge cases gérés : input vide → null, copier-coller "110 000 000 Ar" → digits
  // only "110000000" → number 110_000_000 → display "110 000 000".
  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    if (digitsOnly === "") {
      setDisplayValue("");
      setNumericValue(null);
      return;
    }
    const num = parseInt(digitsOnly, 10);
    if (!Number.isFinite(num)) {
      setDisplayValue("");
      setNumericValue(null);
      return;
    }
    setDisplayValue(formatNumber(num));
    setNumericValue(num);
  };

  // numericValue est calculé en temps réel par handlePriceChange — toujours
  // valide ou null. Plus de re-parsing à chaque render.
  const parsedPrice = numericValue;
  // L'input ne peut plus être "invalide" car on strip les non-digits côté input.
  // Garde-fou conservé pour le futur (ex. validation > 0 ajoutée plus tard).
  const inputInvalid = false;

  const markSoldMutation = useMutation({
    mutationFn: async (args: { listingId: string; price: number | null }) => {
      // RPC créée par migration PROMPT 4 (20260505100000), pas encore typée
      // par le types regen — cast jusqu'au prochain `npx supabase gen types`.
      const { data, error } = await (
        supabase.rpc as unknown as (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      )("mark_listing_sold", {
        p_listing_id: args.listingId,
        p_sold_price: args.price,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success(t("myListings.markSoldModal.success", "Annonce marquée vendue 🎉"));
      void queryClient.invalidateQueries({ queryKey: ["my-listings-dashboard"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      const msg = err.message.includes("not_owner")
        ? t("myListings.markSoldModal.errorNotOwner", "Vous n'êtes pas propriétaire.")
        : err.message.includes("invalid_sold_price")
        ? t("myListings.markSoldModal.errorInvalidPrice", "Prix invalide.")
        : err.message;
      toast.error(msg);
    },
  });

  const handleConfirm = async () => {
    if (!listing || inputInvalid) return;
    setSubmitting(true);
    try {
      await markSoldMutation.mutateAsync({ listingId: listing.id, price: parsedPrice });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="mark-sold-modal">
        <DialogHeader>
          <DialogTitle>
            {t("myListings.markSoldModal.title", "Marquer comme vendue")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {listing && (
            <div data-testid="mark-sold-modal-listing-preview">
              <p className="font-semibold text-foreground">{listing.title}</p>
              {listing.price_mga ? (
                <p className="text-muted-foreground">{formatAriary(listing.price_mga)}</p>
              ) : null}
            </div>
          )}

          <div
            className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-200"
            data-testid="mark-sold-modal-warning"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold">
                {t("myListings.markSoldModal.warning", "Cette action est irréversible.")}
              </p>
              <p className="mt-1 text-xs">
                {t(
                  "myListings.markSoldModal.description",
                  "Votre annonce sera retirée des résultats de recherche. Les boosts actifs seront automatiquement annulés.",
                )}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mark-sold-price" className="text-sm font-medium">
              {t("myListings.markSoldModal.priceLabel", "Vendue à quel prix ? (optionnel)")}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="mark-sold-price"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={displayValue}
                onChange={handlePriceChange}
                disabled={submitting}
                aria-invalid={inputInvalid}
                data-testid="mark-sold-modal-price-input"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">Ar</span>
            </div>
            {inputInvalid && (
              <p className="text-xs text-red-600 dark:text-red-400" data-testid="mark-sold-modal-price-error">
                {t("myListings.markSoldModal.errorInvalidPrice", "Prix invalide.")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("myListings.markSoldModal.priceHelp", "Optionnel — utilisé pour analytics anonymes.")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            data-testid="mark-sold-modal-cancel"
          >
            {t("myListings.renewModal.cancel", "Annuler")}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={inputInvalid || submitting || !listing}
            data-testid="mark-sold-modal-confirm"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {t("myListings.markSoldModal.confirm", "Confirmer la vente")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
