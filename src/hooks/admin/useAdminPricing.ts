import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapDbError } from "@/lib/admin/dbErrorMessages";

export interface AdminPricingRow {
  key: string;
  amount: number;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
  updater_name: string | null;
}

export interface AdminCreditPackRow {
  id: string;
  name: string;
  credits_amount: number;
  price_mga: number;
  sort_order: number;
}

const PRICING_QUERY_KEY = ["admin-credit-pricing"] as const;
const PACKS_QUERY_KEY = ["admin-credit-packs"] as const;

export function useAdminPricingList() {
  return useQuery<AdminPricingRow[]>({
    queryKey: PRICING_QUERY_KEY,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("credit_pricing")
        .select("key, amount, description, updated_at, updated_by")
        .order("key", { ascending: true });
      if (error) throw new Error(error.message);

      const updaterIds = Array.from(
        new Set(
          (rows ?? [])
            .map((r) => r.updated_by)
            .filter((id): id is string => typeof id === "string"),
        ),
      );

      const nameById = new Map<string, string | null>();
      if (updaterIds.length > 0) {
        const { data: profs, error: profsErr } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", updaterIds);
        if (profsErr) throw new Error(profsErr.message);
        for (const p of profs ?? []) nameById.set(p.id, p.full_name);
      }

      return (rows ?? []).map((r) => ({
        key: r.key,
        amount: r.amount,
        description: r.description,
        updated_at: r.updated_at,
        updated_by: r.updated_by,
        updater_name: r.updated_by ? (nameById.get(r.updated_by) ?? null) : null,
      }));
    },
  });
}

export function useAdminCreditPacksList() {
  return useQuery<AdminCreditPackRow[]>({
    queryKey: PACKS_QUERY_KEY,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_packs")
        .select("id, name, credits_amount, price_mga, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        credits_amount: p.credits_amount,
        price_mga: p.price_mga,
        sort_order: p.sort_order ?? 0,
      }));
    },
  });
}

export interface UpdatePricingInput {
  key: string;
  amount: number;
  description: string | null;
}

export interface UpdatePackInput {
  id: string;
  name: string;
  credits_amount: number;
  price_mga: number;
  sort_order: number;
}

export function useAdminPricingActions() {
  const queryClient = useQueryClient();

  const updatePricing = useMutation<void, Error, UpdatePricingInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("admin_update_credit_pricing", {
        p_key: input.key,
        p_amount: input.amount,
        p_description: input.description ?? "",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success(`Tarif "${vars.key}" mis à jour.`);
      queryClient.invalidateQueries({ queryKey: PRICING_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["credit-pricing"] });
    },
    onError: (err) =>
      toast.error(mapDbError(err, "Erreur lors de la mise à jour du tarif.")),
  });

  const updatePack = useMutation<void, Error, UpdatePackInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("admin_update_credit_pack", {
        p_id: input.id,
        p_name: input.name,
        p_credits_amount: input.credits_amount,
        p_price_mga: input.price_mga,
        p_sort_order: input.sort_order,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success(`Pack "${vars.id}" mis à jour.`);
      queryClient.invalidateQueries({ queryKey: PACKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["credit-packs"] });
      queryClient.invalidateQueries({ queryKey: ["credit-packs-admin"] });
    },
    onError: (err) =>
      toast.error(mapDbError(err, "Erreur lors de la mise à jour du pack.")),
  });

  return { updatePricing, updatePack };
}
