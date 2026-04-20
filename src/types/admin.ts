import type { Database } from "@/integrations/supabase/types";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type ListingStatus = Database["public"]["Enums"]["listing_status"];

/**
 * Runtime-accurate shape returned by the admin_user_overview RPC.
 *
 * The Supabase type generator flags RETURNS TABLE columns as non-null, but
 * the underlying columns (suspended_reason, suspended_by, last_sign_in_at,
 * agency_id, etc.) can genuinely be NULL. This interface restores correct
 * nullability at the application boundary.
 */
export interface AdminUserOverview {
  user_id: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  agency_id: string | null;
  credits_balance: number | null;
  seller_type: string | null;
  suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_by: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface AdminListingRow {
  id: string;
  title: string | null;
  status: ListingStatus | null;
  price_mga: number | null;
  rejection_reason: string | null;
  created_at: string | null;
}

export type AdminCreditsLedgerRow =
  Database["public"]["Tables"]["credits_ledger"]["Row"];

export interface AdminUserDetailStats {
  totalListings: number;
  activeListings: number;
  currentCreditsBalance: number;
  totalTransactions: number;
}

export interface AdminUserDetailData {
  profile: AdminUserOverview;
  listings: AdminListingRow[];
  creditsLedger: AdminCreditsLedgerRow[];
  stats: AdminUserDetailStats;
}

export type AdminAuditAction =
  | "grant_credits"
  | "change_role"
  | "suspend_user"
  | "unsuspend_user"
  | "delete_user";

export interface GrantCreditsInput {
  userId: string;
  amount: number;
  reason: string;
}

export interface ChangeRoleInput {
  userId: string;
  newRole: UserRole;
}

export interface SuspendUserInput {
  userId: string;
  reason: string;
}

export interface UnsuspendUserInput {
  userId: string;
}

export interface DeleteUserInput {
  userId: string;
  confirmationEmail: string;
}

export const USER_ROLES: readonly UserRole[] = [
  "particulier",
  "agence",
  "promoteur",
  "admin",
] as const;

export const OWNER_SUSPENDED_PREFIX = "owner_suspended:";

export interface ParsedRejectionReason {
  ownerSuspended: boolean;
  detail: string | null;
}

export function parseRejectionReason(
  reason: string | null,
): ParsedRejectionReason {
  if (!reason) return { ownerSuspended: false, detail: null };
  if (reason.startsWith(OWNER_SUSPENDED_PREFIX)) {
    return {
      ownerSuspended: true,
      detail: reason.slice(OWNER_SUSPENDED_PREFIX.length).trim() || null,
    };
  }
  return { ownerSuspended: false, detail: reason };
}
