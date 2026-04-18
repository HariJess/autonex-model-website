/** Outline + hover/focus accents only; brand green is on the FaWhatsapp icon. */
export const LISTING_WHATSAPP_BUTTON_CLASS =
  "border-emerald-200/85 bg-background text-foreground hover:bg-emerald-50/85 hover:border-emerald-300/95 hover:text-foreground dark:border-emerald-800/50 dark:hover:bg-emerald-950/40 dark:hover:border-emerald-600/55 focus-visible:ring-emerald-500/40";

export const LISTING_DETAIL_BADGE_CLASS =
  "inline-flex min-h-8 items-center rounded-full border border-border/75 bg-card px-3 py-1 text-[13px] md:text-xs font-medium leading-none tracking-[0.01em] text-foreground shadow-sm whitespace-nowrap";

export const LISTING_DETAIL_BADGE_SUBTLE_CLASS =
  "inline-flex min-h-8 items-center rounded-full border border-border/60 bg-secondary/45 px-3 py-1 text-[13px] md:text-xs font-medium leading-none tracking-[0.01em] text-foreground whitespace-nowrap";

export function listingWhatsAppPrefill(title: string): string {
  const short = title.length > 80 ? `${title.slice(0, 77)}…` : title;
  return `Bonjour, je vous contacte au sujet de votre annonce sur AutoNex « ${short} ».`;
}
