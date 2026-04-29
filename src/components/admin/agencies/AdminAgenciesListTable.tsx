import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminAgenciesList } from "@/hooks/admin/useAdminAgencies";
import { AgencyStatusBadge } from "./AgencyStatusBadge";
import type { AgencyStatus, AgencyWithStats } from "@/types/agency";

type StatusFilter = "all" | AgencyStatus;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-MG");
}

export function AdminAgenciesListTable() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdminAgenciesList();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r: AgencyWithStats) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${r.name} ${r.slug} ${r.city ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, slug, ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 font-sans"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-44 font-sans">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending_review">En attente</SelectItem>
            <SelectItem value="approved">Approuvées</SelectItem>
            <SelectItem value="rejected">Rejetées</SelectItem>
            <SelectItem value="suspended">Suspendues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </div>
      ) : error ? (
        <p className="text-sm text-destructive font-sans">
          {error instanceof Error ? error.message : "Erreur de chargement"}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground font-sans">Aucune agence trouvée.</p>
      ) : (
        <Card className="rounded-2xl overflow-x-auto">
          <CardContent className="p-0">
            <table className="w-full text-sm font-sans">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Agence</th>
                  <th className="p-3 font-medium">Ville</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium text-right">Membres</th>
                  <th className="p-3 font-medium text-right">Annonces</th>
                  <th className="p-3 font-medium text-right">Actives</th>
                  <th className="p-3 font-medium">Créée le</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/agences/${a.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/admin/agences/${a.id}`);
                      }
                    }}
                    className="border-t border-border cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border">
                          {a.logo_url ? (
                            <img src={a.logo_url} alt={a.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="font-sans font-bold text-muted-foreground">
                              {a.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{a.city ?? "—"}</td>
                    <td className="p-3">
                      <AgencyStatusBadge status={a.status} verified={a.verified} />
                    </td>
                    <td className="p-3 text-right">{a.members_count}</td>
                    <td className="p-3 text-right">{a.listings_count}</td>
                    <td className="p-3 text-right">{a.active_listings_count}</td>
                    <td className="p-3 whitespace-nowrap">{formatDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
