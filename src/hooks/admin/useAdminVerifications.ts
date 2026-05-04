import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminVerificationStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected"
  | "expired"
  | "all";

export type AdminVerificationRow = {
  id: string;
  user_id: string;
  status: string;
  cin_front_path: string;
  cin_back_path: string;
  selfie_path: string;
  full_name: string;
  cin_number: string;
  date_of_birth: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  rejection_category: string | null;
  expires_at: string | null;
  credits_spent: number;
};

/**
 * Liste admin des verifications avec filtre status. Admin-only via RLS
 * (`admins_full_verif`). FIFO `submitted_at ASC` pour traiter les plus
 * anciennes en premier (équité user).
 */
export function useAdminVerifications(filter: AdminVerificationStatus = "pending", limit = 50) {
  return useQuery<AdminVerificationRow[]>({
    queryKey: ["admin-verifications", filter, limit],
    staleTime: 15_000,
    queryFn: async () => {
      let query = supabase
        .from("verifications")
        .select(
          "id, user_id, status, cin_front_path, cin_back_path, selfie_path, full_name, cin_number, date_of_birth, submitted_at, reviewed_at, reviewed_by, rejection_reason, rejection_category, expires_at, credits_spent",
        )
        .order("submitted_at", { ascending: filter === "pending" })
        .limit(limit);
      if (filter !== "all") {
        query = query.eq("status", filter);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminVerificationRow[];
    },
  });
}
