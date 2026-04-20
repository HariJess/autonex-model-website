import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PromoValidationResult } from "@/types/promo";

export interface ValidatePromoCodeInput {
  code: string;
  creditPackId: string;
}

/**
 * User-facing promo code validation. Returns a preview of the discount or
 * bonus without committing (no redemption row written). Consumers should
 * debounce user input before calling mutate() to avoid server round-trips
 * on every keystroke.
 */
export function useValidatePromoCode() {
  return useMutation<PromoValidationResult, Error, ValidatePromoCodeInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc("validate_promo_code", {
        p_code: input.code,
        p_credit_pack_id: input.creditPackId,
      });
      if (error) throw new Error(error.message);
      const row = (data ?? [])[0];
      if (!row) {
        return {
          valid: false,
          error_code: "code_not_found",
          promo_code_id: null,
          type: null,
          discount_mga: 0,
          bonus_credits: 0,
          final_price_mga: 0,
          final_credits: 0,
        };
      }
      return {
        valid: Boolean(row.valid),
        error_code: row.error_code ?? null,
        promo_code_id: row.promo_code_id ?? null,
        type: row.type ?? null,
        discount_mga: Number(row.discount_mga ?? 0),
        bonus_credits: Number(row.bonus_credits ?? 0),
        final_price_mga: Number(row.final_price_mga ?? 0),
        final_credits: Number(row.final_credits ?? 0),
      };
    },
  });
}
