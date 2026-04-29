import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PremiumStatePanelProps = {
  overline?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  role?: "status" | "alert" | "region";
  ariaLive?: "polite" | "assertive" | "off";
};

export function PremiumStatePanel({
  overline,
  title,
  description,
  icon,
  action,
  className,
  contentClassName,
  role = "status",
  ariaLive = "polite",
}: PremiumStatePanelProps) {
  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={cn(
        "rounded-2xl border border-border/75 bg-gradient-to-br from-card via-card to-secondary/20 px-4 py-10 shadow-sm motion-safe:transition-colors md:px-6 md:py-12",
        className,
      )}
    >
      <div className={cn("mx-auto max-w-xl text-center", contentClassName)}>
        {icon ? (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background/80">
            {icon}
          </div>
        ) : null}
        {overline ? (
          <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{overline}</p>
        ) : null}
        <p className="mt-1.5 font-sans text-xl text-foreground md:text-2xl">{title}</p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground md:text-[15px]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

type PremiumStateSkeletonGridProps = {
  count?: number;
};

export function PremiumStateSkeletonGrid({ count = 6 }: PremiumStateSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, skeleton) => (
        <div key={`premium-skeleton-${skeleton}`} className="overflow-hidden rounded-2xl border border-border/70 bg-card/90">
          <div className="aspect-[4/3] animate-pulse bg-muted/70" />
          <div className="space-y-2 p-3.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted/70" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
