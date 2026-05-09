import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Crown, Loader2, Rocket, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/features/credits/lib/creditFormatting";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";
import { useApplyBoost, type BoostV1Type } from "@/hooks/boosts/useApplyBoost";
import { useBumpCooldown } from "@/hooks/boosts/useBumpCooldown";

/**
 * BoostModal (PROMPT 6 V1).
 *
 * Dialog d'achat de boost orthogonal pour un listing actif. 3 options
 * affichées en stack vertical (1 col mobile, identique desktop pour
 * scannabilité). Sélection radio (1 boost à la fois en V1, pas de combo).
 *
 * États visuels :
 *   - Pas de sélection → bouton Confirmer disabled
 *   - Sélection mais solde insuffisant → bouton Confirmer disabled + lien Recharger
 *   - Bump en cooldown → card Bump disabled + countdown "Disponible dans Xh Ymin"
 *   - Mutation en cours → spinner + label "Activation en cours..." sur le bouton
 *
 * Mobile-first 320px+. Sticky footer avec bouton 100% width.
 */

type BoostModalProps = {
  listingId: string;
  listingTitle: string;
  /** ISO timestamp du dernier bump (ou null si jamais bumpé). */
  lastBumpedAt: string | null;
  /** ISO timestamp de fin Featured (ou null si pas actif). */
  featuredUntil: string | null;
  /** ISO timestamp de fin Top Ad (ou null si pas actif). */
  topAdUntil: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Coûts canoniques V1 — alignés avec credit_pricing seed (PROMPT 1, vérifié
// par monetizationConfigDrift.test.ts).
const BOOST_COSTS: Record<BoostV1Type, number> = {
  bump: 5_000,
  featured: 30_000,
  top_ad: 100_000,
};

// Order Z-pattern reading (cheapest → premium).
const BOOST_ORDER: BoostV1Type[] = ["bump", "featured", "top_ad"];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isFutureIso(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export function BoostModal({
  listingId,
  listingTitle,
  lastBumpedAt,
  featuredUntil,
  topAdUntil,
  open,
  onOpenChange,
}: BoostModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<BoostV1Type | null>(null);

  const cooldown = useBumpCooldown(lastBumpedAt);
  const { data: balance = 0, isPending: balancePending } = useCreditsBalance();
  const apply = useApplyBoost();

  // Reset selection à chaque ouverture.
  useEffect(() => {
    if (open) setSelected(null);
  }, [open, listingId]);

  const cost = selected ? BOOST_COSTS[selected] : 0;
  const canAfford = !balancePending && balance >= cost;
  const isBumpDisabled = cooldown.isOnCooldown;
  const featuredActive = isFutureIso(featuredUntil);
  const topAdActive = isFutureIso(topAdUntil);

  const isSubmitting = apply.isPending;

  const handleSelect = (type: BoostV1Type) => {
    if (type === "bump" && isBumpDisabled) return;
    setSelected(type);
  };

  const handleConfirm = () => {
    if (!selected || !canAfford || isSubmitting) return;
    apply.mutate(
      { listingId, boostType: selected },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  const cards = useMemo(() => {
    return BOOST_ORDER.map((type) => {
      const isSelected = selected === type;
      const isDisabled = type === "bump" && isBumpDisabled;
      return { type, isSelected, isDisabled };
    });
  }, [selected, isBumpDisabled]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-4">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg">
            {t("boostModal.title", "Booster votre annonce")}
          </DialogTitle>
          <DialogDescription className="font-sans text-sm text-muted-foreground">
            {t("boostModal.subtitle", "Choisissez l'option qui vous convient")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2" role="radiogroup" aria-label={t("boostModal.title", "Booster votre annonce")}>
          {cards.map(({ type, isSelected, isDisabled }) => (
            <BoostCard
              key={type}
              type={type}
              cost={BOOST_COSTS[type]}
              isSelected={isSelected}
              isDisabled={isDisabled}
              cooldownLabel={
                type === "bump" && isDisabled
                  ? t("boostModal.cooldown.bumpUnavailable", "Disponible dans {{remaining}}", {
                      remaining: cooldown.formatted,
                    })
                  : null
              }
              activeUntilLabel={
                type === "featured" && featuredActive
                  ? t("boostModal.activeBoosts.featuredUntil", "Actif jusqu'au {{date}} — extension cumulera", {
                      date: formatDate(featuredUntil),
                    })
                  : type === "top_ad" && topAdActive
                  ? t("boostModal.activeBoosts.topAdUntil", "Actif jusqu'au {{date}} — extension cumulera", {
                      date: formatDate(topAdUntil),
                    })
                  : null
              }
              onSelect={() => handleSelect(type)}
            />
          ))}
        </div>

        <p
          className="font-sans text-xs text-muted-foreground leading-relaxed"
          data-testid="boost-disclaimer"
        >
          {t(
            "boostModal.disclaimer.noRefund",
            "Les crédits engagés ne sont pas remboursés en cas de vente anticipée.",
          )}
        </p>

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="font-sans text-xs text-muted-foreground">
              {t("boostModal.balanceLabel", "Solde")}
            </p>
            <p className="font-sans text-sm font-medium text-foreground" data-testid="boost-modal-balance">
              {balancePending
                ? "…"
                : t("boostModal.balanceValue", "{{amount}} crédits", {
                    amount: formatNumber(balance),
                  })}
            </p>
          </div>
          {selected && (
            <div className="text-right min-w-0">
              <p className="font-sans text-xs text-muted-foreground">
                {t("boostModal.totalCostLabel", "Coût")}
              </p>
              <p
                className={cn(
                  "font-sans text-sm font-semibold",
                  canAfford ? "text-foreground" : "text-destructive",
                )}
                data-testid="boost-modal-cost"
              >
                {t("boostModal.totalCostValue", "{{amount}} crédits", {
                  amount: formatNumber(cost),
                })}
              </p>
            </div>
          )}
        </div>

        {selected && !balancePending && !canAfford && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-sans text-destructive flex items-center justify-between gap-3 flex-wrap">
            <span>{t("boostModal.insufficientCredits.title", "Crédits insuffisants")}</span>
            <Link
              to="/credits"
              className="font-medium underline underline-offset-2"
              data-testid="boost-modal-recharge-link"
              onClick={() => onOpenChange(false)}
            >
              {t("boostModal.insufficientCredits.cta", "Recharger")}
            </Link>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="boost-modal-cancel"
            className="font-sans"
          >
            {t("boostModal.cancelCta", "Annuler")}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || !canAfford || isSubmitting}
            aria-busy={isSubmitting}
            data-testid="boost-modal-confirm"
            className="font-sans gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>{t("boostModal.activating", "Activation en cours...")}</span>
              </>
            ) : (
              t("boostModal.confirmCta", "Confirmer le boost")
            )}
          </Button>
        </DialogFooter>

        {/* Hidden listing context for tests */}
        <span className="sr-only" data-testid="boost-modal-listing-title">
          {listingTitle}
        </span>
      </DialogContent>
    </Dialog>
  );
}

type BoostCardProps = {
  type: BoostV1Type;
  cost: number;
  isSelected: boolean;
  isDisabled: boolean;
  cooldownLabel: string | null;
  activeUntilLabel: string | null;
  onSelect: () => void;
};

function BoostCard({
  type,
  cost,
  isSelected,
  isDisabled,
  cooldownLabel,
  activeUntilLabel,
  onSelect,
}: BoostCardProps) {
  const { t } = useTranslation();

  const Icon = type === "bump" ? Rocket : type === "featured" ? Star : Crown;

  const titleKey = `boostModal.boost.${type}.title`;
  const titleFallback =
    type === "bump"
      ? "Remontée immédiate"
      : type === "featured"
      ? "À la une (7 jours)"
      : "Top Annonce (30 jours)";

  const durationKey = `boostModal.boost.${type}.duration`;
  const durationFallback =
    type === "bump" ? "Effet instantané" : type === "featured" ? "7 jours" : "30 jours";

  const descriptionKey = `boostModal.boost.${type}.description`;
  const descriptionFallback =
    type === "bump"
      ? "Votre annonce remonte en haut du feed maintenant."
      : type === "featured"
      ? "Apparaît dans la section « À la une » + badge ⭐ sur la card."
      : "Épinglée 👑 en haut du feed pendant 30 jours.";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      onClick={onSelect}
      data-testid={`boost-card-${type}`}
      className={cn(
        "w-full rounded-xl border bg-card p-4 text-left font-sans transition-shadow touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected ? "border-2 border-primary shadow-md" : "border-border",
        isDisabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:shadow-md cursor-pointer",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" aria-hidden />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">{t(titleKey, titleFallback)}</p>
            <p className="text-xs text-muted-foreground">{t(durationKey, durationFallback)}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(descriptionKey, descriptionFallback)}
          </p>
          {cooldownLabel && (
            <p
              className="text-xs font-medium text-amber-600 dark:text-amber-400 pt-1"
              data-testid={`boost-card-${type}-cooldown`}
            >
              {cooldownLabel}
            </p>
          )}
          {activeUntilLabel && (
            <p
              className="text-xs text-emerald-600 dark:text-emerald-400 pt-1"
              data-testid={`boost-card-${type}-active`}
            >
              {activeUntilLabel}
            </p>
          )}
        </div>
        <p
          className="text-sm font-semibold text-foreground whitespace-nowrap"
          data-testid={`boost-card-${type}-cost`}
        >
          {t("boostModal.cardCostValue", "{{amount}} cr.", {
            amount: formatNumber(cost),
          })}
        </p>
      </div>
    </button>
  );
}
