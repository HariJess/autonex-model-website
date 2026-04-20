import { Helmet } from "react-helmet-async";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

function AdminUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users-basic"],
    queryFn: async () => {
      const [profilesRes, listingsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, role, full_name, phone, agency_id, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase.from("listings").select("owner_id, status"),
      ]);
      if (profilesRes.error) throw new Error(profilesRes.error.message);
      if (listingsRes.error) throw new Error(listingsRes.error.message);

      const byOwner = new Map<string, { total: number; active: number }>();
      for (const l of listingsRes.data ?? []) {
        const row = byOwner.get(l.owner_id) ?? { total: 0, active: 0 };
        row.total += 1;
        if (l.status === "active") row.active += 1;
        byOwner.set(l.owner_id, row);
      }

      const rows = (profilesRes.data ?? []).map((p) => ({
        ...p,
        listings_total: byOwner.get(p.id)?.total ?? 0,
        listings_active: byOwner.get(p.id)?.active ?? 0,
      }));
      return rows;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((u) => {
      const hay = `${u.full_name ?? ""} ${u.phone ?? ""} ${u.id} ${u.role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  return (
    <>
      <Helmet>
        <title>Admin — Utilisateurs — AutoNex</title>
      </Helmet>
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground font-sans">
          Vue basique des comptes depuis `profiles` (source de vérité applicative), avec volume d’annonces par propriétaire.
        </p>
        <Input
          placeholder="Rechercher par nom, rôle, téléphone ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive font-sans">
            {error instanceof Error ? error.message : "Erreur de chargement"}
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground font-sans">Aucun utilisateur trouvé.</p>
        ) : (
          <Card className="rounded-2xl overflow-x-auto">
            <CardContent className="p-0">
              <table className="w-full text-sm font-sans">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Identité</th>
                    <th className="p-3 font-medium">Rôle</th>
                    <th className="p-3 font-medium">Téléphone</th>
                    <th className="p-3 font-medium text-right">Annonces</th>
                    <th className="p-3 font-medium text-right">Actives</th>
                    <th className="p-3 font-medium">Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/admin/utilisateurs/${u.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/admin/utilisateurs/${u.id}`);
                        }
                      }}
                      className="border-t border-border cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <p className="font-medium">{u.full_name?.trim() || "Sans nom"}</p>
                          <p className="text-xs text-muted-foreground">{u.id}</p>
                        </div>
                      </td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">{u.phone || "—"}</td>
                      <td className="p-3 text-right">{u.listings_total}</td>
                      <td className="p-3 text-right">{u.listings_active}</td>
                      <td className="p-3">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("fr-MG") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

export default AdminUsersPage;
