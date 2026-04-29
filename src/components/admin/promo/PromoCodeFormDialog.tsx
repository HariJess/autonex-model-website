import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAdminPromoActions } from "@/hooks/admin/useAdminPromoCodes";
import type { PromoCode, PromoCodeType } from "@/types/promo";

interface PromoCodeFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  target: PromoCode | null;
  onOpenChange: (open: boolean) => void;
}

const CODE_PATTERN = /^[A-Z0-9-]+$/;

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function PromoCodeFormDialog({
  open,
  mode,
  target,
  onOpenChange,
}: PromoCodeFormDialogProps) {
  const { createPromo, updatePromo } = useAdminPromoActions();
  const isEdit = mode === "edit" && target !== null;

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PromoCodeType>("percentage");
  const [percentageOff, setPercentageOff] = useState("");
  const [bonusCredits, setBonusCredits] = useState("");
  const [unlimitedRedemptions, setUnlimitedRedemptions] = useState(true);
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [onePerUser, setOnePerUser] = useState(false);
  const [permanent, setPermanent] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (isEdit && target) {
      setCode(target.code);
      setDescription(target.description ?? "");
      setType(target.type);
      setPercentageOff(target.percentage_off?.toString() ?? "");
      setBonusCredits(target.bonus_credits?.toString() ?? "");
      setUnlimitedRedemptions(target.max_redemptions == null);
      setMaxRedemptions(target.max_redemptions?.toString() ?? "");
      setOnePerUser(target.one_per_user);
      setPermanent(target.expires_at == null);
      setExpiresAt(toDateInputValue(target.expires_at));
      setActive(target.active);
    } else {
      setCode("");
      setDescription("");
      setType("percentage");
      setPercentageOff("");
      setBonusCredits("");
      setUnlimitedRedemptions(true);
      setMaxRedemptions("");
      setOnePerUser(false);
      setPermanent(true);
      setExpiresAt("");
      setActive(true);
    }
  }, [open, isEdit, target]);

  const codeTrimmed = code.trim().toUpperCase();
  const codeValid =
    codeTrimmed.length > 0 &&
    codeTrimmed.length <= 50 &&
    CODE_PATTERN.test(codeTrimmed);

  const percentageValue = Number.parseInt(percentageOff, 10);
  const percentageValid =
    Number.isFinite(percentageValue) &&
    percentageValue >= 1 &&
    percentageValue <= 100;

  const bonusValue = Number.parseInt(bonusCredits, 10);
  const bonusValid = Number.isFinite(bonusValue) && bonusValue > 0;

  const typeFieldsValid =
    type === "percentage" ? percentageValid : bonusValid;

  const maxValue = Number.parseInt(maxRedemptions, 10);
  const maxValid =
    unlimitedRedemptions ||
    (Number.isFinite(maxValue) &&
      maxValue > 0 &&
      (!isEdit || !target || maxValue >= target.times_redeemed));

  const expiresAtValid = permanent || expiresAt.length > 0;

  const canSubmit =
    (isEdit || codeValid) &&
    (isEdit || typeFieldsValid) &&
    maxValid &&
    expiresAtValid;

  const isPending = createPromo.isPending || updatePromo.isPending;

  const handleSubmit = () => {
    const maxRed = unlimitedRedemptions ? null : maxValue;
    const expAt = permanent ? null : new Date(expiresAt).toISOString();

    if (isEdit && target) {
      updatePromo.mutate(
        {
          id: target.id,
          description: description.trim() || null,
          max_redemptions: maxRed,
          one_per_user: onePerUser,
          expires_at: expAt,
          applicable_pack_ids: target.applicable_pack_ids,
          active,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createPromo.mutate(
        {
          code: codeTrimmed,
          description: description.trim() || null,
          type,
          percentage_off: type === "percentage" ? percentageValue : null,
          bonus_credits: type === "bonus_credits" ? bonusValue : null,
          max_redemptions: maxRed,
          one_per_user: onePerUser,
          expires_at: expAt,
          applicable_pack_ids: null,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sans">
            {isEdit ? `Modifier ${target?.code}` : "Nouveau code promo"}
          </DialogTitle>
          <DialogDescription className="font-sans">
            {isEdit
              ? "Le code, le type et la valeur de réduction sont immuables. Pour les changer, crée un nouveau code et désactive l'ancien."
              : "Créer un code promo applicable à l'achat de packs de crédits."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <Label htmlFor="promo-code">Code</Label>
            <Input
              id="promo-code"
              placeholder="LAUNCH20"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isEdit}
              maxLength={50}
              autoComplete="off"
              spellCheck={false}
            />
            {!isEdit ? (
              <p className="text-xs text-muted-foreground">
                Lettres majuscules, chiffres et tirets uniquement. 50 caractères max.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="promo-description">Description (optionnelle)</Label>
            <Textarea
              id="promo-description"
              placeholder="Campagne de lancement — partenariat presse"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Type de réduction</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as PromoCodeType)}
              disabled={isEdit}
              className="space-y-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="percentage" id="type-percentage" />
                <Label htmlFor="type-percentage" className="font-normal">
                  Pourcentage sur le prix
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="bonus_credits" id="type-bonus" />
                <Label htmlFor="type-bonus" className="font-normal">
                  Crédits bonus
                </Label>
              </div>
            </RadioGroup>
          </div>

          {type === "percentage" ? (
            <div className="space-y-1.5">
              <Label htmlFor="promo-percentage">Réduction (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="promo-percentage"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={percentageOff}
                  onChange={(e) => setPercentageOff(e.target.value)}
                  disabled={isEdit}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="promo-bonus">Crédits bonus</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="promo-bonus"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={bonusCredits}
                  onChange={(e) => setBonusCredits(e.target.value)}
                  disabled={isEdit}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">crédits</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Limite globale d'utilisations</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="promo-unlimited"
                checked={unlimitedRedemptions}
                onCheckedChange={(v) => setUnlimitedRedemptions(v === true)}
              />
              <Label htmlFor="promo-unlimited" className="font-normal">
                Illimité
              </Label>
            </div>
            {!unlimitedRedemptions ? (
              <Input
                type="number"
                inputMode="numeric"
                min={isEdit && target ? target.times_redeemed : 1}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="ex: 100"
                className="w-32"
              />
            ) : null}
            {isEdit && target && !unlimitedRedemptions ? (
              <p className="text-xs text-muted-foreground">
                Déjà utilisé : {target.times_redeemed}. La nouvelle limite ne peut pas être inférieure.
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="promo-one-per-user"
              checked={onePerUser}
              onCheckedChange={(v) => setOnePerUser(v === true)}
            />
            <Label htmlFor="promo-one-per-user" className="font-normal">
              Une seule utilisation par utilisateur
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Date d'expiration</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="promo-permanent"
                checked={permanent}
                onCheckedChange={(v) => setPermanent(v === true)}
              />
              <Label htmlFor="promo-permanent" className="font-normal">
                Permanent (pas d'expiration)
              </Label>
            </div>
            {!permanent ? (
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-48"
              />
            ) : null}
          </div>

          {isEdit ? (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Checkbox
                id="promo-active"
                checked={active}
                onCheckedChange={(v) => setActive(v === true)}
              />
              <Label htmlFor="promo-active" className="font-normal">
                Code actif
              </Label>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="font-sans"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="font-sans"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              "Enregistrer"
            ) : (
              "Créer le code"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PromoCodeFormDialog;
