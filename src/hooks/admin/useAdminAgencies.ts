import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapDbError } from "@/lib/admin/dbErrorMessages";
import type {
  Agency,
  AgencyDetail,
  AgencyMember,
  AgencyWithStats,
  CreateAgencyInput,
  UpdateAgencyInput,
} from "@/types/agency";

const LIST_KEY = ["admin-agencies-list"] as const;
const detailKey = (id: string) => ["admin-agency-detail", id] as const;

type CreateArgs = Database["public"]["Functions"]["admin_create_agency"]["Args"];
type UpdateArgs = Database["public"]["Functions"]["admin_update_agency"]["Args"];

function hydrateAgency(raw: Record<string, unknown>): Agency {
  const get = <T = unknown>(key: string) => raw[key] as T;
  return {
    id: get<string>("id"),
    name: get<string>("name"),
    slug: get<string>("slug"),
    logo_url: (get<string | null>("logo_url") ?? null) as string | null,
    cover_image_url: (get<string | null>("cover_image_url") ?? null) as string | null,
    bio: (get<string | null>("bio") ?? null) as string | null,
    description_long: (get<string | null>("description_long") ?? null) as string | null,
    phone: (get<string | null>("phone") ?? null) as string | null,
    email: (get<string | null>("email") ?? null) as string | null,
    whatsapp_phone: (get<string | null>("whatsapp_phone") ?? null) as string | null,
    website_url: (get<string | null>("website_url") ?? null) as string | null,
    address: (get<string | null>("address") ?? null) as string | null,
    city: (get<string | null>("city") ?? null) as string | null,
    region: (get<string | null>("region") ?? null) as string | null,
    commercial_contact_name: (get<string | null>("commercial_contact_name") ?? null) as string | null,
    nif: (get<string | null>("nif") ?? null) as string | null,
    stat: (get<string | null>("stat") ?? null) as string | null,
    reg_commerce: (get<string | null>("reg_commerce") ?? null) as string | null,
    opening_hours: (raw.opening_hours as Agency["opening_hours"]) ?? {},
    social_links: (raw.social_links as Agency["social_links"]) ?? {},
    status: raw.status as Agency["status"],
    verified: Boolean(raw.verified),
    rejection_reason: (get<string | null>("rejection_reason") ?? null) as string | null,
    submitted_at: (get<string | null>("submitted_at") ?? null) as string | null,
    reviewed_at: (get<string | null>("reviewed_at") ?? null) as string | null,
    reviewed_by: (get<string | null>("reviewed_by") ?? null) as string | null,
    spotlight_until: (get<string | null>("spotlight_until") ?? null) as string | null,
    created_at: (get<string | null>("created_at") ?? null) as string | null,
    updated_at: get<string>("updated_at"),
  };
}

export function useAdminAgenciesList() {
  return useQuery<AgencyWithStats[]>({
    queryKey: LIST_KEY,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_agencies_with_stats");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.status,
        verified: r.verified,
        created_at: r.created_at ?? null,
        city: r.city ?? null,
        members_count: Number(r.members_count ?? 0),
        listings_count: Number(r.listings_count ?? 0),
        active_listings_count: Number(r.active_listings_count ?? 0),
        rejection_reason: r.rejection_reason ?? null,
        logo_url: r.logo_url ?? null,
      }));
    },
  });
}

export function useAdminAgencyDetail(agencyId: string | undefined) {
  return useQuery<AgencyDetail>({
    queryKey: detailKey(agencyId ?? ""),
    enabled: Boolean(agencyId),
    staleTime: 15_000,
    queryFn: async () => {
      if (!agencyId) throw new Error("agencyId required");
      const { data, error } = await supabase.rpc("admin_agency_detail", {
        p_id: agencyId,
      });
      if (error) throw new Error(error.message);
      const payload = data as unknown as { agency: Record<string, unknown>; members: AgencyMember[] };
      if (!payload || !payload.agency) throw new Error("agency_not_found");
      return {
        agency: hydrateAgency(payload.agency),
        members: (payload.members ?? []) as AgencyMember[],
      };
    },
  });
}

export function useAdminAgencyActions() {
  const queryClient = useQueryClient();

  const invalidate = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    if (id) queryClient.invalidateQueries({ queryKey: detailKey(id) });
    queryClient.invalidateQueries({ queryKey: ["agencies-list"] });
    queryClient.invalidateQueries({ queryKey: ["agency-profile"] });
  };

  const createAgency = useMutation<string, Error, CreateAgencyInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc("admin_create_agency", {
        p_name: input.name,
        p_email: input.email,
        p_phone: input.phone,
        p_commercial_contact_name: input.commercial_contact_name,
        p_address: input.address,
        p_city: input.city,
        p_region: input.region,
        p_nif: input.nif,
        p_stat: input.stat,
        p_reg_commerce: input.reg_commerce,
        p_logo_url: input.logo_url,
        p_bio: input.bio,
        p_website_url: input.website_url,
        p_whatsapp_phone: input.whatsapp_phone,
      } as unknown as CreateArgs);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Agence créée et approuvée.");
      invalidate();
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors de la création.")),
  });

  const updateAgency = useMutation<void, Error, UpdateAgencyInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.rpc("admin_update_agency", {
        p_id: input.id,
        p_name: input.name,
        p_slug: input.slug,
        p_email: input.email,
        p_phone: input.phone,
        p_commercial_contact_name: input.commercial_contact_name,
        p_address: input.address,
        p_city: input.city,
        p_region: input.region,
        p_nif: input.nif,
        p_stat: input.stat,
        p_reg_commerce: input.reg_commerce,
        p_logo_url: input.logo_url,
        p_cover_image_url: input.cover_image_url,
        p_bio: input.bio,
        p_description_long: input.description_long,
        p_website_url: input.website_url,
        p_whatsapp_phone: input.whatsapp_phone,
        p_opening_hours: input.opening_hours,
        p_social_links: input.social_links,
        p_verified: input.verified,
      } as unknown as UpdateArgs);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success("Agence mise à jour.");
      invalidate(vars.id);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors de la mise à jour.")),
  });

  const approveAgency = useMutation<void, Error, { id: string; verified: boolean }>({
    mutationFn: async ({ id, verified }) => {
      const { error } = await supabase.rpc("admin_approve_agency", {
        p_id: id,
        p_verified: verified,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.verified ? "Agence approuvée et vérifiée." : "Agence approuvée.");
      invalidate(vars.id);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur approbation.")),
  });

  const rejectAgency = useMutation<void, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const { error } = await supabase.rpc("admin_reject_agency", {
        p_id: id,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success("Agence rejetée.");
      invalidate(vars.id);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur rejet.")),
  });

  const suspendAgency = useMutation<void, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const { error } = await supabase.rpc("admin_suspend_agency", {
        p_id: id,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success("Agence suspendue.");
      invalidate(vars.id);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur suspension.")),
  });

  const unsuspendAgency = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc("admin_unsuspend_agency", { p_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, id) => {
      toast.success("Agence réactivée.");
      invalidate(id);
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur réactivation.")),
  });

  const linkUser = useMutation<void, Error, { userId: string; agencyId: string }>({
    mutationFn: async ({ userId, agencyId }) => {
      const { error } = await supabase.rpc("admin_link_user_to_agency", {
        p_user_id: userId,
        p_agency_id: agencyId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success("Utilisateur lié à l'agence.");
      invalidate(vars.agencyId);
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", vars.userId] });
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors du rattachement.")),
  });

  const unlinkUser = useMutation<void, Error, { userId: string; agencyId: string }>({
    mutationFn: async ({ userId }) => {
      const { error } = await supabase.rpc("admin_unlink_user_from_agency", {
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      toast.success("Utilisateur détaché de l'agence.");
      invalidate(vars.agencyId);
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", vars.userId] });
    },
    onError: (err) => toast.error(mapDbError(err, "Erreur lors du détachement.")),
  });

  return {
    createAgency,
    updateAgency,
    approveAgency,
    rejectAgency,
    suspendAgency,
    unsuspendAgency,
    linkUser,
    unlinkUser,
  };
}
