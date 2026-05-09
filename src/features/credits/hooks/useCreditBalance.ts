/**
 * useCreditBalance — snapshot riche du solde crédits avec breakdown granted/paid.
 *
 * Une seule query SELECT delta, is_granted, granted_expires_at FROM credits_ledger
 * WHERE user_id = userId. L'agrégation totale + active grants + consumed grants
 * + earliest expiry est faite côté client en O(N) sur les ~10-100 lignes typiques
 * du ledger d'un user. Évite un 2e round-trip vers profiles.credits_balance
 * (qui n'est qu'un cache de SUM(delta) et peut décaler temporairement).
 *
 * Realtime : invalide le cache sur INSERT credits_ledger (le user a payé/dépensé)
 * ET sur UPDATE profiles (admin adjustment manuel via UI). Pattern channel name
 * unique repris du hotfix Sentry de useNotifications.
 *
 * Hook PARALLÈLE à useCreditsBalance (pluriel, hooks/) qui retourne juste le total.
 * Migration de useCreditsBalance vers useCreditBalance viendra plus tard.
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface CreditBalanceSnapshot {
  /** Solde total (= granted_active + paid). */
  total: number;
  /** Crédits achetés non expirables. */
  paid: number;
  /** Crédits offerts encore actifs (non expirés, après FIFO consommations). */
  granted: number;
  /**
   * Total des crédits offerts INITIALEMENT REÇUS encore actifs (positives non-expirés).
   * PAS soustrait des consommations FIFO. Utile pour CreditWelcomeBanner qui affiche
   * "Vous avez reçu X crédits" (initial) vs "Il vous reste Y / X reçus" (consommé).
   * PROMPT 4.3.
   */
  grantedReceived: number;
  /** ISO date de la prochaine expiration de grant actif. NULL si aucun grant à expirer. */
  grantedExpiresAt: string | null;
  isLoading: boolean;
  error: Error | null;
}

const EMPTY_SNAPSHOT: CreditBalanceSnapshot = {
  total: 0,
  paid: 0,
  granted: 0,
  grantedReceived: 0,
  grantedExpiresAt: null,
  isLoading: false,
  error: null,
};

export const creditBalanceQueryKey = (userId: string | null | undefined) =>
  ["credit-balance", userId ?? null] as const;

type ComputedSnapshot = Pick<
  CreditBalanceSnapshot,
  "total" | "paid" | "granted" | "grantedReceived" | "grantedExpiresAt"
>;

export async function fetchCreditBalanceSnapshot(userId: string): Promise<ComputedSnapshot> {
  const { data, error } = await supabase
    .from("credits_ledger")
    .select("delta, is_granted, granted_expires_at")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const now = Date.now();
  let total = 0;
  let activeGrantPositive = 0;
  let consumedFromGrants = 0;
  let earliestActiveExpiry: number | null = null;

  for (const row of data ?? []) {
    const delta = Number(row.delta ?? 0);
    total += delta;
    if (!row.is_granted) continue;

    if (delta > 0) {
      const expiresMs = row.granted_expires_at ? new Date(row.granted_expires_at).getTime() : null;
      const isActive = expiresMs === null || expiresMs > now;
      if (isActive) {
        activeGrantPositive += delta;
        if (expiresMs !== null && (earliestActiveExpiry === null || expiresMs < earliestActiveExpiry)) {
          earliestActiveExpiry = expiresMs;
        }
      }
    } else if (delta < 0) {
      consumedFromGrants += -delta;
    }
  }

  const granted = Math.max(0, activeGrantPositive - consumedFromGrants);
  const paid = Math.max(0, total - granted);

  return {
    total,
    paid,
    granted,
    // PROMPT 4.3 : montant initial reçu = somme des grants positifs encore actifs
    // (sans soustraire les consommations). Permet au banner d'afficher la
    // distinction reçu/restant.
    grantedReceived: activeGrantPositive,
    grantedExpiresAt: earliestActiveExpiry !== null ? new Date(earliestActiveExpiry).toISOString() : null,
  };
}

export function useCreditBalance(): CreditBalanceSnapshot {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: creditBalanceQueryKey(userId),
    queryFn: () => fetchCreditBalanceSnapshot(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Realtime — pattern repris du hotfix Sentry useNotifications :
  // channel name unique par mount + try/catch défensif + cleanup.
  useEffect(() => {
    if (!userId) return;

    const channelName = `credit-balance:${userId}:${Date.now()}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
          () => {
            void queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "credits_ledger", filter: `user_id=eq.${userId}` },
          () => {
            void queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
          },
        )
        .subscribe();
    } catch (err) {
      // Degraded mode — REST fetch sufficit. Ne casse pas la page.
      // eslint-disable-next-line no-console
      console.warn("[useCreditBalance] realtime subscription failed", err);
      return;
    }

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId, queryClient]);

  if (!userId) {
    return EMPTY_SNAPSHOT;
  }

  return {
    total: query.data?.total ?? 0,
    paid: query.data?.paid ?? 0,
    granted: query.data?.granted ?? 0,
    grantedReceived: query.data?.grantedReceived ?? 0,
    grantedExpiresAt: query.data?.grantedExpiresAt ?? null,
    isLoading: query.isPending,
    error: (query.error as Error | null) ?? null,
  };
}
