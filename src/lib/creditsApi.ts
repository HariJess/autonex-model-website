import { supabase } from "@/integrations/supabase/client";
import { wrapRpc } from "@/lib/monitoring";

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

  const { data, error } = await wrapRpc("consume_credits", () =>
    supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: amount,
      p_reason: reason,
      ...(ref
        ? {
            p_ref_type: ref.refType,
            p_ref_id: ref.refId,
          }
        : {}),
    }),
  );

  if (error) return { ok: false, error: error.message };
  if (data !== true) return { ok: false, error: "Crédits insuffisants" };
  return { ok: true };
}
