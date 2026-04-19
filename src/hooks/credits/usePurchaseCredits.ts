import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { mergeCanonicalCreditPacks, type CreditPackRow } from "@/lib/creditPacks";

export type ManualPaymentMethod = {
  id: string;
  name: string;
};

type ManualPaymentMethodId = "bank_transfer" | "mvola" | "orange_money" | "airtel_money";

export type UsePurchaseCreditsOptions = {
  /** Fired after a successful purchase request submission (post-toast). */
  onSuccess?: () => void;
  /** Fired after a failed submission (post-toast). The hook still handles the user-facing toast. */
  onError?: (error: unknown) => void;
};

export type UsePurchaseCreditsResult = {
  // Form state
  selectedPackId: string;
  setSelectedPackId: (id: string) => void;
  paymentMethod: string;
  setPaymentMethod: (id: string) => void;
  proofFile: File | null;
  setProofFile: (f: File | null) => void;

  // Data
  creditPacks: CreditPackRow[];
  selectedPack: CreditPackRow | undefined;
  paymentMethods: ManualPaymentMethod[];

  // Validation + action
  canSubmit: boolean;
  submit: () => Promise<void>;
  submitting: boolean;
};

/**
 * Centralizes the manual credit purchase flow (pack selection, payment method,
 * proof upload, transaction insert, queryClient invalidations, user feedback).
 *
 * Phase 11.b: extracted from PublishStepVisibility so the same logic can power
 * both the dedicated `/credits` page (variant="standalone") and the in-publish
 * fallback block (variant="fallback-in-publish") via the shared
 * `CreditsPurchaseFlow` component.
 *
 * Behaviour mirrors the legacy `submitCreditPurchase` exactly to avoid
 * regression on the post-6.4.e flow:
 *   - validates user / pack / payment method / proof
 *   - uploads proof to `payment-proofs` storage bucket under the user prefix
 *   - inserts a `pending` transaction row referencing the credit pack
 *   - invalidates pending-credit-purchases + credit-tx-history queries
 *   - shows toast feedback (success / error) — `onSuccess` / `onError`
 *     callbacks fire after the toast for additional caller-side reactions
 *     (e.g. navigation) without duplicating the user-facing notification.
 */
export function usePurchaseCredits(opts?: UsePurchaseCreditsOptions): UsePurchaseCreditsResult {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedPackId, setSelectedPackId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: creditPacks = [] } = useQuery({
    queryKey: ["credit-packs"],
    queryFn: async (): Promise<CreditPackRow[]> => {
      const { data, error } = await supabase
        .from("credit_packs")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) return mergeCanonicalCreditPacks(null);
      return mergeCanonicalCreditPacks(data as CreditPackRow[]);
    },
  });

  const paymentMethods = useMemo<ManualPaymentMethod[]>(
    () => [
      { id: "bank_transfer", name: t("publish.paymentMethodBankTransfer", "Bank transfer") },
      { id: "mvola", name: t("publish.paymentMethodMvola", "MVola") },
      { id: "orange_money", name: t("publish.paymentMethodOrangeMoney", "Orange Money") },
      { id: "airtel_money", name: t("publish.paymentMethodAirtelMoney", "Airtel Money") },
    ],
    [t],
  );

  const selectedPack = creditPacks.find((p) => p.id === selectedPackId);
  const canSubmit = Boolean(selectedPackId && paymentMethod && proofFile);

  const submit = async (): Promise<void> => {
    if (!user) {
      toast.error(t("publish.loginRequired", "Vous devez être connecté"));
      return;
    }
    const pack = creditPacks.find((p) => p.id === selectedPackId);
    if (!pack) {
      toast.error(t("publish.selectPack", "Choisissez un pack de crédits"));
      return;
    }
    if (!paymentMethod) {
      toast.error(t("publish.paymentProofRequired", "Choisissez un mode de paiement"));
      return;
    }
    if (!proofFile) {
      toast.error(
        t("publish.proofRequired", "Joignez une preuve de paiement (capture ou RIB annoté)"),
      );
      return;
    }

    setSubmitting(true);
    try {
      const ext = proofFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-proof.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proofFile);
      if (upErr) throw new Error(upErr.message);

      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount_mga: pack.price_mga,
        method: paymentMethod as ManualPaymentMethodId,
        status: "pending",
        reference: `CR-${pack.id}-${Date.now()}`,
        payment_proof_url: path,
        credit_pack_id: pack.id,
      });
      if (txErr) throw new Error(txErr.message);

      await queryClient.invalidateQueries({ queryKey: ["pending-credit-purchases", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["credit-tx-history", user.id] });

      toast(
        t(
          "publish.creditRequestSent",
          "Demande enregistrée. Nos équipes valideront votre paiement et créditeront votre compte sous peu — les crédits ne sont pas encore disponibles.",
        ),
        { duration: 6500 },
      );
      setProofFile(null);
      setSelectedPackId("");
      setPaymentMethod("");
      opts?.onSuccess?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      opts?.onError?.(e);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    selectedPackId,
    setSelectedPackId,
    paymentMethod,
    setPaymentMethod,
    proofFile,
    setProofFile,
    creditPacks,
    selectedPack,
    paymentMethods,
    canSubmit,
    submit,
    submitting,
  };
}
