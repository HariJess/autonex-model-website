import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type {
  ChangeRoleInput,
  DeleteUserInput,
  GrantCreditsInput,
  SuspendUserInput,
  UnsuspendUserInput,
} from "@/types/admin";
import { adminUserDetailQueryKey } from "./useAdminUserDetail";

const DB_ERROR_MESSAGES: Record<string, string> = {
  forbidden: "Action refusée : droits admin requis.",
  cannot_self_demote: "Vous ne pouvez pas rétrograder votre propre compte.",
  cannot_self_suspend: "Vous ne pouvez pas suspendre votre propre compte.",
  cannot_self_delete: "Vous ne pouvez pas supprimer votre propre compte.",
  amount_required_non_zero: "Le montant doit être différent de zéro.",
  reason_required: "La raison est requise (au moins 3 caractères).",
  user_not_found: "Utilisateur introuvable.",
  confirmation_email_required: "L'email de confirmation est requis.",
  email_mismatch: "L'email de confirmation ne correspond pas à l'email du compte.",
};

function mapDbError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  for (const key of Object.keys(DB_ERROR_MESSAGES)) {
    if (raw.includes(key)) return DB_ERROR_MESSAGES[key];
  }
  return raw || fallback;
}

export function useAdminUserActions(userId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminUserDetailQueryKey(userId) });
    queryClient.invalidateQueries({ queryKey: ["admin-users-basic"] });
  };

  const grantCredits = useMutation<string, Error, GrantCreditsInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc("admin_grant_credits", {
        p_user_id: input.userId,
        p_amount: input.amount,
        p_reason: input.reason,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, vars) => {
      const verb = vars.amount >= 0 ? "Crédits ajoutés" : "Crédits retirés";
      toast.success(`${verb} (${vars.amount > 0 ? "+" : ""}${vars.amount}).`);
      invalidate();
    },
    onError: (err) =>
      toast.error(mapDbError(err, "Erreur lors de l'ajustement des crédits.")),
  });

  const changeRole = useMutation<void, Error, ChangeRoleInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("admin_change_user_role", {
        p_user_id: input.userId,
        p_new_role: input.newRole,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success(`Rôle mis à jour → ${vars.newRole}.`);
      invalidate();
    },
    onError: (err) =>
      toast.error(mapDbError(err, "Erreur lors du changement de rôle.")),
  });

  const suspend = useMutation<void, Error, SuspendUserInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("admin_suspend_user", {
        p_user_id: input.userId,
        p_reason: input.reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Utilisateur suspendu. Les annonces actives ont été rejetées.");
      invalidate();
    },
    onError: (err) =>
      toast.error(mapDbError(err, "Erreur lors de la suspension.")),
  });

  const unsuspend = useMutation<void, Error, UnsuspendUserInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("admin_unsuspend_user", {
        p_user_id: input.userId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(
        "Utilisateur réactivé. Les annonces rejetées restent rejetées (action manuelle requise).",
      );
      invalidate();
    },
    onError: (err) =>
      toast.error(mapDbError(err, "Erreur lors de la réactivation.")),
  });

  const deleteUser = useMutation<void, Error, DeleteUserInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("admin_delete_user", {
        p_user_id: input.userId,
        p_confirmation_email: input.confirmationEmail,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Utilisateur supprimé définitivement.");
      invalidate();
    },
    onError: (err) =>
      toast.error(mapDbError(err, "Erreur lors de la suppression.")),
  });

  return { grantCredits, changeRole, suspend, unsuspend, deleteUser };
}
