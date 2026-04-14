import { cn } from "@/lib/utils";
import { SponsoredPill } from "./MonetizationLabels";

type BannerVariant = "strip" | "inline";

interface BannerSlotProps {
  variant?: BannerVariant;
  title?: string;
  subtitle?: string;
  href?: string | null;
  ctaLabel?: string | null;
  imageUrl?: string | null;
  className?: string;
  /** When false, component returns null (kill switch). */
  enabled?: boolean;
}

/**
 * Premium horizontal sponsor strip — config-driven placeholder until real campaigns exist.
 */
export function BannerSlot({
  variant = "strip",
  title = "Espace partenaire premium",
  subtitle = "Visibilité nationale, ciblage par ville, leads qualifiés — contactez-nous pour les médias.",
  href = null,
  ctaLabel = null,
  imageUrl = null,
  className,
  enabled = true,
}: BannerSlotProps) {
  if (!enabled) return null;
  const showCta = Boolean(href && ctaLabel);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-secondary/60 via-card to-secondary/40",
        variant === "strip" ? "py-4 px-5 md:px-8" : "py-3 px-4",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <SponsoredPill />
          <p className="font-serif text-base md:text-lg font-semibold text-foreground">{title}</p>
          <p className="text-xs md:text-sm text-muted-foreground font-sans max-w-xl leading-relaxed">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-12 w-20 rounded-lg object-cover border border-border/70"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          {showCta ? (
            <a
              href={href!}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center justify-center rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-sans font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              {ctaLabel}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
