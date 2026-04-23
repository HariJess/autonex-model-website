import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, Clock, Check, ArrowRight } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { formatAriary } from "@/config/monetization";

type DashboardCreditsSectionProps = {
  creditsBalancePending: boolean;
  creditsFromLedger: number;
  pendingPurchases: Tables<"transactions">[];
  creditTxHistory: Tables<"transactions">[];
  ledgerRows: Tables<"credits_ledger">[];
  paymentTxLabels: Record<string, string>;
  labels: {
    creditsSectionBadge: string;
    creditsMonetization: string;
    creditsSectionTagline: string;
    creditsUsableInline: string;
    creditsBalanceInlineHint: string;
    creditsChipPublish: string;
    creditsChipBoost: string;
    creditsBullet1: string;
    creditsBullet2: string;
    creditsBullet3: string;
    buyCreditsCta: string;
    pendingPurchases: string;
    noPendingPurchases: string;
    txRef: string;
    txPendingHonest: string;
    creditDecisions: string;
    noCreditHistory: string;
    creditsLedger: string;
    noLedger: string;
  };
};

export function DashboardCreditsSection({
  creditsBalancePending,
  creditsFromLedger,
  pendingPurchases,
  creditTxHistory,
  ledgerRows,
  paymentTxLabels,
  labels,
}: DashboardCreditsSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="relative overflow-hidden rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.09] via-card to-amber-500/[0.06] shadow-xl shadow-primary/20 ring-1 ring-primary/10">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-amber-500/80 to-primary" aria-hidden />
          <CardContent className="relative p-6 md:p-7 space-y-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/12 to-amber-500/10 shadow-inner">
                  <Coins className="h-7 w-7 text-primary" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 space-y-2">
                  <Badge
                    variant="secondary"
                    className="w-fit border border-primary/15 bg-primary/10 font-sans text-[10px] font-semibold uppercase tracking-wider text-primary"
                  >
                    {labels.creditsSectionBadge}
                  </Badge>
                  <div>
                    <h2 className="font-serif text-xl font-bold tracking-tight text-foreground md:text-2xl">{labels.creditsMonetization}</h2>
                    <p className="mt-1.5 font-sans text-sm text-muted-foreground">{labels.creditsSectionTagline}</p>
                  </div>
                </div>
              </div>
              <div className="shrink-0 rounded-2xl border border-border/80 bg-background/90 px-4 py-3 text-left shadow-sm backdrop-blur-sm sm:text-right">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{labels.creditsUsableInline}</p>
                <p className="mt-1 font-sans text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {creditsBalancePending ? "…" : creditsFromLedger.toLocaleString("fr-FR")}
                  {!creditsBalancePending && <span className="ml-1 text-base font-semibold text-muted-foreground">cr</span>}
                </p>
                <p className="mt-1 font-sans text-[11px] leading-snug text-muted-foreground">{labels.creditsBalanceInlineHint}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-border/80 bg-background/60 px-2.5 py-1 font-sans text-[11px] font-medium text-foreground/90">
                {labels.creditsChipPublish}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/80 bg-background/60 px-2.5 py-1 font-sans text-[11px] font-medium text-foreground/90">
                {labels.creditsChipBoost}
              </span>
            </div>

            <ul className="space-y-2.5 font-sans text-sm leading-relaxed text-muted-foreground">
              {[labels.creditsBullet1, labels.creditsBullet2, labels.creditsBullet3].map((bullet) => (
                <li key={bullet} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <Link to="/credits" className="block">
              <Button
                type="button"
                className="h-12 w-full gap-2 border-0 font-sans text-base font-semibold shadow-md transition-[transform,box-shadow] hover:shadow-lg active:scale-[0.99] gradient-primary"
                style={{ color: "#FAFAFA" }}
              >
                {labels.buyCreditsCta}
                <ArrowRight className="h-5 w-5 opacity-95" aria-hidden />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-serif text-lg font-bold">{labels.pendingPurchases}</h2>
            </div>
            {pendingPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">{labels.noPendingPurchases}</p>
            ) : (
              <ul className="space-y-3">
                {pendingPurchases.map((tx) => (
                  <li key={tx.id} className="rounded-xl border border-border bg-secondary/20 p-4 text-sm font-sans">
                    <p className="font-medium">{formatAriary(tx.amount_mga)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {labels.txRef} {tx.reference ?? tx.id.slice(0, 8)} · {tx.method ?? "—"}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-2">{labels.txPendingHonest}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-3">
            <h2 className="font-serif text-lg font-bold">{labels.creditDecisions}</h2>
            {creditTxHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">{labels.noCreditHistory}</p>
            ) : (
              <ul className="space-y-2 text-sm font-sans">
                {creditTxHistory.map((tx) => (
                  <li key={tx.id} className="rounded-lg border border-border/80 px-3 py-2">
                    <p className="font-medium">{formatAriary(tx.amount_mga)}</p>
                    <p className="text-xs text-muted-foreground">
                      {paymentTxLabels[tx.status ?? ""] ?? tx.status} ·{" "}
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString("fr-FR") : ""}
                    </p>
                    {tx.status === "rejected" && tx.rejection_reason && <p className="text-xs text-destructive mt-1">{tx.rejection_reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-3">
            <h2 className="font-serif text-lg font-bold">{labels.creditsLedger}</h2>
            {ledgerRows.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">{labels.noLedger}</p>
            ) : (
              <ul className="space-y-2 text-sm font-sans max-h-64 overflow-y-auto">
                {ledgerRows.map((row) => (
                  <li key={row.id} className="flex justify-between gap-2 rounded-lg border border-border/60 px-3 py-1.5">
                    <span className={row.delta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}>
                      {row.delta >= 0 ? "+" : ""}
                      {row.delta}
                    </span>
                    <span className="text-xs text-muted-foreground text-right truncate flex-1" title={row.reason ?? ""}>
                      {row.reason ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

