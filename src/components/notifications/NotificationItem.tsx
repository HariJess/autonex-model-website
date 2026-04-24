import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Coins,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";
import { formatNotificationTimestamp, isNotificationUnread } from "@/lib/notificationHelpers";

const ICON_MAP: Record<string, LucideIcon> = {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Coins,
  Sparkles,
  AlertCircle,
  AlertTriangle,
};

const PRIORITY_CLASS: Record<Notification["priority"], string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-amber-500/10 text-amber-600",
  normal: "bg-primary/10 text-primary",
  low: "bg-muted text-muted-foreground",
};

export type NotificationItemProps = {
  notification: Notification;
  onClick?: (n: Notification) => void;
  /** Affiche un bouton « Archiver » à droite — désactivé par défaut dans le dropdown. */
  showArchiveButton?: boolean;
  onArchive?: (n: Notification) => void;
};

export function NotificationItem({
  notification,
  onClick,
  showArchiveButton,
  onArchive,
}: NotificationItemProps) {
  const unread = isNotificationUnread(notification);
  const Icon = ICON_MAP[notification.icon] ?? Bell;
  const content = (
    <>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-full shrink-0", PRIORITY_CLASS[notification.priority])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className={cn("text-sm font-sans truncate", unread && "font-semibold text-foreground")}>
            {notification.title}
          </p>
          {unread && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Non lue" />
          )}
        </div>
        {notification.body && (
          <p className="text-[13px] font-sans text-muted-foreground line-clamp-2 mt-0.5">
            {notification.body}
          </p>
        )}
        <p className="text-[11px] font-sans text-muted-foreground mt-1">
          {formatNotificationTimestamp(notification.createdAt)}
        </p>
      </div>
      {showArchiveButton && onArchive && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onArchive(notification);
          }}
          className="self-center text-xs font-sans text-muted-foreground hover:text-foreground underline"
        >
          Archiver
        </button>
      )}
    </>
  );

  const classes = cn(
    "flex items-start gap-3 px-4 py-3 w-full text-left transition-colors",
    unread ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40",
  );

  if (notification.actionUrl) {
    return (
      <Link
        to={notification.actionUrl}
        className={classes}
        onClick={() => onClick?.(notification)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={() => onClick?.(notification)}>
      {content}
    </button>
  );
}
