import { useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useActivateDeal } from "@/features/deals/hooks/useDealMutations";

const DISCOUNT_PRESETS = [5, 10, 15, 20, 25, 30] as const;
const DURATION_PRESETS: ReadonlyArray<7 | 14 | 30> = [7, 14, 30];

const MIN_DISCOUNT = 5;
const MAX_DISCOUNT = 30;

interface DealActivationModalProps {
  /** Annonce cible. Doit être active + transaction='vente' (validé côté serveur). */
  listing: {
    id: string;
    title: string | null;
    price_mga: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback optionnel après succès — typiquement pour fermer le modal côté parent. */
  onSuccess?: () => void;
}

/**
 * Modal d'activation d'un deal vendeur.
 *
 * Source unique de vérité du calcul `newPrice = floor(price * (1 - %/100))` :
 * la RPC `activate_deal_for_listing` côté DB. Le preview client refait
 * EXACTEMENT le même calcul pour ne pas afficher un prix qui diverge du
 * prix réellement appliqué côté serveur.
 */
export function DealActivationModal({
  listing,
  open,
  onOpenChange,
  onSuccess,
}: DealActivationModalProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const activateDeal = useActivateDeal();

  const [presetDiscount, setPresetDiscount] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState<boolean>(false);
  const [customDiscountInput, setCustomDiscountInput] = useState<string>("");
  const [durationDays, setDurationDays] = useState<7 | 14 | 30 | null>(null);

  // Discount effectif = preset ou custom (les deux exclusifs).
  const customDiscountValue = useMemo(() => {
    if (!customMode) return null;
    const trimmed = customDiscountInput.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    if (!Number.isInteger(parsed)) return null;
    return parsed;
  }, [customMode, customDiscountInput]);

  const effectiveDiscount = customMode ? customDiscountValue : presetDiscount;
  const customDiscountValid =
    customDiscountValue !== null &&
    customDiscountValue >= MIN_DISCOUNT &&
    customDiscountValue <= MAX_DISCOUNT;

  const isFormValid =
    effectiveDiscount !== null &&
    effectiveDiscount >= MIN_DISCOUNT &&
    effectiveDiscount <= MAX_DISCOUNT &&
    durationDays !== null;

  // Calcul preview — EXACTEMENT le même que floor(price * (1 - %/100)) côté RPC.
  const previewNewPrice = useMemo(() => {
    if (effectiveDiscount === null) return null;
    if (effectiveDiscount < MIN_DISCOUNT || effectiveDiscount > MAX_DISCOUNT) return null;
    return Math.floor(listing.price_mga * (1 - effectiveDiscount / 100));
  }, [effectiveDiscount, listing.price_mga]);

  const previewSavings = useMemo(() => {
    if (previewNewPrice === null) return null;
    return listing.price_mga - previewNewPrice;
  }, [previewNewPrice, listing.price_mga]);

  const previewEndsAt = useMemo(() => {
    if (durationDays === null) return null;
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    return d;
  }, [durationDays]);

  const formatPreviewDate = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const resetForm = () => {
    setPresetDiscount(null);
    setCustomMode(false);
    setCustomDiscountInput("");
    setDurationDays(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (!isFormValid || effectiveDiscount === null || durationDays === null) return;
    activateDeal.mutate(
      {
        listingId: listing.id,
        discountPercent: effectiveDiscount,
        durationDays,
      },
      {
        onSuccess: () => {
          resetForm();
          onSuccess?.();
        },
      },
    );
  };

  const showPreview = isFormValid && previewNewPrice !== null && previewEndsAt !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-sans">
            <Flame className="h-5 w-5 text-orange-600" aria-hidden />
            {t("deals.modal.title", "Mettre votre annonce en bonne affaire")}
          </DialogTitle>
          <DialogDescription className="font-sans">
            {t("deals.modal.subtitle", "Attirez plus d'acheteurs avec une remise temporaire")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Bloc prix actuel */}
          <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground font-sans">
              {t("deals.modal.currentPriceLabel", "Prix actuel")}
            </p>
            <p className="font-sans text-lg font-semibold text-foreground">
              {formatPrice(listing.price_mga)}
            </p>
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label className="font-sans text-sm">
              {t("deals.modal.discountLabel", "Choisissez votre remise")}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {DISCOUNT_PRESETS.map((p) => {
                const selected = !customMode && presetDiscount === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCustomMode(false);
                      setCustomDiscountInput("");
                      setPresetDiscount(p);
                    }}
                    className={
                      "rounded-full border px-3 py-1.5 text-sm font-sans font-medium transition-colors " +
                      (selected
                        ? "border-orange-600 bg-orange-600 text-white"
                        : "border-border bg-background text-foreground hover:bg-muted")
                    }
                    aria-pressed={selected}
                  >
                    -{p}%
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setPresetDiscount(null);
                  setCustomMode(true);
                }}
                className={
                  "rounded-full border px-3 py-1.5 text-sm font-sans font-medium transition-colors " +
                  (customMode
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-border bg-background text-foreground hover:bg-muted")
                }
                aria-pressed={customMode}
              >
                {t("deals.modal.discountCustom", "Personnalisé")}
              </button>
            </div>
            {customMode && (
              <div className="space-y-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={MIN_DISCOUNT}
                  max={MAX_DISCOUNT}
                  step={1}
                  value={customDiscountInput}
                  onChange={(e) => setCustomDiscountInput(e.target.value)}
                  placeholder="5 — 30"
                  aria-label={t("deals.modal.discountCustom", "Personnalisé")}
                  className="font-sans"
                />
                {customDiscountInput.trim() !== "" && !customDiscountValid && (
                  <p className="text-xs text-destructive font-sans">
                    {t("deals.modal.discountCustomInvalid", "Choisissez un entier entre 5 et 30.")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="font-sans text-sm">
              {t("deals.modal.durationLabel", "Durée du deal")}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_PRESETS.map((d) => {
                const selected = durationDays === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationDays(d)}
                    className={
                      "rounded-lg border px-3 py-2.5 text-sm font-sans font-medium transition-colors " +
                      (selected
                        ? "border-orange-600 bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100"
                        : "border-border bg-background text-foreground hover:bg-muted")
                    }
                    aria-pressed={selected}
                  >
                    {t("deals.modal.durationDays", { count: d, defaultValue: "{{count}} jours" })}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {showPreview && previewNewPrice !== null && previewEndsAt !== null && previewSavings !== null && (
            <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/60 p-3 dark:border-orange-900/40 dark:bg-orange-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-800 font-sans dark:text-orange-200">
                {t("deals.modal.previewTitle", "Aperçu")}
              </p>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-sans">
                    {t("deals.modal.previewBefore", "Avant")}
                  </span>
                  <span className="text-sm font-sans text-muted-foreground line-through">
                    {formatPrice(listing.price_mga)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-sans">
                    {t("deals.modal.previewAfter", "Nouveau prix")}
                  </span>
                  <span className="text-base font-sans font-bold text-orange-700 dark:text-orange-300">
                    {formatPrice(previewNewPrice)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-sans">
                    {t("deals.modal.previewSavings", "Économie pour l'acheteur")}
                  </span>
                  <span className="text-sm font-sans font-medium text-emerald-700 dark:text-emerald-300">
                    {formatPrice(previewSavings)}
                  </span>
                </div>
              </div>
              <p className="border-t border-orange-200/80 pt-2 text-xs text-orange-900 font-sans dark:border-orange-900/40 dark:text-orange-200">
                {t("deals.modal.previewVisibleUntil", {
                  date: formatPreviewDate(previewEndsAt),
                  defaultValue: "Visible jusqu'au {{date}}",
                })}
              </p>
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground font-sans">
            {t("deals.modal.guarantee30d", {
              originalPrice: formatPrice(listing.price_mga),
              defaultValue:
                "Pendant 30 jours après la fin du deal, vous ne pourrez pas remonter votre prix au-dessus de {{originalPrice}}. Cette protection rassure les acheteurs et garantit l'authenticité de votre offre.",
            })}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="font-sans"
            onClick={() => handleOpenChange(false)}
            disabled={activateDeal.isPending}
          >
            {t("deals.modal.ctaCancel", "Annuler")}
          </Button>
          <Button
            type="button"
            className="font-sans bg-orange-600 text-white hover:bg-orange-700"
            onClick={handleSubmit}
            disabled={!isFormValid || activateDeal.isPending}
          >
            {activateDeal.isPending
              ? t("common.loading", "Chargement…")
              : t("deals.modal.ctaActivate", "Activer le deal")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
