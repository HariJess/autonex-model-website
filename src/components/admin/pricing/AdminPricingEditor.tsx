import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAdminPricingActions,
  useAdminPricingList,
  type AdminPricingRow,
} from "@/hooks/admin/useAdminPricing";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
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

function formatUpdater(row: AdminPricingRow): string {
  if (row.updater_name?.trim()) return row.updater_name.trim();
  if (row.updated_by) return `${row.updated_by.slice(0, 8)}…`;
  return "—";
}

function AdminPricingEditor() {
  const { data, isLoading, error } = useAdminPricingList();
  const { updatePricing } = useAdminPricingActions();

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="font-sans">Tarifs des actions</CardTitle>
        <CardDescription className="font-sans">
          Coût en crédits des actions facturables. Modifications prises en compte
          immédiatement par le front (invalidation du cache get_pricing).
          Chaque modification est loguée dans admin_audit_log.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive font-sans">
            {error instanceof Error ? error.message : "Erreur de chargement"}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground font-sans">
            Aucun tarif configuré.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm font-sans">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Clé</th>
                  <th className="p-3 font-medium w-28">Montant (cr.)</th>
                  <th className="p-3 font-medium">Description</th>
                  <th className="p-3 font-medium w-40">Mis à jour le</th>
                  <th className="p-3 font-medium w-32">Par</th>
                  <th className="p-3 font-medium w-28"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <PricingEditorRow
                    key={row.key}
                    row={row}
                    onSave={(amount, description) =>
                      updatePricing.mutate({
                        key: row.key,
                        amount,
                        description,
                      })
                    }
                    isPending={
                      updatePricing.isPending &&
                      updatePricing.variables?.key === row.key
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PricingEditorRowProps {
  row: AdminPricingRow;
  onSave: (amount: number, description: string | null) => void;
  isPending: boolean;
}

function PricingEditorRow({ row, onSave, isPending }: PricingEditorRowProps) {
  const [amountStr, setAmountStr] = useState(String(row.amount));
  const [description, setDescription] = useState(row.description ?? "");

  // Resync local state when the server row changes (after a successful save).
  useEffect(() => {
    setAmountStr(String(row.amount));
    setDescription(row.description ?? "");
  }, [row.amount, row.description]);

  const amount = Number.parseInt(amountStr, 10);
  const amountValid = Number.isFinite(amount) && amount >= 0;
  const descTrimmed = description.trim();
  const isDirty =
    amount !== row.amount || descTrimmed !== (row.description?.trim() ?? "");
  const canSave = amountValid && isDirty && !isPending;

  return (
    <tr className="border-t border-border">
      <td className="p-3 align-top">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.key}</code>
      </td>
      <td className="p-3 align-top">
        <label htmlFor={`pricing-amount-${row.key}`} className="sr-only">
          Montant pour {row.key}
        </label>
        <Input
          id={`pricing-amount-${row.key}`}
          type="number"
          inputMode="numeric"
          min={0}
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          className="h-8 text-sm"
          disabled={isPending}
        />
      </td>
      <td className="p-3 align-top">
        <label htmlFor={`pricing-desc-${row.key}`} className="sr-only">
          Description pour {row.key}
        </label>
        <Input
          id={`pricing-desc-${row.key}`}
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-8 text-sm"
          disabled={isPending}
        />
      </td>
      <td className="p-3 align-top text-xs text-muted-foreground whitespace-nowrap">
        {formatDateTime(row.updated_at)}
      </td>
      <td className="p-3 align-top text-xs text-muted-foreground">
        {formatUpdater(row)}
      </td>
      <td className="p-3 align-top">
        <Button
          type="button"
          size="sm"
          className="font-sans"
          disabled={!canSave}
          onClick={() =>
            onSave(amount, descTrimmed.length > 0 ? descTrimmed : null)
          }
          aria-label={`Enregistrer le tarif ${row.key}`}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" /> Enregistrer
            </>
          )}
        </Button>
      </td>
    </tr>
  );
}

export default AdminPricingEditor;
