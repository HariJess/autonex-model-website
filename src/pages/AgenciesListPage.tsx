import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AgenciesListPage = () => {
  const { t } = useTranslation();
  const canonical = typeof window !== "undefined"
    ? `${window.location.origin}/agences`
    : "https://immonex.mg/agences";

  const { data: agencies = [], isLoading, error } = useQuery({
    queryKey: ["agencies-list"],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from("agencies")
        .select("id, name, slug, logo_url, bio, verified")
        .order("name");
      if (fetchError) throw new Error(fetchError.message);
      return data ?? [];
    },
  });

  return (
    <>
      <Helmet>
        <title>{t("agencies.title")} — ImmoNex</title>
        <meta
          name="description"
          content="Annuaire des agences immobilières à Madagascar : comparez les agences, consultez leurs annonces et contactez-les directement."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <Header />
      <div className="container mx-auto px-4 py-6 md:py-8">
        <h1 className="font-serif text-3xl font-bold mb-8">{t("agencies.pageTitle")}</h1>

        {error && (
          <div className="flex items-center gap-2 text-destructive mb-4">
            <AlertCircle className="h-5 w-5" />
            <p className="font-sans text-sm">{(error as Error).message}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : agencies.length === 0 ? (
          <p className="text-center text-muted-foreground font-sans py-12">{t("agencies.noAgencies")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agencies.map((agency) => (
              <Link key={agency.id} to={`/agence/${agency.slug}`}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all flex items-start gap-4 group">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-border flex-shrink-0 bg-muted flex items-center justify-center">
                  {agency.logo_url ? (
                    <img
                      src={agency.logo_url}
                      alt={agency.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="font-serif text-xl font-bold text-muted-foreground">{agency.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-serif font-bold group-hover:text-primary transition-colors">{agency.name}</h3>
                    {agency.verified && <Badge className="bg-success text-xs font-sans" style={{ color: "#FAFAFA" }}>{t("listing.verified")}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground font-sans line-clamp-2">{agency.bio || t("agencies.noDescription")}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default AgenciesListPage;
