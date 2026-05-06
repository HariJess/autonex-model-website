import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface ActivateDealParams {
  listingId: string;
  discountPercent: number;
  durationDays: 7 | 14 | 30;
}

export interface ActivateDealResponse {
  success: true;
  listing_id: string;
  history_id: string;
  deal_started_at: string;
  deal_ends_at: string;
  deal_price_lock_until: string;
  discount_percent: number;
  original_price_mga: number;
  new_price_mga: number;
}

export interface CancelDealResponse {
  success: true;
  listing_id: string;
  cancelled_at: string;
  price_lock_until: string | null;
}

// Récupère un message d'erreur lisible depuis le payload remonté par
// supabase.functions.invoke. Selon la version du SDK, l'erreur peut arriver
// soit dans `error` (FunctionsHttpError) soit dans `data.error` (notre
// wrapper jsonError côté Edge Function).
function readInvokeError(error: unknown, data: unknown): string | null {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  if (data && typeof data === "object" && "success" in data && (data as { success: unknown }).success === false) {
    const errMsg = (data as { error?: unknown }).error;
    if (typeof errMsg === "string" && errMsg.trim().length > 0) return errMsg;
  }
  return null;
}

export function useActivateDeal() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: ActivateDealParams): Promise<ActivateDealResponse> => {
      const { data, error } = await supabase.functions.invoke("activate-deal", {
        body: {
          listingId: params.listingId,
          discountPercent: params.discountPercent,
          durationDays: params.durationDays,
        },
      });
      const errMsg = readInvokeError(error, data);
      if (errMsg) throw new Error(errMsg);
      const payload = data as ActivateDealResponse | null;
      if (!payload || payload.success !== true) {
        throw new Error(t("deals.toast.activateFailed", "Échec de l'activation du deal"));
      }
      return payload;
    },
    onSuccess: () => {
      // Invalide les queries dashboard (`my-listings`) ET les listings publics
      // (`db-listings` clé utilisée par useDbListings) pour que le badge -X% et
      // le prix barré apparaissent immédiatement partout.
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      // Sprint 7 deals — invalidation MyListingCard /mes-annonces (queryKey
      // distincte `my-listings-dashboard` utilisée par useMyListings, qui ne
      // matche pas `my-listings` en préfixe segments TanStack).
      queryClient.invalidateQueries({ queryKey: ["my-listings-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["db-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      toast.success(t("deals.toast.activated", "Deal activé avec succès !"));
    },
    onError: (err: Error) => {
      toast.error(err.message || t("deals.toast.activateFailed", "Échec de l'activation du deal"));
    },
  });
}

export function useCancelDeal() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (listingId: string): Promise<CancelDealResponse> => {
      const { data, error } = await supabase.functions.invoke("cancel-deal", {
        body: { listingId },
      });
      const errMsg = readInvokeError(error, data);
      if (errMsg) throw new Error(errMsg);
      const payload = data as CancelDealResponse | null;
      if (!payload || payload.success !== true) {
        throw new Error(t("deals.toast.cancelFailed", "Échec de l'annulation"));
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      // Sprint 7 deals — invalidation MyListingCard /mes-annonces (cf. useActivateDeal).
      queryClient.invalidateQueries({ queryKey: ["my-listings-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["db-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      toast.success(t("deals.toast.cancelled", "Deal annulé"));
    },
    onError: (err: Error) => {
      toast.error(err.message || t("deals.toast.cancelFailed", "Échec de l'annulation"));
    },
  });
}
