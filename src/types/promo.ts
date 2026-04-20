import type { Database } from "@/integrations/supabase/types";

export type PromoCodeType = Database["public"]["Enums"]["promo_code_type"];

/**
 * Runtime-accurate shape for a promo_codes row (nullable-correct). The
 * Supabase typegen marks some RETURNS TABLE columns as non-null; we keep
 * a hand-written interface on the app boundary for safety.
 */
export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  type: PromoCodeType;
  percentage_off: number | null;
  bonus_credits: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  one_per_user: boolean;
  expires_at: string | null;
  applicable_pack_ids: string[] | null;
  active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PromoValidationResult {
  valid: boolean;
  error_code: string | null;
  promo_code_id: string | null;
  type: PromoCodeType | null;
  discount_mga: number;
  bonus_credits: number;
  final_price_mga: number;
  final_credits: number;
}

export interface PromoRedemption {
  redemption_id: string;
  user_id: string;
  user_email: string | null;
  user_full_name: string | null;
  transaction_id: string;
  amount_mga: number;
  redeemed_at: string;
}

export interface CreatePromoCodeInput {
  code: string;
  description: string | null;
  type: PromoCodeType;
  percentage_off: number | null;
  bonus_credits: number | null;
  max_redemptions: number | null;
  one_per_user: boolean;
  expires_at: string | null;
  applicable_pack_ids: string[] | null;
}

export interface UpdatePromoCodeInput {
  id: string;
  description: string | null;
  max_redemptions: number | null;
  one_per_user: boolean;
  expires_at: string | null;
  applicable_pack_ids: string[] | null;
  active: boolean;
}
