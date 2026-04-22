import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VpiPaymentMode = "mobile_money" | "international";

export type VpiCheckoutInput = {
  creditPackId: string;
  paymentMode: VpiPaymentMode;
  promoCode?: string | null;
};

export type VpiCheckoutSuccess = {
  ok: true;
  checkout_url: string;
  transaction_id: string;
  amount_mga: number;
  bonus_credits: number;
  pack_credits: number;
  total_credits_expected: number;
  dry_run: boolean;
};

/**
 * Translate an error message thrown by `useVpiCheckout` into an i18n key under
 * `payment.vanilla.*`. The consumer layer (e.g. CreditsPurchaseFlow) calls this
 * to display the right toast without hard-coding strings.
 */
export function mapVpiCheckoutErrorToI18nKey(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("unauthorized") || normalized.includes("session")) {
    return "payment.vanilla.sessionExpired";
  }
  if (normalized.includes("amount_cap") || normalized.includes("cap_exceeded")) {
    return "payment.vanilla.amountCapExceeded";
  }
  return "payment.vanilla.initiateFailed";
}

/**
 * Mutation hook: POSTs to the `vpi-initiate-payment` Edge Function. On success
 * the caller should redirect to `data.checkout_url`. On failure, map the
 * thrown Error.message via `mapVpiCheckoutErrorToI18nKey()` to render a toast.
 */
export function useVpiCheckout() {
  return useMutation<VpiCheckoutSuccess, Error, VpiCheckoutInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke("vpi-initiate-payment", {
        body: {
          credit_pack_id: input.creditPackId,
          payment_mode: input.paymentMode,
          promo_code: input.promoCode ?? undefined,
        },
      });
      if (error) {
        throw new Error(error.message || "initiate_failed");
      }
      const payload = data as (Partial<VpiCheckoutSuccess> & { error?: string }) | null;
      if (
        !payload ||
        payload.ok !== true ||
        typeof payload.checkout_url !== "string" ||
        typeof payload.transaction_id !== "string"
      ) {
        throw new Error(payload?.error ?? "initiate_failed");
      }
      return payload as VpiCheckoutSuccess;
    },
  });
}
