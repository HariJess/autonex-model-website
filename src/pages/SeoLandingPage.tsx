import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useDbListings } from "@/hooks/useListings";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { PremiumStatePanel, PremiumStateSkeletonGrid } from "@/components/ui/premium-state";
import { buildCanonicalUrl, composePageTitle, truncateMetaDescription } from "@/lib/seo";
import {
  getCategoryCityLanding,
  getCategoryLandingBySlug,
  getCityLandingBySlug,
  getTransactionLandingBySlug,
  SEO_P1_CATEGORIES,
  SEO_P1_CITIES,
  SEO_P1_TRANSACTIONS,
} from "@/lib/seoP1Registry";
import { AlertTriangle, Home, ChevronRight, Link2 } from "lucide-react";
import { SearchErrorState } from "@/pages/search/components/SearchErrorState";

type LandingKind = "transaction" | "category" | "city" | "category-city";

const MAX_LISTINGS = 24;

const SeoLandingPage = () => {
  const params = useParams();

  const landing = useMemo(() => {
    if (params.transactionSlug) {
      const tx = getTransactionLandingBySlug(params.transactionSlug);
      if (!tx) return null;
      return {
        kind: "transaction" as LandingKind,
        title: tx.title,
        label: tx.label,
        intro: tx.intro,
        canonicalPath: `/${tx.slug}`,
        inventoryFloor: 0,
        listingFilters: { transaction: tx.transaction, limit: MAX_LISTINGS },
        parentCanonicalPath: "/",
        parentLabel: "Accueil",
      };
    }

    if (params.categorySlug && params.citySlug) {
      const category = getCategoryLandingBySlug(params.categorySlug);
      const city = getCityLandingBySlug(params.citySlug);
      const combo = getCategoryCityLanding(params.categorySlug, params.citySlug);
      if (!category || !city || !combo) return null;
      return {
        kind: "category-city" as LandingKind,
        title: combo.title,
        label: `${category.label} - ${city.city}`,
        intro: combo.intro,
        canonicalPath: `/vehicules/${category.slug}/ville/${city.slug}`,
        inventoryFloor: combo.inventoryFloor,
        listingFilters: { vehicleTypes: [category.vehicleTypeId], ville: city.city, limit: MAX_LISTINGS },
        parentCanonicalPath: `/vehicules/${category.slug}`,
        parentLabel: category.label,
      };
    }

    if (params.categorySlug) {
      const category = getCategoryLandingBySlug(params.categorySlug);
      if (!category) return null;
      return {
        kind: "category" as LandingKind,
        title: category.title,
        label: category.label,
        intro: category.intro,
        canonicalPath: `/vehicules/${category.slug}`,
        inventoryFloor: 0,
        listingFilters: { vehicleTypes: [category.vehicleTypeId], limit: MAX_LISTINGS },
        parentCanonicalPath: "/",
        parentLabel: "Accueil",
      };
    }

    if (params.citySlug) {
      const city = getCityLandingBySlug(params.citySlug);
      if (!city) return null;
      return {
        kind: "city" as LandingKind,
        title: city.title,
        label: city.city,
        intro: city.intro,
        canonicalPath: `/ville/${city.slug}`,
        inventoryFloor: city.inventoryFloor,
        listingFilters: { ville: city.city, limit: MAX_LISTINGS },
        parentCanonicalPath: "/",
        parentLabel: "Accueil",
      };
    }

    return null;
  }, [params]);

  const { data: listings = [], isLoading, error, refetch } = useDbListings(landing?.listingFilters ?? { limit: 0 });

  if (!landing) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-12">
          <PremiumStatePanel
            overline="AutoNex SEO"
            title="Page introuvable"
            description="Cette landing SEO n'est pas active dans la whitelist P1."
            icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          />
        </div>
        <Footer />
      </>
    );
  }

  const canonical = buildCanonicalUrl(landing.canonicalPath);
  const shouldIndex = listings.length >= landing.inventoryFloor;
  const robots = shouldIndex ? "index,follow" : "noindex,follow";
  const fallbackCanonical = buildCanonicalUrl(landing.parentCanonicalPath);
  const finalCanonical = shouldIndex ? canonical : fallbackCanonical;

  const seoDescription = truncateMetaDescription(
    `${landing.title}. ${landing.intro} ${
      shouldIndex
        ? `${listings.length} annonce${listings.length > 1 ? "s" : ""} actuellement disponible${listings.length > 1 ? "s" : ""}.`
        : "La page est conservée comme hub UX mais n'est pas indexée tant que l'inventaire reste insuffisant."
    }`,
  );
  const seoTitle = composePageTitle(landing.title);
  const searchHref = useMemo(() => {
    const params = new URLSearchParams();
    if (landing.listingFilters.transaction) params.set("transaction", landing.listingFilters.transaction);
    if (landing.listingFilters.ville) params.set("ville", landing.listingFilters.ville);
    if (landing.listingFilters.vehicleTypes && landing.listingFilters.vehicleTypes.length > 0) {
      params.set("vtype", landing.listingFilters.vehicleTypes.join(","));
    }
    const qs = params.toString();
    return qs ? `/recherche?${qs}` : "/recherche";
  }, [landing.listingFilters]);

  const relatedLinks = [
    ...SEO_P1_TRANSACTIONS.slice(0, 3).map((entry) => ({
      href: `/${entry.slug}`,
      label: entry.label,
    })),
    ...SEO_P1_CATEGORIES.slice(0, 6).map((entry) => ({
      href: `/vehicules/${entry.slug}`,
      label: entry.label,
    })),
    ...SEO_P1_CITIES.slice(0, 3).map((entry) => ({
      href: `/ville/${entry.slug}`,
      label: entry.city,
    })),
  ].filter((link) => link.href !== landing.canonicalPath);

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={finalCanonical} />
        <meta name="robots" content={robots} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={finalCanonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: landing.title,
            description: seoDescription,
            url: finalCanonical,
            mainEntity: {
              "@type": "ItemList",
              itemListElement: listings.slice(0, 12).map((listing, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                url: buildCanonicalUrl(`/annonce/${listing.id}`),
                name: listing.title,
              })),
            },
          })}
        </script>
      </Helmet>

      <Header />

      <div className="container mx-auto px-4 pt-4 pb-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link to="/" className="hover:text-primary inline-flex items-center gap-1">
            <Home className="h-3 w-3" />
            Accueil
          </Link>
          <ChevronRight className="h-3 w-3" />
          {landing.parentCanonicalPath !== "/" ? (
            <>
              <Link to={landing.parentCanonicalPath} className="hover:text-primary">
                {landing.parentLabel}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          ) : null}
          <span className="text-foreground">{landing.label}</span>
        </nav>

        <section className="rounded-2xl border border-border/70 bg-card/70 p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Landing P1 AutoNex</p>
          <h1 className="font-serif text-2xl md:text-3xl font-bold mb-2">{landing.title}</h1>
          <p className="font-sans text-muted-foreground leading-relaxed">{landing.intro}</p>
          {!shouldIndex && landing.inventoryFloor > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-sans text-amber-700 dark:text-amber-300">
              Cette page reste visible pour la navigation mais passe en noindex tant que l'inventaire est inférieur au
              seuil ({landing.inventoryFloor}) afin d'eviter les pages SEO faibles.
            </div>
          ) : null}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl font-semibold">
              {isLoading ? "Annonces en chargement..." : `${listings.length} annonce${listings.length > 1 ? "s" : ""}`}
            </h2>
            <Link
              to={searchHref}
              className="text-sm text-primary hover:underline"
            >
              Ouvrir dans la recherche
            </Link>
          </div>

          {isLoading ? (
            <PremiumStateSkeletonGrid count={6} />
          ) : error ? (
            <SearchErrorState
              message="Les annonces ne peuvent pas être chargées pour le moment."
              onRetry={() => {
                void refetch();
              }}
            />
          ) : listings.length === 0 ? (
            <PremiumStatePanel
              overline="Inventaire"
              title="Aucune annonce disponible"
              description="Cette landing reste en place pour la navigation interne. Elle ne sera indexable qu'avec un stock suffisant."
              icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-border/70 bg-card/60 p-4 md:p-5">
          <div className="inline-flex items-center gap-2 text-sm font-sans text-muted-foreground mb-3">
            <Link2 className="h-4 w-4" />
            Liens utiles P1
          </div>
          <div className="flex flex-wrap gap-2">
            {relatedLinks.slice(0, 12).map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="rounded-full border border-border/80 px-3 py-1.5 text-sm font-sans hover:bg-secondary transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/estimation"
              className="rounded-full border border-primary/40 px-3 py-1.5 text-sm font-sans text-primary hover:bg-primary/10 transition-colors"
            >
              Estimation AutoNex
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
};

export default SeoLandingPage;

