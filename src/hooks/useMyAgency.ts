import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapDbError } from "@/lib/admin/dbErrorMessages";
import type { Agency, UpdateMyAgencyInput } from "@/types/agency";

type UpdateArgs = Database["public"]["Functions"]["update_my_agency"]["Args"];

const myAgencyKey = (userId: string | undefined) => ["my-agency", userId] as const;

export function useMyAgency() {
  const { user, profile } = useAuth();
  const agencyId = profile?.agency_id ?? null;

  return useQuery<Agency | null>({
    queryKey: myAgencyKey(user?.id),
    enabled: Boolean(user && agencyId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", agencyId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        logo_url: data.logo_url,
        cover_image_url: data.cover_image_url,
        bio: data.bio,
        description_long: data.description_long,
        phone: data.phone,
        email: data.email,
        whatsapp_phone: data.whatsapp_phone,
        website_url: data.website_url,
        address: data.address,
        city: data.city,
        region: data.region,
        commercial_contact_name: data.commercial_contact_name,
        nif: data.nif,
        stat: data.stat,
        reg_commerce: data.reg_commerce,
        opening_hours: (data.opening_hours as Agency["opening_hours"]) ?? {},
        social_links: (data.social_links as Agency["social_links"]) ?? {},
        status: data.status,
        verified: Boolean(data.verified),
        rejection_reason: data.rejection_reason,
        submitted_at: data.submitted_at,
        reviewed_at: data.reviewed_at,
        reviewed_by: data.reviewed_by,
        spotlight_until: data.spotlight_until,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
  });
}

export function useUpdateMyAgency() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, UpdateMyAgencyInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("update_my_agency", {
        p_email: input.email,
        p_phone: input.phone,
        p_whatsapp_phone: input.whatsapp_phone,
        p_logo_url: input.logo_url,
        p_cover_image_url: input.cover_image_url,
        p_bio: input.bio,
        p_description_long: input.description_long,
        p_website_url: input.website_url,
        p_opening_hours: input.opening_hours,
        p_social_links: input.social_links,
      } as unknown as UpdateArgs);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(t("agencies.toastUpdated", "Fiche agence mise à jour."));
      queryClient.invalidateQueries({ queryKey: myAgencyKey(user?.id) });
      queryClient.invalidateQueries({ queryKey: ["agency-profile"] });
      queryClient.invalidateQueries({ queryKey: ["agencies-list"] });
    },
    onError: (err) => toast.error(mapDbError(err, t("agencies.toastUpdateError", "Erreur lors de la mise à jour."))),
  });
}
