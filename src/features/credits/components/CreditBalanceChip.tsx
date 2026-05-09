import { Coins, Plus, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { useCreditBalance } from "@/features/credits/hooks/useCreditBalance";
import { formatCredits } from "@/features/credits/lib/creditFormatting";
import { cn } from "@/lib/utils";

/**
 * Chip header affichant le solde courant + tooltip riche (granted/paid breakdown).
 *
 * 3 variantes selon l'état :
 *   - total === 0 → variant "Recharger" (CTA primaire)
 *   - granted_expires_at < now() + 30 jours → indicateur orange ⚠
 *   - défaut → solde formaté
 *
 * Compact (mobile) vs full (desktop) géré par prop `compact`. Sur mobile on
 * affiche un format raccourci ("100k") + icône Coins seule.
 */

interface CreditBalanceChipProps {
  /** Format compact (mobile) : icône + nombre court. */
  compact?: boolean;
  /** Classes additionnelles passées au container. */
  className?: string;
}

const SOON_EXPIRY_DAYS = 30;
const KILO_THRESHOLD = 10_000;

function formatShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    const m = (n / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${m}M`;
  }
  if (Math.abs(n) >= KILO_THRESHOLD) {
    const k = (n / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${k}k`;
  }
  return n.toLocaleString("fr-MG");
}

function isExpiringSoon(grantedExpiresAt: string | null): boolean {
  if (!grantedExpiresAt) return false;
  const expiry = new Date(grantedExpiresAt).getTime();
  const threshold = Date.now() + SOON_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return expiry > Date.now() && expiry < threshold;
}

function formatExpiryDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-MG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CreditBalanceChip({ compact = false, className }: CreditBalanceChipProps) {
  const { t } = useTranslation();
  const { total, paid, granted, grantedExpiresAt, isLoading } = useCreditBalance();

  // Skeleton pendant le chargement initial (évite flash 0 → 100k)
  if (isLoading) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5",
          compact ? "px-2.5 py-1" : "",
          className,
        )}
        aria-label={t("credits.balance.loading", "Chargement du solde")}
      >
        <Coins className="h-4 w-4 text-amber-400/60 animate-pulse" />
        <span className="h-3 w-10 rounded bg-white/10 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  // Variant Recharger si solde nul
  if (total === 0) {
    return (
      <Link
        to="/credits"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-400/55 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20",
          compact ? "px-2.5 py-1" : "",
          className,
        )}
        aria-label={t("credits.balance.rechargeAria", "Recharger des crédits")}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>{t("credits.balance.recharge", "Recharger")}</span>
      </Link>
    );
  }

  const expiringSoon = isExpiringSoon(grantedExpiresAt);
  const displayValue = compact ? formatShort(total) : total.toLocaleString("fr-MG");

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Link
          to="/credits"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-navbar-foreground transition-colors hover:border-white/30 hover:bg-white/[0.08]",
            compact ? "px-2.5 py-1" : "",
            className,
          )}
          aria-label={t("credits.balance.chipAria", "Solde : {{n}} crédits", { n: total.toLocaleString("fr-MG") })}
        >
          <Coins className={cn("h-4 w-4", expiringSoon ? "text-amber-300" : "text-amber-400")} />
          <span>{displayValue}</span>
          {expiringSoon && (
            <AlertCircle
              className="h-3.5 w-3.5 text-amber-300"
              aria-label={t("credits.balance.expiringSoonAria", "Crédits offerts expirent bientôt")}
            />
          )}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-72 border-white/15 bg-popover text-foreground">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between font-semibold">
            <span>{t("credits.balance.tooltip.total", "Solde total")}</span>
            <span>{formatCredits(total)}</span>
          </div>
          {granted > 0 && (
            <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-2.5 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("credits.balance.tooltip.granted", "Crédits offerts")}</span>
                <span className="font-medium">{formatCredits(granted)}</span>
              </div>
              {grantedExpiresAt && (
                <div className="text-muted-foreground">
                  {t("credits.balance.tooltip.expires", "expire le {{date}}", {
                    date: formatExpiryDate(grantedExpiresAt),
                  })}
                </div>
              )}
            </div>
          )}
          {paid > 0 && (
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-2 text-xs">
              <span className="text-muted-foreground">{t("credits.balance.tooltip.paid", "Crédits achetés")}</span>
              <span className="font-medium">{formatCredits(paid)}</span>
            </div>
          )}
          <Button asChild size="sm" className="w-full">
            <Link to="/credits">{t("credits.balance.recharge", "Recharger")}</Link>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
