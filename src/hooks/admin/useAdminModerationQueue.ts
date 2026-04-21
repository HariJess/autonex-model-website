import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ModerationQueueFilter = "new" | "reports" | "history" | "all";

export type ModerationQueueRow = Database["public"]["Functions"]["admin_moderation_queue"]["Returns"][number];

export const adminModerationQueueKey = (filter: ModerationQueueFilter) =>
  ["admin-moderation-queue", filter] as const;

export function useAdminModerationQueue(filter: ModerationQueueFilter) {
  return useQuery<ModerationQueueRow[]>({
    queryKey: adminModerationQueueKey(filter),
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_moderation_queue", {
        p_filter: filter,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as ModerationQueueRow[];
    },
  });
}
