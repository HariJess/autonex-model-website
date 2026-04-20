import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AdminCreditsLedgerRow,
  AdminListingRow,
  AdminUserDetailData,
  AdminUserOverview,
} from "@/types/admin";

export const adminUserDetailQueryKey = (userId: string | undefined) =>
  ["admin-user-detail", userId] as const;

export function useAdminUserDetail(userId: string | undefined) {
  return useQuery<AdminUserDetailData>({
    queryKey: adminUserDetailQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error("userId is required");

      const [overviewRes, listingsRes, ledgerRes] = await Promise.all([
        supabase.rpc("admin_user_overview", { p_user_id: userId }),
        supabase
          .from("listings")
          .select("id, title, status, price_mga, rejection_reason, created_at")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("credits_ledger")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (overviewRes.error) throw new Error(overviewRes.error.message);
      if (listingsRes.error) throw new Error(listingsRes.error.message);
      if (ledgerRes.error) throw new Error(ledgerRes.error.message);

      const row = overviewRes.data?.[0];
      if (!row) throw new Error("Utilisateur introuvable.");

      const profile: AdminUserOverview = {
        user_id: row.user_id,
        email: row.email ?? null,
        role: row.role,
        full_name: row.full_name ?? null,
        phone: row.phone ?? null,
        whatsapp_phone: row.whatsapp_phone ?? null,
        agency_id: row.agency_id ?? null,
        credits_balance: row.credits_balance ?? null,
        seller_type: row.seller_type ?? null,
        suspended: Boolean(row.suspended),
        suspended_at: row.suspended_at ?? null,
        suspended_reason: row.suspended_reason ?? null,
        suspended_by: row.suspended_by ?? null,
        created_at: row.created_at ?? null,
        last_sign_in_at: row.last_sign_in_at ?? null,
      };

      const listings: AdminListingRow[] = (listingsRes.data ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        price_mga: l.price_mga,
        rejection_reason: l.rejection_reason,
        created_at: l.created_at,
      }));

      const creditsLedger: AdminCreditsLedgerRow[] = ledgerRes.data ?? [];

      return {
        profile,
        listings,
        creditsLedger,
        stats: {
          totalListings: listings.length,
          activeListings: listings.filter((l) => l.status === "active").length,
          currentCreditsBalance: profile.credits_balance ?? 0,
          totalTransactions: creditsLedger.length,
        },
      };
    },
  });
}
