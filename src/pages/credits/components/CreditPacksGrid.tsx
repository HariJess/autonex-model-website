import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatAriary } from "@/config/monetization";
import { formatNumber } from "@/features/credits/lib/creditFormatting";
import { cn } from "@/lib/utils";
import type { CreditPackRow } from "@/lib/creditPacks";

/**
 * CreditPacksGrid (PROMPT 3.8 — final).
 *
 * Direction Linear / Stripe / Vercel : sobriété, scannabilité, 4-5 lignes par
 * card. Tous les 6 packs sont visibles d'un coup dans une grille 3×2 desktop
 * (2×3 tablet, 1×6 mobile). Pas de toggle, pas de footer caché. Cible Phase 4
 * dealer = pouvoir comparer Business/Enterprise sans clic supplémentaire.
 *
 * Pro est mis en avant par ÉLÉVATION uniquement (border-2 + shadow-lg + label
 * "● Recommandé" + bouton primary solide). Pas de couleur de fond, pas de
 * scale, pas de hauteur supérieure.
 *
 * Tous les chiffres passent par `formatNumber` / `formatAriary` qui utilisent
 * une regex robuste (séparateur NBSP U+00A0) indépendante de l'ICU runtime.
 * Fix critique du PROMPT 3.8 : avant, `toLocaleString("fr-MG")` pouvait
 * silencieusement retourner "87500" sans séparateur sur Node minimal /
 * Safari ancien / pré-rendu SEO.
 *
 * HoverCard desktop-only (Radix ne déclenche pas sur touch sans pointer
 * events). Acceptable V1 : les 4 chiffres principaux suffisent sur mobile.
 */

const PUBLISH_LISTING_COST = 25_000;
const SAVINGS_THRESHOLD_AR = 50_000;

/**
 * Ordre canonical d'affichage. Sur grid 3 cols :
 *   Row 1 : Découverte | Standard | Pro
 *   Row 2 : Power      | Business | Enterprise
 * Pro en col 3 row 1 = point focal naturel (Z-pattern reading).
 */
const ORDERED_PACK_IDS = [
  "discover",
  "standard",
  "pro",
  "power",
  "business",
  "enterprise",
] as const;

const HIGHLIGHTED_PACK_ID = "pro";

type CreditPacksGridProps = {
  creditPacks: CreditPackRow[];
  selectedPackId: string;
  onSelectPack: (packId: string) => void;
  /** Force HoverCard ouvert (usage : tests). Ne pas utiliser en prod. */
  forceHoverOpen?: boolean;
};

type PackCardProps = {
  pack: CreditPackRow;
  isSelected: boolean;
  onSelect: (id: string) => void;
  highlighted?: boolean;
  forceHoverOpen?: boolean;
};

function PackCard({ pack, isSelected, onSelect, highlighted = false, forceHoverOpen }: PackCardProps) {
  const { t } = useTranslation();
  const total = pack.credits_amount + pack.bonus_credits;
  const hasBonus = pack.bonus_credits > 0;
  const unitPrice = total > 0 ? pack.price_mga / total : 0;
  // Économie vs achat à l'annonce nominal (ratio 1:1).
  const savingsAr = total - pack.price_mga;
  const equivalentListings = Math.floor(total / PUBLISH_LISTING_COST);

  const cardButton = (
    <button
      type="button"
      data-testid={`pack-${pack.id}`}
      onClick={() => onSelect(pack.id)}
      aria-pressed={isSelected}
      className={cn(
        "relative flex h-full w-full flex-col rounded-xl border bg-card p-4 md:p-6 text-left font-sans transition-shadow touch-manipulation",
        "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        highlighted ? "border-2 border-primary shadow-lg" : "border-border",
        isSelected && !highlighted && "ring-2 ring-primary",
      )}
    >
      {highlighted && (
        <div
          data-testid={`pack-${pack.id}-recommended`}
          className="absolute -top-3 left-4 md:left-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] md:text-xs font-medium text-primary-foreground"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          {t("credits.packs.recommended", "Recommandé")}
        </div>
      )}

      <p className="text-base font-medium text-foreground" data-testid={`pack-${pack.id}-name`}>
        {t(`publish.creditPack.${pack.id}`, pack.name)}
      </p>

      <p className="mt-4">
        <span
          className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
          data-testid={`pack-${pack.id}-credits`}
        >
          {formatNumber(total)}
        </span>{" "}
        <span className="text-xs md:text-sm text-muted-foreground">{t("credits.unit", "crédits")}</span>
      </p>

      {/* Ligne bonus : toujours rendue avec min-h pour préserver la hauteur
          uniforme entre cards (Découverte sans bonus reste alignée sur Standard). */}
      <p
        className="mt-2 min-h-[1.25rem] text-xs md:text-sm font-semibold text-emerald-600 dark:text-emerald-400"
        data-testid={`pack-${pack.id}-bonus`}
      >
        {hasBonus
          ? t("credits.packs.bonusValue", "+{{amount}} bonus", {
              amount: formatNumber(pack.bonus_credits),
            })
          : " "}
      </p>

      <div className="my-5 h-px bg-border" aria-hidden="true" />

      <p className="text-lg md:text-xl font-semibold text-foreground" data-testid={`pack-${pack.id}-price`}>
        {formatAriary(pack.price_mga)}
      </p>

      {/* Spacer pousse le bouton vers le bas pour que tous les CTAs s'alignent. */}
      <div className="flex-1" aria-hidden="true" />

      {/* Visual CTA — pas un vrai <button> car la card entière est cliquable
          (HTML interdit <button> dans <button>). Le span hérite du style Button
          via buttonVariants pour cohérence visuelle. */}
      <span
        className={cn(
          buttonVariants({ variant: highlighted ? "default" : "outline" }),
          "mt-5 w-full text-sm md:text-base",
        )}
        data-testid={`pack-${pack.id}-cta`}
        aria-hidden="true"
      >
        {t("credits.packs.choose", "Choisir")}
      </span>
    </button>
  );

  return (
    <HoverCard openDelay={200} closeDelay={100} {...(forceHoverOpen ? { open: true } : {})}>
      <HoverCardTrigger asChild>{cardButton}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        className="w-72 border-border bg-popover text-foreground"
        data-testid={`pack-${pack.id}-tooltip`}
      >
        <p className="text-sm font-medium">{t(`publish.creditPack.${pack.id}`, pack.name)}</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li data-testid={`pack-${pack.id}-tooltip-listings`}>
            {t("credits.packs.tooltip.equivalentListings", "≈ {{count}} annonces 30 jours", {
              count: equivalentListings,
            })}
          </li>
          <li data-testid={`pack-${pack.id}-tooltip-unit-price`}>
            {t("credits.packs.tooltip.unitPrice", "{{price}} Ar / crédit", {
              price: unitPrice.toFixed(2).replace(".", ","),
            })}
          </li>
          {savingsAr >= SAVINGS_THRESHOLD_AR && (
            <li
              className="font-medium text-emerald-600 dark:text-emerald-400"
              data-testid={`pack-${pack.id}-tooltip-savings`}
            >
              {t("credits.packs.tooltip.savings", "Économisez {{amount}} vs achat à l'annonce", {
                amount: formatAriary(savingsAr),
              })}
            </li>
          )}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}

export function CreditPacksGrid({
  creditPacks,
  selectedPackId,
  onSelectPack,
  forceHoverOpen,
}: CreditPacksGridProps) {
  const byId = new Map(creditPacks.map((p) => [p.id, p]));
  const orderedPacks = ORDERED_PACK_IDS.map((id) => byId.get(id)).filter(
    (p): p is CreditPackRow => Boolean(p),
  );

  return (
    <section data-testid="credit-packs-section">
      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {orderedPacks.map((p) => (
          <PackCard
            key={p.id}
            pack={p}
            isSelected={selectedPackId === p.id}
            onSelect={onSelectPack}
            highlighted={p.id === HIGHLIGHTED_PACK_ID}
            forceHoverOpen={forceHoverOpen}
          />
        ))}
      </div>
    </section>
  );
}

