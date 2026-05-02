import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { mapDbRowToNotification } from "@/lib/notificationHelpers";
import type { Notification } from "@/types/notification";

/**
 * Hook de lecture des notifications utilisateur (Lot 10.1).
 *
 * - Liste paginée (`limit`) + unread count (RPC dédiée) chargés via Tanstack
 *   Query. Cache cross-render + dédup automatique par queryKey.
 * - Realtime postgres_changes : un event invalide les 2 queries ; Tanstack
 *   dédupe les invalidations rapprochées → un seul refetch combiné même si
 *   plusieurs events arrivent dans la même tick (cas typique au boot quand
 *   `send_welcome_notification_if_needed` INSERT une notif et déclenche
 *   immédiatement un event Realtime).
 * - Actions (markAsRead / markAllAsRead / archive) : useMutation + invalidate
 *   au succès. Pas d'optimistic update dans cette passe (PR séparé candidat).
 *
 * Hotfix Sentry ee5c93534c2a4a808aa06838962a2c77 (channel name unique +
 * try/catch défensif + cleanup) : strictement préservé sous le refacto.
 *
 * Historique : avant la migration Tanstack (2026-05-02), le hook utilisait
 * useState + useEffect direct, avec un full refetch à chaque event Realtime,
 * ce qui causait 4× SELECT notifications + 4× RPC count au boot.
 */

export const notificationsListQueryKey = (userId: string | null | undefined, limit: number) =>
  ["notifications", "list", userId ?? null, limit] as const;

export const notificationsUnreadCountQueryKey = (userId: string | null | undefined) =>
  ["notifications", "unread-count", userId ?? null] as const;

async function fetchNotificationsList(userId: string, limit: number): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDbRowToNotification);
}

async function fetchUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_unread_notifications_count");
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}

type UseNotificationsReturn = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
  /**
   * @deprecated No runtime consumer found at refacto time. Kept for API stability.
   * If still unused after 6 months, candidate for removal.
   */
  refetch: () => Promise<void>;
};

export function useNotifications(limit: number = 20): UseNotificationsReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const welcomeCheckedRef = useRef<string | null>(null);
  const userId = user?.id ?? null;

  // Lot 10.1 — Déclenchement de la notif de bienvenue une fois par user.
  // La RPC est idempotente (flag `profiles.welcome_notification_sent`).
  useEffect(() => {
    if (!user) return;
    if (welcomeCheckedRef.current === user.id) return;
    welcomeCheckedRef.current = user.id;
    void supabase.rpc("send_welcome_notification_if_needed");
  }, [user]);

  const listQuery = useQuery({
    queryKey: notificationsListQueryKey(userId, limit),
    queryFn: () =>
      userId ? fetchNotificationsList(userId, limit) : Promise.resolve<Notification[]>([]),
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const unreadCountQuery = useQuery({
    queryKey: notificationsUnreadCountQueryKey(userId),
    queryFn: () => (userId ? fetchUnreadCount() : Promise.resolve(0)),
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // Hotfix Sentry issue ee5c93534c2a4a808aa06838962a2c77 :
  // Un nom de channel déterministe (`notifications:${user.id}`) entre en
  // collision avec le registre interne supabase-js quand le useEffect
  // re-run : `removeChannel` est async, et `supabase.channel(sameName)`
  // renvoie un channel fantôme déjà « subscribed ». Appeler `.on()` dessus
  // throw synchronement "cannot add postgres_changes callbacks … after
  // subscribe()" et remonte jusqu'à l'ErrorBoundary.
  //
  // Fix :
  //  1) Nom unique par montage (suffixe `Date.now()`) pour forcer un
  //     nouveau channel à chaque run.
  //  2) try/catch défensif : si le setup Realtime échoue (pour n'importe
  //     quelle raison), la page reste fonctionnelle en mode REST seul.
  useEffect(() => {
    if (!user) return;

    const channelName = `notifications:${user.id}:${Date.now()}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Invalide les 2 queries d'un coup. Tanstack dédupe les
            // invalidations rapprochées → un seul refetch combiné (au lieu
            // d'un fetch+RPC complet par event Realtime comme avant).
            void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          },
        )
        .subscribe();
    } catch (err) {
      // Degraded mode : on continue sans Realtime, le fetch REST couvre
      // les chargements. Ne casse pas la page.
      // eslint-disable-next-line no-console
      console.warn("[useNotifications] realtime subscription failed", err);
      return;
    }

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [user, queryClient]);

  const { mutateAsync: markAsReadMutate } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("mark_notification_read", {
        p_notification_id: id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const { mutateAsync: markAllAsReadMutate } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_all_notifications_read");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const { mutateAsync: archiveMutate } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("archive_notification", {
        p_notification_id: id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAsRead = useCallback(
    async (id: string) => {
      await markAsReadMutate(id);
    },
    [markAsReadMutate],
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutate();
  }, [markAllAsReadMutate]);

  const archive = useCallback(
    async (id: string) => {
      await archiveMutate(id);
    },
    [archiveMutate],
  );

  const { refetch: refetchList } = listQuery;
  const { refetch: refetchUnreadCount } = unreadCountQuery;
  const refetch = useCallback(async () => {
    await Promise.all([refetchList(), refetchUnreadCount()]);
  }, [refetchList, refetchUnreadCount]);

  return {
    notifications: listQuery.data ?? [],
    unreadCount: unreadCountQuery.data ?? 0,
    // Preserve historical semantics : `loading` est true uniquement pendant
    // le 1er chargement quand un user est logged-in. Reste false pour les
    // utilisateurs anonymes (pas de fetch) et pour les refetch de fond.
    loading: listQuery.isPending && !!userId,
    markAsRead,
    markAllAsRead,
    archive,
    refetch,
  };
}
