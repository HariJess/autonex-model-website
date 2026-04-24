import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { mapDbRowToNotification } from "@/lib/notificationHelpers";
import type { Notification } from "@/types/notification";

/**
 * Hook de lecture des notifications utilisateur (Lot 10.1).
 *
 * - Fetch initial + refetch sur tout event Realtime sur la table `notifications`
 *   filtré par `user_id`.
 * - Expose `unreadCount` (via RPC dédiée pour éviter un count manuel sur le
 *   buffer limité).
 * - Actions : markAsRead, markAllAsRead, archive — toutes via RPCs serveur qui
 *   appliquent la RLS côté DB.
 */

// Hotfix Sentry issue 5602e03b :
// Cf. `useNotificationPreferences.ts` pour le contexte. On cast le client
// ENTIER (préserve le `this`) plutôt que d'extraire `supabase.from` comme
// méthode détachée, ce qui cassait `this.rest` à l'intérieur de supabase-js.
//
// TODO Lot 10.1.5 : régénérer les types Supabase
// `npx supabase gen types typescript --project-id wtkedamrmtvdoippqanc`
// pour supprimer ce cast as unknown as.
const supabaseExtended = supabase as unknown as {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

type UseNotificationsReturn = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
};

export function useNotifications(limit: number = 20): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const welcomeCheckedRef = useRef<string | null>(null);

  // Lot 10.1 — Déclenchement de la notif de bienvenue une fois par user.
  // La RPC est idempotente (flag `profiles.welcome_notification_sent`).
  useEffect(() => {
    if (!user) return;
    if (welcomeCheckedRef.current === user.id) return;
    welcomeCheckedRef.current = user.id;
    void supabase.rpc("send_welcome_notification_if_needed" as never);
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const { data } = await supabaseExtended
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    const rows = Array.isArray(data) ? (data as unknown as Parameters<typeof mapDbRowToNotification>[0][]) : [];
    setNotifications(rows.map(mapDbRowToNotification));

    const { data: countData } = await supabase.rpc(
      "get_unread_notifications_count" as never,
    );
    const count = typeof countData === "number" ? countData : 0;
    setUnreadCount(count);

    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.rpc("mark_notification_read" as never, {
      p_notification_id: id,
    } as never);
    await fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    await supabase.rpc("mark_all_notifications_read" as never);
    await fetchNotifications();
  }, [fetchNotifications]);

  const archive = useCallback(async (id: string) => {
    await supabase.rpc("archive_notification" as never, {
      p_notification_id: id,
    } as never);
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    archive,
    refetch: fetchNotifications,
  };
}
