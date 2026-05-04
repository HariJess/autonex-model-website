import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Verification record la plus récente de l'utilisateur courant.
 * Retourne null si jamais soumis. Utilisé par VerificationStatusCard
 * + page /verification pour décider du variant à afficher.
 */
export type MyVerificationRow = {
  id: string;
  status: "pending" | "reviewing" | "approved" | "rejected" | "expired";
  submitted_at: string;
  reviewed_at: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  rejection_category: string | null;
};

export function useMyVerification() {
  const { user } = useAuth();
  return useQuery<MyVerificationRow | null>({
    queryKey: ["my-verification", user?.id ?? null],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<MyVerificationRow | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("verifications")
        .select(
          "id, status, submitted_at, reviewed_at, expires_at, rejection_reason, rejection_category",
        )
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as MyVerificationRow | null) ?? null;
    },
  });
}
