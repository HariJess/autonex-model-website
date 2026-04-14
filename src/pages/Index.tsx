import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/HeroSearch";
import ListingCard from "@/components/ListingCard";
import { ChevronRight, Loader2, Car, Bike, Truck, BusFront, ShieldCheck, RotateCw, CalendarClock } from "lucide-react";
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
import {
  AUTO_DISCOVERY_CATEGORIES,
  type AutoDiscoveryCategory,
} from "@/data/automotiveCatalog";

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
  const { data: thematicListings = [], isLoading: themedLoading } = useDbListings({ limit: 32 });
  const compactCategoryLinks = useMemo(
    () =>
      AUTO_DISCOVERY_CATEGORIES.filter((category) =>
        ["suv4x4", "pickup", "citadine", "crossover", "utilitaire-leger", "van-fourgon", "electrique", "hybride"].includes(category.id),
      ),
    [],
  );
  const fourByFourAndPickup = useMemo(
    () =>
      thematicListings
        .filter((listing) => {
          const title = listing.title.toLowerCase();
          const drivetrain = listing.vehicle?.drivetrain?.toLowerCase() ?? "";
          return (
            listing.type === "villa" ||
            listing.type === "local_commercial" ||
            drivetrain.includes("4x4") ||
            title.includes("4x4") ||
            title.includes("pickup") ||
            title.includes("pick-up") ||
            title.includes("suv")
          );
        })
        .slice(0, 4),
    [thematicListings],
  );
  const cityAndUrbanSuv = useMemo(
    () =>
      thematicListings
        .filter((listing) => {
          const title = listing.title.toLowerCase();
          return (
            listing.type === "appartement" ||
            listing.type === "maison" ||
            title.includes("citadine") ||
            title.includes("urbain") ||
            title.includes("crossover")
          );
        })
        .slice(0, 4),
    [thematicListings],
  );
  const utilityFleet = useMemo(
    () =>
      thematicListings
        .filter((listing) => {
          const title = listing.title.toLowerCase();
          return (
            listing.type === "local_commercial" ||
            listing.type === "bureau" ||
            title.includes("utilitaire") ||
            title.includes("van") ||
            title.includes("fourgon") ||
            title.includes("minibus") ||
            title.includes("bus") ||
            title.includes("camion")
          );
        })
        .slice(0, 4),
    [thematicListings],
  );
  const electricHybrid = useMemo(
    () =>
      thematicListings
        .filter((listing) => {
          const fuel = listing.vehicle?.fuel?.toLowerCase() ?? "";
          return fuel.includes("électrique") || fuel.includes("electrique") || fuel.includes("hybride");
        })
        .slice(0, 4),
    [thematicListings],
  );
  const categoryGroups: { id: string; label: string; items: AutoDiscoveryCategory[] }[] = [
    {
      id: "carrosseries",
      label: "Carrosseries principales",
      items: AUTO_DISCOVERY_CATEGORIES.filter((category) =>
        ["citadine", "berline", "suv4x4", "crossover", "pickup", "coupe", "cabriolet"].includes(category.id),
      ),
    },
    {
      id: "deux-roues",
      label: "Deux-roues et loisirs",
      items: AUTO_DISCOVERY_CATEGORIES.filter((category) => ["moto", "scooter", "quad", "buggy"].includes(category.id)),
    },
    {
      id: "utilitaires",
      label: "Utilitaires et transport",
      items: AUTO_DISCOVERY_CATEGORIES.filter((category) => ["utilitaire-leger", "van-fourgon", "minibus", "camion"].includes(category.id)),
    },
    {
      id: "modes",
      label: "Energie, etat et mode",
      items: AUTO_DISCOVERY_CATEGORIES.filter((category) =>
        ["electrique", "hybride", "hybride-rechargeable", "thermique", "neuf", "occasion", "loc-courte", "loc-longue"].includes(category.id),
      ),
    },
  ];
  const categoryIcon = (iconKey?: string) => {
    if (iconKey === "moto" || iconKey === "scooter") return <Bike className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "pickup" || iconKey === "camion" || iconKey === "utilitaire") return <Truck className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "van") return <Truck className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "bus") return <BusFront className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "new") return <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "used") return <RotateCw className="h-4 w-4 text-primary" aria-hidden />;
    if (iconKey === "rent-short" || iconKey === "rent-long") return <CalendarClock className="h-4 w-4 text-primary" aria-hidden />;
    return <Car className="h-4 w-4 text-primary" aria-hidden />;
  };
  const categoryToken = (iconKey?: string) => {
    const tokens: Record<string, string> = {
      citadine: "CT",
      berline: "BR",
      suv: "SV",
      crossover: "CR",
      pickup: "PU",
      coupe: "CP",
      cabriolet: "CB",
      moto: "MT",
      scooter: "SC",
      quad: "QD",
      buggy: "BG",
      utilitaire: "UL",
      van: "VF",
      bus: "MB",
      camion: "CM",
      electrique: "EV",
      hybride: "HY",
      "hybride-rechargeable": "PHEV",
      thermique: "TH",
      new: "N",
      used: "OCC",
      "rent-short": "LCD",
      "rent-long": "LLD",
    };
    return tokens[iconKey ?? ""] ?? "VN";
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

  const renderThematicSection = (title: string, subtitle: string, linksTo: string, items: typeof listings) => (
    <section className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-serif text-xl md:text-2xl font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground font-sans mt-1">{subtitle}</p>
        </div>
        <Link to={linksTo} className="text-primary font-sans text-sm font-medium hover:underline">
          Voir plus
        </Link>
      </div>
      {themedLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-6 text-center">
          <p className="text-sm font-sans text-muted-foreground">Aucune annonce pour cette sélection pour le moment.</p>
          <Link to="/publier" className="inline-flex mt-3 text-primary text-sm font-semibold hover:underline">
            Publier le premier véhicule
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((listing) => (
            <ListingCard key={`${title}-${listing.id}`} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );

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

      {renderThematicSection(
        "4x4 & Pick-up",
        "Terrain, robustesse et usages mixtes route/piste.",
        "/recherche?drive=4x4&type=villa&type=local_commercial",
        fourByFourAndPickup,
      )}

      {renderThematicSection(
        "Citadines & SUV urbains",
        "Mobilité quotidienne, confort urbain et polyvalence.",
        "/recherche?type=appartement&type=maison&type=villa",
        cityAndUrbanSuv,
      )}

      {renderThematicSection(
        "Utilitaires, Vans & Minibus",
        "Transport pro, logistique et activité passagers.",
        "/recherche?type=local_commercial&type=bureau",
        utilityFleet,
      )}

      {renderThematicSection(
        "Électriques & hybrides",
        "Motorisations plus efficientes pour vos trajets.",
        "/recherche?fuel=%C3%89lectrique&fuel=Hybride",
        electricHybrid,
      )}

      <section className="container mx-auto px-4 py-6">
        <div className="rounded-2xl border border-border/70 bg-card/95 p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-sans mr-1">Catégories rapides</span>
            {compactCategoryLinks.map((category) => (
              <Link
                key={category.id}
                to={category.href}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 hover:border-primary/35 transition-colors"
              >
                {categoryIcon(category.iconKey)}
                <span className="text-xs font-semibold text-foreground">{category.label}</span>
                <span className="text-[10px] text-muted-foreground">{categoryToken(category.iconKey)}</span>
              </Link>
            ))}
          </div>
        </div>
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
            <h3 className="font-serif text-xl font-bold">Véhicules neufs & certifiés</h3>
            <p className="text-sm text-muted-foreground font-sans mt-2 mb-4">
              Comparez les offres récentes, les faibles kilométrages et les annonces sous garanties.
            </p>
            <Link to="/recherche?condition=neuf&seller=concessionnaire" className="text-primary font-sans text-sm font-semibold hover:underline">
              Voir les offres neuf
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
