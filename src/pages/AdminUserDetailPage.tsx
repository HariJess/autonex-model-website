import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminUserDetail } from "@/hooks/admin/useAdminUserDetail";
import { UserDetailHeader } from "@/components/admin/user-detail/UserDetailHeader";
import { UserDetailIdentity } from "@/components/admin/user-detail/UserDetailIdentity";
import { UserDetailStats } from "@/components/admin/user-detail/UserDetailStats";
import { UserDetailListings } from "@/components/admin/user-detail/UserDetailListings";
import { UserDetailTransactions } from "@/components/admin/user-detail/UserDetailTransactions";
import { UserDetailActions } from "@/components/admin/user-detail/UserDetailActions";

function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, error } = useAdminUserDetail(id);

  const pageTitle = data?.profile.full_name?.trim() || data?.profile.email || "Utilisateur";

  return (
    <>
      <Helmet>
        <title>Admin — {pageTitle} — AutoNex</title>
      </Helmet>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </div>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive font-sans">
            {error instanceof Error ? error.message : "Erreur de chargement"}
          </p>
          <Button variant="outline" size="sm" asChild className="font-sans">
            <Link to="/admin/utilisateurs">Retour aux utilisateurs</Link>
          </Button>
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground font-sans">Utilisateur introuvable.</p>
      ) : (
        <div className="space-y-6">
          <UserDetailHeader profile={data.profile} />

          <UserDetailStats stats={data.stats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <UserDetailIdentity profile={data.profile} />
              <UserDetailListings listings={data.listings} />
              <UserDetailTransactions ledger={data.creditsLedger} />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <UserDetailActions profile={data.profile} currentAdminId={user?.id} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminUserDetailPage;
