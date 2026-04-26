import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SESSION_DISMISS_KEY = "autonex-payment-beta-banner-dismissed";

type BetaPaymentBannerProps = {
  /** Called after the user dismisses the banner (dismissible only). */
  onDismiss?: () => void;
  /** When true, renders an X button that persists dismissal per session. Default false. */
  dismissible?: boolean;
  /** Additional classes for layout (e.g. margin). */
  className?: string;
};

/**
 * Discreet amber banner shown on /credits and /paiement/retour during the
 * Vanilla Pay beta. Controlled by VITE_PAYMENT_BETA_BANNER_ENABLED env var
 * (default "true"); set to "false" once post-launch stability is confirmed.
 *
 * Role is "status" (polite) rather than "alert" because this is a persistent
 * informational notice, not a time-sensitive warning. Dismissal (when enabled)
 * is persisted in sessionStorage so the banner re-appears on the next login.
 */
export function BetaPaymentBanner({
  onDismiss,
  dismissible = false,
  className,
}: BetaPaymentBannerProps) {
  const { t } = useTranslation();

  // Audit fix M-LAUNCH-MODE (2026-04-26): default OFF for public launch.
  // The banner now only renders when the env var is explicitly "true" — so
  // a fresh deploy (no env var set) ships without the beta warning. To
  // re-enable temporarily during a controlled rollout, set the var to
  // "true" on Vercel.
  const flagRaw = (import.meta.env.VITE_PAYMENT_BETA_BANNER_ENABLED ?? "false")
    .toString()
    .toLowerCase();
  const enabled = flagRaw === "true";

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (!dismissible) return false;
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!enabled || dismissed) return null;

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
      } catch {
        // sessionStorage may be blocked (private mode); dismissal still works for this render.
      }
    }
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="status"
      aria-label={t("payment.vanilla.betaBannerLabel", "Bannière beta paiement")}
      className={cn(
        "rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900",
        "flex items-start gap-3",
        className,
      )}
    >
      <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <p className="flex-1 font-sans text-sm leading-relaxed">
        {t(
          "payment.vanilla.betaBannerText",
          "Les paiements Vanilla Pay sont en phase de test (beta). En cas de problème, contactez-nous via le support.",
        )}
      </p>
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("payment.vanilla.betaBannerDismiss", "Masquer")}
          className="shrink-0 rounded p-1 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
