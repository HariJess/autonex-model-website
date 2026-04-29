import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type CookieConsentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: { analytics: boolean; functional: boolean };
  onSave: (next: { analytics: boolean; functional: boolean }) => void;
};

type CategoryRow = {
  id: "technical" | "analytics" | "functional" | "monitoring";
  labelKey: string;
  descriptionKey: string;
  /** When true, the switch is shown as ON and the user cannot change it. */
  locked: boolean;
  /** When true, the switch is shown as OFF and the user cannot change it (category currently not toggleable from UI). */
  lockedOff?: boolean;
};

const CATEGORIES: CategoryRow[] = [
  { id: "technical", labelKey: "cookies.technicalLabel", descriptionKey: "cookies.technicalDescription", locked: true },
  { id: "analytics", labelKey: "cookies.analyticsLabel", descriptionKey: "cookies.analyticsDescription", locked: false },
  { id: "functional", labelKey: "cookies.functionalLabel", descriptionKey: "cookies.functionalDescription", locked: false },
  { id: "monitoring", labelKey: "cookies.monitoringLabel", descriptionKey: "cookies.monitoringDescription", locked: true, lockedOff: false },
];

export function CookieConsentModal({ open, onOpenChange, initial, onSave }: CookieConsentModalProps) {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [functional, setFunctional] = useState(initial.functional);

  useEffect(() => {
    if (open) {
      setAnalytics(initial.analytics);
      setFunctional(initial.functional);
    }
  }, [open, initial.analytics, initial.functional]);

  const handleSave = () => {
    onSave({ analytics, functional });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sans">{t("cookies.preferencesTitle", "Préférences cookies")}</DialogTitle>
          <DialogDescription className="font-sans">
            {t("cookies.preferencesDescription", "Choisissez quelles catégories de cookies vous souhaitez autoriser. Vos choix sont modifiables à tout moment via le bouton \"Gérer mes cookies\" en pied de page.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            const isAnalytics = cat.id === "analytics";
            const isFunctional = cat.id === "functional";
            const checked = cat.locked ? !cat.lockedOff : isAnalytics ? analytics : isFunctional ? functional : false;
            const onCheckedChange = (next: boolean) => {
              if (cat.locked) return;
              if (isAnalytics) setAnalytics(next);
              if (isFunctional) setFunctional(next);
            };
            const label = t(cat.labelKey);
            return (
              <div
                key={cat.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-border p-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="font-sans text-sm font-semibold">{label}</Label>
                  <p className="text-xs font-sans text-muted-foreground leading-relaxed">{t(cat.descriptionKey)}</p>
                </div>
                <Switch
                  checked={checked}
                  onCheckedChange={onCheckedChange}
                  disabled={cat.locked}
                  aria-label={label}
                />
              </div>
            );
          })}
        </div>

        <p className="text-xs font-sans text-muted-foreground">
          {t("cookies.moreDetailsPrefix", "Plus de détails sur la page")}{" "}
          <Link to="/legal/cookies" className="text-primary hover:underline">
            {t("cookies.moreDetailsLink", "Cookies")}
          </Link>
          .
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-sans">
            {t("common.cancel", "Annuler")}
          </Button>
          <Button type="button" onClick={handleSave} className="font-sans">
            {t("cookies.saveChoices", "Enregistrer mes choix")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
