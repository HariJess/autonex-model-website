import type { Notification } from "@/types/notification";
import { NotificationItem } from "./NotificationItem";

export type NotificationListProps = {
  notifications: Notification[];
  onNotificationClick?: (n: Notification) => void;
  onArchive?: (n: Notification) => void;
  showArchiveButton?: boolean;
  emptyMessage?: string;
  className?: string;
  maxHeightClass?: string;
};

export function NotificationList({
  notifications,
  onNotificationClick,
  onArchive,
  showArchiveButton = false,
  emptyMessage = "Aucune notification",
  maxHeightClass = "max-h-[24rem]",
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground font-sans">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto divide-y divide-border ${maxHeightClass}`}>
      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onClick={onNotificationClick}
          showArchiveButton={showArchiveButton}
          onArchive={onArchive}
        />
      ))}
    </div>
  );
}
