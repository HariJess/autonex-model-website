import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminPromoRedemptions } from "@/hooks/admin/useAdminPromoCodes";
import type { PromoCode } from "@/types/promo";

interface PromoRedemptionsDialogProps {
  open: boolean;
  promoCode: PromoCode | null;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-MG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(mga: number): string {
  return new Intl.NumberFormat("fr-MG").format(mga) + " Ar";
}

function PromoRedemptionsDialog({
  open,
  promoCode,
  onOpenChange,
}: PromoRedemptionsDialogProps) {
  const { data, isLoading, error } = useAdminPromoRedemptions(
    open ? promoCode?.id : undefined,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-sans">
            Historique des utilisations
            {promoCode ? (
              <code className="ml-2 rounded bg-muted px-2 py-0.5 text-sm">
                {promoCode.code}
              </code>
            ) : null}
          </DialogTitle>
          <DialogDescription className="font-sans">
            Journal des utilisations du code promo (ordre chronologique inverse).
          </DialogDescription>
        </DialogHeader>

        <div className="font-sans">
          {isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
            </div>
          ) : error ? (
            <p className="p-4 text-sm text-destructive">
              {error instanceof Error ? error.message : "Erreur de chargement"}
            </p>
          ) : !data || data.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Aucune utilisation enregistrée.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Utilisateur</th>
                    <th className="p-3 font-medium">Transaction</th>
                    <th className="p-3 font-medium text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.redemption_id} className="border-t border-border">
                      <td className="p-3 whitespace-nowrap">
                        {formatDateTime(r.redeemed_at)}
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/admin/utilisateurs/${r.user_id}`}
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={() => onOpenChange(false)}
                        >
                          {r.user_full_name?.trim() || r.user_email || r.user_id.slice(0, 8)}
                        </Link>
                        {r.user_email ? (
                          <p className="text-xs text-muted-foreground">
                            {r.user_email}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <code className="text-xs text-muted-foreground">
                          {r.transaction_id.slice(0, 8)}…
                        </code>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {formatAmount(r.amount_mga)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PromoRedemptionsDialog;
