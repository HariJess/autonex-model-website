import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

export function NotificationsSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h2 className="font-sans text-2xl font-bold">{t("account.notifications.title", "Notifications")}</h2>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <Bell className="mx-auto h-8 w-8 text-muted-foreground/70" aria-hidden />
        <p className="mt-3 font-sans text-sm font-medium text-foreground">{t("account.notifications.comingSoon", "Bientôt disponible")}</p>
        <p className="mt-1 font-sans text-xs text-muted-foreground">
          {t("account.notifications.comingSoonDesc", "Préférences email et WhatsApp (nouveautés, réponses aux annonces, alertes modération).")}
        </p>
      </div>
    </div>
  );
}
