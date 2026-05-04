import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { wrapRpc } from "@/lib/monitoring";

export type SubmitVerificationInput = {
  cin_front_path: string;
  cin_back_path: string;
  selfie_path: string;
  full_name: string;
  cin_number: string;
  date_of_birth?: string | null;
};

export type SubmitVerificationResult = {
  ok: boolean;
  verification_id: string;
  credits_charged: number;
  submitted_at: string;
  notification_id: string | null;
};

/**
 * Mappe les codes d'erreur RPC `submit_verification` vers une i18n key.
 * Codes émis par la RPC (RAISE EXCEPTION) :
 *   - 'auth_required'                → verification.errors.generic
 *   - 'missing_documents'            → verification.errors.uploadFailed
 *   - 'invalid_full_name'            → verification.errors.invalidFullName
 *   - 'invalid_cin_number'           → verification.errors.invalidCinNumber
 *   - 'invalid_document_path'        → verification.errors.uploadFailed
 *   - 'verification_already_active'  → verification.errors.alreadyActive
 *   - 'pricing_not_found'            → verification.errors.generic
 *   - 'insufficient_credits'         → verification.errors.insufficientCredits
 */
export function mapSubmitVerificationErrorToI18nKey(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("insufficient_credits")) return "verification.errors.insufficientCredits";
  if (m.includes("verification_already_active")) return "verification.errors.alreadyActive";
  if (m.includes("invalid_full_name")) return "verification.errors.invalidFullName";
  if (m.includes("invalid_cin_number")) return "verification.errors.invalidCinNumber";
  if (m.includes("missing_documents") || m.includes("invalid_document_path")) {
    return "verification.errors.uploadFailed";
  }
  return "verification.errors.generic";
}

export function useSubmitVerification() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<SubmitVerificationResult, Error, SubmitVerificationInput>({
    mutationFn: async (input) => {
      const { data, error } = await wrapRpc("submit_verification", () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.rpc as any)("submit_verification", {
          p_cin_front_path: input.cin_front_path,
          p_cin_back_path: input.cin_back_path,
          p_selfie_path: input.selfie_path,
          p_full_name: input.full_name,
          p_cin_number: input.cin_number,
          p_date_of_birth: input.date_of_birth ?? null,
        }),
      );
      if (error) throw new Error(error.message);
      return data as SubmitVerificationResult;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-verification"] });
      void queryClient.invalidateQueries({ queryKey: ["credits-balance"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("verification.success.toast", "Demande envoyée"));
    },
    onError: (err) => {
      toast.error(t(mapSubmitVerificationErrorToI18nKey(err.message)));
    },
  });
}
