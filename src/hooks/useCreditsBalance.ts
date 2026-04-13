import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { creditsBalanceQueryKey, fetchCreditsBalanceFromLedger } from "@/lib/creditsBalance";

/**
 * Authoritative available credit balance: sum of `credits_ledger.delta` for the current user.
 * Does not include pending purchases (those are not posted to the ledger until approval).
 */
export function useCreditsBalance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: creditsBalanceQueryKey(user?.id),
    queryFn: () => fetchCreditsBalanceFromLedger(user!.id),
    enabled: !!user?.id,
    staleTime: 15_000,
  });
}
