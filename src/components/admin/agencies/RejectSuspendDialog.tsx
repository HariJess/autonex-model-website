import { useEffect, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RejectSuspendDialogProps {
  open: boolean;
  mode: "reject" | "suspend";
  agencyName: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function RejectSuspendDialog({
  open,
  mode,
  agencyName,
  isPending,
  onConfirm,
  onOpenChange,
}: RejectSuspendDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= 10;
  const title = mode === "reject" ? "Rejeter l'agence" : "Suspendre l'agence";
  const confirmLabel = mode === "reject" ? "Rejeter" : "Suspendre";

  return (
    <AdminConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        <>
          L'agence <strong>{agencyName}</strong> ne sera plus visible publiquement
          (décision admin). Donne une raison (≥ 10 caractères).
        </>
      }
      confirmLabel={confirmLabel}
      destructive
      isPending={isPending}
      disabled={!valid}
      onConfirm={() => onConfirm(trimmed)}
    >
      <div className="space-y-1">
        <Label htmlFor="reject-reason" className="text-xs">
          Raison (min 10 caractères)
        </Label>
        <Textarea
          id="reject-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex : documents légaux manquants (NIF, STAT)"
        />
        <p className="text-xs text-muted-foreground">{trimmed.length} / 10</p>
      </div>
    </AdminConfirmDialog>
  );
}
