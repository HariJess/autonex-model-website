/**
 * Types côté frontend pour le système de notifications (Lot 10.1).
 *
 * Les types DB sont en snake_case ; on expose ici la version camelCase
 * consommée par les hooks et composants. La conversion se fait dans
 * `mapDbRowToNotification` (src/hooks/useNotifications.ts).
 *
 * PROMPT 4 (2026-05-05) : NotificationType passe d'un union manuel (9 valeurs)
 * à `Database['public']['Enums']['notification_type']` (auto-sync avec types
 * regen). Les 13 nouvelles valeurs ajoutées par PROMPT 1 (listing_expiring_7d/3d/1d,
 * listing_renewed, boost_ending_1d/ended, credits_grant/expiring_30d/expired,
 * verif_approved/rejected, milestone_50_views/10_contacts) sont automatiquement
 * couvertes — plus de drift TS.
 */

import type { Database } from "@/integrations/supabase/types";

export const NOTIFICATION_CATEGORIES = [
  "listings",
  "payments",
  "activity",
  "searches",
  "admin",
  "system",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationType = Database["public"]["Enums"]["notification_type"];

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

export const NOTIFICATION_CATEGORY_LABEL_KEYS: Record<NotificationCategory, string> = {
  listings: "notifications.categoryListings",
  payments: "notifications.categoryPayments",
  activity: "notifications.categoryActivity",
  searches: "notifications.categorySearches",
  admin: "notifications.categoryAdmin",
  system: "notifications.categorySystem",
};
