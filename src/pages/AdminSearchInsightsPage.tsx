import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { WheelSpinner } from "@/components/ui/wheel-spinner";

const AdminSearchInsightsPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-search-analytics"],
    queryFn: async () => {
      const { data: rows, error: qErr } = await supabase
        .from("search_analytics_events")
        .select(
          "id, created_at, ville, quartiers, transaction_type, exact_result_count, had_zero_exact, showed_similar_fallback, showed_also_like, path",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (qErr) throw new Error(qErr.message);
      return rows ?? [];
    },
  });

  const errMsg = error instanceof Error ? error.message : error != null ? String(error) : "";

  return (
    <>
      <Helmet>
        <title>Admin — Recherche — AutoNex</title>
      </Helmet>
      <div className="max-w-6xl">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild className="font-sans">
            <Link to="/admin/overview">
              <ArrowLeft className="h-4 w-4 mr-1" /> Vue d’ensemble
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold">Signaux de recherche (aperçu)</h1>
        </div>
        <p className="text-sm text-muted-foreground font-sans mb-6 max-w-2xl">
          Données anonymisées : filtres utilisés, nombre de résultats exacts, recours aux suggestions. Base pour
          l’intelligence marché (quartiers demandés, recherches sans résultat).
        </p>

        {isLoading && (
          <div className="flex justify-center py-16">
            <WheelSpinner size="lg" />
          </div>
        )}

        {error && (
          <p className="text-destructive font-sans text-sm">
            {errMsg.includes("relation") || errMsg.includes("does not exist")
              ? "Table non disponible : appliquez la migration Supabase `search_analytics_events`."
              : errMsg}
          </p>
        )}

        {!isLoading && !error && data && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm font-sans">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Ville</th>
                  <th className="p-3 font-medium">Quartiers</th>
                  <th className="p-3 font-medium">Transaction</th>
                  <th className="p-3 font-medium text-right">Résultats</th>
                  <th className="p-3 font-medium">Zéro exact</th>
                  <th className="p-3 font-medium">Similaires</th>
                  <th className="p-3 font-medium">Aussi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {row.created_at ? new Date(row.created_at).toLocaleString("fr-MG") : "—"}
                    </td>
                    <td className="p-3">{row.ville ?? "—"}</td>
                    <td className="p-3 max-w-[200px] truncate" title={(row.quartiers ?? []).join(", ")}>
                      {(row.quartiers ?? []).length ? row.quartiers!.join(", ") : "—"}
                    </td>
                    <td className="p-3">{row.transaction_type ?? "—"}</td>
                    <td className="p-3 text-right">{row.exact_result_count}</td>
                    <td className="p-3">{row.had_zero_exact ? "oui" : "non"}</td>
                    <td className="p-3">{row.showed_similar_fallback ? "oui" : "non"}</td>
                    <td className="p-3">{row.showed_also_like ? "oui" : "non"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && (
              <p className="p-8 text-center text-muted-foreground font-sans">Aucun événement enregistré pour l’instant.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminSearchInsightsPage;
