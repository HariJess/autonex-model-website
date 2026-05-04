import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { wrapRpc } from "@/lib/monitoring";

export type ApproveVerificationResult = {
  ok: boolean;
  verification_id: string;
  badge_id: string;
  expires_at: string;
  notification_id: string | null;
};

export function mapApproveVerificationErrorToI18nKey(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("admin_required")) return "admin.verifications.errors.adminRequired";
  if (m.includes("verification_not_found")) return "admin.verifications.errors.notFound";
  if (m.includes("verification_not_reviewable")) return "admin.verifications.errors.notReviewable";
  return "admin.verifications.errors.generic";
}

export function useApproveVerification() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<ApproveVerificationResult, Error, { verificationId: string }>({
    mutationFn: async ({ verificationId }) => {
      const { data, error } = await wrapRpc("approve_verification", () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.rpc as any)("approve_verification", {
          p_verification_id: verificationId,
        }),
      );
      if (error) throw new Error(error.message);
      return data as ApproveVerificationResult;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
      void queryClient.invalidateQueries({ queryKey: ["my-verification"] });
      void queryClient.invalidateQueries({ queryKey: ["my-seller-badge"] });
      void queryClient.invalidateQueries({ queryKey: ["verified-sellers-batch"] });
      toast.success(t("admin.verifications.success.approved", "Vérification approuvée"));
    },
    onError: (err) => {
      toast.error(t(mapApproveVerificationErrorToI18nKey(err.message)));
    },
  });
}
