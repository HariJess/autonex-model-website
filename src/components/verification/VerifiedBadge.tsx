import { BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type VerifiedBadgeProps = {
  /** "sm" pour cards, "md" pour profil. */
  size?: "sm" | "md";
  /** false → icône seule (mobile dense). default true. */
  label?: boolean;
  className?: string;
};

/**
 * Pill compact "Vendeur vérifié" — utilisé sur ListingCard, MyListingCard, etc.
 * Style : bleu (trust/identité) — distinct du vert "nouveau".
 * Privacy-safe : ne contient ni info personnelle ni path.
 */
export function VerifiedBadge({ size = "sm", label = true, className }: VerifiedBadgeProps) {
  const { t } = useTranslation();
  const labelText = t("listing.badge.verifiedSeller", "Vérifié");

  return (
    <span
      data-testid="verified-badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className,
      )}
      title={labelText}
      aria-label={labelText}
    >
      <BadgeCheck className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} aria-hidden="true" />
      {label && <span>{labelText}</span>}
    </span>
  );
}
