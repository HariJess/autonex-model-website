import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatAriary } from "@/config/monetization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

/**
 * Recent credit transactions for the current user, split in two cards:
 *   - "En attente de validation" (pending + under_review)
 *   - "Historique" (approved / rejected / cancelled / failed, last 8)
 *
 * Reuses the same React Query keys as DashboardCreditsSection
 * (`pending-credit-purchases` / `credit-tx-history`) so visiting /credits
 * after /dashboard hits the cache and feels instant.
 */
export function CreditsTransactionsHistory() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: pending = [], isPending: pendingLoading } = useQuery({
    queryKey: ["pending-credit-purchases", user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "under_review"])
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
    enabled: Boolean(user),
    staleTime: 20_000,
  });

  const { data: history = [], isPending: historyLoading } = useQuery({
    queryKey: ["credit-tx-history", user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["approved", "rejected", "cancelled", "failed"])
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) return [];
      return data ?? [];
    },
    enabled: Boolean(user),
    staleTime: 20_000,
  });

  if (!user) return null;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-sans text-base">
            {t("credits.pendingTitle", "En attente de validation")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-sans">{t("common.loading")}</span>
            </div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">
              {t("credits.noPending", "Aucune demande en attente.")}
            </p>
          ) : (
            <ul className="space-y-2 font-sans text-sm">
              {pending.map((tx) => (
                <li
                  key={tx.id}
                  className="flex justify-between items-center border-b border-border/50 py-2 last:border-0"
                >
                  <span className="text-foreground">
                    {tx.reference ?? "—"} · {formatAriary(Number(tx.amount_mga ?? 0))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("credits.statusPending", "En attente")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-sans text-base">
            {t("credits.historyTitle", "Historique récent")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-sans">{t("common.loading")}</span>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">
              {t("credits.noHistory", "Aucune transaction passée.")}
            </p>
          ) : (
            <ul className="space-y-2 font-sans text-sm">
              {history.map((tx) => (
                <li
                  key={tx.id}
                  className="flex justify-between items-center border-b border-border/50 py-2 last:border-0"
                >
                  <span className="text-foreground">
                    {tx.reference ?? "—"} · {formatAriary(Number(tx.amount_mga ?? 0))}
                  </span>
                  <span
                    className={`text-xs ${
                      tx.status === "approved" ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {t(`credits.txStatus.${tx.status}`, tx.status ?? "")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
