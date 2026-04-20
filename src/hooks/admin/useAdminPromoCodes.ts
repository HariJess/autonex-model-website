import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapDbError } from "@/lib/admin/dbErrorMessages";
import type {
  CreatePromoCodeInput,
  PromoCode,
  PromoRedemption,
  UpdatePromoCodeInput,
} from "@/types/promo";

// The Supabase typegen flags every RPC argument as non-null even when the
// Postgres function accepts NULL. We cast at each call site through `unknown`
// to restore runtime truth (nullable descriptions, expires_at, etc.).
type CreatePromoArgs = Database["public"]["Functions"]["admin_create_promo_code"]["Args"];
type UpdatePromoArgs = Database["public"]["Functions"]["admin_update_promo_code"]["Args"];

const PROMO_CODES_QUERY_KEY = ["admin-promo-codes"] as const;
const promoRedemptionsKey = (promoCodeId: string) =>
  ["admin-promo-redemptions", promoCodeId] as const;

export function useAdminPromoCodesList() {
  return useQuery<PromoCode[]>({
    queryKey: PROMO_CODES_QUERY_KEY,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        code: r.code,
        description: r.description,
        type: r.type,
        percentage_off: r.percentage_off,
        bonus_credits: r.bonus_credits,
        max_redemptions: r.max_redemptions,
        times_redeemed: r.times_redeemed,
        one_per_user: r.one_per_user,
        expires_at: r.expires_at,
        applicable_pack_ids: r.applicable_pack_ids,
        active: r.active,
        created_at: r.created_at,
        created_by: r.created_by,
        updated_at: r.updated_at,
        updated_by: r.updated_by,
      }));
    },
  });
}

export function useAdminPromoRedemptions(promoCodeId: string | undefined) {
  return useQuery<PromoRedemption[]>({
    queryKey: promoRedemptionsKey(promoCodeId ?? ""),
    enabled: Boolean(promoCodeId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!promoCodeId) return [];
      const { data, error } = await supabase.rpc("admin_list_promo_redemptions", {
        p_promo_code_id: promoCodeId,
      });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        redemption_id: r.redemption_id,
        user_id: r.user_id,
        user_email: r.user_email ?? null,
        user_full_name: r.user_full_name ?? null,
        transaction_id: r.transaction_id,
        amount_mga: Number(r.amount_mga ?? 0),
        redeemed_at: r.redeemed_at,
      }));
    },
  });
}

export function useAdminPromoActions() {
  const queryClient = useQueryClient();

  const invalidate = (promoId?: string) => {
    queryClient.invalidateQueries({ queryKey: PROMO_CODES_QUERY_KEY });
    if (promoId) {
      queryClient.invalidateQueries({ queryKey: promoRedemptionsKey(promoId) });
    }
  };

  const createPromo = useMutation<string, Error, CreatePromoCodeInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc("admin_create_promo_code", {
        p_code: input.code,
        p_description: input.description,
        p_type: input.type,
        p_percentage_off: input.percentage_off,
        p_bonus_credits: input.bonus_credits,
        p_max_redemptions: input.max_redemptions,
        p_one_per_user: input.one_per_user,
        p_expires_at: input.expires_at,
        p_applicable_pack_ids: input.applicable_pack_ids,
      } as unknown as CreatePromoArgs);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_id, vars) => {
      toast.success(`Code "${vars.code}" créé.`);
      invalidate();
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors de la création du code.")),
  });

  const updatePromo = useMutation<void, Error, UpdatePromoCodeInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("admin_update_promo_code", {
        p_id: input.id,
        p_description: input.description,
        p_max_redemptions: input.max_redemptions,
        p_one_per_user: input.one_per_user,
        p_expires_at: input.expires_at,
        p_applicable_pack_ids: input.applicable_pack_ids,
        p_active: input.active,
      } as unknown as UpdatePromoArgs);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success("Code promo mis à jour.");
      invalidate(vars.id);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors de la mise à jour du code.")),
  });

  const deletePromo = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc("admin_delete_promo_code", { p_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, id) => {
      toast.success("Code promo désactivé.");
      invalidate(id);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors de la désactivation.")),
  });

  return { createPromo, updatePromo, deletePromo };
}
