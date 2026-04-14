import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/HeroSearch";
import ListingCard from "@/components/ListingCard";
import { ChevronRight, Loader2, Car, Bike, Truck, BusFront, ShieldCheck, RotateCw, Globe } from "lucide-react";
import { fetchActiveListingCountsByVille, useDbListings } from "@/hooks/useListings";
import { useQuery } from "@tanstack/react-query";
import { villes } from "@/data/madagascar-locations";
import { seedBlogPosts } from "@/data/seed-listings";
import { BannerSlot } from "@/components/monetization/BannerSlot";
import { PremiumBillboard } from "@/components/monetization/PremiumBillboard";
import { FeaturedListingsSection } from "@/components/monetization/FeaturedListingsSection";
import { FeaturedAgenciesSection } from "@/components/monetization/FeaturedAgenciesSection";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { buildCanonicalUrl, toAbsoluteUrl, truncateMetaDescription } from "@/lib/seo";
import { applyImageFallback } from "@/lib/imageFallback";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";
import { AUTO_DISCOVERY_CATEGORIES, AUTO_TRANSACTION_MODES, TOP_AUTO_BRANDS } from "@/data/automotiveCatalog";

const Index = () => {
  const { t } = useTranslation();
  const cityImageFallback = "/placeholder.svg";
  const canonical = buildCanonicalUrl("/");
  const seoTitle = "AutoNex — Automobile à Madagascar";
  const seoDescription = truncateMetaDescription(
    "AutoNex : annonces automobiles à Madagascar — achat, vente, voitures, 4x4, motos et utilitaires.",
  );
  const seoImage = toAbsoluteUrl("/blog-covers/location-antananarivo.jpg");
  const { data: listings = [], isLoading } = useDbListings({ limit: 8 });
  const categoryIcon = (iconKey?: string) => {
    if (iconKey === "bike") return <Bike className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "truck") return <Truck className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "van") return <Truck className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "bus") return <BusFront className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "new") return <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "used") return <RotateCw className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "import") return <Globe className="h-4 w-4 text-primary" aria-hidden />;
    return <Car className="h-4 w-4 text-primary" aria-hidden />;
  };
  const homeSponsorEnabled = MONETIZATION_PLACEMENTS.homeSponsorStrip;
  const { data: homeSponsorCampaign } = usePartnerCampaign("homeSponsorStrip", homeSponsorEnabled);

  const { data: villeCounts = {} } = useQuery({
    queryKey: ["ville-counts", villes.map((v) => v.name).join("|")],
    queryFn: () => fetchActiveListingCountsByVille(villes.map((v) => v.name)),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {seoImage && <meta name="twitter:image" content={seoImage} />}
      </Helmet>
      <Header />

      <HeroSearch />

      <section className="container mx-auto px-4 pt-8 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {AUTO_TRANSACTION_MODES.map((mode) => (
            <Link
              key={mode.id}
              to={mode.href}
              className="rounded-2xl border border-border/80 bg-card hover:border-primary/30 hover:bg-primary/[0.03] transition-colors p-4 shadow-sm"
            >
              <p className="text-sm font-semibold font-sans text-foreground">{mode.label}</p>
              <p className="text-xs text-muted-foreground font-sans mt-1">
                {mode.id === "acheter" && "Explorez le stock actif par marque, budget et ville."}
                {mode.id === "vendre" && "Publiez rapidement votre véhicule avec un parcours guidé."}
                {mode.id === "location_courte" && "Trouver des véhicules pour quelques jours ou semaines."}
                {mode.id === "location_longue" && "Offres dédiées professionnels, long terme et flotte."}
                {mode.id === "import" && "Parcourez les véhicules neufs/importés et spécialistes."}
                {mode.id === "concessionnaires" && "Accédez aux professionnels vérifiés et à leur stock."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pt-8 pb-2">
        <div className="rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-sans mb-3">Explorer par catégorie</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {AUTO_DISCOVERY_CATEGORIES.map((category) => (
              <Link
                key={category.id}
                to={category.href}
                className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5 hover:border-primary/30 hover:bg-primary/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {categoryIcon(category.iconKey)}
                  <span className="text-xs font-semibold text-foreground">{category.label}</span>
                </div>
                {category.description && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{category.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        <div className="rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-sm">
          <h2 className="font-serif text-xl md:text-2xl font-bold mb-2">Marques populaires</h2>
          <p className="text-sm text-muted-foreground font-sans mb-4">
            Catalogue étendu voitures, utilitaires, premium, import et moto.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
            {TOP_AUTO_BRANDS.map((brand) => (
              <Link
                key={brand}
                to={`/recherche?brand=${encodeURIComponent(brand)}`}
                className="rounded-md border border-border bg-background px-2.5 py-2 text-xs font-semibold text-center text-foreground hover:border-primary/35 hover:text-primary transition-colors"
              >
                {brand}
              </Link>
            ))}
          </div>
          <Link
            to="/recherche"
            className="inline-flex mt-4 rounded-md border border-primary/25 bg-primary/[0.08] px-3 py-2 text-xs font-semibold text-primary"
          >
            Autres marques
          </Link>
        </div>
      </section>

      {homeSponsorEnabled && homeSponsorCampaign && (
        <section className="container mx-auto px-4 pt-6 pb-2">
          <BannerSlot
            enabled
            title={homeSponsorCampaign.advertiser_name}
            subtitle="Contenu sponsorisé"
            href={homeSponsorCampaign.destination_url}
            ctaLabel={homeSponsorCampaign.destination_url ? homeSponsorCampaign.cta_label?.trim() || "Découvrir" : null}
            imageUrl={homeSponsorCampaign.image_url}
          />
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
            title="Format partenaire natif"
            subtitle="Format sponsorisé intégré au flux, réservé aux campagnes partenaires gérées par AutoNex."
          />
        </section>
      )}

      {/* Recent feed — complementary to “À la une” */}
      <section className="container mx-auto px-4 py-10 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{t("sections.latest", "Nouvelles annonces auto")}</h2>
          <Link to="/recherche" className="text-primary font-sans text-sm font-medium flex items-center gap-1 hover:underline">
            {t("sections.viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : listings.length === 0 ? (
          <p className="text-center text-muted-foreground font-sans py-12">
            {t("home.noListings", "Aucune annonce auto pour le moment. Soyez le premier à publier un véhicule !")}
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
      <section className="bg-secondary/50 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">{t("sections.cities", "Explorer par ville")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {villes.map((ville) => {
              const count = villeCounts[ville.name] ?? 0;
              return (
                <Link key={ville.name} to={`/recherche?ville=${encodeURIComponent(ville.name)}`} className="group relative rounded-2xl overflow-hidden aspect-[3/2]">
                  <img
                    src={ville.image}
                    alt={ville.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      applyImageFallback(e.currentTarget, cityImageFallback);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <h3 className="font-serif font-bold text-lg" style={{ color: "#FAFAFA" }}>{ville.name}</h3>
                    <p className="text-xs font-sans opacity-80" style={{ color: "#FAFAFA" }}>{ville.description} • {count} véhicule{count !== 1 ? "s" : ""}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <FeaturedAgenciesSection title={t("sections.agencies")} enabled limit={12} />

      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-serif text-xl font-bold">Import & véhicules neufs</h3>
            <p className="text-sm text-muted-foreground font-sans mt-2 mb-4">
              Comparez les spécialistes import, les arrivages récents et les véhicules zéro km.
            </p>
            <Link to="/recherche?condition=neuf&seller=concessionnaire" className="text-primary font-sans text-sm font-semibold hover:underline">
              Voir les offres import/neuf
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-serif text-xl font-bold">Location courte & longue durée</h3>
            <p className="text-sm text-muted-foreground font-sans mt-2 mb-4">
              Louez pour un besoin ponctuel ou pour une durée prolongée selon votre activité.
            </p>
            <div className="flex gap-3">
              <Link to="/recherche?transaction=location_vacances" className="text-primary font-sans text-sm font-semibold hover:underline">
                Court terme
              </Link>
              <Link to="/recherche?transaction=location&rental_term=longue" className="text-primary font-sans text-sm font-semibold hover:underline">
                Long terme
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Blog — uses seed data consistently */}
      <section className="bg-secondary/50 py-12 md:py-16">
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
                  <img
                    src={post.cover}
                    alt={post.coverAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      applyImageFallback(e.currentTarget);
                    }}
                  />
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
