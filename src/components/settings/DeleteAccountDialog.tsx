import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestDeletion } from "@/hooks/useAccountDeletion";

type Step = "description" | "confirmation";
const CONFIRM_WORD = "SUPPRIMER";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const [step, setStep] = useState<Step>("description");
  const [typed, setTyped] = useState("");
  const mutation = useRequestDeletion();

  // Reset wizard state every time the dialog toggles so reopening always
  // starts on the description step with a blank input.
  useEffect(() => {
    if (!open) {
      setStep("description");
      setTyped("");
      mutation.reset();
    }
    // Intentionally exclude `mutation` from deps: TanStack Query returns
    // a NEW mutation object reference on every render; including it here
    // would create an infinite loop (setState -> re-render -> new mutation
    // ref -> effect re-fires). `mutation.reset()` is safe to call inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const typedTrimmed = typed.trim();
  const typedLooksPartial = typedTrimmed.length > 0 && typedTrimmed !== CONFIRM_WORD;
  const canConfirm = typedTrimmed === CONFIRM_WORD && !mutation.isPending;

  const handleConfirm = () => {
    if (!canConfirm) return;
    mutation.mutate(undefined, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="delete-account-dialog">
        {step === "description" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif">Supprimer mon compte ?</DialogTitle>
              <DialogDescription className="font-sans">
                Avant de confirmer, voici ce qui se passe :
              </DialogDescription>
            </DialogHeader>

            <ul className="list-disc pl-5 space-y-2 text-sm font-sans text-foreground">
              <li>Votre compte sera désactivé immédiatement.</li>
              <li>Vos annonces actives seront retirées du site.</li>
              <li>Vos données seront conservées 30 jours ; la demande reste annulable pendant cette période.</li>
              <li>Après 30 jours : anonymisation RGPD définitive.</li>
            </ul>

            <p className="text-xs font-sans text-muted-foreground">
              Conformément à nos obligations légales, certaines données comptables (transactions,
              factures) seront conservées de façon anonymisée.
            </p>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-sans">
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setStep("confirmation")}
                className="font-sans"
              >
                Continuer
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif">Confirmer la suppression</DialogTitle>
              <DialogDescription className="font-sans">
                Cette action est irréversible au bout de 30 jours. Pour confirmer, tapez{" "}
                <strong className="font-mono">{CONFIRM_WORD}</strong> ci-dessous.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm-input" className="font-sans text-sm">
                Tapez {CONFIRM_WORD}
              </Label>
              <Input
                id="delete-confirm-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="font-mono"
                disabled={mutation.isPending}
                data-testid="delete-confirm-input"
              />
              {typedLooksPartial ? (
                <p className="text-xs text-destructive font-sans">
                  Veuillez taper exactement {CONFIRM_WORD} pour continuer.
                </p>
              ) : null}
            </div>

            {mutation.isError ? (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {mutation.error?.message || "La demande de suppression a échoué. Veuillez réessayer."}
                </AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("description");
                  setTyped("");
                  mutation.reset();
                }}
                disabled={mutation.isPending}
                className="font-sans"
              >
                Retour
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="font-sans"
                data-testid="delete-confirm-button"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                    Envoi…
                  </>
                ) : (
                  "Confirmer la suppression"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
