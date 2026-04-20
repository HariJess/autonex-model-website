import { AdminStatCard } from "@/components/admin/AdminStatCard";
import type { AdminUserDetailStats } from "@/types/admin";

interface UserDetailStatsProps {
  stats: AdminUserDetailStats;
}

export function UserDetailStats({ stats }: UserDetailStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <AdminStatCard
        title="Annonces totales"
        value={stats.totalListings}
        subtitle="Toutes statuts confondus"
      />
      <AdminStatCard
        title="Annonces actives"
        value={stats.activeListings}
        subtitle="Visibles côté public"
      />
      <AdminStatCard
        title="Crédits actuels"
        value={stats.currentCreditsBalance}
        subtitle="Solde en temps réel"
      />
      <AdminStatCard
        title="Transactions crédits"
        value={stats.totalTransactions}
        subtitle="Total mouvements ledger"
      />
    </div>
  );
}
