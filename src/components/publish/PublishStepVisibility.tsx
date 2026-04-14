import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, Sparkles } from "lucide-react";
import { LISTING_TYPE_LABELS, type ListingType, type TransactionType } from "@/types/listing";
import {
  LISTING_PUBLISH_CREDIT_COST,
  BOOST_CREDIT_COSTS,
  BOOST_ORDER,
  BOOST_LABELS_FR,
  AGENCY_SPOTLIGHT_CREDIT_COST,
  formatAriary,
  type PurchasableBoostType,
} from "@/config/monetization";
import type { CreditPackRow } from "@/lib/creditPacks";

type ManualPaymentMethod = {
  id: string;
  name: string;
};

export type PublishStepVisibilityProps = {
  /** Édition d’annonce existante : pas de débit de crédits, boosts non modifiables. */
  editMode?: boolean;
  editSubmitLabel?: string;
  editModeCreditsHint?: string;
  // Crédits + état
  creditsBalance: number;
  creditsBalancePending: boolean;
  totalCost: number;
  canPublishWithCredits: boolean;

  // Résumé
  title: string;
  listingType: ListingType | "";
  transaction: TransactionType | "";
  ville: string;
  photoCount: number;

  // Boosts
  selectedBoosts: PurchasableBoostType[];
  toggleBoost: (b: PurchasableBoostType) => void;

  // Spotlight agence
  hasAgency: boolean;
  agencySpotlight: boolean;
  setAgencySpotlight: (v: boolean) => void;
  agencySpotlightActive: boolean;

  // Publication
  publishing: boolean;
  onPublish: () => void;

  // Achat de crédits
  creditPacks: CreditPackRow[];
  creditPackPurchase: string;
  setCreditPackPurchase: (id: string) => void;
  paymentMethods: ManualPaymentMethod[];
  purchasePaymentMethod: string;
  setPurchasePaymentMethod: (id: string) => void;
  onProofFileChange: (file: File | null) => void;
  purchaseSubmitting: boolean;
  onSubmitCreditPurchase: () => void;
};

/**
 * Étape 3 du wizard de publication : choix des boosts, récapitulatif,
 * bouton d'envoi pour modération, et formulaire d'achat de crédits.
 *
 * Composant purement présentationnel : tout le state et la logique métier
 * restent dans PublishPage.tsx. Ce composant reçoit ses données et callbacks via props.
 */
const PublishStepVisibility = ({
  editMode = false,
  editSubmitLabel,
  editModeCreditsHint,
  creditsBalance,
  creditsBalancePending,
  totalCost,
  canPublishWithCredits,
  title,
  listingType,
  transaction,
  ville,
  photoCount,
  selectedBoosts,
  toggleBoost,
  hasAgency,
  agencySpotlight,
  setAgencySpotlight,
  agencySpotlightActive,
  publishing,
  onPublish,
  creditPacks,
  creditPackPurchase,
  setCreditPackPurchase,
  paymentMethods,
  purchasePaymentMethod,
  setPurchasePaymentMethod,
  onProofFileChange,
  purchaseSubmitting,
  onSubmitCreditPurchase,
}: PublishStepVisibilityProps) => {
  const { t } = useTranslation();
  const publishAllowed = editMode || canPublishWithCredits;

  return (
    <div className="space-y-5 pb-2">
      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Coins className="h-5 w-5" /> {t("publish.creditsTitle", "Crédits & coût")}
          </CardTitle>
          <CardDescription className="font-sans">
            {editMode ? (
              editModeCreditsHint ??
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
                  {t("publish.costPublication", "Publication (modération)")}
                </span>
                <span>{LISTING_PUBLISH_CREDIT_COST}</span>
              </div>
              {selectedBoosts.map((b) => (
                <div key={b} className="flex justify-between">
                  <span className="text-muted-foreground">{BOOST_LABELS_FR[b]}</span>
                  <span>{BOOST_CREDIT_COSTS[b]}</span>
                </div>
              ))}
              {agencySpotlightActive && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("publish.agencySpotlight", "Spotlight agence (marque)")}
                  </span>
                  <span>{AGENCY_SPOTLIGHT_CREDIT_COST}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>{totalCost}</span>
              </div>
              {!canPublishWithCredits && (
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

      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> {t("publish.boostTitle", "Boosts (après validation)")}
          </CardTitle>
          <CardDescription className="font-sans">
            {t(
              "publish.boostHonest",
              "Les boosts sélectionnés seront pris en compte lors de la mise en ligne par notre équipe, sous réserve de disponibilité.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
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
                <span>{BOOST_LABELS_FR[b]}</span>
              </span>
              <span className="text-muted-foreground whitespace-nowrap">
                {BOOST_CREDIT_COSTS[b]} cr.
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
            <CardDescription className="font-sans text-xs">
              {t(
                "publish.agencySpotlightDesc",
                "Renforce la présence de votre marque sur le portail (après validation). Réservé aux comptes agence.",
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
                  onCheckedChange={(c) => setAgencySpotlight(c === true)}
                />
                <span>{t("publish.agencySpotlightLabel", "Spotlight agence")}</span>
              </span>
              <span className="text-muted-foreground">{AGENCY_SPOTLIGHT_CREDIT_COST} cr.</span>
            </label>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            {t("publish.summary", "Récapitulatif")}
          </CardTitle>
        </CardHeader>
        <CardContent className="font-sans text-sm space-y-1 text-muted-foreground">
          <p><strong className="text-foreground">{title || "—"}</strong></p>
          <p>
            {listingType ? LISTING_TYPE_LABELS[listingType as ListingType] : ""} · {transaction} · {ville}
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
            : t("publish.submitForReview", "Envoyer pour modération")}
      </Button>

      {!editMode && (
      <div className="border-t border-border pt-6 space-y-4">
        <h3 className="font-serif font-semibold">
          {t("publish.buyCredits", "Acheter des crédits")}
        </h3>
        <p className="text-xs text-muted-foreground font-sans">
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
              <p className="font-semibold">{p.name}</p>
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
              {paymentMethods.map((m) => (
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
            onChange={(e) => onProofFileChange(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full font-sans min-h-11 touch-manipulation"
          disabled={purchaseSubmitting}
          onClick={onSubmitCreditPurchase}
        >
          {purchaseSubmitting
            ? t("common.loading")
            : t("publish.submitCreditRequest", "Enregistrer la demande d'achat")}
        </Button>
      </div>
      )}
    </div>
  );
};

export default PublishStepVisibility;
