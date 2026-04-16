import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/HeroSearch";
import ListingCard from "@/components/ListingCard";
import { ChevronRight, Loader2, Car, Bike, Truck, BusFront, ShieldCheck, RotateCw, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDbListings } from "@/hooks/useListings";
import { FeaturedListingsSection } from "@/components/monetization/FeaturedListingsSection";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { buildCanonicalUrl, toAbsoluteUrl, truncateMetaDescription } from "@/lib/seo";
import { PremiumStatePanel, PremiumStateSkeletonGrid } from "@/components/ui/premium-state";
import {
  AUTO_DISCOVERY_CATEGORIES,
  AUTO_HOMEPAGE_BRANDS,
} from "@/data/automotiveCatalog";

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
  const compactCategoryLinks = useMemo(
    () =>
      AUTO_DISCOVERY_CATEGORIES.filter((category) =>
        ["suv4x4", "pickup", "citadine", "crossover", "utilitaire-leger", "van-fourgon", "electrique", "hybride"].includes(category.id),
      ),
    [],
  );
  const heroCategoryShortcuts = useMemo(
    () => [
      {
        key: "suv-pickup",
        label: "SUV & Pick-up",
        to: "/recherche?vtype=suv_4x4,pick_up",
        iconSrc: "/category-icons/category-suv-pickup.svg",
        iconAlt: "Silhouette SUV et Pick-up",
      },
      {
        key: "berline",
        label: "Berline",
        to: "/recherche?vtype=berline",
        iconSrc: "/category-icons/category-sedan.svg",
        iconAlt: "Silhouette berline",
      },
      {
        key: "citadine",
        label: "Citadine",
        to: "/recherche?vtype=citadine",
        iconSrc: "/category-icons/category-citadine.svg",
        iconAlt: "Silhouette citadine",
      },
      {
        key: "utilitaire",
        label: "Utilitaire",
        to: "/recherche?vtype=utilitaire_leger",
        iconSrc: "/category-icons/category-utilitaire.svg",
        iconAlt: "Silhouette utilitaire",
      },
      {
        key: "scooter",
        label: "Moto",
        to: "/recherche?vtype=moto",
        iconSrc: "/category-icons/category-scooter.svg",
        iconAlt: "Silhouette scooter",
      },
    ],
    [],
  );
  const popularBrands = useMemo(() => {
    const curatedBrandIds = [
      "toyota",
      "nissan",
      "hyundai",
      "mazda",
      "suzuki",
      "ford",
      "mitsubishi",
      "isuzu",
    ];
    const brandLogoById: Record<string, string> = {
      toyota: "/brands/toyota.svg",
      nissan: "/brands/nissan.svg",
      hyundai: "/brands/hyundai.svg",
      mazda: "/brands/mazda.svg",
      suzuki: "/brands/suzuki.svg",
      ford: "/brands/ford.svg",
      mitsubishi: "/brands/mitsubishi.svg",
      isuzu: "/brands/isuzu.svg",
    };
    const curatedSet = new Set(curatedBrandIds);
    return AUTO_HOMEPAGE_BRANDS.filter((brand) => curatedSet.has(brand.id)).map((brand) => ({
      ...brand,
      logoAsset: brandLogoById[brand.id] ?? brand.logoAsset,
    }));
  }, []);
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
        title: "4x4 & Pick-up",
        subtitle: "Terrain, robustesse et usages mixtes route/piste.",
        linksTo: "/recherche?drive=4x4&type=villa&type=local_commercial",
        items: fourByFourAndPickup,
      },
      {
        id: "city-urban",
        title: "Citadines & SUV urbains",
        subtitle: "Mobilité quotidienne, confort urbain et polyvalence.",
        linksTo: "/recherche?type=appartement&type=maison&type=villa",
        items: cityAndUrbanSuv,
      },
      {
        id: "utility-fleet",
        title: "Utilitaires, Vans & Minibus",
        subtitle: "Transport pro, logistique et activité passagers.",
        linksTo: "/recherche?type=local_commercial&type=bureau",
        items: utilityFleet,
      },
      {
        id: "electric-hybrid",
        title: "Électriques & hybrides",
        subtitle: "Motorisations plus efficientes pour vos trajets.",
        linksTo: "/recherche?fuel=%C3%89lectrique&fuel=Hybride",
        items: electricHybrid,
      },
    ],
    [fourByFourAndPickup, cityAndUrbanSuv, utilityFleet, electricHybrid],
  );
  const themedSectionsToRender = useMemo(() => {
    if (themedLoading) return themedSections;
    const nonEmpty = themedSections.filter((section) => section.items.length > 0);
    if (isZeroInventory) return [];
    if (isLowInventory) return nonEmpty.slice(0, 2);
    return nonEmpty;
  }, [themedLoading, themedSections, isZeroInventory, isLowInventory]);
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
  const renderThematicSection = (title: string, subtitle: string, linksTo: string, items: typeof listings) => (
    <section className="container mx-auto px-4 py-5 md:py-6">
      <div className="flex items-start justify-between gap-3 mb-4 md:mb-5">
        <div className="min-w-0">
          <h3 className="font-serif text-lg md:text-2xl font-bold text-foreground leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground font-sans mt-1 leading-relaxed">{subtitle}</p>
        </div>
        <Link to={linksTo} className="text-primary font-sans text-sm font-medium hover:underline shrink-0 min-h-10 inline-flex items-center rounded-md motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2">
          Voir plus
        </Link>
      </div>
      {themedLoading ? (
        <PremiumStatePanel
          overline="Collection AutoNex"
          title="Sélection en préparation"
          description="Nous organisons cette collection pour vous proposer les annonces les plus pertinentes."
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
              target: `${canonical.replace(/\/+$/, "")}/recherche?transaction={transaction}&ville={ville}&type={type}`,
              "query-input": ["required name=transaction", "optional name=ville", "optional name=type"],
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
              <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t("home.quickExplore", "Explorer rapidement")}</p>
              <h2 className="font-serif text-lg md:text-2xl font-semibold mt-1">{t("home.mainCategories", "Catégories principales")}</h2>
            </div>
            <Link
              to="/recherche"
              className="hidden md:inline-flex items-center text-sm font-sans text-primary hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
            >
              Voir tout
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
                />
                <span className="font-serif text-sm md:text-base text-foreground leading-tight">{shortcut.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pt-6 md:pt-8">
        <div className="rounded-2xl border border-border/70 bg-background/95 px-3 py-4 md:px-6 md:py-5">
          <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t("home.brandNavigation", "Navigation par marque")}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h2 className="font-serif text-lg md:text-2xl font-semibold">{t("home.popularBrands", "Marques populaires")}</h2>
            <Link
              to="/recherche"
              className="hidden md:inline-flex items-center text-sm font-sans text-primary hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
            >
              Voir tout
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
            {popularBrands.map((brand) => (
              <Link
                key={brand.id}
                to={brand.href}
                className="group rounded-xl border border-border/60 bg-card/30 px-2.5 py-3 md:py-3.5 min-h-[94px] flex items-center justify-center text-center motion-safe:transition-colors hover:border-primary/40 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
                aria-label={`Voir les annonces ${brand.label}`}
                title={brand.label}
              >
                {brand.logoAsset ? (
                  <img
                    src={brand.logoAsset}
                    alt={`Logo ${brand.label}`}
                    loading="lazy"
                    className="h-8 md:h-9 w-auto object-contain opacity-90 group-hover:opacity-100 motion-safe:transition-opacity"
                  />
                ) : (
                  <span className="inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full border border-border/60 bg-background text-[11px] md:text-xs font-semibold tracking-wide text-foreground/85">
                    {brand.label.slice(0, 2).toUpperCase()}
                  </span>
                )}
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

      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="rounded-2xl border border-border/75 bg-gradient-to-br from-card via-card to-secondary/20 p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t("home.estimationOverline", "Différenciateur AutoNex")}</p>
              <h2 className="mt-1 font-serif text-2xl text-foreground md:text-[2rem]">{t("home.estimationTitle", "Estimation: votre repère avant négociation")}</h2>
              <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                Obtenez une fourchette argumentée, un niveau de confiance explicite et un rapport utile pour cadrer votre décision d'achat ou de vente.
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
              overline="Flux marché"
              title="Chargement des nouvelles annonces"
              description="Nous mettons à jour les dernières publications pour vous donner une vue actuelle du marché."
              icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
              className="py-8"
            />
            <PremiumStateSkeletonGrid count={4} />
          </div>
        ) : listings.length === 0 ? (
          <PremiumStatePanel
            overline="Flux marché"
            title={t("home.noListings", "Le catalogue AutoNex démarre. Publiez le premier véhicule !")}
            description="Découvrez déjà la recherche et nos catégories, puis lancez votre première annonce pour activer le marché."
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
              L’inventaire est encore limité. Publiez votre véhicule ou explorez les recherches pour suivre les nouvelles annonces.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button asChild className="gradient-primary border-0" style={{ color: "#FAFAFA" }}>
                <Link to="/publier" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 rounded-md">{t("home.publishVehicle", "Publier mon véhicule")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/recherche" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 rounded-md">Voir les annonces</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-5 md:py-6">
        <div className="rounded-2xl border border-border/70 bg-card/95 p-3.5 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-sans mr-1">Catégories rapides</span>
            {compactCategoryLinks.map((category) => (
              <Link
                key={category.id}
                to={category.href}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-2 min-h-10 hover:border-primary/35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
              >
                {categoryIcon(category.iconKey)}
                <span className="text-xs font-semibold text-foreground">{category.label}</span>
                <span className="text-[10px] text-muted-foreground">{categoryToken(category.iconKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8 md:pb-12">
        <div className="rounded-2xl border border-border/75 bg-gradient-to-br from-background via-background to-secondary/20 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Parcours conseillé</p>
              <p className="mt-1 font-serif text-xl text-foreground">Explorez, estimez, puis passez à l’action</p>
              <p className="mt-1 font-sans text-sm text-muted-foreground">Un flux simple pour comparer le marché, valider le bon prix et publier avec confiance.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button asChild variant="outline">
                <Link to="/recherche" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 rounded-md">{t("home.exploreMarket", "Explorer le marché")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/estimation" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 rounded-md">Estimer le véhicule</Link>
              </Button>
              <Button asChild className="gradient-primary border-0" style={{ color: "#FAFAFA" }}>
                <Link to="/publier" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 rounded-md">Publier mon annonce</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Index;
