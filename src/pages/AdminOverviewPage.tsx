import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const links = [
  {
    to: "/admin/moderation",
    title: "Modération",
    desc: "Validation des annonces et opérations éditoriales.",
  },
  {
    to: "/admin/monetisation",
    title: "Monétisation",
    desc: "Paiements crédits, décisions et contrôle opérationnel.",
  },
  {
    to: "/admin/partenaires",
    title: "Partenaires",
    desc: "Campagnes publicitaires externes (placements partenaires).",
  },
  {
    to: "/admin/recherche",
    title: "Recherche",
    desc: "Signaux et analytics de recherche.",
  },
] as const;

function AdminOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview-metrics"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        totalUsersRes,
        recentUsersRes,
        pendingListingsRes,
        pendingCreditRes,
        activePartnerRes,
        activeListingsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgoIso),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "under_review"])
          .not("credit_pack_id", "is", null),
        supabase
          .from("partner_ad_campaigns")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .lte("starts_at", nowIso)
          .or(`ends_at.is.null,ends_at.gte.${nowIso}`),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      const firstErr =
        totalUsersRes.error ??
        recentUsersRes.error ??
        pendingListingsRes.error ??
        pendingCreditRes.error ??
        activePartnerRes.error ??
        activeListingsRes.error;
      if (firstErr) throw new Error(firstErr.message);

      return {
        totalUsers: totalUsersRes.count ?? 0,
        recentUsers7d: recentUsersRes.count ?? 0,
        pendingListings: pendingListingsRes.count ?? 0,
        pendingCreditTx: pendingCreditRes.count ?? 0,
        activePartnerCampaigns: activePartnerRes.count ?? 0,
        activeListings: activeListingsRes.count ?? 0,
      };
    },
  });

  return (
    <>
      <Helmet>
        <title>Admin — Vue d’ensemble — AutoNex</title>
      </Helmet>
      <div className="space-y-5">
        <div>
          <h1 className="font-serif text-2xl font-bold">Vue d’ensemble admin</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Espace interne séparé du compte utilisateur standard.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex items-center gap-2 text-sm text-muted-foreground font-sans">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des indicateurs...
            </div>
          ) : error ? (
            <p className="col-span-full text-sm text-destructive font-sans">
              Impossible de charger les indicateurs: {error instanceof Error ? error.message : "Erreur inconnue"}
            </p>
          ) : (
            <>
              <Card className="rounded-2xl">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground font-sans">Utilisateurs (total)</p>
                  <p className="font-serif text-2xl font-bold">{data?.totalUsers ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground font-sans">Nouveaux utilisateurs (7j)</p>
                  <p className="font-serif text-2xl font-bold">{data?.recentUsers7d ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground font-sans">Annonces en modération</p>
                  <p className="font-serif text-2xl font-bold">{data?.pendingListings ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground font-sans">Achats crédits en attente</p>
                  <p className="font-serif text-2xl font-bold">{data?.pendingCreditTx ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground font-sans">Campagnes partenaires actives</p>
                  <p className="font-serif text-2xl font-bold">{data?.activePartnerCampaigns ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground font-sans">Annonces actives</p>
                  <p className="font-serif text-2xl font-bold">{data?.activeListings ?? 0}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="rounded-2xl hover:shadow-sm transition-shadow">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{item.title}</CardTitle>
                  <CardDescription className="font-sans">{item.desc}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-primary font-sans">Ouvrir</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default AdminOverviewPage;
