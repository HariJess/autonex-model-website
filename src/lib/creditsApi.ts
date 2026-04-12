import { supabase } from "@/integrations/supabase/client";

export interface CreditLedgerRef {
  refType: string;
  refId: string;
}

export async function consumeCredits(
  amount: number,
  reason: string,
  ref?: CreditLedgerRef,
): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non connecté" };

  const { data, error } = await supabase.rpc("consume_credits", {
    p_user_id: user.id,
    p_amount: amount,
    p_reason: reason,
    p_ref_type: ref?.refType ?? null,
    p_ref_id: ref?.refId ?? null,
  });

  if (error) return { ok: false, error: error.message };
  if (data !== true) return { ok: false, error: "Crédits insuffisants" };
  return { ok: true };
}
