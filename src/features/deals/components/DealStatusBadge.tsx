import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DealStatusBadgeProps {
  discountPercent: number;
  endsAt: string;
}

/**
 * Badge inline « -X% jusqu'au DD/MM/YYYY » affiché côté dashboard vendeur
 * quand `listing.deal_active === true`. Format date FR (locale-aware) pour
 * rester cohérent avec les autres rendus FR du dashboard.
 */
export function DealStatusBadge({ discountPercent, endsAt }: DealStatusBadgeProps) {
  const { t } = useTranslation();
  const endDate = new Date(endsAt);
  const formatted = Number.isNaN(endDate.getTime())
    ? endsAt
    : endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-orange-50 px-2 py-1 text-[11px] font-medium text-orange-800 dark:bg-orange-950/60 dark:text-orange-200">
      <Flame className="h-3 w-3 shrink-0" aria-hidden />
      <span>{t("deals.status.activeUntil", { discount: discountPercent, date: formatted })}</span>
    </span>
  );
}
