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
import {
  Eye,
  Phone,
  MessageSquare,
  Home,
  Pause,
  Trash2,
  Play,
  Loader2,
  Plus,
  AlertCircle,
  Coins,
  Clock,
  FileEdit,
  ArrowRight,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { formatAriary } from "@/config/monetization";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";

type Listing = Tables<"listings">;

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, profile, isAdmin } = useAuth();
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
    staleTime: 30_000,
  });

  const publishedListings = useMemo(() => myListings.filter((l) => l.status !== "draft"), [myListings]);
  const draftListings = useMemo(() => myListings.filter((l) => l.status === "draft"), [myListings]);
  const listingIds = useMemo(() => publishedListings.map((l) => l.id), [publishedListings]);

  // Separate query for accurate lead counts (no limit)
  const { data: leadCounts } = useQuery({
    queryKey: ["my-lead-counts", user?.id, listingIds],
    queryFn: async () => {
      if (!user || listingIds.length === 0) return { contacts: 0, phoneReveals: 0 };
      // Fetch all lead types for counting
      const { data, error } = await supabase
        .from("leads")
        .select("type")
        .in("listing_id", listingIds);
      if (error) return { contacts: 0, phoneReveals: 0 };
      const contacts = (data ?? []).filter((l) => l.type === "contact_form").length;
      const phoneReveals = (data ?? []).filter((l) => l.type === "phone_reveal").length;
      return { contacts, phoneReveals };
    },
    enabled: !!user && listingIds.length > 0,
    staleTime: 20_000,
  });

  // Recent leads for display (limited)
  const { data: recentLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["my-leads-recent", user?.id, listingIds],
    queryFn: async () => {
      if (!user || listingIds.length === 0) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*, listings(title)")
        .in("listing_id", listingIds)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<Tables<"leads"> & { listings?: { title: string } | null }>;
    },
    enabled: !!user && listingIds.length > 0,
    staleTime: 20_000,
  });

  const { data: pendingPurchases = [] } = useQuery({
    queryKey: ["pending-credit-purchases", user?.id],
    queryFn: async (): Promise<Tables<"transactions">[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "under_review"])
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 20_000,
  });

  const { data: creditTxHistory = [] } = useQuery({
    queryKey: ["credit-tx-history", user?.id],
    queryFn: async (): Promise<Tables<"transactions">[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["approved", "rejected", "cancelled", "failed"])
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 20_000,
  });

  const { data: ledgerRows = [] } = useQuery({
    queryKey: ["my-credits-ledger", user?.id],
    queryFn: async (): Promise<Tables<"credits_ledger">[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credits_ledger")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 20_000,
  });

  const { data: activeBoostRows = [] } = useQuery({
    queryKey: ["my-listing-boosts", user?.id, listingIds],
    queryFn: async () => {
      if (!user || listingIds.length === 0) return [];
      const { data, error } = await supabase
        .from("boosts")
        .select("listing_id, type, ends_at")
        .in("listing_id", listingIds)
        .gte("ends_at", new Date().toISOString());
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user && listingIds.length > 0,
    staleTime: 20_000,
  });

  const boostsByListing = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const row of activeBoostRows) {
      if (!row.listing_id) continue;
      const arr = m.get(row.listing_id) ?? [];
      arr.push(row.type);
      m.set(row.listing_id, arr);
    }
    return m;
  }, [activeBoostRows]);

  const totalViews = publishedListings.reduce((sum, l) => sum + (l.views_count ?? 0), 0);
  const totalContacts = leadCounts?.contacts ?? 0;
  const totalPhoneReveals = leadCounts?.phoneReveals ?? 0;
  const activeListings = publishedListings.filter((l) => l.status === "active").length;
  const { data: creditsFromLedger = 0, isPending: creditsBalancePending } = useCreditsBalance();

  const stats = [
    {
      label: t("dashboard.creditsBalance", "Crédits disponibles"),
      value: creditsBalancePending ? "…" : creditsFromLedger.toLocaleString("fr-FR"),
      icon: Coins,
      color: "text-amber-600",
    },
    { label: t("dashboard.totalViews"), value: totalViews.toLocaleString(), icon: Eye, color: "text-primary" },
    { label: t("dashboard.contacts"), value: String(totalContacts), icon: MessageSquare, color: "text-success" },
    { label: t("dashboard.phoneReveals"), value: String(totalPhoneReveals), icon: Phone, color: "text-accent" },
    { label: t("dashboard.activeListings"), value: String(activeListings), icon: Home, color: "text-primary" },
  ];

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "paused" : "active";
      const { error } = await supabase
        .from("listings")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-listing-boosts", user?.id] });
      toast.success(t("dashboard.statusUpdated", "Statut mis à jour"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      // Delete photos from storage first
      const { data: photos } = await supabase.from("listing_photos").select("url").eq("listing_id", id);
      if (photos && photos.length > 0) {
        const paths = photos.map((p) => {
          try {
            const url = new URL(p.url);
            const parts = url.pathname.split("/listing-photos/");
            return parts.length > 1 ? parts[1] : "";
          } catch {
            return "";
          }
        }).filter(Boolean);
        if (paths.length > 0) {
          await supabase.storage.from("listing-photos").remove(paths);
        }
      }
      // Delete related records
      await supabase.from("listing_photos").delete().eq("listing_id", id);
      // Note: leads, favorites, boosts have FK cascades or will be orphaned safely
      // Delete listing
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-lead-counts"] });
      queryClient.invalidateQueries({ queryKey: ["my-listing-boosts", user?.id] });
      toast.success(t("dashboard.listingDeleted", "Annonce supprimée"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusLabels: Record<string, string> = {
    active: t("status.active", "Active"),
    paused: t("status.paused", "En pause"),
    draft: t("status.draft", "Brouillon"),
    expired: t("status.expired", "Expirée"),
    pending_review: t("status.pendingReview", "En modération"),
    pending_payment: t("status.pendingPayment", "Paiement à confirmer"),
    pending_payment_verification: t("status.pendingPaymentVerification", "Paiement en vérification"),
    rejected: t("status.rejected", "Refusée"),
  };

  const boostLabels: Record<string, string> = {
    urgent: "Urgent",
    daily_bump: "Actualisation quotidienne",
    featured: "Mise en avant",
    top: "Top annonce",
    newsletter: "Newsletter",
    agency_spotlight: "Spotlight agence",
  };

  const paymentTxLabels: Record<string, string> = {
    pending: t("dashboard.txStatusPending", "En attente de vérification"),
    under_review: t("dashboard.txStatusReview", "En cours d’examen"),
    approved: t("dashboard.txStatusApproved", "Approuvé — crédits ajoutés"),
    rejected: t("dashboard.txStatusRejected", "Rejeté"),
    cancelled: t("dashboard.txStatusCancelled", "Annulé"),
    success: t("dashboard.txStatusSuccess", "Réussi"),
    failed: t("dashboard.txStatusFailed", "Échoué"),
  };

  const pendingBoostsLabel = (raw: unknown): string | null => {
    if (!Array.isArray(raw)) return null;
    const list = raw
      .filter((x): x is string => typeof x === "string")
      .map((x) => boostLabels[x] ?? x);
    return list.length > 0 ? list.join(", ") : null;
  };

  return (
    <>
      <Helmet><title>{t("dashboard.title")} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold">{t("dashboard.title")}</h1>
            {profile?.role && (
              <p className="text-sm text-muted-foreground font-sans mt-1">
                {profile.role === "agence"
                  ? t("dashboard.accountAgency", "Compte professionnel (agence)")
                  : profile.role === "admin"
                    ? t("dashboard.accountAdmin", "Compte administrateur")
                    : t("dashboard.accountIndividual", "Compte particulier")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Link to="/admin/monetisation">
                  <Button variant="outline" size="sm" className="font-sans">
                    Admin monétisation
                  </Button>
                </Link>
                <Link to="/admin/recherche">
                  <Button variant="outline" size="sm" className="font-sans">
                    Signaux recherche
                  </Button>
                </Link>
              </>
            )}
            <Link to="/publier">
              <Button className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
                <Plus className="h-4 w-4 mr-2" /> {t("nav.publish")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="rounded-2xl">
              <CardContent className="flex items-center gap-4 p-4 md:p-6">
                <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold font-sans">{stat.value}</p>
                  <p className="text-xs md:text-sm text-muted-foreground font-sans">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {draftListings.length > 0 && (
          <Card className="rounded-2xl border-2 border-dashed border-primary/35 bg-muted/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-lg font-bold">{t("dashboard.draftListings", "Brouillons d’annonces")}</h2>
              </div>
              <p className="text-sm text-muted-foreground font-sans">{t("dashboard.draftListingsHint", "Reprenez une annonce en cours — tout est sauvegardé automatiquement.")}</p>
              <ul className="space-y-3">
                {draftListings.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-card p-4 font-sans text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground line-clamp-1">{d.title || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {d.ville ? `${d.ville} · ` : ""}
                        {t("dashboard.draftStep", "Étape {{n}}/4").replace("{{n}}", String((d.draft_step ?? 0) + 1))}
                        {d.updated_at
                          ? ` · ${t("dashboard.draftUpdated", "Maj.")} ${new Date(d.updated_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Link to={`/publier?draft=${d.id}`}>
                        <Button type="button" size="sm" variant="default" className="font-sans gradient-primary border-0" style={{ color: "#FAFAFA" }}>
                          {t("dashboard.resumeDraft", "Reprendre")}
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" size="sm" variant="outline" className="font-sans text-destructive border-destructive/40">
                            {t("dashboard.deleteDraft", "Supprimer")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("dashboard.deleteDraftTitle", "Supprimer ce brouillon ?")}</AlertDialogTitle>
                            <AlertDialogDescription className="font-sans">{t("dashboard.deleteDraftDesc", "Cette action est définitive.")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="font-sans">{t("common.cancel", "Annuler")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="font-sans bg-destructive text-destructive-foreground"
                              onClick={() => deleteListing.mutate(d.id)}
                            >
                              {t("dashboard.deleteDraftConfirm", "Supprimer")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="relative overflow-hidden rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.09] via-card to-amber-500/[0.06] shadow-xl shadow-primary/20 ring-1 ring-primary/10">
            <div
              className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-amber-500/80 to-primary"
              aria-hidden
            />
            <CardContent className="relative p-6 md:p-7 space-y-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/12 to-amber-500/10 shadow-inner">
                    <Coins className="h-7 w-7 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Badge
                      variant="secondary"
                      className="w-fit border border-primary/15 bg-primary/10 font-sans text-[10px] font-semibold uppercase tracking-wider text-primary"
                    >
                      {t("dashboard.creditsSectionBadge", "Espace crédits")}
                    </Badge>
                    <div>
                      <h2 className="font-serif text-xl font-bold tracking-tight text-foreground md:text-2xl">
                        {t("dashboard.creditsMonetization", "Crédits & packs")}
                      </h2>
                      <p className="mt-1.5 font-sans text-sm text-muted-foreground">
                        {t("dashboard.creditsSectionTagline", "Publiez et boostez vos annonces grâce à vos crédits.")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 rounded-2xl border border-border/80 bg-background/90 px-4 py-3 text-left shadow-sm backdrop-blur-sm sm:text-right">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.creditsUsableInline", "Solde utilisable")}
                  </p>
                  <p className="mt-1 font-sans text-3xl font-bold tabular-nums tracking-tight text-foreground">
                    {creditsBalancePending ? "…" : creditsFromLedger.toLocaleString("fr-FR")}
                    {!creditsBalancePending && (
                      <span className="ml-1 text-base font-semibold text-muted-foreground">cr</span>
                    )}
                  </p>
                  <p className="mt-1 font-sans text-[11px] leading-snug text-muted-foreground">
                    {t(
                      "dashboard.creditsBalanceInlineHint",
                      "Hors paiements en attente de validation.",
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-border/80 bg-background/60 px-2.5 py-1 font-sans text-[11px] font-medium text-foreground/90">
                  {t("dashboard.creditsChipPublish", "Publication")}
                </span>
                <span className="inline-flex items-center rounded-full border border-border/80 bg-background/60 px-2.5 py-1 font-sans text-[11px] font-medium text-foreground/90">
                  {t("dashboard.creditsChipBoost", "Boosts & visibilité")}
                </span>
              </div>

              <ul className="space-y-2.5 font-sans text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>
                    {t(
                      "dashboard.creditsBullet1",
                      "Achat de packs en Ariary — paiement manuel avec justificatif (virement, mobile money, etc.).",
                    )}
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>
                    {t(
                      "dashboard.creditsBullet2",
                      "Les crédits sont ajoutés à votre solde uniquement après validation par notre équipe.",
                    )}
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>
                    {t(
                      "dashboard.creditsBullet3",
                      "Le solde affiché en tête de tableau de bord et dans ce bloc n’inclut pas les paiements encore en attente.",
                    )}
                  </span>
                </li>
              </ul>

              <Link to="/publier" className="block">
                <Button
                  type="button"
                  className="h-12 w-full gap-2 border-0 font-sans text-base font-semibold shadow-md transition-[transform,box-shadow] hover:shadow-lg active:scale-[0.99] gradient-primary"
                  style={{ color: "#FAFAFA" }}
                >
                  {t("dashboard.buyCreditsCta", "Acheter des crédits")}
                  <ArrowRight className="h-5 w-5 opacity-95" aria-hidden />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-serif text-lg font-bold">{t("dashboard.pendingPurchases", "Achats en attente")}</h2>
              </div>
              {pendingPurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground font-sans">{t("dashboard.noPendingPurchases", "Aucun paiement en attente de vérification.")}</p>
              ) : (
                <ul className="space-y-3">
                  {pendingPurchases.map((tx) => (
                    <li key={tx.id} className="rounded-xl border border-border bg-secondary/20 p-3 text-sm font-sans">
                      <p className="font-medium">{formatAriary(tx.amount_mga)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("dashboard.txRef", "Réf.")} {tx.reference ?? tx.id.slice(0, 8)} · {tx.method ?? "—"}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-500 mt-2">
                        {t("dashboard.txPendingHonest", "Vérification en cours — les crédits ne sont pas encore disponibles.")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl">
            <CardContent className="p-6 space-y-3">
              <h2 className="font-serif text-lg font-bold">{t("dashboard.creditDecisions", "Historique achats crédits")}</h2>
              {creditTxHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground font-sans">{t("dashboard.noCreditHistory", "Aucun achat traité pour l’instant.")}</p>
              ) : (
                <ul className="space-y-2 text-sm font-sans">
                  {creditTxHistory.map((tx) => (
                    <li key={tx.id} className="rounded-lg border border-border/80 px-3 py-2">
                      <p className="font-medium">{formatAriary(tx.amount_mga)}</p>
                      <p className="text-xs text-muted-foreground">
                        {paymentTxLabels[tx.status ?? ""] ?? tx.status} · {tx.created_at ? new Date(tx.created_at).toLocaleDateString("fr-FR") : ""}
                      </p>
                      {tx.status === "rejected" && tx.rejection_reason && (
                        <p className="text-xs text-destructive mt-1">{tx.rejection_reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 space-y-3">
              <h2 className="font-serif text-lg font-bold">{t("dashboard.creditsLedger", "Mouvements de crédits")}</h2>
              {ledgerRows.length === 0 ? (
                <p className="text-sm text-muted-foreground font-sans">{t("dashboard.noLedger", "Aucun mouvement enregistré.")}</p>
              ) : (
                <ul className="space-y-2 text-sm font-sans max-h-64 overflow-y-auto">
                  {ledgerRows.map((row) => (
                    <li key={row.id} className="flex justify-between gap-2 rounded-lg border border-border/60 px-3 py-1.5">
                      <span className={row.delta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}>
                        {row.delta >= 0 ? "+" : ""}
                        {row.delta}
                      </span>
                      <span className="text-xs text-muted-foreground text-right truncate flex-1" title={row.reason ?? ""}>
                        {row.reason ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
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
          ) : publishedListings.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-sans mb-4">{t("dashboard.noListings", "Aucune annonce. Publiez votre première annonce !")}</p>
              <Link to="/publier">
                <Button className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>{t("nav.publish")}</Button>
              </Link>
            </div>
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {publishedListings.map((listing) => {
                const boostsLine = pendingBoostsLabel(listing.pending_boost_types);
                const activeBoostTypes = boostsByListing.get(listing.id) ?? [];
                const activeBoostLine =
                  activeBoostTypes.length > 0
                    ? activeBoostTypes.map((x) => boostLabels[x] ?? x).join(", ")
                    : null;
                return (
                  <Card key={`mobile-${listing.id}`} className="rounded-2xl">
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1">
                        <Link to={`/annonce/${listing.id}`} className="font-sans text-sm font-semibold hover:text-primary transition-colors line-clamp-2">
                          {listing.title}
                        </Link>
                        <p className="text-xs text-muted-foreground font-sans">{listing.ville}{listing.quartier ? ` • ${listing.quartier}` : ""}</p>
                        <p className="text-sm font-sans font-medium">{formatPrice(listing.price_mga)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            listing.status === "active"
                              ? "default"
                              : listing.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                          className="font-sans text-xs"
                        >
                          {statusLabels[listing.status ?? "draft"] ?? listing.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-sans">{listing.views_count ?? 0} vues</span>
                      </div>
                      {listing.status === "pending_review" && boostsLine && (
                        <p className="text-[11px] text-muted-foreground font-sans">
                          {t("dashboard.pendingBoosts", "Visibilité après validation")}: {boostsLine}
                        </p>
                      )}
                      {listing.status === "active" && activeBoostLine && (
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-500 font-sans">
                          {t("dashboard.activeBoosts", "Boost actif")}: {activeBoostLine}
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost" size="icon"
                          title={listing.status === "active" ? t("dashboard.pause", "Mettre en pause") : t("dashboard.activate", "Activer")}
                          onClick={() => toggleStatus.mutate({ id: listing.id, status: listing.status ?? "draft" })}
                          disabled={!["active", "paused"].includes(listing.status ?? "")}
                          className="min-h-10 min-w-10 touch-manipulation"
                        >
                          {listing.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title={t("common.delete")} className="min-h-10 min-w-10 touch-manipulation">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-serif">{t("dashboard.deleteConfirm", "Supprimer cette annonce ?")}</AlertDialogTitle>
                              <AlertDialogDescription className="font-sans">
                                {t("dashboard.deleteDesc", "Cette action est irréversible. L'annonce et toutes ses photos seront définitivement supprimées.")}
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="bg-card rounded-2xl border border-border overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">{t("dashboard.listing", "Annonce")}</th>
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground hidden sm:table-cell">{t("dashboard.price", "Prix")}</th>
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">{t("dashboard.status", "Statut")}</th>
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground hidden md:table-cell">{t("dashboard.views", "Vues")}</th>
                      <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedListings.map((listing) => {
                      const boostsLine = pendingBoostsLabel(listing.pending_boost_types);
                      const activeBoostTypes = boostsByListing.get(listing.id) ?? [];
                      const activeBoostLine =
                        activeBoostTypes.length > 0
                          ? activeBoostTypes.map((x) => boostLabels[x] ?? x).join(", ")
                          : null;
                      return (
                      <tr key={listing.id} className="border-b border-border last:border-0">
                        <td className="p-4">
                          <div>
                            <Link to={`/annonce/${listing.id}`} className="font-sans text-sm font-medium hover:text-primary transition-colors">
                              {listing.title}
                            </Link>
                            <p className="text-xs text-muted-foreground font-sans">{listing.ville}{listing.quartier ? ` • ${listing.quartier}` : ""}</p>
                            {listing.status === "pending_review" && boostsLine && (
                              <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
                                {t("dashboard.pendingBoosts", "Visibilité après validation")}: {boostsLine}
                              </p>
                            )}
                            {listing.status === "active" && activeBoostLine && (
                              <p className="text-[11px] text-emerald-800 dark:text-emerald-500 font-sans mt-0.5">
                                {t("dashboard.activeBoosts", "Boost actif")}: {activeBoostLine}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-sans text-sm hidden sm:table-cell">{formatPrice(listing.price_mga)}</td>
                        <td className="p-4">
                          <Badge
                            variant={
                              listing.status === "active"
                                ? "default"
                                : listing.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="font-sans text-xs"
                          >
                            {statusLabels[listing.status ?? "draft"] ?? listing.status}
                          </Badge>
                        </td>
                        <td className="p-4 font-sans text-sm hidden md:table-cell">{listing.views_count ?? 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="icon"
                              title={listing.status === "active" ? t("dashboard.pause", "Mettre en pause") : t("dashboard.activate", "Activer")}
                              onClick={() => toggleStatus.mutate({ id: listing.id, status: listing.status ?? "draft" })}
                              disabled={!["active", "paused"].includes(listing.status ?? "")}
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
                                  <AlertDialogTitle className="font-serif">{t("dashboard.deleteConfirm", "Supprimer cette annonce ?")}</AlertDialogTitle>
                                  <AlertDialogDescription className="font-sans">
                                    {t("dashboard.deleteDesc", "Cette action est irréversible. L'annonce et toutes ses photos seront définitivement supprimées.")}
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
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}
        </div>

        <div>
          <h2 className="font-serif text-xl font-bold mb-4">{t("dashboard.leads", "Contacts reçus")}</h2>
          {leadsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recentLeads.length === 0 ? (
            <p className="text-muted-foreground font-sans text-center py-8">{t("dashboard.noLeads", "Aucun contact reçu pour le moment.")}</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <Card key={lead.id} className="rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-sans font-semibold">{lead.visitor_name || t("dashboard.visitor", "Visiteur")}</p>
                        <p className="text-xs text-muted-foreground font-sans mb-2">
                          {lead.type === "phone_reveal" ? "📞 Numéro révélé" : lead.type === "whatsapp" ? "💬 WhatsApp" : "✉️ Message"} • {lead.listings?.title ?? t("dashboard.listing", "Annonce")}
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
