import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Phone, MessageSquare, Home, Zap, Pause, Trash2, CreditCard, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const { data: myListings = [] } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: myLeads = [] } = useQuery({
    queryKey: ["my-leads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const listingIds = myListings.map((l: any) => l.id);
      if (listingIds.length === 0) return [];
      const { data } = await supabase
        .from("leads")
        .select("*, listings(title)")
        .in("listing_id", listingIds)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user && myListings.length > 0,
  });

  const totalViews = myListings.reduce((sum: number, l: any) => sum + (l.views_count || 0), 0);
  const totalContacts = myLeads.filter((l: any) => l.type === "contact_form").length;
  const totalPhoneReveals = myLeads.filter((l: any) => l.type === "phone_reveal").length;
  const activeListings = myListings.filter((l: any) => l.status === "active").length;

  const stats = [
    { label: t("dashboard.totalViews"), value: totalViews.toLocaleString(), icon: Eye, color: "text-primary" },
    { label: t("dashboard.contacts"), value: String(totalContacts), icon: MessageSquare, color: "text-success" },
    { label: t("dashboard.phoneReveals"), value: String(totalPhoneReveals), icon: Phone, color: "text-accent" },
    { label: t("dashboard.activeListings"), value: String(activeListings), icon: Home, color: "text-primary" },
  ];

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "paused" : "active";
      const { error } = await supabase.from("listings").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Statut mis à jour");
    },
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Annonce supprimée");
    },
  });

  return (
    <>
      <Helmet><title>{t("dashboard.title")} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <h1 className="font-serif text-3xl font-bold">{t("dashboard.title")}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="rounded-2xl">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-sans">{stat.value}</p>
                  <p className="text-sm text-muted-foreground font-sans">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10 text-accent">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold font-sans text-lg">{t("dashboard.credits")}: {(profile?.credits_balance || 0).toLocaleString()} Ar</p>
                <p className="text-sm text-muted-foreground font-sans">{profile?.role}</p>
              </div>
            </div>
            <Button className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>{t("dashboard.buyCredits")}</Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-serif text-xl font-bold mb-4">{t("dashboard.myListings")}</h2>
          {myListings.length === 0 ? (
            <p className="text-muted-foreground font-sans text-center py-8">Aucune annonce. Publiez votre première annonce !</p>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Annonce</th>
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Prix</th>
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Statut</th>
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Vues</th>
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myListings.map((listing: any) => (
                      <tr key={listing.id} className="border-b border-border last:border-0">
                        <td className="p-4">
                          <div>
                            <p className="font-sans text-sm font-medium">{listing.title}</p>
                            <p className="text-xs text-muted-foreground font-sans">{listing.ville} {listing.quartier && `• ${listing.quartier}`}</p>
                          </div>
                        </td>
                        <td className="p-4 font-sans text-sm">{formatPrice(listing.price_mga)}</td>
                        <td className="p-4">
                          <Badge variant={listing.status === "active" ? "default" : "secondary"} className="font-sans text-xs capitalize">
                            {listing.status}
                          </Badge>
                        </td>
                        <td className="p-4 font-sans text-sm">{listing.views_count || 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" title="Boost"><Zap className="h-4 w-4 text-accent" /></Button>
                            <Button variant="ghost" size="icon" title={listing.status === "active" ? "Pause" : "Activer"} onClick={() => toggleStatus.mutate({ id: listing.id, status: listing.status })}>
                              {listing.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" title="Supprimer" onClick={() => deleteListing.mutate(listing.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-serif text-xl font-bold mb-4">{t("dashboard.leads")}</h2>
          {myLeads.length === 0 ? (
            <p className="text-muted-foreground font-sans text-center py-8">Aucun contact reçu pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {myLeads.map((lead: any) => (
                <Card key={lead.id} className="rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-sans font-semibold">{lead.visitor_name || "Visiteur"}</p>
                        <p className="text-xs text-muted-foreground font-sans mb-2">
                          {lead.type === "phone_reveal" ? "📞 Numéro révélé" : "✉️ Message"} • {(lead as any).listings?.title}
                        </p>
                        {lead.message && <p className="text-sm text-muted-foreground font-sans">{lead.message}</p>}
                        {lead.visitor_email && <p className="text-xs text-primary font-sans mt-1">{lead.visitor_email}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground font-sans flex-shrink-0">
                        {new Date(lead.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Dashboard;
