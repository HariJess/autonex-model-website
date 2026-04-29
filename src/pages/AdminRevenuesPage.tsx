import { type ReactNode, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type MonetizationPeriod,
  useMonetizationBreakdowns,
  useMonetizationOverview,
  useMonetizationSummary,
  useMonetizationTopUsers,
} from "@/hooks/useMonetizationDashboard";
import { formatDeltaPct, formatMga, formatNumber } from "@/lib/formatMga";

const PERIOD_OPTIONS: Array<{ value: MonetizationPeriod; label: string }> = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: "all", label: "Tout" },
];

function formatDayShort(day: string): string {
  const [, m, d] = day.split("-");
  if (!m || !d) return day;
  return `${d}/${m}`;
}

function formatDayLong(day: string): string {
  const [y, m, d] = day.split("-");
  if (!y || !m || !d) return day;
  return `${d}/${m}/${y}`;
}

function formatDateShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-sans">{label}</div>
      <div className="mt-1 text-lg font-semibold font-sans">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground font-sans">{sub}</div> : null}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground font-sans">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Chargement...
    </div>
  );
}

function ErrorBlock({ error }: { error: unknown }) {
  return (
    <div className="py-4 text-sm text-destructive font-sans">
      Impossible de charger les données. {error instanceof Error ? error.message : ""}
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground font-sans">
      {label}
    </div>
  );
}

export default function AdminRevenuesPage() {
  const [period, setPeriod] = useState<MonetizationPeriod>(30);

  const summary = useMonetizationSummary();
  const overview = useMonetizationOverview(period);
  const topUsers = useMonetizationTopUsers(10);
  const breakdowns = useMonetizationBreakdowns(period);

  return (
    <>
      <Helmet>
        <title>Admin — Revenus — AutoNex</title>
      </Helmet>
      <div className="max-w-6xl space-y-6">
        <div>
          <h1 className="font-sans text-2xl font-bold">Revenus & analytics</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Revenus nets après remises promotionnelles. Source : transactions approuvées d'achats de packs de crédits.
          </p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">Vue d'ensemble</CardTitle>
            <CardDescription className="font-sans">All-time + comparaison mois en cours vs mois dernier.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <LoadingBlock />
            ) : summary.isError ? (
              <ErrorBlock error={summary.error} />
            ) : summary.data ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi
                  label="Revenu total"
                  value={formatMga(summary.data.net_revenue_alltime)}
                  sub="depuis le début"
                />
                <Kpi
                  label="Ce mois-ci"
                  value={formatMga(summary.data.net_revenue_this_month)}
                  sub={
                    summary.data.net_revenue_last_month > 0 ? (
                      <span
                        className={summary.data.mom_delta_pct >= 0 ? "text-green-600" : "text-red-600"}
                      >
                        {summary.data.mom_delta_pct >= 0 ? (
                          <TrendingUp className="inline h-3 w-3 mr-0.5" />
                        ) : (
                          <TrendingDown className="inline h-3 w-3 mr-0.5" />
                        )}
                        {formatDeltaPct(summary.data.mom_delta_pct)} vs mois dernier
                      </span>
                    ) : (
                      "0 Ar le mois dernier"
                    )
                  }
                />
                <Kpi
                  label="Mois précédent"
                  value={formatMga(summary.data.net_revenue_last_month)}
                  sub={`${formatNumber(summary.data.approved_count_last_month)} ventes`}
                />
                <Kpi
                  label="Panier moyen"
                  value={formatMga(summary.data.avg_basket_mga)}
                  sub={`${formatNumber(summary.data.approved_count_alltime)} ventes au total`}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="font-sans">Évolution des revenus</CardTitle>
                <CardDescription className="font-sans">Revenu net journalier sur la période sélectionnée.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-1">
                {PERIOD_OPTIONS.map((opt) => (
                  <Button
                    key={String(opt.value)}
                    size="sm"
                    variant={period === opt.value ? "default" : "outline"}
                    onClick={() => setPeriod(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <LoadingBlock />
            ) : overview.isError ? (
              <ErrorBlock error={overview.error} />
            ) : overview.data ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <Kpi
                    label="Revenu net"
                    value={formatMga(overview.data.totalsForPeriod.net_revenue_mga)}
                    sub="sur la période"
                  />
                  <Kpi
                    label="Remises promo"
                    value={formatMga(overview.data.totalsForPeriod.promo_discount_mga)}
                    sub="déduites du revenu"
                  />
                  <Kpi
                    label="Ventes approuvées"
                    value={formatNumber(overview.data.totalsForPeriod.approved_count)}
                    sub={`${formatNumber(overview.data.totalsForPeriod.rejected_count)} refusées · ${formatNumber(overview.data.totalsForPeriod.pending_count)} en attente`}
                  />
                </div>
                {overview.data.totalsForPeriod.approved_count === 0 ? (
                  <EmptyBlock label="Aucune transaction approuvée sur cette période." />
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={overview.data.timeseries.map((p) => ({
                          day: p.day,
                          revenue: p.net_revenue_mga,
                        }))}
                        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" tickFormatter={formatDayShort} fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v) => formatNumber(Number(v))} allowDecimals={false} />
                        <Tooltip
                          labelFormatter={(label) => formatDayLong(String(label))}
                          formatter={(value) => [formatMga(Number(value)), "Revenu net"]}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#16a34a"
                          strokeWidth={2}
                          dot={false}
                          name="Revenu net (Ar)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">Stats opérationnelles</CardTitle>
            <CardDescription className="font-sans">
              Taux d'approbation et statuts all-time. Refusées = rejected + failed + cancelled. En attente = pending + under_review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi label="Approuvées" value={formatNumber(summary.data.approved_count_alltime)} sub="depuis le début" />
                <Kpi label="Refusées" value={formatNumber(summary.data.rejected_count_alltime)} sub="non comptées en revenu" />
                <Kpi label="En attente" value={formatNumber(summary.data.pending_count_alltime)} sub="à traiter" />
                <Kpi
                  label="Taux d'approbation"
                  value={`${summary.data.approval_rate_pct.toFixed(1)}%`}
                  sub="approved / (approved + refusées)"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">Top 10 acheteurs</CardTitle>
            <CardDescription className="font-sans">Classement par revenu net cumulé all-time.</CardDescription>
          </CardHeader>
          <CardContent>
            {topUsers.isLoading ? (
              <LoadingBlock />
            ) : topUsers.isError ? (
              <ErrorBlock error={topUsers.error} />
            ) : topUsers.data && topUsers.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Utilisateur</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3 text-right">Achats</th>
                      <th className="py-2 pr-3 text-right">Revenu net</th>
                      <th className="py-2 pr-3">Dernier achat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.data.map((u, i) => (
                      <tr key={u.user_id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{i + 1}</td>
                        <td className="py-2 pr-3">{u.full_name ?? "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{u.email ?? "Compte supprimé"}</td>
                        <td className="py-2 pr-3 text-right">{formatNumber(u.approved_count)}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{formatMga(u.total_net_revenue_mga)}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{formatDateShort(u.last_purchase_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBlock label="Aucun acheteur pour l'instant." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">Crédits en circulation</CardTitle>
            <CardDescription className="font-sans">
              Vue financière du ledger : achetés vs dépensés. Les crédits non consommés représentent une dette d'usage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.data && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Kpi label="Crédits achetés" value={formatNumber(summary.data.credits_purchased_alltime)} sub="all-time" />
                <Kpi label="Crédits dépensés" value={formatNumber(summary.data.credits_spent_alltime)} sub="all-time" />
                <Kpi label="Solde flottant" value={formatNumber(summary.data.credits_in_circulation)} sub="achetés non consommés" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">Performance des packs</CardTitle>
            <CardDescription className="font-sans">Quel pack rapporte le plus sur la période sélectionnée.</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdowns.isLoading ? (
              <LoadingBlock />
            ) : breakdowns.isError ? (
              <ErrorBlock error={breakdowns.error} />
            ) : breakdowns.data && breakdowns.data.packs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">Pack</th>
                      <th className="py-2 pr-3 text-right">Ventes</th>
                      <th className="py-2 pr-3 text-right">Revenu net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdowns.data.packs.map((p) => (
                      <tr key={p.label} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{p.label}</td>
                        <td className="py-2 pr-3 text-right">{formatNumber(p.approved_count)}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{formatMga(p.total_net_revenue_mga)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBlock label="Aucune vente de pack sur cette période." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">Méthodes de paiement</CardTitle>
            <CardDescription className="font-sans">Répartition des achats par méthode sur la période.</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdowns.data && breakdowns.data.methods.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">Méthode</th>
                      <th className="py-2 pr-3 text-right">Ventes</th>
                      <th className="py-2 pr-3 text-right">Revenu net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdowns.data.methods.map((m) => (
                      <tr key={m.label} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{m.label}</td>
                        <td className="py-2 pr-3 text-right">{formatNumber(m.approved_count)}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{formatMga(m.total_net_revenue_mga)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBlock label="Aucune transaction sur cette période." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">Impact des codes promo</CardTitle>
            <CardDescription className="font-sans">
              Coût total des promotions accordées (à comparer aux ventes générées).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.data && (
              <div className="grid grid-cols-2 gap-3">
                <Kpi
                  label="Remises accordées"
                  value={formatMga(summary.data.total_promo_discount_mga)}
                  sub="déduites du revenu"
                />
                <Kpi
                  label="Crédits bonus offerts"
                  value={formatNumber(summary.data.total_promo_bonus_credits)}
                  sub="dette d'usage"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
