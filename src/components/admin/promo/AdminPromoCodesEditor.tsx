import { useState } from "react";
import { Loader2, Plus, Power, PowerOff, Pencil, History } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import {
  useAdminPromoActions,
  useAdminPromoCodesList,
} from "@/hooks/admin/useAdminPromoCodes";
import type { PromoCode } from "@/types/promo";
import PromoCodeFormDialog from "./PromoCodeFormDialog";
import PromoRedemptionsDialog from "./PromoRedemptionsDialog";

function formatDate(value: string | null): string {
  if (!value) return "Permanent";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-MG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatQuota(row: PromoCode): string {
  return row.max_redemptions == null
    ? `${row.times_redeemed} / ∞`
    : `${row.times_redeemed} / ${row.max_redemptions}`;
}

function formatType(row: PromoCode): string {
  if (row.type === "percentage" && row.percentage_off != null) {
    return `-${row.percentage_off} %`;
  }
  if (row.type === "bonus_credits" && row.bonus_credits != null) {
    return `+${row.bonus_credits} crédits`;
  }
  return "—";
}

function AdminPromoCodesEditor() {
  const { data, isLoading, error } = useAdminPromoCodesList();
  const { deletePromo } = useAdminPromoActions();

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<PromoCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [historyTarget, setHistoryTarget] = useState<PromoCode | null>(null);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="font-serif">Codes promo</CardTitle>
          <CardDescription className="font-sans">
            Réductions appliquées à l'achat de packs de crédits : pourcentage
            sur le prix ou crédits bonus. Désactivation soft (historique préservé).
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          className="font-sans shrink-0"
          onClick={() => {
            setEditTarget(null);
            setFormMode("create");
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nouveau code
        </Button>
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
            Aucun code promo configuré.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm font-sans">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Code</th>
                  <th className="p-3 font-medium">Réduction</th>
                  <th className="p-3 font-medium">Utilisations</th>
                  <th className="p-3 font-medium">Expire</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="p-3 align-top">
                      <code className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">
                        {row.code}
                      </code>
                      {row.description ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      {formatType(row)}
                      {row.one_per_user ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">1 / user</p>
                      ) : null}
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      {formatQuota(row)}
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      {formatDate(row.expires_at)}
                    </td>
                    <td className="p-3 align-top">
                      {row.active ? (
                        <Badge variant="secondary">Actif</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Désactivé
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="font-sans"
                          onClick={() => {
                            setEditTarget(row);
                            setFormMode("edit");
                          }}
                          aria-label={`Modifier le code ${row.code}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="font-sans"
                          onClick={() => setHistoryTarget(row)}
                          aria-label={`Historique du code ${row.code}`}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        {row.active ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="font-sans text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(row)}
                            aria-label={`Désactiver le code ${row.code}`}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="font-sans text-muted-foreground"
                            disabled
                            aria-label={`Code ${row.code} désactivé`}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <PromoCodeFormDialog
        open={formMode !== null}
        mode={formMode ?? "create"}
        target={editTarget}
        onOpenChange={(v) => {
          if (!v) {
            setFormMode(null);
            setEditTarget(null);
          }
        }}
      />

      <PromoRedemptionsDialog
        open={historyTarget !== null}
        promoCode={historyTarget}
        onOpenChange={(v) => {
          if (!v) setHistoryTarget(null);
        }}
      />

      <AdminConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        title="Désactiver ce code promo ?"
        description={
          deleteTarget ? (
            <>
              Le code <strong>{deleteTarget.code}</strong> ne sera plus utilisable.
              Les utilisations déjà enregistrées sont conservées dans l'historique.
              (Désactivation soft — aucune suppression réelle.)
            </>
          ) : null
        }
        confirmLabel="Désactiver"
        destructive
        isPending={deletePromo.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deletePromo.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </Card>
  );
}

export default AdminPromoCodesEditor;
