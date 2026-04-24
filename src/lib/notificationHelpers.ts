/**
 * Helpers purs utilisés par les hooks et composants de notifications (Lot 10.1).
 *
 * Gardés stateless / testables (pas d'imports React / Supabase client) pour
 * faciliter les tests unitaires. Les types de Row sont importés depuis le
 * fichier de types Supabase régénéré (Lot 10.1.5) — plus de duplication de
 * schéma en dur.
 */

import type { Database } from "@/integrations/supabase/types";
import type {
  Notification,
  NotificationPreferences,
} from "@/types/notification";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationPreferencesRow = Database["public"]["Tables"]["notification_preferences"]["Row"];
type NotificationPreferencesUpdate = Database["public"]["Tables"]["notification_preferences"]["Update"];

export function mapDbRowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    category: row.category,
    priority: row.priority,
    title: row.title,
    body: row.body,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    actionUrl: row.action_url,
    icon: row.icon ?? "Bell",
    readAt: row.read_at,
    archivedAt: row.archived_at,
    emailSentAt: row.email_sent_at,
    createdAt: row.created_at,
  };
}

export function mapDbRowToNotificationPreferences(
  row: NotificationPreferencesRow,
): NotificationPreferences {
  return {
    userId: row.user_id,
    listingsInApp: row.listings_in_app,
    listingsEmailImmediate: row.listings_email_immediate,
    listingsEmailDigest: row.listings_email_digest,
    paymentsInApp: row.payments_in_app,
    paymentsEmailImmediate: row.payments_email_immediate,
    paymentsEmailDigest: row.payments_email_digest,
    activityInApp: row.activity_in_app,
    activityEmailImmediate: row.activity_email_immediate,
    activityEmailDigest: row.activity_email_digest,
    searchesInApp: row.searches_in_app,
    searchesEmailImmediate: row.searches_email_immediate,
    searchesEmailDigest: row.searches_email_digest,
    systemInApp: row.system_in_app,
    systemEmailImmediate: row.system_email_immediate,
    systemEmailDigest: row.system_email_digest,
    // La contrainte CHECK en DB garantit l'une des 3 valeurs : narrow safe.
    digestFrequency: row.digest_frequency as NotificationPreferences["digestFrequency"],
    digestTime: row.digest_time,
    maxEmailsPerDay: row.max_emails_per_day,
  };
}

export function notificationPreferencesToDbPatch(
  prefs: Partial<NotificationPreferences>,
): NotificationPreferencesUpdate {
  const patch: NotificationPreferencesUpdate = {};
  if (prefs.listingsInApp !== undefined) patch.listings_in_app = prefs.listingsInApp;
  if (prefs.listingsEmailImmediate !== undefined) patch.listings_email_immediate = prefs.listingsEmailImmediate;
  if (prefs.listingsEmailDigest !== undefined) patch.listings_email_digest = prefs.listingsEmailDigest;
  if (prefs.paymentsInApp !== undefined) patch.payments_in_app = prefs.paymentsInApp;
  if (prefs.paymentsEmailImmediate !== undefined) patch.payments_email_immediate = prefs.paymentsEmailImmediate;
  if (prefs.paymentsEmailDigest !== undefined) patch.payments_email_digest = prefs.paymentsEmailDigest;
  if (prefs.activityInApp !== undefined) patch.activity_in_app = prefs.activityInApp;
  if (prefs.activityEmailImmediate !== undefined) patch.activity_email_immediate = prefs.activityEmailImmediate;
  if (prefs.activityEmailDigest !== undefined) patch.activity_email_digest = prefs.activityEmailDigest;
  if (prefs.searchesInApp !== undefined) patch.searches_in_app = prefs.searchesInApp;
  if (prefs.searchesEmailImmediate !== undefined) patch.searches_email_immediate = prefs.searchesEmailImmediate;
  if (prefs.searchesEmailDigest !== undefined) patch.searches_email_digest = prefs.searchesEmailDigest;
  if (prefs.systemInApp !== undefined) patch.system_in_app = prefs.systemInApp;
  if (prefs.systemEmailImmediate !== undefined) patch.system_email_immediate = prefs.systemEmailImmediate;
  if (prefs.systemEmailDigest !== undefined) patch.system_email_digest = prefs.systemEmailDigest;
  if (prefs.digestFrequency !== undefined) patch.digest_frequency = prefs.digestFrequency;
  if (prefs.digestTime !== undefined) patch.digest_time = prefs.digestTime;
  if (prefs.maxEmailsPerDay !== undefined) patch.max_emails_per_day = prefs.maxEmailsPerDay;
  return patch;
}

/**
 * Format relatif FR : « il y a 2 min », « il y a 3 h », « il y a 2 j »,
 * sinon date courte « 24 avril ».
 */
export function formatNotificationTimestamp(
  isoDate: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!isoDate) return "";
  const then = new Date(isoDate).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (diffSeconds < 60) return "à l'instant";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `il y a ${diffDays} j`;
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

export function isNotificationUnread(n: Pick<Notification, "readAt" | "archivedAt">): boolean {
  return n.readAt === null && n.archivedAt === null;
}
