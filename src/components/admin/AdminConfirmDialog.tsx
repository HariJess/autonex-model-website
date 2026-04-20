import { useEffect, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AdminConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** If set, the Confirm button is disabled until the user types this exact string. */
  requireType?: string;
  requireTypeLabel?: ReactNode;
  isPending?: boolean;
  /** Disable confirm for reasons beyond requireType (e.g. form validation). */
  disabled?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  requireType,
  requireTypeLabel,
  isPending = false,
  disabled = false,
  onConfirm,
  children,
}: AdminConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const typeMatches =
    !requireType || typed.trim().toLowerCase() === requireType.trim().toLowerCase();
  const canConfirm = !disabled && !isPending && typeMatches;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif">{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="font-sans">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        {children ? <div className="space-y-3 font-sans">{children}</div> : null}

        {requireType ? (
          <div className="space-y-1 font-sans">
            <Label className="text-xs">
              {requireTypeLabel ?? (
                <>
                  Pour confirmer, tapez <strong>{requireType}</strong>
                </>
              )}
            </Label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel className="font-sans">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "font-sans",
              destructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
            disabled={!canConfirm}
            onClick={(e) => {
              e.preventDefault();
              if (canConfirm) onConfirm();
            }}
          >
            {isPending ? "En cours..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
