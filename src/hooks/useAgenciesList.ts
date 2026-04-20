import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicAgencyListItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  bio: string | null;
  verified: boolean;
  city: string | null;
}

export interface AgenciesListFilters {
  search?: string;
  city?: string | null;
  verifiedOnly?: boolean;
}

export function useAgenciesList(filters: AgenciesListFilters = {}) {
  return useQuery<PublicAgencyListItem[]>({
    queryKey: ["agencies-list", filters],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from("agencies")
        .select("id, name, slug, logo_url, bio, verified, city")
        .eq("status", "approved")
        .order("verified", { ascending: false })
        .order("name", { ascending: true });

      if (filters.city) query = query.eq("city", filters.city);
      if (filters.verifiedOnly) query = query.eq("verified", true);
      if (filters.search && filters.search.trim().length > 0) {
        query = query.ilike("name", `%${filters.search.trim()}%`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        logo_url: a.logo_url,
        bio: a.bio,
        verified: Boolean(a.verified),
        city: a.city,
      }));
    },
  });
}
