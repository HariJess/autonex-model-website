import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StatsPeriod = 7 | 30 | 90 | "all";

export interface TimeseriesPoint {
  day: string;
  total_impressions: number;
  unique_impressions: number;
  total_clicks: number;
  unique_clicks: number;
}

export interface CampaignStatsTotals {
  total_impressions: number;
  unique_impressions: number;
  total_clicks: number;
  unique_clicks: number;
  ctr: number;
  avg_impressions_per_day: number;
  avg_clicks_per_day: number;
  days_in_period: number;
}

export interface CampaignStats {
  timeseries: TimeseriesPoint[];
  totals: CampaignStatsTotals;
}

const ALL_TIME_DAYS = 3650;

function periodToDays(period: StatsPeriod): number {
  return period === "all" ? ALL_TIME_DAYS : period;
}

function safeCtr(uniqueClicks: number, uniqueImpressions: number): number {
  return uniqueImpressions > 0 ? (uniqueClicks / uniqueImpressions) * 100 : 0;
}

export function usePartnerCampaignStats(
  campaignId: string | undefined,
  period: StatsPeriod,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ["partner-campaign-stats", campaignId, period],
    queryFn: async (): Promise<CampaignStats> => {
      if (!campaignId) throw new Error("campaignId is required");

      const days = periodToDays(period);
      const { data: rawTimeseries, error: tsError } = await supabase.rpc(
        "get_partner_ad_stats_timeseries",
        { p_campaign_id: campaignId, p_days: days },
      );
      if (tsError) throw tsError;

      const timeseries: TimeseriesPoint[] = (rawTimeseries ?? []).map((row) => ({
        day: row.day,
        total_impressions: Number(row.total_impressions),
        unique_impressions: Number(row.unique_impressions),
        total_clicks: Number(row.total_clicks),
        unique_clicks: Number(row.unique_clicks),
      }));

      const days_in_period = timeseries.length || 1;
      const total_impressions = timeseries.reduce((s, p) => s + p.total_impressions, 0);
      const total_clicks = timeseries.reduce((s, p) => s + p.total_clicks, 0);

      // For all-time, prefer the all-time DISTINCT counts from the stats view (a session
      // that spans days would otherwise be over-counted by summing daily uniques).
      // For 7/30/90j the daily-sum approximation is acceptable and avoids an extra round-trip.
      let unique_impressions: number;
      let unique_clicks: number;

      if (period === "all") {
        const { data: statsRow, error: statsErr } = await supabase
          .from("partner_ad_campaign_stats")
          .select("total_impressions, unique_impressions, total_clicks, unique_clicks")
          .eq("campaign_id", campaignId)
          .maybeSingle();
        if (statsErr) throw statsErr;
        unique_impressions = Number(statsRow?.unique_impressions ?? 0);
        unique_clicks = Number(statsRow?.unique_clicks ?? 0);
      } else {
        unique_impressions = timeseries.reduce((s, p) => s + p.unique_impressions, 0);
        unique_clicks = timeseries.reduce((s, p) => s + p.unique_clicks, 0);
      }

      return {
        timeseries,
        totals: {
          total_impressions,
          unique_impressions,
          total_clicks,
          unique_clicks,
          ctr: safeCtr(unique_clicks, unique_impressions),
          avg_impressions_per_day: total_impressions / days_in_period,
          avg_clicks_per_day: total_clicks / days_in_period,
          days_in_period,
        },
      };
    },
    enabled: enabled && !!campaignId,
    staleTime: 60_000,
  });
}
