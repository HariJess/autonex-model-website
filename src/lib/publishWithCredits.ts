import { supabase } from "@/integrations/supabase/client";
import { wrapRpc } from "@/lib/monitoring";

export type PublishWithCreditsErrorCode =
  | "not_authenticated"
  | "listing_not_found"
  | "not_owner"
  | "invalid_listing_status"
  | "insufficient_credits"
  | "already_published"
  | "unknown";

/**
 * Statuts finaux légitimes renvoyés par la RPC `publish_listing_with_credits`.
 * - `active` : dealer vérifié (fast-track sans modération).
 * - `pending_review` : particulier ou compte non-dealer (modération manuelle).
 * Voir migration `20260420190000_moderation_triggers.sql` pour la logique DB.
 */
export const ACCEPTED_FINAL_STATUSES = ["active", "pending_review"] as const;
export type AcceptedFinalStatus = (typeof ACCEPTED_FINAL_STATUSES)[number];

export type PublishWithCreditsSuccess = {
  ok: true;
  listingId: string;
  finalStatus: AcceptedFinalStatus;
  spentCredits: number;
  message: string;
};

export type PublishWithCreditsFailure = {
  ok: false;
  code: PublishWithCreditsErrorCode;
  message: string;
};

export function isPublishWithCreditsFailure(
  result: PublishWithCreditsSuccess | PublishWithCreditsFailure,
): result is PublishWithCreditsFailure {
  return result.ok === false;
}

type RpcPublishPayload = {
  ok?: boolean;
  listing_id?: string;
  status?: string;
  spent_credits?: number;
  message?: string;
} | null;

export function mapPublishWithCreditsError(raw: string): PublishWithCreditsErrorCode {
  const value = raw.toLowerCase();
  if (value.includes("not_authenticated")) return "not_authenticated";
  if (value.includes("listing_not_found")) return "listing_not_found";
  if (value.includes("not_owner")) return "not_owner";
  if (value.includes("invalid_listing_status")) return "invalid_listing_status";
  if (value.includes("already_published")) return "already_published";
  if (value.includes("insufficient_credits")) return "insufficient_credits";
  return "unknown";
}

export function parsePublishWithCreditsPayload(
  data: RpcPublishPayload,
  fallbackListingId: string,
): PublishWithCreditsSuccess | null {
  if (!data || data.ok !== true) return null;
  // Lot 9.1e — Le statut final légitime est `active` (dealer fast-track)
  // OU `pending_review` (particulier → modération manuelle). Avant ce fix,
  // seul `active` était accepté, ce qui faisait paraître les publications
  // particulier comme des échecs alors qu'elles avaient réussi en DB.
  if (!ACCEPTED_FINAL_STATUSES.includes(data.status as AcceptedFinalStatus)) return null;
  return {
    ok: true,
    listingId: data.listing_id ?? fallbackListingId,
    finalStatus: data.status as AcceptedFinalStatus,
    spentCredits: Number(data.spent_credits ?? 0),
    message: data.message ?? "Listing published",
  };
}

export async function publishListingWithCredits(
  listingId: string,
): Promise<PublishWithCreditsSuccess | PublishWithCreditsFailure> {
  const { data, error } = await wrapRpc("publish_listing_with_credits", () =>
    supabase.rpc("publish_listing_with_credits", {
      p_listing_id: listingId,
    }),
  );

  if (error) {
    const code = mapPublishWithCreditsError(error.message);
    return { ok: false, code, message: error.message };
  }

  const parsed = parsePublishWithCreditsPayload(data as RpcPublishPayload, listingId);
  if (!parsed) {
    return { ok: false, code: "unknown", message: "publish_listing_with_credits returned invalid payload" };
  }
  return parsed;
}
