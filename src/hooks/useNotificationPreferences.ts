import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  mapDbRowToNotificationPreferences,
  notificationPreferencesToDbPatch,
} from "@/lib/notificationHelpers";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/types/notification";

type UseNotificationPreferencesReturn = {
  preferences: NotificationPreferences | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  update: (patch: Partial<NotificationPreferences>) => Promise<void>;
  resetDefaults: () => Promise<void>;
};

/**
 * Hook de lecture/écriture des préférences de notifications de l'user courant.
 *
 * À l'inscription, le trigger Supabase `on_auth_user_created_notification_prefs`
 * pose déjà une row avec les defaults. Pour les users pré-Lot 10.1, on fait un
 * INSERT explicite idempotent côté client si le SELECT renvoie vide.
 *
 * Historique : les casts `as unknown as` et le wrapper `supabaseExtended` ont
 * été retirés au Lot 10.1.5 suite à la régénération des types Supabase
 * (Sentry issue 5602e03b). Les appels `.from()` sont maintenant typés et
 * binding `this` préservé naturellement.
 */
export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: readError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError) {
      setError(readError.message);
      setLoading(false);
      return;
    }

    if (data) {
      setPreferences(mapDbRowToNotificationPreferences(data));
      setLoading(false);
      return;
    }

    // Fallback : la row n'existe pas encore (user pré-Lot 10.1). On la crée
    // avec les defaults — idempotent grâce à la contrainte PRIMARY KEY.
    const defaultsPayload = {
      user_id: user.id,
      ...notificationPreferencesToDbPatch({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        userId: user.id,
      }),
    };
    const { data: inserted, error: insertError } = await supabase
      .from("notification_preferences")
      .insert(defaultsPayload)
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setPreferences(mapDbRowToNotificationPreferences(inserted));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      if (!user) return;
      setSaving(true);
      setError(null);
      const dbPatch = notificationPreferencesToDbPatch(patch);
      const { data, error: updateError } = await supabase
        .from("notification_preferences")
        .update({ ...dbPatch, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      if (data) {
        setPreferences(mapDbRowToNotificationPreferences(data));
      }
      setSaving(false);
    },
    [user],
  );

  const resetDefaults = useCallback(async () => {
    await update({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  }, [update]);

  return { preferences, loading, saving, error, update, resetDefaults };
}
