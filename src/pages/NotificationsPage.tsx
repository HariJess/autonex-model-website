import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NotificationList } from "@/components/notifications/NotificationList";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABEL_KEYS,
  type NotificationCategory,
} from "@/types/notification";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | NotificationCategory;
type StatusFilter = "all" | "unread";

const NotificationsPage = () => {
  const { t } = useTranslation();
  const { notifications, loading, markAsRead, markAllAsRead, archive, unreadCount } = useNotifications(100);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
      if (statusFilter === "unread" && n.readAt !== null) return false;
      return true;
    });
  }, [notifications, categoryFilter, statusFilter]);

  return (
    <>
      <Helmet>
        <title>{t("notifications.title", "Notifications")} — AutoNex</title>
      </Helmet>
      <Header />
      <div className="container mx-auto max-w-3xl py-6 md:py-8 px-4">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-sans text-2xl md:text-3xl font-bold">{t("notifications.title", "Notifications")}</h1>
            <p className="text-sm text-muted-foreground font-sans mt-1">
              {unreadCount > 0
                ? t("notifications.unreadCount", { count: unreadCount })
                : t("notifications.allCaughtUp", "Tout est à jour")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => void markAllAsRead()}>
                {t("notifications.markAllAsRead", "Tout marquer comme lu")}
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/settings/notifications">{t("notifications.preferences")}</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            className={cn(
              "text-xs font-sans px-3 py-1.5 rounded-full border",
              statusFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted/40",
            )}
            onClick={() => setStatusFilter("all")}
          >
            {t("notifications.filterAll", "Toutes")}
          </button>
          <button
            type="button"
            className={cn(
              "text-xs font-sans px-3 py-1.5 rounded-full border",
              statusFilter === "unread"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted/40",
            )}
            onClick={() => setStatusFilter("unread")}
          >
            {t("notifications.filterUnread", "Non lues")}
          </button>
          <span className="w-px bg-border mx-1" aria-hidden />
          <button
            type="button"
            className={cn(
              "text-xs font-sans px-3 py-1.5 rounded-full border",
              categoryFilter === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-background hover:bg-muted/40",
            )}
            onClick={() => setCategoryFilter("all")}
          >
            {t("notifications.filterAllCategories", "Toutes catégories")}
          </button>
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={cn(
                "text-xs font-sans px-3 py-1.5 rounded-full border",
                categoryFilter === cat
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background hover:bg-muted/40",
              )}
              onClick={() => setCategoryFilter(cat)}
            >
              {t(NOTIFICATION_CATEGORY_LABEL_KEYS[cat])}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground font-sans">
              {t("common.loading", "Chargement...")}
            </div>
          ) : (
            <NotificationList
              notifications={filtered}
              onNotificationClick={(n) => void markAsRead(n.id)}
              onArchive={(n) => void archive(n.id)}
              showArchiveButton
              emptyMessage={
                statusFilter === "unread"
                  ? t("notifications.emptyUnread", "Aucune notification non lue")
                  : t("notifications.emptyCategory", "Aucune notification pour cette catégorie")
              }
              maxHeightClass="max-h-none"
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default NotificationsPage;
