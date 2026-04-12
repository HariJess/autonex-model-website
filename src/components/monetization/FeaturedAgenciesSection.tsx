import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FeaturedPill } from "./MonetizationLabels";

interface FeaturedAgenciesSectionProps {
  title?: string;
  enabled?: boolean;
  limit?: number;
  /** Embedded = compact card for listing detail (no full-bleed band). */
  variant?: "page" | "embedded";
}

export function FeaturedAgenciesSection({
  title = "Agences partenaires",
  enabled = true,
  limit = 12,
  variant = "page",
}: FeaturedAgenciesSectionProps) {
  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ["agencies-monetization", limit, variant],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data: spotlight, error: e1 } = await supabase
        .from("agencies")
        .select("id, name, slug, logo_url, verified, spotlight_until")
        .gte("spotlight_until", nowIso)
        .order("name")
        .limit(limit);
      if (e1) throw new Error(e1.message);
      const spot = spotlight ?? [];
      if (spot.length >= limit) return spot.slice(0, limit);

      const { data: rest, error: e2 } = await supabase
        .from("agencies")
        .select("id, name, slug, logo_url, verified, spotlight_until")
        .order("verified", { ascending: false })
        .order("name")
        .limit(limit * 2);
      if (e2) throw new Error(e2.message);

      const seen = new Set(spot.map((a) => a.id));
      const merged = [...spot];
      for (const a of rest ?? []) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        merged.push(a);
        if (merged.length >= limit) break;
      }
      return merged;
    },
    enabled,
  });

  if (!enabled) return null;

  const inner = (
    <>
      <div className={`flex items-center gap-3 mb-6 ${variant === "page" ? "justify-center" : "justify-start flex-wrap"}`}>
        <h2
          className={`font-serif font-bold text-foreground ${variant === "embedded" ? "text-lg md:text-xl" : "text-2xl md:text-3xl text-center"}`}
        >
          {title}
        </h2>
        <FeaturedPill label="Réseau" />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : agencies.length === 0 ? (
        <p className="text-center text-muted-foreground font-sans">Les agences inscrites apparaîtront ici.</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-8 md:gap-10">
          {agencies.map((agency) => (
            <Link key={agency.id} to={`/agence/${agency.slug}`} className="flex flex-col items-center gap-2 group max-w-[100px]">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border shadow-sm group-hover:shadow-md transition-shadow bg-muted flex items-center justify-center">
                {agency.logo_url ? (
                  <img src={agency.logo_url} alt={agency.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-xl font-bold text-muted-foreground">{agency.name.charAt(0)}</span>
                )}
              </div>
              <span className="text-xs font-sans font-medium text-foreground text-center leading-tight">{agency.name}</span>
              {agency.verified && <span className="text-[10px] text-success font-sans">Vérifiée</span>}
            </Link>
          ))}
        </div>
      )}
    </>
  );

  if (variant === "embedded") {
    return <div className="rounded-2xl border border-border bg-secondary/20 p-5 md:p-6">{inner}</div>;
  }

  return (
    <section className="bg-secondary/40 py-14">
      <div className="container mx-auto px-4">{inner}</div>
    </section>
  );
}
