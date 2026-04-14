import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type ListingRow = Pick<
  Tables<"listings">,
  "id" | "title" | "owner_id" | "ville" | "transaction" | "type" | "created_at" | "pending_boost_types"
>;

function AdminModerationPage() {
  const { data: pendingListings = [], isLoading, error } = useQuery({
    queryKey: ["admin-moderation-pending-listings-basic"],
    queryFn: async (): Promise<ListingRow[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, owner_id, ville, transaction, type, created_at, pending_boost_types")
        .eq("status", "pending_review")
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return (
    <>
      <Helmet>
        <title>Admin — Modération — AutoNex</title>
      </Helmet>
      <div className="space-y-5">
        <div>
          <h1 className="font-serif text-2xl font-bold">Modération</h1>
          <p className="text-sm text-muted-foreground font-sans">
            Annonces actuellement en attente de revue (`pending_review`).
          </p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">File de modération</CardTitle>
            <CardDescription className="font-sans">
              Les actions d’approbation/refus restent centralisées dans la section monétisation pour cette V1.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button variant="outline" size="sm" className="font-sans" asChild>
                <Link to="/admin/monetisation">Ouvrir les actions de modération</Link>
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
              </div>
            ) : error ? (
              <p className="text-sm text-destructive font-sans">
                {error instanceof Error ? error.message : "Erreur de chargement"}
              </p>
            ) : pendingListings.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">Aucune annonce en attente.</p>
            ) : (
              <ul className="space-y-3">
                {pendingListings.map((l) => (
                  <li key={l.id} className="rounded-xl border border-border p-4 font-sans text-sm space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link to={`/annonce/${l.id}`} className="font-medium hover:text-primary transition-colors">
                        {l.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {l.created_at ? new Date(l.created_at).toLocaleString("fr-MG") : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {l.type} · {l.transaction} · {l.ville ?? "Ville non renseignée"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Propriétaire: {l.owner_id}
                      {Array.isArray(l.pending_boost_types) && l.pending_boost_types.length > 0
                        ? ` · Boosts demandés: ${JSON.stringify(l.pending_boost_types)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default AdminModerationPage;
