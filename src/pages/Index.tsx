import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/HeroSearch";
import ListingCard from "@/components/ListingCard";
import { ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { useDbListings } from "@/hooks/useListings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { villes } from "@/data/madagascar-locations";
import { seedBlogPosts } from "@/data/seed-listings";
import { BannerSlot } from "@/components/monetization/BannerSlot";
import { PremiumBillboard } from "@/components/monetization/PremiumBillboard";
import { FeaturedListingsSection } from "@/components/monetization/FeaturedListingsSection";
import { FeaturedAgenciesSection } from "@/components/monetization/FeaturedAgenciesSection";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";

const Index = () => {
  const { t } = useTranslation();
  const { data: listings = [], isLoading, error: listingsError } = useDbListings({ limit: 8 });

  const { data: villeCounts = {} } = useQuery({
    queryKey: ["ville-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("ville")
        .eq("status", "active");
      const counts: Record<string, number> = {};
      data?.forEach((l) => {
        if (l.ville) counts[l.ville] = (counts[l.ville] ?? 0) + 1;
      });
      return counts;
    },
  });

  return (
    <>
      <Helmet>
        <title>ImmoNex Madagascar — Portail immobilier N°1</title>
        <meta name="description" content="Trouvez votre futur chez-vous à Madagascar. Vente, location dans toutes les villes." />
      </Helmet>
      <Header />

      <HeroSearch />

      {MONETIZATION_PLACEMENTS.homeSponsorStrip && (
        <section className="container mx-auto px-4 pt-6 pb-2">
          <BannerSlot enabled />
        </section>
      )}

      {MONETIZATION_PLACEMENTS.homeBillboard && <PremiumBillboard className="py-8" enabled />}

      <FeaturedListingsSection
        enabled={MONETIZATION_PLACEMENTS.homeFeaturedRail}
        title={t("sections.featured", "À la une")}
        limit={8}
      />

      {MONETIZATION_PLACEMENTS.homeNativeMid && (
        <section className="container mx-auto px-4 py-6">
          <BannerSlot
            title="Visibilité native"
            subtitle="Formats sponsorisés intégrés au flux — moins intrusifs, plus performants pour les annonceurs."
            ctaLabel="Découvrir les formats"
            href="/publier"
          />
        </section>
      )}

      {/* Recent feed — complementary to “À la une” */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{t("sections.latest", "Récemment publiées")}</h2>
          <Link to="/recherche" className="text-primary font-sans text-sm font-medium flex items-center gap-1 hover:underline">
            {t("sections.viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : listingsError ? (
          <div className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-muted-foreground font-sans">{t("common.error")}</p>
          </div>
        ) : listings.length === 0 ? (
          <p className="text-center text-muted-foreground font-sans py-12">
            {t("home.noListings", "Aucune annonce pour le moment. Soyez le premier à publier !")}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* Cities */}
      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">{t("sections.cities", "Nos villes")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {villes.map((ville) => {
              const count = villeCounts[ville.name] ?? 0;
              return (
                <Link key={ville.name} to={`/recherche?ville=${ville.name}`} className="group relative rounded-2xl overflow-hidden aspect-[3/2]">
                  <img src={ville.image} alt={ville.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <h3 className="font-serif font-bold text-lg" style={{ color: "#FAFAFA" }}>{ville.name}</h3>
                    <p className="text-xs font-sans opacity-80" style={{ color: "#FAFAFA" }}>{ville.description} • {count} annonce{count !== 1 ? "s" : ""}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <FeaturedAgenciesSection title={t("sections.agencies")} enabled limit={12} />

      {/* Blog — uses seed data consistently */}
      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{t("sections.blog")}</h2>
            <Link to="/conseils" className="text-primary font-sans text-sm font-medium flex items-center gap-1 hover:underline">
              {t("sections.viewAll")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {seedBlogPosts.slice(0, 3).map((post) => (
              <Link key={post.id} to={`/conseils/${post.slug}`} className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all">
                <div className="aspect-video overflow-hidden">
                  <img src={post.cover} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-5 space-y-2">
                  <span className="text-xs font-sans font-medium text-primary">{post.category}</span>
                  <h3 className="font-serif font-semibold text-foreground leading-tight">{post.title}</h3>
                  <p className="text-sm font-sans text-muted-foreground line-clamp-2">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Index;
