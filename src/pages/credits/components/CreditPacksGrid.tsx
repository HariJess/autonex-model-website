import { useTranslation } from "react-i18next";
import { formatAriary } from "@/config/monetization";
import type { CreditPackRow } from "@/lib/creditPacks";

type CreditPacksGridProps = {
  creditPacks: CreditPackRow[];
  selectedPackId: string;
  onSelectPack: (packId: string) => void;
};

/**
 * Grid of credit-pack cards. Each card shows the pack name, the credits
 * amount delivered, the price in MGA, and the resulting MGA-per-credit
 * ratio (so the user can compare bundles at a glance — bigger packs are
 * cheaper per credit per the current dégressif pricing).
 */
export function CreditPacksGrid({ creditPacks, selectedPackId, onSelectPack }: CreditPacksGridProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {creditPacks.map((p) => {
        const ratio = p.credits_amount > 0 ? Math.round(p.price_mga / p.credits_amount) : null;
        const isSelected = selectedPackId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectPack(p.id)}
            aria-pressed={isSelected}
            className={`rounded-xl border p-4 min-h-24 text-left font-sans transition-colors touch-manipulation ${
              isSelected
                ? "border-primary ring-2 ring-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <p className="font-semibold text-base text-foreground">
              {t(`publish.creditPack.${p.id}`, p.name)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.credits_amount} {t("credits.unit", "crédits")}
            </p>
            <p className="mt-2 font-serif text-lg text-primary">
              {formatAriary(p.price_mga)}
            </p>
            {ratio != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("credits.ratioLabel", "{{ratio}} MGA / crédit", { ratio })}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
