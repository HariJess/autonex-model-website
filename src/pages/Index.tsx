import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/HeroSearch";
import ListingCard from "@/components/ListingCard";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDbListings } from "@/hooks/useListings";
import { FeaturedListingsSection } from "@/components/monetization/FeaturedListingsSection";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { buildCanonicalUrl, toAbsoluteUrl, truncateMetaDescription } from "@/lib/seo";
import { PremiumStatePanel, PremiumStateSkeletonGrid } from "@/components/ui/premium-state";
import { FEATURED_MAKES } from "@/data/featuredMakes";
import { cn } from "@/lib/utils";
import { getDealMeta } from "@/lib/deals";

const Index = () => {
  const { t } = useTranslation();
  const canonical = buildCanonicalUrl("/");
  const seoTitle = "AutoNex — Automobile à Madagascar";
  const seoDescription = truncateMetaDescription(
    "AutoNex : annonces automobiles à Madagascar — achat, vente, voitures, 4x4, motos et utilitaires.",
  );
  const seoImage = toAbsoluteUrl("/blog-covers/location-antananarivo.jpg");
  const { data: listings = [], isLoading } = useDbListings({ limit: 8 });
  const { data: thematicListings = [], isLoading: themedLoading } = useDbListings({ limit: 32 });
  const { data: dealCandidates = [], isLoading: dealsLoading } = useDbListings({ limit: 48 });
  const heroCategoryShortcuts = useMemo(
    () => [
      {
        key: "suv-pickup",
        label: t("home.categorySuvPickup", "SUV & Pick-up"),
        to: "/recherche?vtype=suv_4x4,pick_up",
        iconSrc: "/category-icons/category-suv-pickup.svg.svg",
        iconAlt: t("home.categorySuvPickupAlt", "Silhouette SUV et Pick-up"),
      },
      {
        key: "berline",
        label: t("home.categorySedan", "Berline"),
        to: "/recherche?vtype=berline",
        iconSrc: "/category-icons/category-sedan.svg.svg",
        iconAlt: t("home.categorySedanAlt", "Silhouette berline"),
      },
      {
        key: "citadine",
        label: t("home.categoryCity", "Citadine"),
        to: "/recherche?vtype=citadine",
        iconSrc: "/category-icons/category-citadine.svg",
        iconAlt: t("home.categoryCityAlt", "Silhouette citadine"),
      },
      {
        key: "utilitaire",
        label: t("home.categoryUtility", "Utilitaire"),
        to: "/recherche?vtype=utilitaire_leger",
        iconSrc: "/category-icons/category-utilitaire.svg.svg",
        iconAlt: t("home.categoryUtilityAlt", "Silhouette utilitaire"),
      },
      {
        key: "scooter",
        label: t("home.categoryMoto", "Moto"),
        to: "/recherche?vtype=moto",
        iconSrc: "/category-icons/category-scooter.svg.svg",
        iconAlt: t("home.categoryMotoAlt", "Silhouette scooter"),
      },
    ],
    [t],
  );
  const popularBrands = useMemo(
    (): Array<{
      id: string;
      label: string;
      href: string;
      logoAsset: string | null | undefined;
      wrapperClassName?: string;
      logoClassName?: string;
    }> =>
      FEATURED_MAKES.map((make) => ({
        id: make.slug,
        label: make.name,
        href: `/recherche?brand=${encodeURIComponent(make.name)}`,
        logoAsset: make.logo,
      })),
    [],
  );
  const fourByFourAndPickup = useMemo(
    () =>
      thematicListings
        .filter((listing) => {
          const title = listing.title.toLowerCase();
          const drivetrain = listing.vehicle?.drivetrain?.toLowerCase() ?? "";
          const bodyStyle = listing.vehicle?.bodyStyle?.toLowerCase() ?? "";
          return (
            drivetrain.includes("4x4") ||
            bodyStyle.includes("4x4") ||
            bodyStyle.includes("pickup") ||
            bodyStyle.includes("pick-up") ||
            bodyStyle.includes("suv") ||
            title.includes("4x4") ||
            title.includes("pickup") ||
            title.includes("pick-up") ||
            title.includes("suv") ||
            listing.type === "villa" ||
            listing.type === "local_commercial"
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
          const bodyStyle = listing.vehicle?.bodyStyle?.toLowerCase() ?? "";
          return (
            bodyStyle.includes("citadine") ||
            bodyStyle.includes("crossover") ||
            bodyStyle.includes("berline") ||
            bodyStyle.includes("hatchback") ||
            bodyStyle.includes("suv urbain") ||
            title.includes("citadine") ||
            title.includes("urbain") ||
            title.includes("crossover") ||
            listing.type === "appartement" ||
            listing.type === "maison"
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
          const bodyStyle = listing.vehicle?.bodyStyle?.toLowerCase() ?? "";
          return (
            bodyStyle.includes("utilitaire") ||
            bodyStyle.includes("van") ||
            bodyStyle.includes("fourgon") ||
            bodyStyle.includes("minibus") ||
            bodyStyle.includes("bus") ||
            bodyStyle.includes("camion") ||
            listing.vehicle?.rentalMode?.toLowerCase() === "professionnel" ||
            title.includes("utilitaire") ||
            title.includes("van") ||
            title.includes("fourgon") ||
            title.includes("minibus") ||
            title.includes("bus") ||
            title.includes("camion") ||
            listing.type === "local_commercial" ||
            listing.type === "bureau"
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
          return (
            listing.vehicle?.isElectric === true ||
            listing.vehicle?.isHybrid === true ||
            fuel.includes("électrique") ||
            fuel.includes("electrique") ||
            fuel.includes("hybride")
          );
        })
        .slice(0, 4),
    [thematicListings],
  );
  const totalInventory = thematicListings.length;
  const isZeroInventory = !themedLoading && totalInventory === 0;
  const isLowInventory = !themedLoading && totalInventory > 0 && totalInventory <= 6;
  const themedSections = useMemo(
    () => [
      {
        id: "4x4-pickup",
        title: t("home.thematic4x4Title", "4x4 & Pick-up"),
        subtitle: t("home.thematic4x4Subtitle", "Terrain, robustesse et usages mixtes route/piste."),
        linksTo: "/recherche?vtype=suv_4x4,pick_up&drive=4x4",
        items: fourByFourAndPickup,
      },
      {
        id: "city-urban",
        title: t("home.thematicCityTitle", "Citadines & SUV urbains"),
        subtitle: t("home.thematicCitySubtitle", "Mobilité quotidienne, confort urbain et polyvalence."),
        linksTo: "/recherche?vtype=citadine,berline,crossover",
        items: cityAndUrbanSuv,
      },
      {
        id: "utility-fleet",
        title: t("home.thematicUtilityTitle", "Utilitaires, Vans & Minibus"),
        subtitle: t("home.thematicUtilitySubtitle", "Transport pro, logistique et activité passagers."),
        linksTo: "/recherche?vtype=utilitaire_leger,van_fourgon,minibus_bus,camion",
        items: utilityFleet,
      },
      {
        id: "electric-hybrid",
        title: t("home.thematicElectricTitle", "Électriques & hybrides"),
        subtitle: t("home.thematicElectricSubtitle", "Motorisations plus efficientes pour vos trajets."),
        linksTo: "/recherche?fuel=%C3%89lectrique,Hybride",
        items: electricHybrid,
      },
    ],
    [fourByFourAndPickup, cityAndUrbanSuv, utilityFleet, electricHybrid, t],
  );
  const themedSectionsToRender = useMemo(() => {
    if (themedLoading) return themedSections;
    const nonEmpty = themedSections.filter((section) => section.items.length > 0);
    if (isZeroInventory) return [];
    if (isLowInventory) return nonEmpty.slice(0, 2);
    return nonEmpty;
  }, [themedLoading, themedSections, isZeroInventory, isLowInventory]);
  const discountedListings = useMemo(
    () =>
      dealCandidates
        .map((listing) => ({ listing, deal: getDealMeta(listing) }))
        .filter((entry): entry is { listing: typeof dealCandidates[number]; deal: NonNullable<ReturnType<typeof getDealMeta>> } => Boolean(entry.deal))
        .sort((a, b) => b.deal.discountPercent - a.deal.discountPercent)
        .slice(0, 8),
    [dealCandidates],
  );
  const showDealsSection = !dealsLoading && discountedListings.length >= 3;
  const renderThematicSection = (title: string, subtitle: string, linksTo: string, items: typeof listings) => (
    <section className="container mx-auto px-4 py-5 md:py-6">
      <div className="flex items-start justify-between gap-3 mb-4 md:mb-5">
        <div className="min-w-0">
          <h3 className="font-serif text-lg md:text-2xl font-bold text-foreground leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground font-sans mt-1 leading-relaxed">{subtitle}</p>
        </div>
        <Link to={linksTo} className="text-primary font-sans text-sm font-medium hover:underline shrink-0 min-h-10 inline-flex items-center rounded-md motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2">
          {t("sections.viewMore", "Voir plus")}
        </Link>
      </div>
      {themedLoading ? (
        <PremiumStatePanel
          overline={t("home.collectionOverline", "Collection AutoNex")}
          title={t("home.collectionLoadingTitle", "Sélection en préparation")}
          description={t("home.collectionLoadingDesc", "Nous organisons cette collection pour vous proposer les annonces les plus pertinentes.")}
          icon={<Loader2 className="h-5 w-5 animate-spin text-primary" />}
          className="py-7"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "AutoNex",
            url: canonical,
            potentialAction: {
              "@type": "SearchAction",
              target: `${canonical.replace(/\/+$/, "")}/recherche?transaction={transaction}&ville={ville}&vtype={vtype}`,
              "query-input": ["required name=transaction", "optional name=ville", "optional name=vtype"],
            },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "AutoNex",
            url: canonical,
          })}
        </script>
      </Helmet>
      <Header />

      <HeroSearch />

      <section className="container mx-auto px-4 pt-10 md:pt-14">
        <div className="rounded-2xl border border-border/70 bg-background/95 px-3 py-4 md:px-6 md:py-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("home.quickExplore", "Explorer rapidement")}</p>
              <h2 className="font-serif text-lg md:text-2xl font-semibold mt-1">{t("home.mainCategories", "Catégories principales")}</h2>
            </div>
            <Link
              to="/recherche"
              className="hidden md:inline-flex items-center text-sm font-sans text-primary hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
            >
              {t("sections.viewAll", "Voir tout")}
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
            {heroCategoryShortcuts.map((shortcut) => (
              <Link
                key={shortcut.key}
                to={shortcut.to}
                className="group rounded-xl border border-border/60 bg-card/30 px-3 py-3 md:py-3.5 min-h-[96px] md:min-h-[104px] flex flex-col items-center justify-center gap-2.5 md:gap-3 text-center motion-safe:transition-colors hover:border-primary/40 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
              >
                <img
                  src={shortcut.iconSrc}
                  alt={shortcut.iconAlt}
                  loading="lazy"
                  className="h-9 md:h-10 w-auto object-contain opacity-90 group-hover:opacity-100 motion-safe:transition-opacity"
                  onError={(event) => {
                    const target = event.currentTarget;
                    if (!target.dataset.fallbackApplied) {
                      target.dataset.fallbackApplied = "1";
                      target.src = "/category-icons/category-citadine.svg";
                    }
                  }}
                />
                <span className="font-serif text-sm md:text-base text-foreground leading-tight">{shortcut.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pt-6 md:pt-8">
        <div className="py-1 md:py-2">
          <div className="mt-1 flex items-end justify-between gap-3">
            <h2 className="font-serif text-xl md:text-[2rem] font-semibold">{t("home.popularBrands", "Marques populaires")}</h2>
            <Link
              to="/recherche"
              className="hidden md:inline-flex items-center text-sm font-sans text-primary hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
            >
              {t("sections.viewAll", "Voir tout")}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-5 md:gap-x-6 md:gap-y-6">
            {popularBrands.map((brand) => (
              <Link
                key={brand.id}
                to={brand.href}
                className={cn(
                  "group rounded-lg px-3 py-3.5 min-h-[132px] w-[144px] md:min-h-[148px] md:w-[168px] flex flex-col items-center justify-center gap-2 text-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-[3px] hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
                  brand.wrapperClassName,
                )}
                aria-label={`Voir les annonces ${brand.label}`}
              >
                {brand.logoAsset ? (
                  <img
                    src={brand.logoAsset}
                    alt={`Logo ${brand.label}`}
                    loading="lazy"
                    className={cn(
                      "h-[3.1rem] md:h-[3.35rem] w-auto max-w-[168px] object-contain opacity-90 group-hover:opacity-100 motion-safe:transition-opacity",
                      brand.logoClassName,
                    )}
                  />
                ) : (
                  <span className="inline-flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full border border-border/60 bg-background text-xs font-semibold tracking-wide text-foreground/85">
                    {brand.label.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="font-sans text-[13px] md:text-xs font-medium tracking-[0.01em] text-foreground/75">
                  {brand.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FeaturedListingsSection
        enabled={MONETIZATION_PLACEMENTS.homeFeaturedRail}
        title={t("sections.featured", "À la une")}
        limit={8}
      />

      {showDealsSection && (
        <section className="container mx-auto px-4 pt-6 md:pt-8">
          <div className="flex items-end justify-between gap-3 mb-4 md:mb-5">
            <div className="min-w-0">
              <h2 className="font-serif text-xl md:text-3xl font-bold text-foreground leading-tight">
                {t("home.goodDealsTitle", "Bonnes affaires")}
              </h2>
              <p className="text-sm text-muted-foreground font-sans mt-1 leading-relaxed">
                {t("home.goodDealsSubtitle", "Annonces avec prix réellement réduits, vérifiés sur AutoNex.")}
              </p>
            </div>
            <Link
              to="/recherche?sort=recent"
              className="hidden md:inline-flex items-center text-sm font-sans text-primary hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
            >
              {t("sections.viewAll", "Voir tout")}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {discountedListings.map((entry) => (
              <ListingCard key={`deal-${entry.listing.id}`} listing={entry.listing} dealMeta={entry.deal} />
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="rounded-2xl border border-border/75 bg-gradient-to-br from-card via-card to-secondary/20 p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("home.estimationOverline", "Différenciateur AutoNex")}</p>
              <h2 className="mt-1 font-serif text-2xl text-foreground md:text-[2rem]">{t("home.estimationTitle", "Estimation: votre repère avant négociation")}</h2>
              <p className="mt-2 font-sans text-[14px] md:text-sm leading-relaxed text-muted-foreground">
                {t("home.estimationSupport", "Obtenez une fourchette argumentée, un niveau de confiance explicite et un rapport utile pour cadrer votre décision d'achat ou de vente.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button asChild className="gradient-primary border-0" style={{ color: "#FAFAFA" }}>
                <Link to="/estimation" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 rounded-md">{t("home.launchEstimation", "Lancer l’estimation")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/recherche" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 rounded-md">{t("home.compareListings", "Comparer les annonces")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Recent feed — complementary to “À la une” */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-start justify-between gap-3 mb-5 md:mb-8">
          <h2 className="font-serif text-xl md:text-3xl font-bold text-foreground leading-tight">{t("sections.latest", "Nouvelles annonces auto")}</h2>
          <Link to="/recherche" className="text-primary font-sans text-sm font-medium flex items-center gap-1 hover:underline shrink-0 min-h-10 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2">
            {t("sections.viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            <PremiumStatePanel
              overline={t("home.marketFeedOverline", "Flux marché")}
              title={t("home.marketFeedLoadingTitle", "Chargement des nouvelles annonces")}
              description={t("home.marketFeedLoadingDesc", "Nous mettons à jour les dernières publications pour vous donner une vue actuelle du marché.")}
              icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
              className="py-8"
            />
            <PremiumStateSkeletonGrid count={4} />
          </div>
        ) : listings.length === 0 ? (
          <PremiumStatePanel
            overline={t("home.marketFeedOverline", "Flux marché")}
            title={t("home.noListings", "Le catalogue AutoNex démarre. Publiez le premier véhicule !")}
            description={t("home.noListingsDesc", "Découvrez déjà la recherche et nos catégories, puis lancez votre première annonce pour activer le marché.")}
            action={
              <div className="flex flex-wrap justify-center gap-2.5">
                <Button asChild className="gradient-primary border-0" style={{ color: "#FAFAFA" }}>
                  <Link to="/publier" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 rounded-md">{t("home.publishVehicle", "Publier mon véhicule")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/recherche" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 rounded-md">{t("home.exploreMarket", "Explorer le marché")}</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {themedSectionsToRender.map((section) =>
        renderThematicSection(section.title, section.subtitle, section.linksTo, section.items),
      )}

      {isLowInventory && themedSectionsToRender.length === 0 && (
        <section className="container mx-auto px-4 py-5 md:py-6">
          <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6">
            <h3 className="font-serif text-lg md:text-xl font-bold text-foreground">{t("home.marketStarting", "Le marché se lance")}</h3>
            <p className="text-sm text-muted-foreground font-sans mt-1.5 leading-relaxed">
              {t("home.lowInventoryDesc", "L’inventaire est encore limité. Publiez votre véhicule ou explorez les recherches pour suivre les nouvelles annonces.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button asChild className="gradient-primary border-0" style={{ color: "#FAFAFA" }}>
                <Link to="/publier" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 rounded-md">{t("home.publishVehicle", "Publier mon véhicule")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/recherche" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 rounded-md">{t("home.seeListings", "Voir les annonces")}</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
};

export default Index;
