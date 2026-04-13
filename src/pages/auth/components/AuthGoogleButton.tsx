import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type AuthGoogleButtonProps = {
  disabled: boolean;
  label: string;
  hint: string;
  orLabel: string;
  onClick: () => void;
  icon: ReactNode;
};

export function AuthGoogleButton({
  disabled,
  label,
  hint,
  orLabel,
  onClick,
  icon,
}: AuthGoogleButtonProps) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        className="w-full font-sans gap-2 border-border bg-background hover:bg-muted min-h-11 touch-manipulation"
        onClick={onClick}
      >
        {icon}
        {label}
      </Button>
      <p className="text-xs text-center text-muted-foreground font-sans">{hint}</p>
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground font-sans">{orLabel}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

