import { supabase } from "@/integrations/supabase/client";

export type PublishWithCreditsErrorCode =
  | "not_authenticated"
  | "listing_not_found"
  | "not_owner"
  | "invalid_listing_status"
  | "insufficient_credits"
  | "already_published"
  | "unknown";

export type PublishWithCreditsSuccess = {
  ok: true;
  listingId: string;
  finalStatus: string;
  spentCredits: number;
  message: string;
};

export type PublishWithCreditsFailure = {
  ok: false;
  code: PublishWithCreditsErrorCode;
  message: string;
};

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
  if (!data || data.ok !== true || data.status !== "active") return null;
  return {
    ok: true,
    listingId: data.listing_id ?? fallbackListingId,
    finalStatus: data.status,
    spentCredits: Number(data.spent_credits ?? 0),
    message: data.message ?? "Listing published",
  };
}

export async function publishListingWithCredits(
  listingId: string,
): Promise<PublishWithCreditsSuccess | PublishWithCreditsFailure> {
  const { data, error } = await supabase.rpc("publish_listing_with_credits", {
    p_listing_id: listingId,
  });

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
