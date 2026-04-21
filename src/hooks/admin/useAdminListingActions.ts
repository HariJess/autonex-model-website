import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapDbError } from "@/lib/admin/dbErrorMessages";

type ApproveInput = { listingId: string; ownerId: string };
type RejectInput = { listingId: string; ownerId: string; reason: string };
type DismissReportsInput = { listingId: string; ownerId: string };
type ValidateReportsInput = { listingId: string; ownerId: string; rejectionReason: string };

export function useAdminListingActions() {
  const queryClient = useQueryClient();

  const invalidateAll = (ownerId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["admin-moderation-queue"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-pending-listings"] });
    if (ownerId) {
      void queryClient.invalidateQueries({ queryKey: ["my-listings", ownerId] });
    }
  };

  const approve = useMutation<void, Error, ApproveInput>({
    mutationFn: async ({ listingId }) => {
      const { error } = await supabase.rpc("admin_approve_listing_moderation", {
        p_listing_id: listingId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { ownerId }) => {
      toast.success("Annonce approuvée.");
      invalidateAll(ownerId);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors de l'approbation.")),
  });

  const reject = useMutation<void, Error, RejectInput>({
    mutationFn: async ({ listingId, reason }) => {
      const { error } = await supabase.rpc("admin_reject_listing_moderation", {
        p_listing_id: listingId,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { ownerId }) => {
      toast.success("Annonce rejetée.");
      invalidateAll(ownerId);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors du rejet.")),
  });

  const dismissReports = useMutation<void, Error, DismissReportsInput>({
    mutationFn: async ({ listingId }) => {
      const { error } = await supabase.rpc("admin_dismiss_listing_reports", {
        p_listing_id: listingId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { ownerId }) => {
      toast.success("Signalements rejetés — annonce restaurée.");
      invalidateAll(ownerId);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors du rejet des signalements.")),
  });

  const validateReports = useMutation<void, Error, ValidateReportsInput>({
    mutationFn: async ({ listingId, rejectionReason }) => {
      const { error } = await supabase.rpc("admin_validate_listing_reports", {
        p_listing_id: listingId,
        p_rejection_reason: rejectionReason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { ownerId }) => {
      toast.success("Signalements validés — annonce rejetée.");
      invalidateAll(ownerId);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors de la validation des signalements.")),
  });

  return { approve, reject, dismissReports, validateReports };
}
