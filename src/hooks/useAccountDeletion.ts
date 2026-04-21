import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * RGPD self-delete + export hooks, plus a status reader used by the /settings
 * pending banner and section gating. Kept together so the single source of
 * truth for queryKey invalidation lives next to the writes.
 *
 * Non-goals:
 *   - JWT signout after delete (Google/Meta pattern: the user stays logged
 *     in; the session cookie expires naturally; `banned_until` blocks the
 *     next login attempt).
 *   - Blocking UX on email failures: `useRequestDeletion` treats an
 *     Edge-Function failure as a warning, never a blocker. The canonical
 *     state is the DB (request_account_deletion RPC has already committed).
 */

export const DELETION_STATUS_KEY = (userId: string) => ["deletion-status", userId] as const;

export type DeletionStatus = {
  is_pending: boolean;
  is_anonymized: boolean;
  deletion_requested_at: Date | null;
  deletion_scheduled_for: Date | null;
  deletion_email_sent_at: Date | null;
  deletion_email_error: string | null;
};

type DeletionStatusRow = {
  deletion_requested_at: string | null;
  deletion_scheduled_for: string | null;
  deletion_email_sent_at: string | null;
  deletion_email_error: string | null;
  is_anonymized: boolean;
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatFrenchDate(d: Date | null): string {
  if (!d) return "";
  return format(d, "d MMMM yyyy", { locale: fr });
}

/** Read-only snapshot of the current user's deletion state. */
export function useDeletionStatus() {
  const { user } = useAuth();
  return useQuery<DeletionStatus | null>({
    queryKey: DELETION_STATUS_KEY(user?.id ?? "anon"),
    enabled: Boolean(user?.id),
    staleTime: 15_000,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "deletion_requested_at, deletion_scheduled_for, deletion_email_sent_at, deletion_email_error, is_anonymized",
        )
        .eq("id", user.id)
        .single();
      if (error) throw new Error(error.message);
      const row = data as DeletionStatusRow;
      const requested = parseDate(row.deletion_requested_at);
      return {
        is_pending: Boolean(requested) && !row.is_anonymized,
        is_anonymized: Boolean(row.is_anonymized),
        deletion_requested_at: requested,
        deletion_scheduled_for: parseDate(row.deletion_scheduled_for),
        deletion_email_sent_at: parseDate(row.deletion_email_sent_at),
        deletion_email_error: row.deletion_email_error,
      };
    },
  });
}

/**
 * Drives the "Supprimer mon compte" CTA.
 *
 * Flow (each step is gated on the previous step's success):
 *   1. RPC request_account_deletion() — the canonical, DB-side transition.
 *   2. Best-effort call to the send-deletion-notification-email Edge Fn.
 *      A failure here updates profiles.deletion_email_error and surfaces a
 *      warning toast, but the overall mutation stays "successful" because
 *      the DB state already reflects the request.
 *   3. queryClient invalidation so /settings and banners refresh immediately.
 */
export function useRequestDeletion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    { scheduled_for: Date; emailWarning: string | null },
    Error,
    void
  >({
    mutationFn: async () => {
      if (!user?.id) throw new Error("not_authenticated");

      const { data, error } = await supabase.rpc("request_account_deletion");
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || typeof row.deletion_scheduled_for !== "string") {
        throw new Error("unexpected_rpc_payload");
      }
      const scheduledForIso = row.deletion_scheduled_for;
      const scheduled_for = new Date(scheduledForIso);

      // Fetch the profile name for the email render (best-effort).
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      const fullName = profile?.full_name ?? undefined;

      // Edge Function call — non-blocking on failure.
      let emailWarning: string | null = null;
      try {
        const { data: edgeResp, error: edgeErr } = await supabase.functions.invoke(
          "send-deletion-notification-email",
          {
            body: {
              user_id: user.id,
              email: user.email ?? "",
              full_name: fullName,
              deletion_scheduled_for: scheduledForIso,
            },
          },
        );
        const payload = edgeResp as { success?: boolean; error?: string } | null;
        if (edgeErr || !payload?.success) {
          emailWarning = edgeErr?.message ?? payload?.error ?? "unknown_edge_failure";
        }
      } catch (err) {
        emailWarning = err instanceof Error ? err.message : "fetch_failed";
      }

      // Log the outcome to profiles (best-effort, ignore errors — the RPC
      // state is canonical, this is purely observability).
      if (emailWarning) {
        await supabase
          .from("profiles")
          .update({ deletion_email_error: emailWarning.slice(0, 500), deletion_email_sent_at: null })
          .eq("id", user.id);
      } else {
        await supabase
          .from("profiles")
          .update({ deletion_email_sent_at: new Date().toISOString(), deletion_email_error: null })
          .eq("id", user.id);
      }

      return { scheduled_for, emailWarning };
    },
    onSuccess: ({ scheduled_for, emailWarning }) => {
      const formatted = formatFrenchDate(scheduled_for);
      if (emailWarning) {
        toast.warning(
          `Compte programmé pour suppression le ${formatted}. L'email de confirmation n'a pas pu être envoyé.`,
        );
      } else {
        toast.success(`Compte programmé pour suppression le ${formatted}.`);
      }
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: DELETION_STATUS_KEY(user.id) });
        void queryClient.invalidateQueries({ queryKey: ["settings-profile", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      }
    },
    onError: (err) => {
      toast.error(err.message || "La demande de suppression a échoué.");
    },
  });
}

export function useCancelDeletion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!user?.id) throw new Error("not_authenticated");
      const { error } = await supabase.rpc("cancel_account_deletion");
      if (error) throw new Error(error.message);
      // Clean-slate the email tracking so a future re-request starts fresh.
      await supabase
        .from("profiles")
        .update({ deletion_email_sent_at: null, deletion_email_error: null })
        .eq("id", user.id);
    },
    onSuccess: () => {
      toast.success("Suppression annulée. Votre compte reste actif.");
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: DELETION_STATUS_KEY(user.id) });
        void queryClient.invalidateQueries({ queryKey: ["settings-profile", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      }
    },
    onError: (err) => {
      toast.error(err.message || "L'annulation a échoué.");
    },
  });
}

/** RGPD Art. 20 portabilité — triggers a browser download of the JSONB export. */
export function useExportData() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("export_user_data");
      if (error) throw new Error(error.message);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      try {
        const today = format(new Date(), "yyyyMMdd");
        const a = document.createElement("a");
        a.href = url;
        a.download = `mes-donnees-autonex-${today}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    onSuccess: () => toast.success("Export téléchargé."),
    onError: (err) => toast.error(err.message || "L'export a échoué."),
  });
}
