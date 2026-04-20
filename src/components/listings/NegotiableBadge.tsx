import { Handshake } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface NegotiableBadgeProps {
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

/**
 * Reusable badge shown next to the price when a listing's owner opted-in
 * to price negotiation (DB column listings.negotiable = true).
 * Used on ListingCard (sm) and ListingDetail (md).
 */
export function NegotiableBadge({
  size = "sm",
  showIcon = true,
  className,
}: NegotiableBadgeProps) {
  const { t } = useTranslation();
  const label = t("listings.negotiable.badge", "Négociable");
  const tooltip = t(
    "listings.negotiable.tooltip",
    "Le vendeur accepte la négociation du prix",
  );

  return (
    <span
      title={tooltip}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 font-sans font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-sm",
        className,
      )}
    >
      {showIcon ? (
        <Handshake
          className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}
          aria-hidden
        />
      ) : null}
      {label}
    </span>
  );
}

export default NegotiableBadge;
