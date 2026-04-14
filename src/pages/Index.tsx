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
import {
  AUTO_DISCOVERY_CATEGORIES,
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
        <Link to={linksTo} className="text-primary font-sans text-sm font-medium hover:underline shrink-0 min-h-10 inline-flex items-center">
          Voir plus
        </Link>
      </div>
      {themedLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
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
      </Helmet>
      <Header />

      <HeroSearch />

      <FeaturedListingsSection
        enabled={MONETIZATION_PLACEMENTS.homeFeaturedRail}
        title={t("sections.featured", "À la une")}
        limit={8}
      />

      {/* Recent feed — complementary to “À la une” */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-start justify-between gap-3 mb-5 md:mb-8">
          <h2 className="font-serif text-xl md:text-3xl font-bold text-foreground leading-tight">{t("sections.latest", "Nouvelles annonces auto")}</h2>
          <Link to="/recherche" className="text-primary font-sans text-sm font-medium flex items-center gap-1 hover:underline shrink-0 min-h-10">
            {t("sections.viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-border/80 bg-card p-6 md:p-8 text-center">
            <p className="text-base font-serif text-foreground">
              {t("home.noListings", "Le catalogue AutoNex démarre. Publiez le premier véhicule !")}
            </p>
            <p className="text-sm text-muted-foreground font-sans mt-2 leading-relaxed max-w-xl mx-auto">
              Découvrez déjà la recherche et nos catégories, puis lancez votre première annonce pour activer le marché.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Button asChild className="gradient-primary border-0" style={{ color: "#FAFAFA" }}>
                <Link to="/publier">Publier un véhicule</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/recherche">Explorer la recherche</Link>
              </Button>
            </div>
          </div>
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
            <h3 className="font-serif text-lg md:text-xl font-bold text-foreground">Le marché se lance</h3>
            <p className="text-sm text-muted-foreground font-sans mt-1.5 leading-relaxed">
              L’inventaire est encore limité. Publiez votre véhicule ou explorez les recherches pour suivre les nouvelles annonces.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button asChild className="gradient-primary border-0" style={{ color: "#FAFAFA" }}>
                <Link to="/publier">Publier maintenant</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/recherche">Voir les annonces</Link>
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
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-2 min-h-10 hover:border-primary/35 transition-colors"
              >
                {categoryIcon(category.iconKey)}
                <span className="text-xs font-semibold text-foreground">{category.label}</span>
                <span className="text-[10px] text-muted-foreground">{categoryToken(category.iconKey)}</span>
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
