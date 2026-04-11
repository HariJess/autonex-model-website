import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, Phone, MessageSquare, Home, Pause, Trash2, Play, Loader2, Plus, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Listing = Tables<"listings">;
type Lead = Tables<"leads"> & { listings?: { title: string } | null };

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const { data: myListings = [], isLoading: listingsLoading, error: listingsError } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async (): Promise<Listing[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user,
    retry: 1,
  });

  const listingIds = useMemo(() => myListings.map((l) => l.id), [myListings]);
  const { data: myLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["my-leads", user?.id, listingIds],
    queryFn: async (): Promise<Lead[]> => {
      if (!user) return [];
      // listingIds comes from the memoized variable above
      if (listingIds.length === 0) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*, listings(title)")
        .in("listing_id", listingIds)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as Lead[];
    },
    enabled: !!user && listingIds.length > 0,
  });

  const totalViews = myListings.reduce((sum, l) => sum + (l.views_count ?? 0), 0);
  const totalContacts = myLeads.filter((l) => l.type === "contact_form").length;
  const totalPhoneReveals = myLeads.filter((l) => l.type === "phone_reveal").length;
  const activeListings = myListings.filter((l) => l.status === "active").length;

  const stats = [
    { label: t("dashboard.totalViews"), value: totalViews.toLocaleString(), icon: Eye, color: "text-primary" },
    { label: t("dashboard.contacts"), value: String(totalContacts), icon: MessageSquare, color: "text-success" },
    { label: t("dashboard.phoneReveals"), value: String(totalPhoneReveals), icon: Phone, color: "text-accent" },
    { label: t("dashboard.activeListings"), value: String(activeListings), icon: Home, color: "text-primary" },
  ];

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "paused" : "active";
      const { error } = await supabase.from("listings").update({ status: newStatus as "active" | "paused" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Statut mis à jour");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      // Delete photos from storage first
      const { data: photos } = await supabase.from("listing_photos").select("url").eq("listing_id", id);
      if (photos && photos.length > 0) {
        const paths = photos.map((p) => {
          const url = new URL(p.url);
          const parts = url.pathname.split("/listing-photos/");
          return parts.length > 1 ? parts[1] : "";
        }).filter(Boolean);
        if (paths.length > 0) {
          await supabase.storage.from("listing-photos").remove(paths);
        }
      }
      // Delete listing_photos rows
      await supabase.from("listing_photos").delete().eq("listing_id", id);
      // Delete listing
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Annonce supprimée");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusLabels: Record<string, string> = {
    active: "Active",
    paused: "En pause",
    draft: "Brouillon",
    expired: "Expirée",
  };

  return (
    <>
      <Helmet><title>{t("dashboard.title")} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold">{t("dashboard.title")}</h1>
          <Link to="/publier">
            <Button className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
              <Plus className="h-4 w-4 mr-2" /> {t("nav.publish")}
            </Button>
          </Link>
        </div>

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

        <div>
          <h2 className="font-serif text-xl font-bold mb-4">{t("dashboard.myListings")}</h2>

          {listingsError && (
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <p className="font-sans text-sm">{(listingsError as Error).message}</p>
            </div>
          )}

          {listingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : myListings.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-sans mb-4">Aucune annonce. Publiez votre première annonce !</p>
              <Link to="/publier">
                <Button className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>{t("nav.publish")}</Button>
              </Link>
            </div>
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
                    {myListings.map((listing) => (
                      <tr key={listing.id} className="border-b border-border last:border-0">
                        <td className="p-4">
                          <div>
                            <Link to={`/annonce/${listing.id}`} className="font-sans text-sm font-medium hover:text-primary transition-colors">
                              {listing.title}
                            </Link>
                            <p className="text-xs text-muted-foreground font-sans">{listing.ville}{listing.quartier ? ` • ${listing.quartier}` : ""}</p>
                          </div>
                        </td>
                        <td className="p-4 font-sans text-sm">{formatPrice(listing.price_mga)}</td>
                        <td className="p-4">
                          <Badge variant={listing.status === "active" ? "default" : "secondary"} className="font-sans text-xs">
                            {statusLabels[listing.status ?? "draft"] ?? listing.status}
                          </Badge>
                        </td>
                        <td className="p-4 font-sans text-sm">{listing.views_count ?? 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="icon"
                              title={listing.status === "active" ? "Mettre en pause" : "Activer"}
                              onClick={() => toggleStatus.mutate({ id: listing.id, status: listing.status ?? "draft" })}
                              disabled={listing.status === "expired"}
                            >
                              {listing.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title={t("common.delete")}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-serif">Supprimer cette annonce ?</AlertDialogTitle>
                                  <AlertDialogDescription className="font-sans">
                                    Cette action est irréversible. L'annonce et toutes ses photos seront définitivement supprimées.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="font-sans">{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteListing.mutate(listing.id)}
                                    className="bg-destructive text-destructive-foreground font-sans"
                                  >
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
          {leadsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : myLeads.length === 0 ? (
            <p className="text-muted-foreground font-sans text-center py-8">Aucun contact reçu pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {myLeads.map((lead) => (
                <Card key={lead.id} className="rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-sans font-semibold">{lead.visitor_name || "Visiteur"}</p>
                        <p className="text-xs text-muted-foreground font-sans mb-2">
                          {lead.type === "phone_reveal" ? "📞 Numéro révélé" : lead.type === "whatsapp" ? "💬 WhatsApp" : "✉️ Message"} • {lead.listings?.title ?? "Annonce"}
                        </p>
                        {lead.message && <p className="text-sm text-muted-foreground font-sans">{lead.message}</p>}
                        {lead.visitor_email && <p className="text-xs text-primary font-sans mt-1">{lead.visitor_email}</p>}
                        {lead.visitor_phone && <p className="text-xs text-muted-foreground font-sans">{lead.visitor_phone}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground font-sans flex-shrink-0">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString("fr-FR") : ""}
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
