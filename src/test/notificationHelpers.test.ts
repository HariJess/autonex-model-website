import { describe, it, expect } from "vitest";
import {
  formatNotificationTimestamp,
  isNotificationUnread,
  mapDbRowToNotification,
  mapDbRowToNotificationPreferences,
  notificationPreferencesToDbPatch,
} from "@/lib/notificationHelpers";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notification";

describe("formatNotificationTimestamp", () => {
  const now = new Date("2026-04-25T12:00:00Z");

  it("retourne « à l'instant » si moins d'une minute", () => {
    expect(formatNotificationTimestamp(new Date(now.getTime() - 30_000).toISOString(), now)).toBe("à l'instant");
  });

  it("retourne « il y a N min » sous l'heure", () => {
    expect(formatNotificationTimestamp(new Date(now.getTime() - 5 * 60_000).toISOString(), now)).toBe("il y a 5 min");
  });

  it("retourne « il y a N h » pour moins de 24h", () => {
    expect(formatNotificationTimestamp(new Date(now.getTime() - 3 * 3600_000).toISOString(), now)).toBe("il y a 3 h");
  });

  it("retourne « il y a N j » entre 1 et 6 jours", () => {
    expect(formatNotificationTimestamp(new Date(now.getTime() - 2 * 86400_000).toISOString(), now)).toBe("il y a 2 j");
  });

  it("retourne une date formatée au-delà de 7 jours", () => {
    const formatted = formatNotificationTimestamp(new Date(now.getTime() - 10 * 86400_000).toISOString(), now);
    expect(formatted).toMatch(/avril|mars/);
  });

  it("retourne chaîne vide pour null/undefined/invalid", () => {
    expect(formatNotificationTimestamp(null, now)).toBe("");
    expect(formatNotificationTimestamp(undefined, now)).toBe("");
    expect(formatNotificationTimestamp("not-a-date", now)).toBe("");
  });
});

describe("isNotificationUnread", () => {
  it("vrai si read_at et archived_at sont null", () => {
    expect(isNotificationUnread({ readAt: null, archivedAt: null })).toBe(true);
  });

  it("faux si read_at renseigné", () => {
    expect(isNotificationUnread({ readAt: "2026-04-25T10:00:00Z", archivedAt: null })).toBe(false);
  });

  it("faux si archived_at renseigné", () => {
    expect(isNotificationUnread({ readAt: null, archivedAt: "2026-04-25T10:00:00Z" })).toBe(false);
  });
});

describe("mapDbRowToNotification", () => {
  it("convertit snake_case → camelCase avec defaults robustes", () => {
    const row = {
      id: "n1",
      user_id: "u1",
      type: "listing_published" as const,
      category: "listings" as const,
      priority: "critical" as const,
      title: "Publiée !",
      body: "Votre annonce est en ligne",
      metadata: { listing_id: "abc" },
      action_url: "/annonce/abc",
      icon: "CheckCircle",
      read_at: null,
      archived_at: null,
      email_sent_at: null,
      created_at: "2026-04-25T10:00:00Z",
    };
    const notif = mapDbRowToNotification(row);
    expect(notif.id).toBe("n1");
    expect(notif.userId).toBe("u1");
    expect(notif.type).toBe("listing_published");
    expect(notif.actionUrl).toBe("/annonce/abc");
    expect(notif.icon).toBe("CheckCircle");
    expect(notif.metadata).toEqual({ listing_id: "abc" });
  });

  it("fallback icon Bell si icon null", () => {
    const row = {
      id: "n2",
      user_id: "u1",
      type: "system" as const,
      category: "system" as const,
      priority: "low" as const,
      title: "Test",
      body: null,
      metadata: null,
      action_url: null,
      icon: null,
      read_at: null,
      archived_at: null,
      email_sent_at: null,
      created_at: "2026-04-25T10:00:00Z",
    };
    const notif = mapDbRowToNotification(row);
    expect(notif.icon).toBe("Bell");
    expect(notif.metadata).toEqual({});
  });
});

describe("mapDbRowToNotificationPreferences", () => {
  it("convertit la row DB en camelCase", () => {
    const row = {
      user_id: "u1",
      listings_in_app: true,
      listings_email_immediate: true,
      listings_email_digest: false,
      payments_in_app: true,
      payments_email_immediate: true,
      payments_email_digest: false,
      activity_in_app: true,
      activity_email_immediate: false,
      activity_email_digest: true,
      searches_in_app: true,
      searches_email_immediate: false,
      searches_email_digest: true,
      system_in_app: true,
      system_email_immediate: false,
      system_email_digest: false,
      digest_frequency: "daily" as const,
      digest_time: "18:00:00",
      max_emails_per_day: 5,
    };
    const prefs = mapDbRowToNotificationPreferences(row);
    expect(prefs.userId).toBe("u1");
    expect(prefs.listingsInApp).toBe(true);
    expect(prefs.digestFrequency).toBe("daily");
    expect(prefs.digestTime).toBe("18:00:00");
  });
});

describe("notificationPreferencesToDbPatch", () => {
  it("ne produit que les clés fournies (patch partiel)", () => {
    const patch = notificationPreferencesToDbPatch({
      listingsEmailImmediate: false,
      digestFrequency: "weekly",
    });
    expect(patch).toEqual({
      listings_email_immediate: false,
      digest_frequency: "weekly",
    });
  });

  it("couvre toutes les clés quand on passe les defaults complets", () => {
    const patch = notificationPreferencesToDbPatch(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(patch.listings_in_app).toBe(true);
    expect(patch.payments_email_digest).toBe(false);
    expect(patch.digest_frequency).toBe("daily");
    expect(patch.max_emails_per_day).toBe(5);
  });

  it("renvoie objet vide pour patch vide", () => {
    expect(notificationPreferencesToDbPatch({})).toEqual({});
  });
});
