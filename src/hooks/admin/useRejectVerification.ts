import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { wrapRpc } from "@/lib/monitoring";

export type RejectionCategory =
  | "blurry"
  | "wrong_doc"
  | "fraud_suspect"
  | "expired_doc"
  | "other";

export type RejectVerificationInput = {
  verificationId: string;
  reason: string;
  category: RejectionCategory | null;
};

export type RejectVerificationResult = {
  ok: boolean;
  verification_id: string;
  rejected_at: string;
  category: string | null;
  notification_id: string | null;
};

export function mapRejectVerificationErrorToI18nKey(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rejection_reason_too_short")) {
    return "admin.verifications.errors.reasonTooShort";
  }
  if (m.includes("invalid_rejection_category")) {
    return "admin.verifications.errors.invalidCategory";
  }
  if (m.includes("admin_required")) return "admin.verifications.errors.adminRequired";
  if (m.includes("verification_not_found")) return "admin.verifications.errors.notFound";
  if (m.includes("verification_not_reviewable")) {
    return "admin.verifications.errors.notReviewable";
  }
  return "admin.verifications.errors.generic";
}

export function useRejectVerification() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<RejectVerificationResult, Error, RejectVerificationInput>({
    mutationFn: async (input) => {
      const { data, error } = await wrapRpc<RejectVerificationResult, { message: string } | null>(
        "reject_verification",
        () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.rpc as any)("reject_verification", {
          p_verification_id: input.verificationId,
          p_reason: input.reason,
          p_category: input.category,
        }),
      );
      if (error) throw new Error(error.message);
      return data as RejectVerificationResult;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
      void queryClient.invalidateQueries({ queryKey: ["my-verification"] });
      toast.success(t("admin.verifications.success.rejected", "Vérification rejetée"));
    },
    onError: (err) => {
      toast.error(t(mapRejectVerificationErrorToI18nKey(err.message)));
    },
  });
}
