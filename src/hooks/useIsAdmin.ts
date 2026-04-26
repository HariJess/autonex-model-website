import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Audit fix M4 — server-side admin check via the immonex_is_admin() RPC.
 *
 * The client-side `profile.role === "admin"` flag exposed by AuthContext
 * is a soft pre-filter (still useful for non-critical UI cosmetics:
 * "skip lead form for admins/owners", "show admin moderation hint").
 * The source of truth for granting access to /admin/* routes is now THIS
 * hook — a user who manipulates their local profile state to flip
 * `role: "admin"` will see AdminRoute reject them because the RPC,
 * gated by SECURITY DEFINER + auth.uid(), returns false.
 *
 * RLS policies remain the ultimate gate on actual data writes; this
 * hook closes the UI-information-disclosure surface.
 *
 * Caching:
 *   - 5 min staleTime: an admin's privilege flag changes very rarely
 *     (manual SQL UPDATE), no need to re-query on every navigation.
 *   - 1 retry: the RPC is essentially a SELECT on auth schema, retries
 *     beyond 1 just delay the inevitable failure.
 *   - enabled: !!user → never fires for anonymous visitors.
 *
 * Fail-closed: callers should treat `isError` as "not admin", never as
 * "couldn't determine, default to admin". See AdminRoute.tsx.
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["isAdmin", user?.id ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("immonex_is_admin");
      if (error) throw error;
      return data === true;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
