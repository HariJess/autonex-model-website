import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MonetizationPeriod = 7 | 30 | 90 | "all";

const ALL_TIME_DAYS = 3650;

function periodToDays(period: MonetizationPeriod): number {
  return period === "all" ? ALL_TIME_DAYS : period;
}

export interface MonetizationOverviewPoint {
  day: string;
  net_revenue_mga: number;
  gross_revenue_mga: number;
  promo_discount_mga: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
}

export interface MonetizationOverviewTotals {
  net_revenue_mga: number;
  gross_revenue_mga: number;
  promo_discount_mga: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
}

export interface MonetizationSummary {
  net_revenue_alltime: number;
  net_revenue_this_month: number;
  net_revenue_last_month: number;
  approved_count_alltime: number;
  approved_count_this_month: number;
  approved_count_last_month: number;
  rejected_count_alltime: number;
  pending_count_alltime: number;
  approval_rate_pct: number;
  avg_basket_mga: number;
  total_promo_discount_mga: number;
  total_promo_bonus_credits: number;
  credits_purchased_alltime: number;
  credits_spent_alltime: number;
  credits_in_circulation: number;
  /** Computed client-side. (this_month - last_month) / last_month × 100, 0 when last_month = 0. */
  mom_delta_pct: number;
}

export interface TopUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  approved_count: number;
  total_net_revenue_mga: number;
  last_purchase_at: string;
}

export interface BreakdownRow {
  dimension: "pack" | "method";
  label: string;
  approved_count: number;
  total_net_revenue_mga: number;
}

export function useMonetizationOverview(period: MonetizationPeriod, enabled = true) {
  return useQuery({
    queryKey: ["monetization-overview", period],
    queryFn: async (): Promise<{
      timeseries: MonetizationOverviewPoint[];
      totalsForPeriod: MonetizationOverviewTotals;
    }> => {
      const days = periodToDays(period);
      const { data, error } = await supabase.rpc("get_monetization_overview", { p_days: days });
      if (error) throw error;

      const timeseries: MonetizationOverviewPoint[] = (data ?? []).map((row) => ({
        day: row.day,
        net_revenue_mga: Number(row.net_revenue_mga),
        gross_revenue_mga: Number(row.gross_revenue_mga),
        promo_discount_mga: Number(row.promo_discount_mga),
        approved_count: Number(row.approved_count),
        rejected_count: Number(row.rejected_count),
        pending_count: Number(row.pending_count),
      }));

      const totalsForPeriod = timeseries.reduce<MonetizationOverviewTotals>(
        (acc, p) => ({
          net_revenue_mga: acc.net_revenue_mga + p.net_revenue_mga,
          gross_revenue_mga: acc.gross_revenue_mga + p.gross_revenue_mga,
          promo_discount_mga: acc.promo_discount_mga + p.promo_discount_mga,
          approved_count: acc.approved_count + p.approved_count,
          rejected_count: acc.rejected_count + p.rejected_count,
          pending_count: acc.pending_count + p.pending_count,
        }),
        {
          net_revenue_mga: 0,
          gross_revenue_mga: 0,
          promo_discount_mga: 0,
          approved_count: 0,
          rejected_count: 0,
          pending_count: 0,
        },
      );

      return { timeseries, totalsForPeriod };
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useMonetizationSummary(enabled = true) {
  return useQuery({
    queryKey: ["monetization-summary"],
    queryFn: async (): Promise<MonetizationSummary> => {
      const { data, error } = await supabase.rpc("get_monetization_summary");
      if (error) throw error;
      const row = (data?.[0] ?? {}) as Partial<Record<keyof MonetizationSummary, number | string | null>>;

      const last = Number(row.net_revenue_last_month ?? 0);
      const current = Number(row.net_revenue_this_month ?? 0);
      const mom_delta_pct = last > 0 ? ((current - last) / last) * 100 : 0;

      return {
        net_revenue_alltime: Number(row.net_revenue_alltime ?? 0),
        net_revenue_this_month: current,
        net_revenue_last_month: last,
        approved_count_alltime: Number(row.approved_count_alltime ?? 0),
        approved_count_this_month: Number(row.approved_count_this_month ?? 0),
        approved_count_last_month: Number(row.approved_count_last_month ?? 0),
        rejected_count_alltime: Number(row.rejected_count_alltime ?? 0),
        pending_count_alltime: Number(row.pending_count_alltime ?? 0),
        approval_rate_pct: Number(row.approval_rate_pct ?? 0),
        avg_basket_mga: Number(row.avg_basket_mga ?? 0),
        total_promo_discount_mga: Number(row.total_promo_discount_mga ?? 0),
        total_promo_bonus_credits: Number(row.total_promo_bonus_credits ?? 0),
        credits_purchased_alltime: Number(row.credits_purchased_alltime ?? 0),
        credits_spent_alltime: Number(row.credits_spent_alltime ?? 0),
        credits_in_circulation: Number(row.credits_in_circulation ?? 0),
        mom_delta_pct,
      };
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useMonetizationTopUsers(limit = 10, enabled = true) {
  return useQuery({
    queryKey: ["monetization-top-users", limit],
    queryFn: async (): Promise<TopUser[]> => {
      const { data, error } = await supabase.rpc("get_monetization_top_users", {
        p_limit: limit,
        p_days: ALL_TIME_DAYS,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        user_id: row.user_id,
        email: row.email ?? null,
        full_name: row.full_name ?? null,
        approved_count: Number(row.approved_count),
        total_net_revenue_mga: Number(row.total_net_revenue_mga),
        last_purchase_at: row.last_purchase_at,
      }));
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useMonetizationBreakdowns(period: MonetizationPeriod, enabled = true) {
  return useQuery({
    queryKey: ["monetization-breakdowns", period],
    queryFn: async (): Promise<{ packs: BreakdownRow[]; methods: BreakdownRow[] }> => {
      const days = periodToDays(period);
      const { data, error } = await supabase.rpc("get_monetization_breakdowns", { p_days: days });
      if (error) throw error;
      const rows = (data ?? []).map((row) => ({
        dimension: row.dimension as "pack" | "method",
        label: row.label,
        approved_count: Number(row.approved_count),
        total_net_revenue_mga: Number(row.total_net_revenue_mga),
      }));
      return {
        packs: rows.filter((r) => r.dimension === "pack"),
        methods: rows.filter((r) => r.dimension === "method"),
      };
    },
    enabled,
    staleTime: 60_000,
  });
}
