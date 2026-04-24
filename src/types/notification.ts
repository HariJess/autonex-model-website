/**
 * Types côté frontend pour le système de notifications (Lot 10.1).
 *
 * Les types DB sont en snake_case ; on expose ici la version camelCase
 * consommée par les hooks et composants. La conversion se fait dans
 * `mapDbRowToNotification` (src/hooks/useNotifications.ts).
 */

export const NOTIFICATION_CATEGORIES = [
  "listings",
  "payments",
  "activity",
  "searches",
  "admin",
  "system",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationType =
  | "listing_published"
  | "listing_rejected"
  | "listing_expiring_soon"
  | "listing_expired"
  | "credits_purchased"
  | "credits_low"
  | "welcome"
  | "admin_moderation_needed"
  | "system";

export type NotificationPriority = "critical" | "high" | "normal" | "low";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  actionUrl: string | null;
  icon: string;
  readAt: string | null;
  archivedAt: string | null;
  emailSentAt: string | null;
  createdAt: string;
};

export type NotificationPreferences = {
  userId: string;
  listingsInApp: boolean;
  listingsEmailImmediate: boolean;
  listingsEmailDigest: boolean;
  paymentsInApp: boolean;
  paymentsEmailImmediate: boolean;
  paymentsEmailDigest: boolean;
  activityInApp: boolean;
  activityEmailImmediate: boolean;
  activityEmailDigest: boolean;
  searchesInApp: boolean;
  searchesEmailImmediate: boolean;
  searchesEmailDigest: boolean;
  systemInApp: boolean;
  systemEmailImmediate: boolean;
  systemEmailDigest: boolean;
  digestFrequency: "daily" | "weekly" | "never";
  digestTime: string;
  maxEmailsPerDay: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, "userId"> = {
  listingsInApp: true,
  listingsEmailImmediate: true,
  listingsEmailDigest: true,
  paymentsInApp: true,
  paymentsEmailImmediate: true,
  paymentsEmailDigest: false,
  activityInApp: true,
  activityEmailImmediate: false,
  activityEmailDigest: true,
  searchesInApp: true,
  searchesEmailImmediate: false,
  searchesEmailDigest: true,
  systemInApp: true,
  systemEmailImmediate: false,
  systemEmailDigest: false,
  digestFrequency: "daily",
  digestTime: "18:00:00",
  maxEmailsPerDay: 5,
};

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  listings: "Annonces",
  payments: "Paiements",
  activity: "Activité",
  searches: "Recherches sauvegardées",
  admin: "Administration",
  system: "Système",
};
