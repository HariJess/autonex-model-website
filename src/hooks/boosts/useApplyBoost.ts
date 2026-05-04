import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { wrapRpc } from "@/lib/monitoring";

/**
 * V1 boost types (PROMPT 6). 3 types orthogonaux cumulables.
 *
 * Mapping coût (ratio 1:1 crédits/Ar) :
 *   - bump      :   5 000 crédits, one-shot, cooldown 24h
 *   - featured  :  30 000 crédits, +7 jours (cumule)
 *   - top_ad    : 100 000 crédits, +30 jours (cumule)
 */
export type BoostV1Type = "bump" | "featured" | "top_ad";

export type ApplyBoostInput = {
  listingId: string;
  boostType: BoostV1Type;
};

export type ApplyBoostResult = {
  ok: boolean;
  boost_id: string;
  boost_type: BoostV1Type;
  credits_charged: number;
  last_bumped_at: string | null;
  featured_until: string | null;
  top_ad_until: string | null;
  notification_id: string | null;
};

/**
 * Mappe les codes d'erreur RPC `apply_boost` vers une i18n key.
 *
 * Codes émis par la RPC (RAISE EXCEPTION) :
 *   - 'auth_required'           → boost.errors.notAuthenticated
 *   - 'invalid_boost_type'      → boost.errors.invalidType
 *   - 'listing_not_found'       → boost.errors.notFound
 *   - 'not_owner'               → boost.errors.notOwner
 *   - 'listing_not_boostable'   → boost.errors.notBoostable
 *   - 'bump_cooldown_active'    → boost.errors.cooldown
 *   - 'pricing_not_found'       → boost.errors.generic
 *   - 'insufficient_credits'    → boost.errors.insufficientCredits
 */
export function mapApplyBoostErrorToI18nKey(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("insufficient_credits")) return "boost.errors.insufficientCredits";
  if (m.includes("bump_cooldown_active")) return "boost.errors.cooldown";
  if (m.includes("not_owner")) return "boost.errors.notOwner";
  if (m.includes("listing_not_boostable")) return "boost.errors.notBoostable";
  if (m.includes("listing_not_found")) return "boost.errors.notFound";
  if (m.includes("invalid_boost_type")) return "boost.errors.invalidType";
  if (m.includes("auth_required") || m.includes("not_authenticated")) {
    return "boost.errors.notAuthenticated";
  }
  return "boost.errors.generic";
}

function successI18nKey(boostType: BoostV1Type): string {
  switch (boostType) {
    case "bump":
      return "boost.success.bumpToast";
    case "featured":
      return "boost.success.featuredToast";
    case "top_ad":
      return "boost.success.topAdToast";
  }
}

/**
 * Mutation TanStack pour appeler la RPC `apply_boost`. Invalide les caches
 * impactés (my-listings, credits-balance, featured-boosts, notifications)
 * en onSuccess. Toast localisé selon le boost type. Erreurs mappées vers
 * une i18n key déterministe via `mapApplyBoostErrorToI18nKey`.
 */
export function useApplyBoost() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<ApplyBoostResult, Error, ApplyBoostInput>({
    mutationFn: async (input) => {
      const { data, error } = await wrapRpc("apply_boost", () =>
        // Cast `any` car la RPC apply_boost n'est pas encore dans le types regen
        // (migration appliquée manuellement par Ali post-implementation).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.rpc as any)("apply_boost", {
          p_listing_id: input.listingId,
          p_boost_type: input.boostType,
        }),
      );
      if (error) throw new Error(error.message);
      return data as ApplyBoostResult;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["my-listings-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["credits-balance"] });
      void queryClient.invalidateQueries({ queryKey: ["featured-boost-listing-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["db-listings"] });
      toast.success(t(successI18nKey(variables.boostType)));
    },
    onError: (err) => {
      toast.error(t(mapApplyBoostErrorToI18nKey(err.message)));
    },
  });
}
