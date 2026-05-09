import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReportReason =
  | "scam"
  | "inappropriate"
  | "duplicate"
  | "wrong_price"
  | "wrong_category"
  | "fake_photos"
  | "other";

export type CreateListingReportInput = {
  listingId: string;
  reason: ReportReason;
  details?: string;
};

export type CreateListingReportError =
  | "unauthenticated"
  | "invalid_reason"
  | "details_required"
  | "listing_not_found"
  | "cannot_report_own_listing"
  | "listing_not_active"
  | "already_reported"
  | "unknown";

export class ListingReportError extends Error {
  code: CreateListingReportError;
  constructor(code: CreateListingReportError, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

const KNOWN_CODES: readonly CreateListingReportError[] = [
  "unauthenticated",
  "invalid_reason",
  "details_required",
  "listing_not_found",
  "cannot_report_own_listing",
  "listing_not_active",
  "already_reported",
];

export function normalizeListingReportError(raw: unknown): ListingReportError {
  const message = raw instanceof Error ? raw.message : String(raw ?? "");
  const hit = KNOWN_CODES.find((code) => message.includes(code));
  return new ListingReportError(hit ?? "unknown", message);
}

export function useCreateListingReport() {
  const queryClient = useQueryClient();

  return useMutation<void, ListingReportError, CreateListingReportInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("create_listing_report", {
        p_listing_id: input.listingId,
        p_reason: input.reason,
        p_details: input.details?.trim() ? input.details.trim() : undefined,
      });
      if (error) throw normalizeListingReportError(error);
    },
    onSuccess: (_void, input) => {
      void queryClient.invalidateQueries({ queryKey: ["listing-detail", input.listingId] });
    },
  });
}
