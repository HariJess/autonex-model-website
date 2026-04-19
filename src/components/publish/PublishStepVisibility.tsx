import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, Sparkles, ChevronDown } from "lucide-react";
import { LISTING_TYPE_LABELS, type ListingType } from "@/types/listing";
import {
  BOOST_ORDER,
  BOOST_LABELS_FR,
  formatAriary,
  type PurchasableBoostType,
} from "@/config/monetization";
import { usePricing } from "@/hooks/usePricing";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";
import { mergeCanonicalCreditPacks, type CreditPackRow } from "@/lib/creditPacks";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { PublishFormValues } from "@/pages/publish/publishFormSchema";

export type PublishStepVisibilityProps = {
  /** Édition d’annonce existante : pas de débit de crédits, boosts non modifiables. */
  editMode?: boolean;
  editSubmitLabel?: string;
  /** Photo count (server + pending) — comes from usePublishMedia parent. */
  photoCount: number;
  /** Lifecycle: handlePublish (parent) toggles setPublishing across the publish flow. */
  publishing: boolean;
  /** Cross-step orchestration callback (handlePublish in PublishPage). */
  onPublish: () => void;
};

/**
 * Étape 3 du wizard de publication : choix des boosts, récapitulatif,
 * bouton d'envoi pour modération, et formulaire d'achat de crédits.
 *
 * Phase 6.4.e: form-aware via useFormContext + autonomous purchase mini-form.
 * Reads 6 form fields (title, listingType, transaction, ville, selectedBoosts,
 * agencySpotlight). Owns its own purchase state (creditPackPurchase, payment
 * method, proof file, submission flag) and the credit purchase async flow.
 *
 * Only `publishing` + `onPublish` cross the parent boundary, since the publish
 * orchestration spans multiple steps and lives in PublishPage's handlePublish.
 */
const PublishStepVisibility = ({
  editMode = false,
  editSubmitLabel,
  photoCount,
  publishing,
  onPublish,
}: PublishStepVisibilityProps) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const form = useFormContext<PublishFormValues>();

  // Form fields
  const title = form.watch("title");
  const listingType = form.watch("listingType");
  const transaction = form.watch("transaction");
  const ville = form.watch("ville");
  const selectedBoosts = form.watch("selectedBoosts");
  const agencySpotlight = form.watch("agencySpotlight");

  // Pricing & credits (migrated from parent in Phase 6.4.e)
  const { prices, boostPrice, totalPublication } = usePricing();
  const { data: creditsBalance = 0, isPending: creditsBalancePending } = useCreditsBalance();
  const { data: creditPacks = [] } = useQuery({
    queryKey: ["credit-packs"],
    queryFn: async (): Promise<CreditPackRow[]> => {
      const { data, error } = await supabase.from("credit_packs").select("*").order("sort_order", { ascending: true });
      if (error) return mergeCanonicalCreditPacks(null);
      return mergeCanonicalCreditPacks(data as CreditPackRow[]);
    },
  });

  const hasAgency = Boolean(profile?.agency_id);
  const agencySpotlightActive = Boolean(profile?.agency_id && agencySpotlight);
  const totalCost = totalPublication(selectedBoosts, { agencySpotlight: agencySpotlightActive });
  const canPublishWithCredits = !creditsBalancePending && creditsBalance >= totalCost;

  const manualPaymentMethods = useMemo(
    () => [
      { id: "bank_transfer", name: t("publish.paymentMethodBankTransfer", "Bank transfer") },
      { id: "mvola", name: t("publish.paymentMethodMvola", "MVola") },
      { id: "orange_money", name: t("publish.paymentMethodOrangeMoney", "Orange Money") },
      { id: "airtel_money", name: t("publish.paymentMethodAirtelMoney", "Airtel Money") },
    ],
    [t],
  );

  // Purchase mini-form local state
  const [creditPackPurchase, setCreditPackPurchase] = useState("");
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);

  // UI collapse state
  const [showCreditPurchase, setShowCreditPurchase] = useState(!editMode && !canPublishWithCredits);
  const [showMobileOptions, setShowMobileOptions] = useState(false);

  const publishAllowed = true;

  const transactionLabel =
    transaction === "vente"
      ? t("publish.sell", "Vendre")
      : transaction === "location"
        ? t("publish.rent", "Louer")
        : transaction === "location_vacances"
          ? t("publish.shortTermRental", "Location courte durée")
          : t("common.none", "—");

  // Display values gated by editMode (pricing display + capacity)
  const totalCostDisplay = editMode ? 0 : totalCost;
  const canPublishDisplay = editMode || canPublishWithCredits;

  const toggleBoost = (b: PurchasableBoostType) => {
    const current = form.getValues("selectedBoosts");
    form.setValue(
      "selectedBoosts",
      current.includes(b) ? current.filter((x) => x !== b) : [...current, b],
    );
  };

  const submitCreditPurchase = async () => {
    if (!user) {
      toast.error(t("publish.loginRequired", "Vous devez être connecté"));
      return;
    }
    const pack = creditPacks.find((p) => p.id === creditPackPurchase);
    if (!pack) {
      toast.error(t("publish.selectPack", "Choisissez un pack de crédits"));
      return;
    }
    if (!purchasePaymentMethod) {
      toast.error(t("publish.paymentProofRequired", "Choisissez un mode de paiement"));
      return;
    }
    if (!proofFile) {
      toast.error(t("publish.proofRequired", "Joignez une preuve de paiement (capture ou RIB annoté)"));
      return;
    }

    setPurchaseSubmitting(true);
    try {
      const ext = proofFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-proof.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proofFile);
      if (upErr) throw new Error(upErr.message);

      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount_mga: pack.price_mga,
        method: purchasePaymentMethod as "bank_transfer" | "mvola" | "orange_money" | "airtel_money",
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
          "Demande enregistrée. Nos équipes valideront votre paiement et créditeront votre compte sous peu — les crédits ne sont pas encore disponibles."
        ),
        { duration: 6500 },
      );
      setProofFile(null);
      setCreditPackPurchase("");
      setPurchasePaymentMethod("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setPurchaseSubmitting(false);
  };

  return (
    <div className="space-y-5 pb-2">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-secondary/20 px-4 py-3.5">
        <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {t("publish.finalStep", "Étape finale")}
        </p>
        <p className="mt-1 font-serif text-lg text-foreground">
          {t("publish.finalizeThreeChoices", "Finalisez en 3 choix simples")}
        </p>
        <p className="mt-1 font-sans text-[14px] md:text-sm text-muted-foreground leading-relaxed">
          {t(
                "publish.finalizeStepHintInstant",
                "Vérifiez le coût, sélectionnez la visibilité souhaitée, puis publiez votre annonce.",
          )}
        </p>
      </div>

      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Coins className="h-5 w-5" /> {t("publish.creditsTitle", "Crédits & coût")}
          </CardTitle>
          <CardDescription className="font-sans">
            {editMode ? (
              t(
                "publish.editCreditsHint",
                "Modification : aucun crédit supplémentaire n’est débité. Les options de visibilité payantes ne sont pas modifiables ici.",
              )
            ) : (
              <>
                {t("publish.yourBalance", "Votre solde")} :{" "}
                <strong>{creditsBalancePending ? "…" : creditsBalance}</strong>{" "}
                {t("publish.credits", "crédits")}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 font-sans text-sm">
          {editMode ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t(
                "publish.editCostFree",
                "Enregistrer vos changements est gratuit. Si l’annonce était en ligne, elle repassera en vérification lorsque le contenu aura changé.",
              )}
            </p>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("publish.costPublicationInstant", "Publication standard")}
                </span>
                <span>{prices.publish_listing}</span>
              </div>
              {selectedBoosts.map((b) => (
                <div key={b} className="flex justify-between">
                  <span className="text-muted-foreground">{t(`publish.boost.${b}`, BOOST_LABELS_FR[b])}</span>
                  <span>{boostPrice(b)}</span>
                </div>
              ))}
              {agencySpotlightActive && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("publish.agencySpotlight", "Spotlight agence (marque)")}
                  </span>
                  <span>{prices.agency_spotlight}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>{t("publish.total", "Total")}</span>
                <span>{totalCostDisplay}</span>
              </div>
              {!canPublishDisplay && (
                <div className="space-y-1">
                  <p className="text-destructive text-sm">
                    {t(
                      "publish.needMoreCredits",
                      "Solde insuffisant pour envoyer cette annonce avec les options choisies.",
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "publish.draftKept",
                      "Votre brouillon reste enregistré : vous pourrez publier après avoir obtenu des crédits.",
                    )}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => setShowMobileOptions((prev) => !prev)}
        className="md:hidden flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 text-left"
        aria-expanded={showMobileOptions}
      >
        <div>
          <p className="font-serif font-semibold text-sm">{t("publish.visibilityOptions", "Options de visibilité")}</p>
          <p className="text-xs text-muted-foreground font-sans">
            {t("publish.visibilityOptionsHint", "Boosts et options avancées (facultatif)")}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showMobileOptions ? "rotate-180" : ""}`} />
      </button>

      <div className={`${showMobileOptions ? "block" : "hidden"} md:block space-y-5`}>
      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> {t("publish.boostTitleInstant", "Boosts (application immédiate)")}
          </CardTitle>
          <CardDescription className="font-sans">
            {t(
              "publish.boostHonestInstant",
              "Les boosts sélectionnés sont appliqués au moment de la publication, selon les règles de disponibilité.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!editMode && (
            <p className="rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-[13px] font-sans text-muted-foreground leading-relaxed">
              {t(
                "publish.boostPragmaticHint",
                "Sélectionnez uniquement les options utiles maintenant: vous pouvez publier sans boost.",
              )}
            </p>
          )}
          {BOOST_ORDER.map((b) => (
            <label
              key={b}
              className={`flex items-center justify-between gap-3 rounded-xl border border-border p-3 min-h-12 font-sans text-sm touch-manipulation ${
                editMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={selectedBoosts.includes(b)}
                  disabled={editMode}
                  onCheckedChange={() => toggleBoost(b)}
                />
                  <span>{t(`publish.boost.${b}`, BOOST_LABELS_FR[b])}</span>
              </span>
              <span className="text-muted-foreground whitespace-nowrap">
                {boostPrice(b)} cr.
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      {hasAgency && (
        <Card className="rounded-2xl border-border border-dashed border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-base">
              {t("publish.agencySpotlightTitle", "Visibilité agence")}
            </CardTitle>
            <CardDescription className="font-sans text-[13px] leading-relaxed">
              {t(
                "publish.agencySpotlightDescInstant",
                "Renforce la présence de votre marque sur le portail dès publication. Réservé aux comptes agence.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              className={`flex items-center justify-between gap-3 rounded-xl border border-border p-3 min-h-12 font-sans text-sm touch-manipulation ${
                editMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={agencySpotlight}
                  disabled={editMode}
                  onCheckedChange={(c) => form.setValue("agencySpotlight", c === true)}
                />
                <span>{t("publish.agencySpotlightLabel", "Spotlight agence")}</span>
              </span>
              <span className="text-muted-foreground">{prices.agency_spotlight} cr.</span>
            </label>
          </CardContent>
        </Card>
      )}
      </div>

      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            {t("publish.summary", "Récapitulatif")}
          </CardTitle>
        </CardHeader>
        <CardContent className="font-sans text-sm space-y-1 text-muted-foreground">
          <p><strong className="text-foreground">{title || t("common.none", "—")}</strong></p>
          <p>
            {listingType ? LISTING_TYPE_LABELS[listingType as ListingType] : ""} · {transactionLabel} · {ville}
          </p>
          <p>
            {photoCount} {t("publish.photoCount", "photo(s)")}
          </p>
        </CardContent>
      </Card>

      <Button
        type="button"
        onClick={onPublish}
        disabled={publishing || !publishAllowed}
        className="w-full gradient-primary border-0 font-sans text-base sm:text-lg py-6 min-h-12 touch-manipulation"
        style={{ color: "#FAFAFA" }}
      >
        {publishing
          ? t("common.loading")
          : editMode
            ? (editSubmitLabel ?? t("publish.editSave", "Enregistrer les modifications"))
            : t("publish.submitNow", "Publier maintenant")}
      </Button>

      {!editMode && (
      <div className="border-t border-border pt-6 space-y-3">
        <button
          type="button"
          onClick={() => setShowCreditPurchase((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 text-left"
          aria-expanded={showCreditPurchase}
        >
          <div>
            <h3 className="font-serif font-semibold">{t("publish.buyCredits", "Acheter des crédits")}</h3>
            <p className="text-[13px] text-muted-foreground font-sans leading-relaxed">
              {t("publish.buyCreditsAccordionHint", "Ouvrez ce bloc uniquement si votre solde est insuffisant.")}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCreditPurchase ? "rotate-180" : ""}`} />
        </button>

        {showCreditPurchase && (
          <div className="space-y-4 rounded-xl border border-border/70 p-3 md:p-4">
            <p className="text-[13px] text-muted-foreground font-sans leading-relaxed">
              {t(
                "publish.buyCreditsHint",
                "Paiement manuel : transmettez le montant puis joignez une preuve. Aucun crédit n'est ajouté avant validation.",
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {creditPacks.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCreditPackPurchase(p.id)}
                  className={`rounded-xl border p-3 min-h-14 text-left font-sans text-sm transition-colors touch-manipulation ${
                    creditPackPurchase === p.id ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <p className="font-semibold">{t(`publish.creditPack.${p.id}`, p.name)}</p>
                  <p className="text-muted-foreground">
                    {p.credits_amount} crédits — {formatAriary(p.price_mga)}
                  </p>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="font-sans">
                {t("publish.paymentMethod", "Mode de paiement")}
              </Label>
              <Select value={purchasePaymentMethod} onValueChange={setPurchasePaymentMethod}>
                <SelectTrigger className="font-sans min-h-11">
                  <SelectValue placeholder={t("common.select")} />
                </SelectTrigger>
                <SelectContent>
                  {manualPaymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-sans">
                {t("publish.proofFile", "Preuve de paiement (fichier)")}
              </Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                className="font-sans min-h-11"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full font-sans min-h-11 touch-manipulation"
              disabled={purchaseSubmitting}
              onClick={submitCreditPurchase}
            >
              {purchaseSubmitting
                ? t("common.loading")
                : t("publish.submitCreditRequest", "Enregistrer la demande d'achat")}
            </Button>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default PublishStepVisibility;
