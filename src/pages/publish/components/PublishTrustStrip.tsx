import { ShieldCheck, Save, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Strip de réassurance compacte (mode embedded YAS uniquement) — remplace la
 * grosse aside `<PublishGuidanceAside>` (3 cards verticales) par une seule
 * ligne fine au-dessus du formulaire. Garde les 3 promesses clés
 * (modération / auto-save / parcours guidé) sans bouffer 200px de hauteur sur
 * mobile.
 */
export function PublishTrustStrip() {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex items-center justify-center gap-3 rounded-lg border border-border/40 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground sm:gap-4 sm:text-xs">
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <span>{t("yas.publish.trust.moderation", "Modération")}</span>
      </span>
      <span aria-hidden className="text-border">·</span>
      <span className="inline-flex items-center gap-1.5">
        <Save className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden />
        <span>{t("yas.publish.trust.autosave", "Auto-save")}</span>
      </span>
      <span aria-hidden className="text-border">·</span>
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
        <span>{t("yas.publish.trust.guided", "Parcours guidé")}</span>
      </span>
    </div>
  );
}
