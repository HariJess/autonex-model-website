import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminVerifications,
  type AdminVerificationRow,
  type AdminVerificationStatus,
} from "@/hooks/admin/useAdminVerifications";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminVerificationReviewDrawer } from "@/components/admin/AdminVerificationReviewDrawer";

const STATUS_FILTER_OPTIONS: AdminVerificationStatus[] = [
  "pending",
  "approved",
  "rejected",
  "all",
];

function relativeFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `il y a ${diffD}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusBadgeClass(status: string): string {
  if (status === "pending" || status === "reviewing")
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200";
  if (status === "approved")
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (status === "rejected")
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

export function AdminVerificationsList() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<AdminVerificationStatus>("pending");
  const [selected, setSelected] = useState<AdminVerificationRow | null>(null);

  const { data: rows = [], isPending } = useAdminVerifications(filter, 50);

  const empty = useMemo(() => !isPending && rows.length === 0, [isPending, rows]);

  return (
    <div className="space-y-4" data-testid="admin-verifications-list">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-sans text-xl md:text-2xl font-bold text-foreground">
          {t("admin.verifications.title", "Vérifications")}
        </h1>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-muted-foreground">
            {t("admin.verifications.statusFilter.label", "Filtrer par statut")}
          </span>
          <Select value={filter} onValueChange={(v) => setFilter(v as AdminVerificationStatus)}>
            <SelectTrigger className="font-sans w-40 h-9" data-testid="admin-verifications-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="font-sans">
                  {t(`admin.verifications.statusFilter.${s}`, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending && (
        <div className="flex justify-center py-12">
          <WheelSpinner size="md" />
        </div>
      )}

      {empty && (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <p className="font-sans text-sm text-muted-foreground">
            {t("admin.verifications.empty", "Aucune vérification en attente")}
          </p>
        </div>
      )}

      {!isPending && !empty && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-sans text-xs font-medium text-muted-foreground">
                    {t("admin.verifications.list.user", "Utilisateur")}
                  </th>
                  <th className="text-left p-3 font-sans text-xs font-medium text-muted-foreground">
                    {t("admin.verifications.list.fullName", "Nom")}
                  </th>
                  <th className="text-left p-3 font-sans text-xs font-medium text-muted-foreground">
                    {t("admin.verifications.list.submitted", "Soumise")}
                  </th>
                  <th className="text-left p-3 font-sans text-xs font-medium text-muted-foreground">
                    {t("admin.verifications.list.status", "Statut")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelected(r)}
                    data-testid={`admin-verifications-row-${r.id}`}
                  >
                    <td className="p-3 font-sans text-xs text-muted-foreground">
                      {r.user_id.slice(0, 8)}…
                    </td>
                    <td className="p-3 font-sans text-sm text-foreground font-medium">
                      {r.full_name}
                    </td>
                    <td className="p-3 font-sans text-xs text-muted-foreground">
                      {relativeFr(r.submitted_at)}
                    </td>
                    <td className="p-3">
                      <Badge className={`font-sans text-[10px] ${statusBadgeClass(r.status)}`}>
                        {t(`admin.verifications.statusFilter.${r.status}`, r.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <AdminVerificationReviewDrawer
          verification={selected}
          open={selected !== null}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      )}
    </div>
  );
}
