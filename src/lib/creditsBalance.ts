import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

/** React Query key: sum of `credits_ledger.delta` for the user (authoritative available balance). */
export const creditsBalanceQueryKey = (userId: string | undefined | null) =>
  ["credits-balance-ledger", userId] as const;

export function sumLedgerDeltas(rows: { delta: number | null }[] | null | undefined): number {
  return (rows ?? []).reduce((s, r) => s + Number(r.delta ?? 0), 0);
}

/** Available credits = sum of ledger deltas (approved grants and spends; pending purchases are not in the ledger). */
export async function fetchCreditsBalanceFromLedger(userId: string): Promise<number> {
  const { data, error } = await supabase.from("credits_ledger").select("delta").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return sumLedgerDeltas(data ?? []);
}

export function invalidateCreditsBalanceQueries(queryClient: QueryClient, userId: string | undefined | null) {
  if (!userId) return;
  void queryClient.invalidateQueries({ queryKey: creditsBalanceQueryKey(userId) });
}
