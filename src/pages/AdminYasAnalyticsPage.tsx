import { type ReactNode, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useYasAnalytics } from "@/hooks/useYasAnalytics";
import { formatNumber } from "@/lib/formatMga";

/**
 * Dashboard admin interne — analytics YAS × AutoNex.
 *
 * Source : RPC `get_yas_analytics()` (SECURITY DEFINER + check
 * `immonex_is_admin()` interne, cf. Plan 4/4 SQL). Affiche :
 * - 4 KPI cards (sessions 24h / 7j / 30j + total events 30j)
 * - Funnel 9 étapes en BarChart vertical (avec % vs étape précédente)
 * - Time series 30 jours en LineChart
 * - Top events 30j en BarChart horizontal
 * - Plateformes (iOS / Android / unknown) en BarChart horizontal
 * - Top 10 referrers en table
 *
 * Pattern visuel et helpers (Kpi/LoadingBlock/ErrorBlock/EmptyBlock) calqués
 * sur `AdminRevenuesPage.tsx` pour cohérence cross-admin.
 */

const FUNNEL_STEPS: Array<{ key: keyof FunnelData; labelKey: string; fallback: string }> = [
  { key: "autonex_open", labelKey: "admin.yasAnalytics.funnel.steps.autonexOpen", fallback: "Ouverture mini-app" },
  { key: "action_click", labelKey: "admin.yasAnalytics.funnel.steps.actionClick", fallback: "Clic CTA action" },
  { key: "search_performed", labelKey: "admin.yasAnalytics.funnel.steps.searchPerformed", fallback: "Recherche lancée" },
  { key: "listing_view", labelKey: "admin.yasAnalytics.funnel.steps.listingView", fallback: "Vue annonce" },
  { key: "seller_contact_click", labelKey: "admin.yasAnalytics.funnel.steps.sellerContactClick", fallback: "Contact vendeur" },
  { key: "estimation_started", labelKey: "admin.yasAnalytics.funnel.steps.estimationStarted", fallback: "Estimation démarrée" },
  { key: "estimation_completed", labelKey: "admin.yasAnalytics.funnel.steps.estimationCompleted", fallback: "Estimation terminée" },
  { key: "publish_started", labelKey: "admin.yasAnalytics.funnel.steps.publishStarted", fallback: "Publication démarrée" },
  { key: "publish_completed", labelKey: "admin.yasAnalytics.funnel.steps.publishCompleted", fallback: "Publication réussie" },
];

type FunnelData = {
  autonex_open: number;
  action_click: number;
  search_performed: number;
  listing_view: number;
  seller_contact_click: number;
  estimation_started: number;
  estimation_completed: number;
  publish_started: number;
  publish_completed: number;
};

function Kpi({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-sans">{label}</div>
      <div className="mt-1 text-lg font-semibold font-sans">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground font-sans">{sub}</div> : null}
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground font-sans">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function ErrorBlock({ error, label }: { error: unknown; label: string }) {
  return (
    <div className="py-4 text-sm text-destructive font-sans">
      {label} {error instanceof Error ? error.message : ""}
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
  return d.toLocaleString("fr-FR");
}

function eventNameLabel(name: string): string {
  // Strip the `yas_` prefix and humanize for nicer chart labels.
  return name.replace(/^yas_/, "").replace(/_/g, " ");
}

export default function AdminYasAnalyticsPage() {
  const { t } = useTranslation();
  const query = useYasAnalytics();
  const data = query.data;

  // Funnel chart data (9 étapes ordonnées + % vs étape précédente).
  const funnelChartData = useMemo(() => {
    if (!data) return [];
    const items = FUNNEL_STEPS.map((step, idx) => {
      const count = data.funnel[step.key];
      const previousCount = idx === 0 ? count : data.funnel[FUNNEL_STEPS[idx - 1].key];
      const pctVsPrev = previousCount > 0 ? Math.round((count / previousCount) * 100) : 0;
      return {
        step: t(step.labelKey, step.fallback),
        count,
        pctVsPrev,
      };
    });
    return items;
  }, [data, t]);

  const topEventsChartData = useMemo(() => {
    if (!data?.top_events) return [];
    return data.top_events.map((entry) => ({
      label: eventNameLabel(entry.event_name),
      count: entry.count,
    }));
  }, [data]);

  const platformsChartData = useMemo(() => {
    if (!data?.platforms) return [];
    return data.platforms.map((entry) => ({
      platform: entry.platform,
      count: entry.count,
    }));
  }, [data]);

  const referrersTotal = useMemo(() => {
    if (!data?.referrers) return 0;
    return data.referrers.reduce((acc, r) => acc + r.count, 0);
  }, [data]);

  return (
    <>
      <Helmet>
        <title>{t("admin.yasAnalytics.title", "Analytics YAS — AutoNex")}</title>
      </Helmet>
      <div className="max-w-6xl space-y-6">
        <div>
          <h1 className="font-sans text-2xl font-bold">
            {t("admin.yasAnalytics.title", "Analytics YAS × AutoNex")}
          </h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {t(
              "admin.yasAnalytics.subtitle",
              "Vue d'ensemble des sessions, du funnel et des performances de la mini-app embarquée dans YAS & Moi.",
            )}
          </p>
          {data?.generated_at ? (
            <p className="text-xs text-muted-foreground font-sans mt-1">
              {t("admin.yasAnalytics.lastUpdate", "Dernière maj : {{date}}", {
                date: formatDateShort(data.generated_at),
              })}
            </p>
          ) : null}
        </div>

        {/* KPI cards — sessions */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">
              {t("admin.yasAnalytics.kpi.heading", "Sessions YAS")}
            </CardTitle>
            <CardDescription className="font-sans">
              {t(
                "admin.yasAnalytics.kpi.subtitle",
                "Sessions distinctes par fenêtre temporelle (déduplication par session_id).",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <LoadingBlock label={t("admin.yasAnalytics.loading", "Chargement des données...")} />
            ) : query.isError ? (
              <ErrorBlock
                error={query.error}
                label={t("admin.yasAnalytics.error", "Impossible de charger les données.")}
              />
            ) : data ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi
                  label={t("admin.yasAnalytics.kpi.sessions24h", "Sessions 24h")}
                  value={formatNumber(data.sessions.sessions_24h)}
                />
                <Kpi
                  label={t("admin.yasAnalytics.kpi.sessions7d", "Sessions 7 jours")}
                  value={formatNumber(data.sessions.sessions_7d)}
                />
                <Kpi
                  label={t("admin.yasAnalytics.kpi.sessions30d", "Sessions 30 jours")}
                  value={formatNumber(data.sessions.sessions_30d)}
                />
                <Kpi
                  label={t("admin.yasAnalytics.kpi.totalEvents30d", "Événements totaux 30j")}
                  value={formatNumber(data.sessions.total_events_30d)}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">
              {t("admin.yasAnalytics.funnel.title", "Funnel de conversion")}
            </CardTitle>
            <CardDescription className="font-sans">
              {t(
                "admin.yasAnalytics.funnel.subtitle",
                "Sessions distinctes ayant atteint chaque étape (sur 30 jours).",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <LoadingBlock label={t("admin.yasAnalytics.loading", "Chargement des données...")} />
            ) : query.isError ? (
              <ErrorBlock
                error={query.error}
                label={t("admin.yasAnalytics.error", "Impossible de charger les données.")}
              />
            ) : funnelChartData.length === 0 || funnelChartData.every((d) => d.count === 0) ? (
              <EmptyBlock
                label={t("admin.yasAnalytics.funnel.empty", "Pas encore de données de funnel sur 30 jours.")}
              />
            ) : (
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={funnelChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 24, left: 16, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={11} />
                    <YAxis dataKey="step" type="category" width={170} fontSize={11} />
                    <Tooltip
                      formatter={(value, _name, ctx) => {
                        const pct = (ctx.payload as { pctVsPrev?: number } | undefined)?.pctVsPrev;
                        return [
                          `${formatNumber(Number(value))} sessions${pct != null ? ` (${pct}% vs étape précédente)` : ""}`,
                          t("admin.yasAnalytics.funnel.legend", "Sessions"),
                        ];
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time series 30j */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">
              {t("admin.yasAnalytics.dailyEvents.title", "Activité par jour")}
            </CardTitle>
            <CardDescription className="font-sans">
              {t(
                "admin.yasAnalytics.dailyEvents.subtitle",
                "Événements totaux par jour sur 30 jours.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <LoadingBlock label={t("admin.yasAnalytics.loading", "Chargement des données...")} />
            ) : query.isError ? (
              <ErrorBlock
                error={query.error}
                label={t("admin.yasAnalytics.error", "Impossible de charger les données.")}
              />
            ) : !data?.daily_events || data.daily_events.length === 0 ? (
              <EmptyBlock
                label={t("admin.yasAnalytics.dailyEvents.empty", "Pas encore d'événements sur 30 jours.")}
              />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.daily_events.map((p) => ({ day: p.date, count: p.count }))}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickFormatter={formatDayShort} fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} tickFormatter={(v) => formatNumber(Number(v))} />
                    <Tooltip
                      labelFormatter={(label) => formatDayLong(String(label))}
                      formatter={(value) => [
                        formatNumber(Number(value)),
                        t("admin.yasAnalytics.dailyEvents.legend", "Événements"),
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name={t("admin.yasAnalytics.dailyEvents.legend", "Événements")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top events */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">
              {t("admin.yasAnalytics.topEvents.title", "Top événements")}
            </CardTitle>
            <CardDescription className="font-sans">
              {t(
                "admin.yasAnalytics.topEvents.subtitle",
                "Fréquence des événements trackés (30 jours).",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <LoadingBlock label={t("admin.yasAnalytics.loading", "Chargement des données...")} />
            ) : query.isError ? (
              <ErrorBlock
                error={query.error}
                label={t("admin.yasAnalytics.error", "Impossible de charger les données.")}
              />
            ) : topEventsChartData.length === 0 ? (
              <EmptyBlock label={t("admin.yasAnalytics.topEvents.empty", "Pas encore d'événements.")} />
            ) : (
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topEventsChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 24, left: 16, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={11} />
                    <YAxis dataKey="label" type="category" width={180} fontSize={11} />
                    <Tooltip
                      formatter={(value) => [
                        formatNumber(Number(value)),
                        t("admin.yasAnalytics.topEvents.legend", "Occurrences"),
                      ]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plateformes */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">
              {t("admin.yasAnalytics.platforms.title", "Plateformes")}
            </CardTitle>
            <CardDescription className="font-sans">
              {t(
                "admin.yasAnalytics.platforms.subtitle",
                "Répartition iOS / Android / inconnu sur 30 jours (par événement).",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <LoadingBlock label={t("admin.yasAnalytics.loading", "Chargement des données...")} />
            ) : query.isError ? (
              <ErrorBlock
                error={query.error}
                label={t("admin.yasAnalytics.error", "Impossible de charger les données.")}
              />
            ) : platformsChartData.length === 0 ? (
              <EmptyBlock label={t("admin.yasAnalytics.platforms.empty", "Pas encore d'événements.")} />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={platformsChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 24, left: 16, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={11} />
                    <YAxis dataKey="platform" type="category" width={120} fontSize={11} />
                    <Tooltip
                      formatter={(value) => [
                        formatNumber(Number(value)),
                        t("admin.yasAnalytics.platforms.legend", "Événements"),
                      ]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top referrers */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-sans">
              {t("admin.yasAnalytics.referrers.title", "Sources de trafic")}
            </CardTitle>
            <CardDescription className="font-sans">
              {t(
                "admin.yasAnalytics.referrers.subtitle",
                "Top 10 des origines de session (document.referrer, 30 jours).",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <LoadingBlock label={t("admin.yasAnalytics.loading", "Chargement des données...")} />
            ) : query.isError ? (
              <ErrorBlock
                error={query.error}
                label={t("admin.yasAnalytics.error", "Impossible de charger les données.")}
              />
            ) : !data?.referrers || data.referrers.length === 0 ? (
              <EmptyBlock label={t("admin.yasAnalytics.referrers.empty", "Aucun referrer capturé pour l'instant.")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">
                        {t("admin.yasAnalytics.referrers.colReferrer", "Referrer")}
                      </th>
                      <th className="py-2 pr-3 text-right">
                        {t("admin.yasAnalytics.referrers.colCount", "Événements")}
                      </th>
                      <th className="py-2 pr-3 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.referrers.map((r, i) => (
                      <tr key={`${r.referrer}-${i}`} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{i + 1}</td>
                        <td className="py-2 pr-3 break-all">{r.referrer}</td>
                        <td className="py-2 pr-3 text-right">{formatNumber(r.count)}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {referrersTotal > 0 ? `${Math.round((r.count / referrersTotal) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
