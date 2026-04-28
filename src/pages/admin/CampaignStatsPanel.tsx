import { useState } from "react";
import { Loader2, Download } from "lucide-react";
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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerCampaignStats, type StatsPeriod } from "@/hooks/usePartnerCampaignStats";

interface CampaignStatsPanelProps {
  campaignId: string;
  campaignTitle: string;
}

const PERIOD_OPTIONS: Array<{ value: StatsPeriod; label: string }> = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: "all", label: "Tout" },
];

const ALL_TIME_DAYS = 3650;
const EXPORT_ROW_CAP = 50000;

function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
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

function escapeCsvCell(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-sans">{label}</div>
      <div className="mt-1 text-lg font-semibold font-sans">{value}</div>
      <div className="text-xs text-muted-foreground font-sans">{sub}</div>
    </div>
  );
}

export function CampaignStatsPanel({ campaignId, campaignTitle }: CampaignStatsPanelProps) {
  const [period, setPeriod] = useState<StatsPeriod>(30);
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, isError, error } = usePartnerCampaignStats(campaignId, period);

  const handleExport = async () => {
    setExporting(true);
    try {
      const days = period === "all" ? ALL_TIME_DAYS : period;
      const { data: events, error: rpcError } = await supabase.rpc("get_partner_ad_events_export", {
        p_campaign_id: campaignId,
        p_days: days,
      });
      if (rpcError) throw rpcError;

      const rows = (events ?? []) as Array<{
        occurred_at: string;
        event_type: string;
        placement_key: string;
        session_id: string;
        user_id: string | null;
      }>;

      if (rows.length >= EXPORT_ROW_CAP) {
        console.warn(`[stats-export] truncated to ${EXPORT_ROW_CAP} rows for campaign ${campaignId}`);
      }

      const header = "occurred_at,event_type,placement_key,session_id,user_id\n";
      const body = rows
        .map((r) =>
          [r.occurred_at, r.event_type, r.placement_key, r.session_id, r.user_id ?? ""]
            .map(escapeCsvCell)
            .join(","),
        )
        .join("\n");
      const csv = header + body;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = campaignTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "campaign";
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `autonex_stats_${safeTitle}_${dateStamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[stats-export]", err);
      toast.error("L'export a échoué. Réessaie dans un instant.");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground font-sans">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Chargement des statistiques...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-4 text-sm text-destructive font-sans">
        Impossible de charger les statistiques. {error instanceof Error ? error.message : ""}
      </div>
    );
  }

  if (!data) return null;

  const { timeseries, totals } = data;
  const hasAnyEvents = totals.total_impressions > 0 || totals.total_clicks > 0;

  const chartData = timeseries.map((p) => ({
    day: p.day,
    impressions: p.total_impressions,
    clicks: p.total_clicks,
  }));

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting || !hasAnyEvents}>
          {exporting ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Download className="mr-2 h-3 w-3" />
          )}
          Exporter CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Impressions"
          value={formatNumber(totals.total_impressions)}
          sub={`${formatNumber(totals.unique_impressions)} uniques`}
        />
        <Kpi
          label="Clics"
          value={formatNumber(totals.total_clicks)}
          sub={`${formatNumber(totals.unique_clicks)} uniques`}
        />
        <Kpi
          label="CTR"
          value={`${totals.ctr.toFixed(2)}%`}
          sub="clics uniques / impr. uniques"
        />
        <Kpi
          label="Moyenne / jour"
          value={`${formatNumber(Math.round(totals.avg_impressions_per_day))} impr.`}
          sub={`${formatNumber(Math.round(totals.avg_clicks_per_day))} clics`}
        />
      </div>

      {hasAnyEvents ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={formatDayShort} fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip labelFormatter={(label) => formatDayLong(String(label))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="impressions"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Impressions"
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Clics"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground font-sans">
          Aucun événement enregistré pour cette période.
        </div>
      )}
    </div>
  );
}
