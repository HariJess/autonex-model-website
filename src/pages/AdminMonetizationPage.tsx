import { Helmet } from "react-helmet-async";
import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatAriary } from "@/config/monetization";
import { invalidateCreditsBalanceQueries } from "@/lib/creditsBalance";
import { Loader2, Check, X } from "lucide-react";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import { Link } from "react-router-dom";

const AdminPricingEditor = lazy(
  () => import("@/components/admin/pricing/AdminPricingEditor"),
);
const AdminCreditPacksEditor = lazy(
  () => import("@/components/admin/pricing/AdminCreditPacksEditor"),
);
const AdminPromoCodesEditor = lazy(
  () => import("@/components/admin/promo/AdminPromoCodesEditor"),
);

function EditorFallback() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
      <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
    </div>
  );
}

type TxRow = Tables<"transactions">;
type ListingRow = Tables<"listings">;

const PENDING_PAYMENT_ACTIONABLE: Tables<"transactions">["status"][] = ["pending", "under_review"];
const FINAL_PAYMENT_STATES: Tables<"transactions">["status"][] = ["approved", "rejected", "cancelled", "failed", "success"];
const PENDING_PAYMENT: Tables<"transactions">["status"][] = ["pending", "under_review"];

async function proofSignedUrl(storagePath: string | null): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data.signedUrl;
}

const AdminMonetizationPage = () => {
  const queryClient = useQueryClient();
  const [rejectTxId, setRejectTxId] = useState<string | null>(null);
  const [rejectTxReason, setRejectTxReason] = useState("");
  const [rejectListingId, setRejectListingId] = useState<string | null>(null);
  const [rejectListingReason, setRejectListingReason] = useState("");

  const { data: pendingTx = [], isLoading: txLoading } = useQuery({
    queryKey: ["admin-pending-credit-tx"],
    queryFn: async (): Promise<TxRow[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .in("status", PENDING_PAYMENT)
        .not("credit_pack_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: finalizedTxCount = 0 } = useQuery({
    queryKey: ["admin-credit-tx-finalized-count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .in("status", FINAL_PAYMENT_STATES)
        .not("credit_pack_id", "is", null);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });

  const { data: packs = [] } = useQuery({
    queryKey: ["credit-packs-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_packs").select("id, name, credits_amount");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: pendingListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["admin-pending-listings"],
    queryFn: async (): Promise<ListingRow[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "pending_review")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const approveTx = useMutation({
    mutationFn: async ({ id }: { id: string; buyerId: string }) => {
      const { data, error } = await supabase.rpc("admin_approve_credit_transaction", {
        p_transaction_id: id,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, { buyerId }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-pending-credit-tx"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-credit-tx-finalized-count"] });
      void queryClient.invalidateQueries({ queryKey: ["pending-credit-purchases", buyerId] });
      void queryClient.invalidateQueries({ queryKey: ["credit-tx-history", buyerId] });
      void queryClient.invalidateQueries({ queryKey: ["my-credits-ledger", buyerId] });
      invalidateCreditsBalanceQueries(queryClient, buyerId);
      toast.success("Transaction approuvée — crédits crédités une fois.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectTx = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string; buyerId: string }) => {
      const { error } = await supabase.rpc("admin_reject_credit_transaction", {
        p_transaction_id: id,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { buyerId }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-pending-credit-tx"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-credit-tx-finalized-count"] });
      void queryClient.invalidateQueries({ queryKey: ["pending-credit-purchases", buyerId] });
      void queryClient.invalidateQueries({ queryKey: ["credit-tx-history", buyerId] });
      invalidateCreditsBalanceQueries(queryClient, buyerId);
      setRejectTxId(null);
      setRejectTxReason("");
      toast.success("Transaction rejetée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveListing = useMutation({
    mutationFn: async ({ id }: { id: string; ownerId: string }) => {
      const { error } = await supabase.rpc("admin_approve_listing_moderation", {
        p_listing_id: id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { ownerId }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-pending-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["my-listings", ownerId] });
      void queryClient.invalidateQueries({ queryKey: ["my-listing-boosts", ownerId] });
      void queryClient.invalidateQueries({ queryKey: ["featured-boost-listing-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["agencies-monetization"] });
      invalidateCreditsBalanceQueries(queryClient, ownerId);
      toast.success("Annonce publiée — boosts matérialisés.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectListing = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string; ownerId: string }) => {
      const { error } = await supabase.rpc("admin_reject_listing_moderation", {
        p_listing_id: id,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { ownerId }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-pending-listings"] });
      void queryClient.invalidateQueries({ queryKey: ["my-listings", ownerId] });
      void queryClient.invalidateQueries({ queryKey: ["my-credits-ledger", ownerId] });
      void queryClient.invalidateQueries({ queryKey: ["credit-tx-history", ownerId] });
      invalidateCreditsBalanceQueries(queryClient, ownerId);
      setRejectListingId(null);
      setRejectListingReason("");
      toast.success("Annonce refusée — remboursement crédits si applicable.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Helmet>
        <title>Admin — Monétisation — AutoNex</title>
      </Helmet>
      <div className="max-w-4xl space-y-10">
        <div>
          <h1 className="font-serif text-2xl font-bold">Monétisation (admin)</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Validation des achats de crédits et modération des annonces en attente. Les actions sont idempotentes côté serveur.
          </p>
          <div className="mt-3">
            <Button variant="outline" size="sm" className="font-sans" asChild>
              <Link to="/admin/partenaires">Gérer les campagnes partenaires</Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">Achats de crédits en attente</CardTitle>
            <CardDescription className="font-sans">
              Source de vérité : table `transactions` (demandes de packs avec `credit_pack_id` non nul).
              États à traiter ici : {PENDING_PAYMENT_ACTIONABLE.join(", ")}.
              États finalisés (hors file d’action) : {FINAL_PAYMENT_STATES.join(", ")}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground font-sans">
              En attente d’action : <span className="font-medium text-foreground">{pendingTx.length}</span> ·
              Finalisées (historique) : <span className="font-medium text-foreground">{finalizedTxCount}</span>
            </p>
            {txLoading ? (
              <WheelSpinner size="md" />
            ) : pendingTx.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">Aucune demande en attente.</p>
            ) : (
              <ul className="space-y-4">
                {pendingTx.map((tx) => (
                  <li key={tx.id} data-testid={`tx-row-${tx.id}`} data-tx-user={tx.user_id} className="rounded-xl border border-border p-4 space-y-2 font-sans text-sm">
                    <div className="flex flex-wrap gap-2 justify-between">
                      <span className="font-medium">{formatAriary(tx.amount_mga)}</span>
                      <span className="text-muted-foreground text-xs">{tx.reference ?? tx.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pack : {packs.find((p) => p.id === tx.credit_pack_id)?.name ?? tx.credit_pack_id} · Méthode :{" "}
                      {tx.method ?? "—"}
                    </p>
                    <p className="text-xs">Utilisateur : {tx.user_id}</p>
                    {tx.payment_proof_url && (
                      <OpenProofButton path={tx.payment_proof_url} />
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        data-testid="approve-tx-btn"
                        className="font-sans"
                        disabled={approveTx.isPending}
                        onClick={() => approveTx.mutate({ id: tx.id, buyerId: tx.user_id })}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approuver
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        data-testid="reject-tx-btn"
                        variant="destructive"
                        className="font-sans"
                        onClick={() => setRejectTxId(tx.id)}
                      >
                        <X className="h-4 w-4 mr-1" /> Rejeter
                      </Button>
                    </div>
                    {rejectTxId === tx.id && (
                      <div className="pt-2 space-y-2 border-t border-border mt-2">
                        <Label className="font-sans text-xs">Motif (optionnel)</Label>
                        <Textarea
                          value={rejectTxReason}
                          onChange={(e) => setRejectTxReason(e.target.value)}
                          rows={2}
                          className="font-sans text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid="confirm-reject-tx-btn"
                          className="font-sans"
                          disabled={rejectTx.isPending}
                          onClick={() =>
                            rejectTx.mutate({ id: tx.id, reason: rejectTxReason, buyerId: tx.user_id })
                          }
                        >
                          Confirmer le rejet
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">Annonces en modération</CardTitle>
            <CardDescription className="font-sans">
              Les crédits ont déjà été débités à la soumission. L’approbation active l’annonce et crée les lignes de boost.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {listingsLoading ? (
              <WheelSpinner size="md" />
            ) : pendingListings.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">Aucune annonce en attente.</p>
            ) : (
              <ul className="space-y-4">
                {pendingListings.map((l) => (
                  <li key={l.id} className="rounded-xl border border-border p-4 space-y-2 font-sans text-sm">
                    <p className="font-medium">{l.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.ville} · {l.publication_credits_charged ?? "—"} cr. prélevés · Vendeur {l.owner_id}
                    </p>
                    <p className="text-xs">
                      Boosts demandés :{" "}
                      {Array.isArray(l.pending_boost_types)
                        ? JSON.stringify(l.pending_boost_types)
                        : "—"}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        className="font-sans"
                        disabled={approveListing.isPending}
                        onClick={() => approveListing.mutate({ id: l.id, ownerId: l.owner_id ?? "" })}
                      >
                        <Check className="h-4 w-4 mr-1" /> Publier
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="font-sans"
                        onClick={() => setRejectListingId(l.id)}
                      >
                        <X className="h-4 w-4 mr-1" /> Refuser
                      </Button>
                    </div>
                    {rejectListingId === l.id && (
                      <div className="pt-2 space-y-2 border-t border-border mt-2">
                        <Label className="font-sans text-xs">Motif</Label>
                        <Textarea
                          value={rejectListingReason}
                          onChange={(e) => setRejectListingReason(e.target.value)}
                          rows={3}
                          className="font-sans text-sm"
                          placeholder="Expliquez la raison du refus au déposant…"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-sans"
                          disabled={rejectListing.isPending}
                          onClick={() =>
                            rejectListing.mutate({
                              id: l.id,
                              reason: rejectListingReason,
                              ownerId: l.owner_id ?? "",
                            })
                          }
                        >
                          Confirmer le refus (remboursement crédits si applicable)
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Suspense fallback={<EditorFallback />}>
          <AdminPricingEditor />
        </Suspense>

        <Suspense fallback={<EditorFallback />}>
          <AdminCreditPacksEditor />
        </Suspense>

        <Suspense fallback={<EditorFallback />}>
          <AdminPromoCodesEditor />
        </Suspense>
      </div>
    </>
  );
};

function OpenProofButton({ path }: { path: string }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["admin-proof-url", path],
    queryFn: () => proofSignedUrl(path),
    enabled: !!path,
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Preuve…</p>;
  if (!url) return <p className="text-xs text-destructive">Impossible de charger la preuve</p>;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline font-sans">
      Ouvrir la preuve (lien signé 1h)
    </a>
  );
}

export default AdminMonetizationPage;
