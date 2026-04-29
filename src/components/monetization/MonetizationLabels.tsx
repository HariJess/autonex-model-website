import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type PillVariant = "sponsored" | "featured" | "top";

const styles: Record<PillVariant, string> = {
  sponsored: "bg-muted/80 text-muted-foreground border-border",
  featured: "bg-primary/10 text-primary border-primary/25",
  top: "gradient-primary border-0",
};

export function SponsoredPill({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("monetization.sponsoredLabel", "Sponsorisé");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide font-sans",
        styles.sponsored,
        className,
      )}
    >
      {resolvedLabel}
    </span>
  );
}

export function FeaturedPill({ className, label }: { className?: string; label?: string }) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("monetization.featuredLabel", "Mis en avant");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide font-sans",
        styles.featured,
        className,
      )}
    >
      {resolvedLabel}
    </span>
  );
}

export function TopAnnoncePill({ className, label }: { className?: string; label?: string }) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("monetization.topListingLabel", "Top annonce");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide font-sans text-primary-foreground",
        styles.top,
        className,
      )}
      style={{ color: "#FAFAFA" }}
    >
      {resolvedLabel}
    </span>
  );
}
