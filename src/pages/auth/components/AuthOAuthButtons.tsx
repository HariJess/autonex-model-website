import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type AuthOAuthButtonsProps = {
  disabled: boolean;
  hint: string;
  orLabel: string;
  googleLabel: string;
  facebookLabel: string;
  googleIcon: ReactNode;
  facebookIcon: ReactNode;
  onGoogle: () => void;
  onFacebook: () => void;
};

/**
 * 2-column grid of OAuth providers (Google + Facebook), styled as compact
 * outline buttons with a brand icon and a short label. Mirrors the layout
 * pattern used by Stripe / Notion / Linear / Vercel when multiple providers
 * are visible side-by-side: the verb ("Continuer avec…") is implicit, so we
 * just render the brand name.
 *
 * Followed by the provider hint (single line) and the "ou" separator that
 * leads into the email/password form below.
 */
export function AuthOAuthButtons({
  disabled,
  hint,
  orLabel,
  googleLabel,
  facebookLabel,
  googleIcon,
  facebookIcon,
  onGoogle,
  onFacebook,
}: AuthOAuthButtonsProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full font-sans gap-2 border-border bg-background hover:bg-muted min-h-11 touch-manipulation"
          onClick={onGoogle}
        >
          {googleIcon}
          {googleLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full font-sans gap-2 border-border bg-background hover:bg-muted min-h-11 touch-manipulation"
          onClick={onFacebook}
        >
          {facebookIcon}
          {facebookLabel}
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground font-sans">{hint}</p>
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground font-sans">{orLabel}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
