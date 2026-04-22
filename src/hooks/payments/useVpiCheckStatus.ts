import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { invokeEdgeFunctionGet } from "@/lib/supabase/invokeEdgeFunctionGet";

export type VpiTxStatus = "pending" | "approved" | "failed" | "rejected" | "cancelled";

export type VpiStatus = {
  ok: boolean;
  transaction_id: string;
  status: VpiTxStatus;
  terminal: boolean;
  dry_run: boolean;
  provider_state?: string;
  error?: string;
};

const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const POLL_INTERVAL_MS = 3_000;

/**
 * Poll `vpi-check-status` every 3s until the transaction is terminal or the
 * 5-minute timeout elapses. Uses GET + query-string via invokeEdgeFunctionGet
 * (supabase.functions.invoke() doesn't support GET query params).
 */
export function useVpiCheckStatus(txId: string | null, opts?: { timeoutMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (!txId) {
      setIsTimedOut(false);
      return;
    }
    setIsTimedOut(false);
    const timer = setTimeout(() => setIsTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [txId, timeoutMs]);

  const query = useQuery<VpiStatus | null, Error>({
    queryKey: ["vpi-check-status", txId],
    enabled: !!txId,
    queryFn: async () => {
      if (!txId) return null;
      const { data, error } = await invokeEdgeFunctionGet<VpiStatus>("vpi-check-status", {
        tx_id: txId,
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => {
      const latest = (q.state.data as VpiStatus | null | undefined) ?? null;
      if (latest?.terminal) return false;
      if (isTimedOut) return false;
      return POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const isTerminal = !!query.data?.terminal;

  return {
    ...query,
    isTimedOut,
    isTerminal,
  };
}

export type PollingStatus = {
  status: VpiTxStatus | null;
  providerState: string | null;
  dryRun: boolean;
  isLoading: boolean;
  error: Error | null;
  isTimedOut: boolean;
  isTerminal: boolean;
};

/**
 * Convenience wrapper that flattens the shape the return page needs. Prefer
 * this in UI components; reach for `useVpiCheckStatus` directly only if you
 * need access to the raw React Query state.
 */
export function usePollingStatus(txId: string | null): PollingStatus {
  const q = useVpiCheckStatus(txId);
  return {
    status: q.data?.status ?? null,
    providerState: q.data?.provider_state ?? null,
    dryRun: !!q.data?.dry_run,
    isLoading: q.isLoading && !q.data,
    error: q.error ?? null,
    isTimedOut: q.isTimedOut,
    isTerminal: q.isTerminal,
  };
}
