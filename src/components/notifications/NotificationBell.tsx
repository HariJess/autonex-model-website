import { Bell } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationList } from "./NotificationList";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(10);
  const location = useLocation();

  // Pas d'animation pulse sur /publier (contexte concentration — Ali Lot 9).
  const isOnPublishPage = location.pathname.startsWith("/publier");
  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-navbar-foreground"
          aria-label={t("notifications.bellAriaLabel", { count: unreadCount })}
        >
          <Bell
            className={cn(
              "h-5 w-5",
              unreadCount > 0 && !isOnPublishPage && "animate-pulse",
            )}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {displayCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 p-0 max-w-[calc(100vw-2rem)]"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-sans font-semibold text-sm text-foreground">{t("notifications.title", "Notifications")}</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs font-sans text-primary hover:underline"
              onClick={() => void markAllAsRead()}
            >
              {t("notifications.markAllAsRead", "Tout marquer comme lu")}
            </button>
          )}
        </div>
        <NotificationList
          notifications={notifications}
          onNotificationClick={(n) => {
            void markAsRead(n.id);
            setOpen(false);
          }}
          emptyMessage={t("notifications.empty", "Aucune notification pour le moment")}
        />
        <div className="border-t px-4 py-2 flex items-center justify-between">
          <Link
            to="/notifications"
            className="text-sm font-sans text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            {t("notifications.viewAll", "Voir toutes les notifications")}
          </Link>
          <Link
            to="/settings/notifications"
            className="text-xs font-sans text-muted-foreground hover:text-foreground hover:underline"
            onClick={() => setOpen(false)}
          >
            {t("notifications.preferences")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
