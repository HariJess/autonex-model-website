import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDbListings } from "@/hooks/useListings";
import { BannerSlot } from "@/components/monetization/BannerSlot";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { buildCanonicalUrl, composePageTitle, toAbsoluteUrl, truncateMetaDescription } from "@/lib/seo";
import { applyImageFallback } from "@/lib/imageFallback";

const AgencyProfile = () => {
  const { slug } = useParams();
  const { t } = useTranslation();

  const { data: agency, isLoading: agencyLoading, error: agencyError } = useQuery({
    queryKey: ["agency", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!slug,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: agentIds = [] } = useQuery({
    queryKey: ["agency-agents", agency?.id],
    queryFn: async () => {
      if (!agency?.id) return [];
      const { data, error } = await supabase.rpc("list_agency_agent_ids", {
        p_agency_id: agency.id,
      });
      if (error) throw new Error(error.message);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!agency?.id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: listings = [], isLoading: listingsLoading } = useDbListings(
    agentIds.length > 0 ? { ownerIds: agentIds } : { ownerIds: ["__none__"] }
  );

  if (agencyLoading) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </>
    );
  }

  if (agencyError) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">{t("common.error")}</h1>
          <p className="text-muted-foreground font-sans mb-6">{(agencyError as Error).message}</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!agency) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">{t("agencies.notFound")}</h1>
          <p className="text-muted-foreground font-sans mb-6">{t("agencies.notFoundDesc")}</p>
          <Link to="/agences">
            <Button className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>{t("agencies.viewAll")}</Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }
  const canonical = buildCanonicalUrl(`/agence/${agency.slug}`);
  const seoTitle = composePageTitle(`${agency.name} — Concessionnaire automobile`);
  const seoDescription = truncateMetaDescription(
    `${agency.name} : ${agency.bio || "concessionnaire automobile a Madagascar"} — ${listings.length} annonce${listings.length > 1 ? "s" : ""} active${listings.length > 1 ? "s" : ""}.`,
  );
  const seoImage = toAbsoluteUrl(agency.logo_url || "/placeholder.svg");
  const agencyJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: agency.name,
    url: canonical,
    logo: seoImage,
    image: seoImage,
    description: agency.bio || undefined,
    telephone: agency.phone || undefined,
    email: agency.email || undefined,
  };

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonical} />
        {seoImage && <meta property="og:image" content={seoImage} />}
        <script type="application/ld+json">
          {JSON.stringify(agencyJsonLd)}
        </script>
      </Helmet>
      <Header />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {MONETIZATION_PLACEMENTS.agencyStrip && (
          <div className="mb-8">
            <BannerSlot
              title="Visibilité concessionnaire sur AutoNex"
              subtitle="Packages marque, spotlight et diffusion multi-villes — contact commercial pour un plan sur mesure."
              href="/publier"
              ctaLabel="Booster ma visibilité"
            />
          </div>
        )}
        <div className="bg-card rounded-2xl border border-border p-5 sm:p-8 flex flex-col md:flex-row items-center gap-5 sm:gap-6 mb-8">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border border-border flex-shrink-0 bg-muted flex items-center justify-center">
            {agency.logo_url ? (
              <img
                src={agency.logo_url}
                alt={agency.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => applyImageFallback(e.currentTarget)}
              />
            ) : (
              <span className="font-serif text-2xl font-bold text-muted-foreground">{agency.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h1 className="font-serif text-2xl font-bold">{agency.name}</h1>
              {agency.verified && <Badge className="bg-success font-sans text-xs" style={{ color: "#FAFAFA" }}>{t("listing.verified")}</Badge>}
            </div>
            <p className="text-muted-foreground font-sans mt-2">{agency.bio || t("agencies.noDescription")}</p>
            {agency.phone && <p className="text-sm font-sans text-muted-foreground mt-2">📞 {agency.phone}</p>}
            {agency.email && <p className="text-sm font-sans text-muted-foreground">✉️ {agency.email}</p>}
            <p className="text-sm font-sans text-primary mt-1">
              {t("agencies.activeListings", { count: listings.length })}
            </p>
          </div>
        </div>

        <h2 className="font-serif text-xl font-bold mb-4">{t("agencies.listingsOf", { name: agency.name })}</h2>
        {listingsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : listings.length === 0 ? (
          <p className="text-muted-foreground font-sans py-8 text-center">{t("agencies.noListings")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} agencyName={agency.name} agencyLogo={agency.logo_url ?? undefined} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default AgencyProfile;
