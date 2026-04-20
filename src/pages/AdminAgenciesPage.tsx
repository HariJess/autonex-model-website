import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminAgenciesListTable } from "@/components/admin/agencies/AdminAgenciesListTable";
import AgencyFormDialog from "@/components/admin/agencies/AgencyFormDialog";
import { useAdminAgenciesList } from "@/hooks/admin/useAdminAgencies";

function AdminAgenciesPage() {
  const [creating, setCreating] = useState(false);
  const { data } = useAdminAgenciesList();

  const stats = {
    total: data?.length ?? 0,
    pending: data?.filter((a) => a.status === "pending_review").length ?? 0,
    approved: data?.filter((a) => a.status === "approved").length ?? 0,
    verified: data?.filter((a) => a.verified).length ?? 0,
  };

  return (
    <>
      <Helmet>
        <title>Admin — Agences — AutoNex</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-bold">Agences</h1>
            <p className="text-sm text-muted-foreground font-sans">
              Gestion du back-office des concessionnaires : modération, édition, rattachement utilisateurs.
            </p>
          </div>
          <Button onClick={() => setCreating(true)} className="font-sans">
            <Plus className="h-4 w-4 mr-1" /> Nouvelle agence
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-sans text-sm">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="font-serif text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">En attente</p>
            <p className="font-serif text-2xl font-bold">{stats.pending}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Approuvées</p>
            <p className="font-serif text-2xl font-bold">{stats.approved}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Partenaires</p>
            <p className="font-serif text-2xl font-bold">{stats.verified}</p>
          </div>
        </div>

        <AdminAgenciesListTable />
      </div>

      <AgencyFormDialog
        open={creating}
        mode="create"
        target={null}
        onOpenChange={setCreating}
      />
    </>
  );
}

export default AdminAgenciesPage;
