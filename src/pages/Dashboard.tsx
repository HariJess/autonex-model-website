import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Eye, Phone, MessageSquare, Home, Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";
import { BOOST_LABELS_FR } from "@/config/monetization";
import { partitionBoostRowsByListing } from "@/lib/listingBoosts";
import { removeDraft } from "@/lib/draftStorage";
import { DashboardHeader } from "@/pages/dashboard/components/DashboardHeader";
import { DashboardStatsCards } from "@/pages/dashboard/components/DashboardStatsCards";
import { DashboardDraftListingsSection } from "@/pages/dashboard/components/DashboardDraftListingsSection";
import { DashboardCreditsSection } from "@/pages/dashboard/components/DashboardCreditsSection";
import { DashboardListingsSection } from "@/pages/dashboard/components/DashboardListingsSection";
import { DashboardLeadsSection } from "@/pages/dashboard/components/DashboardLeadsSection";

type Listing = Tables<"listings">;

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
    staleTime: 30_000,
  });

  const publishedListings = useMemo(() => myListings.filter((l) => l.status !== "draft"), [myListings]);
  const draftListings = useMemo(() => myListings.filter((l) => l.status === "draft"), [myListings]);
  const listingIds = useMemo(() => publishedListings.map((l) => l.id), [publishedListings]);

  // Separate query for accurate lead counts (no limit)
  const { data: leadCounts } = useQuery({
    queryKey: ["my-lead-counts", user?.id, listingIds],
    queryFn: async () => {
      if (!user || listingIds.length === 0) return { contacts: 0, phoneReveals: 0, whatsappClicks: 0 };
      const [leadRes, revealRes] = await Promise.all([
        supabase
          .from("leads")
          .select("type")
          .in("listing_id", listingIds)
          .eq("type", "contact_form"),
        supabase
          .from("phone_reveal_events")
          .select("kind")
          .in("listing_id", listingIds),
      ]);
      if (leadRes.error || revealRes.error) {
        return { contacts: 0, phoneReveals: 0, whatsappClicks: 0 };
      }
      const contacts = leadRes.data?.length ?? 0;
      const phoneReveals = (revealRes.data ?? []).filter((r) => r.kind === "phone_reveal").length;
      const whatsappClicks = (revealRes.data ?? []).filter((r) => r.kind === "whatsapp").length;
      return { contacts, phoneReveals, whatsappClicks };
    },
    enabled: !!user && listingIds.length > 0,
    staleTime: 20_000,
  });

  // Recent leads for display (contact_form only; reveals live in phone_reveal_events)
  const { data: recentLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["my-leads-recent", user?.id, listingIds],
    queryFn: async () => {
      if (!user || listingIds.length === 0) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*, listings(title)")
        .in("listing_id", listingIds)
        .eq("type", "contact_form")
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

  const { data: myListingBoostRows = [] } = useQuery({
    queryKey: ["my-listing-boosts", user?.id, listingIds],
    queryFn: async () => {
      if (!user || listingIds.length === 0) return [];
      const { data, error } = await supabase
        .from("boosts")
        .select("listing_id, type, ends_at")
        .in("listing_id", listingIds);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user && listingIds.length > 0,
    staleTime: 20_000,
  });

  const listingBoostPartitions = useMemo(
    () => partitionBoostRowsByListing(myListingBoostRows, new Date()),
    [myListingBoostRows],
  );

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
      // Drop any matching local draft backup so a later /publier visit
      // doesn't autosave-loop against a phantom UUID.
      if (user?.id) removeDraft(user.id, id);
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
    ...BOOST_LABELS_FR,
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

  const accountRoleLabel = profile?.role
    ? profile.role === "agence"
      ? t("dashboard.accountAgency", "Compte professionnel (agence)")
      : profile.role === "admin"
        ? t("dashboard.accountAdmin", "Compte administrateur")
        : t("dashboard.accountIndividual", "Compte particulier")
    : null;

  return (
    <>
      <Helmet>
        <title>{t("dashboard.title")} — AutoNex</title>
      </Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <DashboardHeader
          title={t("dashboard.title")}
          accountRoleLabel={accountRoleLabel}
          publishLabel={t("nav.publish")}
        />

        <DashboardStatsCards stats={stats} />

        <DashboardDraftListingsSection
          draftListings={draftListings}
          title={t("dashboard.draftListings", "Brouillons d’annonces")}
          hint={t("dashboard.draftListingsHint", "Reprenez une annonce en cours — tout est sauvegardé automatiquement.")}
          draftStepLabel={t("dashboard.draftStep", "Étape {{n}}/4")}
          draftUpdatedLabel={t("dashboard.draftUpdated", "Maj.")}
          resumeLabel={t("dashboard.resumeDraft", "Reprendre")}
          deleteLabel={t("dashboard.deleteDraft", "Supprimer")}
          deleteTitle={t("dashboard.deleteDraftTitle", "Supprimer ce brouillon ?")}
          deleteDescription={t("dashboard.deleteDraftDesc", "Cette action est définitive.")}
          cancelLabel={t("common.cancel", "Annuler")}
          onDelete={(id) => deleteListing.mutate(id)}
        />

        <DashboardCreditsSection
          creditsBalancePending={creditsBalancePending}
          creditsFromLedger={creditsFromLedger}
          pendingPurchases={pendingPurchases}
          creditTxHistory={creditTxHistory}
          ledgerRows={ledgerRows}
          paymentTxLabels={paymentTxLabels}
          labels={{
            creditsSectionBadge: t("dashboard.creditsSectionBadge", "Espace crédits"),
            creditsMonetization: t("dashboard.creditsMonetization", "Crédits & packs"),
            creditsSectionTagline: t("dashboard.creditsSectionTagline", "Publiez et boostez vos annonces grâce à vos crédits."),
            creditsUsableInline: t("dashboard.creditsUsableInline", "Solde utilisable"),
            creditsBalanceInlineHint: t("dashboard.creditsBalanceInlineHint", "Hors paiements en attente de validation."),
            creditsChipPublish: t("dashboard.creditsChipPublish", "Publication"),
            creditsChipBoost: t("dashboard.creditsChipBoost", "Boosts & visibilité"),
            creditsBullet1: t("dashboard.creditsBullet1", "Achat de packs en Ariary — paiement manuel avec justificatif (virement, mobile money, etc.)."),
            creditsBullet2: t("dashboard.creditsBullet2", "Les crédits sont ajoutés à votre solde uniquement après validation par notre équipe."),
            creditsBullet3: t("dashboard.creditsBullet3", "Le solde affiché en tête de tableau de bord et dans ce bloc n’inclut pas les paiements encore en attente."),
            buyCreditsCta: t("dashboard.buyCreditsCta", "Acheter des crédits"),
            pendingPurchases: t("dashboard.pendingPurchases", "Achats en attente"),
            noPendingPurchases: t("dashboard.noPendingPurchases", "Aucun paiement en attente de vérification."),
            txRef: t("dashboard.txRef", "Réf."),
            txPendingHonest: t("dashboard.txPendingHonest", "Vérification en cours — les crédits ne sont pas encore disponibles."),
            creditDecisions: t("dashboard.creditDecisions", "Historique achats crédits"),
            noCreditHistory: t("dashboard.noCreditHistory", "Aucun achat traité pour l’instant."),
            creditsLedger: t("dashboard.creditsLedger", "Mouvements de crédits"),
            noLedger: t("dashboard.noLedger", "Aucun mouvement enregistré."),
          }}
        />

        <DashboardListingsSection
          title={t("dashboard.myListings")}
          listingsLoading={listingsLoading}
          listingsErrorMessage={listingsError instanceof Error ? listingsError.message : undefined}
          publishedListings={publishedListings}
          formatPrice={formatPrice}
          statusLabels={statusLabels}
          boostLabels={boostLabels}
          listingBoostPartitions={listingBoostPartitions}
          creditsBalance={creditsFromLedger}
          creditsBalancePending={creditsBalancePending}
          userId={user?.id}
          pendingBoostsLabel={pendingBoostsLabel}
          labels={{
            noListings: t("dashboard.noListings", "Aucune annonce. Publiez votre première annonce !"),
            publish: t("nav.publish"),
            pause: t("dashboard.pause", "Mettre en pause"),
            activate: t("dashboard.activate", "Activer"),
            delete: t("common.delete"),
            pendingBoosts: t("dashboard.pendingBoosts", "Visibilité après validation"),
            activeBoosts: t("dashboard.activeBoosts", "Boosts actifs"),
            expiredBoosts: t("dashboard.expiredBoosts", "Boosts expirés"),
            boostListing: t("dashboard.boostListing", "Booster"),
            boostPendingReviewNote: t(
              "dashboard.boostPendingReviewNote",
              "Les boosts « après publication » seront disponibles une fois l’annonce validée. Les options payées à l’envoi restent en attente ci-dessus.",
            ),
            listing: t("dashboard.listing", "Annonce"),
            price: t("dashboard.price", "Prix"),
            status: t("dashboard.status", "Statut"),
            views: t("dashboard.views", "Vues"),
            actions: "Actions",
            deleteConfirm: t("dashboard.deleteConfirm", "Supprimer cette annonce ?"),
            deleteDesc: t("dashboard.deleteDesc", "Cette action est irréversible. L'annonce et toutes ses photos seront définitivement supprimées."),
            cancel: t("common.cancel"),
            edit: t("dashboard.editListing", "Modifier"),
          }}
          onToggleStatus={(id, status) => toggleStatus.mutate({ id, status })}
          onDelete={(id) => deleteListing.mutate(id)}
        />

        <DashboardLeadsSection
          title={t("dashboard.leads", "Contacts reçus")}
          leadsLoading={leadsLoading}
          recentLeads={recentLeads}
          labels={{
            noLeads: t("dashboard.noLeads", "Aucun contact reçu pour le moment."),
            visitor: t("dashboard.visitor", "Visiteur"),
            listing: t("dashboard.listing", "Annonce"),
          }}
        />
      </div>
      <Footer />
    </>
  );
};

export default Dashboard;
