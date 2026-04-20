import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CarFront,
  DoorOpen,
  Gauge,
  Phone,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  MapPin,
  Loader2,
  Info,
  Video,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { applyImageFallback } from "@/lib/imageFallback";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";
import { NegotiableBadge } from "@/components/listings/NegotiableBadge";
import { buildCanonicalUrl } from "@/lib/seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ListingSponsorBlock,
  ListingRelatedPromoted,
  ListingPartnerAgencyStrip,
} from "@/components/monetization/ListingDetailPlacements";
import { useListingDetailPageData } from "@/pages/listing-detail/useListingDetailPageData";
import { useListingDetailContact } from "@/pages/listing-detail/useListingDetailContact";
import { buildListingDetailViewModel } from "@/pages/listing-detail/buildListingDetailViewModel";
import {
  LISTING_DETAIL_BADGE_CLASS,
  LISTING_DETAIL_BADGE_SUBTLE_CLASS,
  LISTING_WHATSAPP_BUTTON_CLASS,
} from "@/pages/listing-detail/listingDetailConstants";
import {
  ListingDetailLoading,
  ListingDetailFetchError,
  ListingDetailNotFound,
} from "@/pages/listing-detail/ListingDetailShellStates";

const ListingLocationMap = lazy(() => import("@/components/ListingLocationMap"));

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { formatPrice, formatPriceSecondary } = useCurrency();

  const [selectedImg, setSelectedImg] = useState(0);
  const [showAllSpecsMobile, setShowAllSpecsMobile] = useState(false);
  const [showAllFeaturesMobile, setShowAllFeaturesMobile] = useState(false);

  const { listing, isLoading, fetchError, refetch, filteredSimilar } = useListingDetailPageData(id);

  const contact = useListingDetailContact({
    listing: listing ?? undefined,
    user,
    isAdmin,
    navigate,
    location,
    t,
  });

  const isOwner = Boolean(user?.id && listing?.owner_id && user.id === listing.owner_id);

  const vm = useMemo(
    () =>
      listing
        ? buildListingDetailViewModel({
            listing,
            t,
            isOwner,
            showAllSpecsMobile,
            showAllFeaturesMobile,
          })
        : null,
    [listing, t, isOwner, showAllSpecsMobile, showAllFeaturesMobile],
  );

  useEffect(() => {
    if (!listing) return;
    const imageCount = listing.images.length > 0 ? listing.images.length : 1;
    if (selectedImg < imageCount) return;
    setSelectedImg(0);
  }, [listing, selectedImg]);

  if (isLoading) {
    return <ListingDetailLoading />;
  }

  if (fetchError && !listing) {
    return <ListingDetailFetchError onRetry={() => void refetch()} />;
  }

  if (!listing || !vm) {
    return <ListingDetailNotFound />;
  }

  const {
    transactionLabel,
    typeLabel,
    addressLine,
    mapPublic,
    hasApproxMap,
    canonicalVehicle,
    displayTitle,
    versionLabel,
    mileageLabel,
    doorsLabel,
    vehicleSummary,
    sellerLabel,
    vehicleSpecRows,
    visibleSpecRowsMobile,
    contactTrustHints,
    listingTrustProofs,
    ownerStatusHint,
    displayBrand,
    displayBrandAsset,
    allFeatureBadges,
    visibleFeatureBadgesMobile,
    activeDeal,
    canonical,
    listingTitle,
    listingDescription,
    seoImage,
    listingJsonLd,
  } = vm;

  const images = vm.images;
  const hasMultipleImages = vm.hasMultipleImages;

  const goToPreviousImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImg((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNextImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImg((prev) => (prev + 1) % images.length);
  };

  const {
    phoneRevealed,
    contactName,
    setContactName,
    contactEmail,
    setContactEmail,
    contactPhone,
    setContactPhone,
    contactMessage,
    setContactMessage,
    sending,
    contactSectionRef,
    displayedPhone,
    handleRevealPhone,
    handleContact,
    handleWhatsApp,
  } = contact;

  return (
    <>
      <Helmet>
        <title>{listingTitle}</title>
        <meta name="description" content={listingDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={listingTitle} />
        <meta property="og:description" content={listingDescription} />
        <meta property="og:url" content={canonical} />
        {seoImage && <meta property="og:image" content={seoImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={listingTitle} />
        <meta name="twitter:description" content={listingDescription} />
        {seoImage && <meta name="twitter:image" content={seoImage} />}
        <script type="application/ld+json">{JSON.stringify(listingJsonLd)}</script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: t("nav.home", "Accueil"), item: buildCanonicalUrl("/") },
              {
                "@type": "ListItem",
                position: 2,
                name: t("search.title", "Recherche"),
                item: buildCanonicalUrl("/recherche"),
              },
              { "@type": "ListItem", position: 3, name: displayTitle, item: canonical },
            ],
          })}
        </script>
      </Helmet>
      <Header />
      <div className="container mx-auto px-4 py-4 md:py-6 pb-32 lg:pb-6">
        <nav className="flex items-center gap-2 text-xs md:text-sm font-sans text-muted-foreground mb-4 md:mb-6 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-primary">
            {t("nav.home", "Accueil")}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/recherche" className="hover:text-primary">
            {t("search.title")}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{displayTitle}</span>
        </nav>

        {ownerStatusHint && (
          <Alert className="mb-6 rounded-2xl border-primary/30 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertTitle className="font-sans">{t("listing.ownerStatusTitle", "Statut de votre annonce")}</AlertTitle>
            <AlertDescription className="font-sans text-muted-foreground">{ownerStatusHint}</AlertDescription>
            {listing.pending_boost_types && listing.pending_boost_types.length > 0 && listing.status === "pending_review" && (
              <AlertDescription className="font-sans text-muted-foreground mt-2">
                {t(
                  "listing.pendingBoostsNote",
                  "Options de visibilité sélectionnées : {{list}} — elles seront appliquées après validation.",
                  { list: listing.pending_boost_types.join(", ") },
                )}
              </AlertDescription>
            )}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-secondary/20 p-4.5 md:p-6">
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <Badge variant="outline" className={cn("font-sans normal-case", LISTING_DETAIL_BADGE_CLASS)}>
                  {transactionLabel}
                </Badge>
                <Badge variant="outline" className={cn("font-sans normal-case", LISTING_DETAIL_BADGE_CLASS)}>
                  {typeLabel}
                </Badge>
                {canonicalVehicle.isElectric && (
                  <Badge variant="secondary" className={cn("font-sans normal-case", LISTING_DETAIL_BADGE_SUBTLE_CLASS)}>
                    {t("listing.electric", "Électrique")}
                  </Badge>
                )}
                {canonicalVehicle.isHybrid && (
                  <Badge variant="secondary" className={cn("font-sans normal-case", LISTING_DETAIL_BADGE_SUBTLE_CLASS)}>
                    {t("listing.hybrid", "Hybride")}
                  </Badge>
                )}
                {listing.badge && (
                  <Badge
                    className={`font-sans text-xs ${
                      listing.badge === "boost"
                        ? "gradient-primary"
                        : listing.badge === "urgent"
                          ? "bg-destructive"
                          : "bg-accent"
                    }`}
                    style={{ color: "#FAFAFA" }}
                  >
                    {listing.badge === "boost"
                      ? t("listing.boost")
                      : listing.badge === "urgent"
                        ? t("listing.urgent", "Urgent")
                        : t("listing.favorite")}
                  </Badge>
                )}
              </div>
              <h1 className="font-serif text-[1.45rem] leading-tight md:text-3xl font-bold text-foreground">{displayTitle}</h1>
              {vehicleSummary && (
                <p className="mt-1.5 text-[14px] text-muted-foreground font-sans leading-relaxed">{vehicleSummary}</p>
              )}
              {displayBrand && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card px-2.5 py-1.5">
                  <BrandLogo
                    brand={displayBrand}
                    className="h-8 w-12 rounded-md bg-background"
                    imgClassName="max-h-5"
                    showFallbackLabel={!displayBrandAsset?.logoPath}
                  />
                  <span className="text-[13px] md:text-xs font-medium font-sans text-muted-foreground">
                    {t("search.brand", "Marque")}: {displayBrand}
                  </span>
                </div>
              )}
              {listing.internal_ref && isOwner && (
                <p className="mt-2 text-xs text-muted-foreground font-sans">
                  {t("listing.internalRef", "Réf. interne : {{ref}}", { ref: listing.internal_ref })}
                </p>
              )}
              <p className="mt-2.5 flex items-center gap-1 text-sm text-muted-foreground font-sans">
                <MapPin className="h-4 w-4 shrink-0" />
                {addressLine || t("listing.addressUnknown", "Adresse non précisée")}
              </p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[1.65rem] md:text-[2rem] font-bold text-primary font-sans leading-tight">
                      {formatPrice(listing.price_mga)}
                    </p>
                    {listing.negotiable ? <NegotiableBadge size="md" /> : null}
                  </div>
                  {activeDeal ? (
                    <p className="text-sm text-muted-foreground font-sans line-through">
                      {formatPrice(activeDeal.originalPriceMga)}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground font-sans">{formatPriceSecondary(listing.price_mga)}</p>
                </div>
                {activeDeal ? (
                  <Badge className="bg-destructive text-xs font-semibold" style={{ color: "#FAFAFA" }}>
                    -{activeDeal.discountPercent}%
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  onClick={() => contactSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="hidden lg:inline-flex gradient-primary border-0 font-sans min-h-11 px-5 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
                  style={{ color: "#FAFAFA" }}
                >
                  {t("listing.contactSeller", "Contacter le vendeur")}
                </Button>
              </div>
            </section>

            <div className="space-y-2.5 md:space-y-3">
              <div className="rounded-2xl overflow-hidden aspect-video relative border border-border/70 shadow-sm">
                <img
                  src={images[selectedImg]}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                  decoding="async"
                  onError={(e) => applyImageFallback(e.currentTarget)}
                />
                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      onClick={goToPreviousImage}
                      className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/75 bg-card/90 text-foreground shadow-md backdrop-blur-sm transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 md:left-3 md:h-9 md:w-9"
                      aria-label={t("listing.galleryPrev", "Image précédente")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextImage}
                      className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/75 bg-card/90 text-foreground shadow-md backdrop-blur-sm transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 md:right-3 md:h-9 md:w-9"
                      aria-label={t("listing.galleryNext", "Image suivante")}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
                <div className="absolute left-3 bottom-3">
                  <Badge variant="secondary" className="font-sans text-xs bg-card/90">
                    {selectedImg + 1}/{images.length}
                  </Badge>
                </div>
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImg(i)}
                      aria-label={t("listing.galleryGoToImage", "Voir l’image {{index}}", { index: i + 1 })}
                      aria-pressed={i === selectedImg}
                      className={`w-20 h-14 rounded-lg overflow-hidden border-2 motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 flex-shrink-0 ${i === selectedImg ? "border-primary" : "border-transparent"}`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => applyImageFallback(e.currentTarget)}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {listingTrustProofs.length > 0 && (
              <section className="rounded-2xl border border-border/75 bg-card p-4.5 md:p-6">
                <h2 className="font-serif text-xl font-bold">{t("listing.trustLayerTitle", "Pourquoi cette annonce inspire confiance")}</h2>
                <p className="mt-1.5 text-sm font-sans text-muted-foreground">
                  {t("listing.trustLayerSubtitle", "Indicateurs utiles pour décider plus sereinement avant contact.")}
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {listingTrustProofs.map((proof) => (
                    <div key={proof} className="rounded-xl border border-border/70 bg-secondary/20 px-3 py-2.5">
                      <p className="inline-flex items-center gap-2 text-sm font-sans text-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {proof}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
              {versionLabel && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <CarFront className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold font-sans">{versionLabel}</p>
                    <p className="text-[13px] md:text-xs text-muted-foreground font-sans leading-relaxed">
                      {t("listing.rooms", "Version")} / {t("listing.trimFinish", "Finition")}
                    </p>
                  </div>
                </div>
              )}
              {mileageLabel && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Gauge className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold font-sans">{mileageLabel}</p>
                    <p className="text-[13px] md:text-xs text-muted-foreground font-sans">{t("search.surface", "Kilométrage")}</p>
                  </div>
                </div>
              )}
              {doorsLabel && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <DoorOpen className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold font-sans">{doorsLabel}</p>
                    <p className="text-[13px] md:text-xs text-muted-foreground font-sans">{t("listing.bathrooms", "Portes")}</p>
                  </div>
                </div>
              )}
              {canonicalVehicle.seats != null && canonicalVehicle.seats > 0 && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold font-sans">{canonicalVehicle.seats}</p>
                    <p className="text-[13px] md:text-xs text-muted-foreground font-sans">{t("listing.seats", "Places")}</p>
                  </div>
                </div>
              )}
            </div>
            {vehicleSpecRows.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-4.5 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CarFront className="h-5 w-5 text-primary" />
                  <h2 className="font-serif text-xl font-bold">{t("listing.vehicleSpecs", "Fiche véhicule")}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 md:gap-y-3">
                  {visibleSpecRowsMobile.map((spec) => (
                    <div key={spec.label} className="flex items-start justify-between gap-3 border-b border-border/70 pb-2">
                      <span className="text-sm font-sans text-muted-foreground">{spec.label}</span>
                      <span className="text-sm font-sans font-semibold text-foreground text-right capitalize">{spec.value}</span>
                    </div>
                  ))}
                </div>
                {vehicleSpecRows.length > 8 && (
                  <button
                    type="button"
                    className="mt-3 sm:hidden text-xs font-sans text-primary"
                    onClick={() => setShowAllSpecsMobile((prev) => !prev)}
                  >
                    {showAllSpecsMobile ? t("search.showLess", "Voir moins") : t("search.showMore", "Voir plus")}
                  </button>
                )}
              </section>
            )}

            {listing.description && (
              <section className="rounded-2xl border border-border/75 bg-card p-4.5 md:p-6">
                <h2 className="font-serif text-xl font-bold mb-3">{t("listing.description")}</h2>
                <p className="font-sans text-muted-foreground leading-relaxed whitespace-pre-line">{listing.description}</p>
              </section>
            )}

            {allFeatureBadges.length > 0 && (
              <section className="rounded-2xl border border-border/75 bg-card p-4.5 md:p-6">
                <h2 className="font-serif text-xl font-bold mb-3">{t("listing.features")}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {visibleFeatureBadgesMobile.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm font-sans">
                      <Check className="h-4 w-4 text-success" /> {f}
                    </div>
                  ))}
                </div>
                {allFeatureBadges.length > 8 && (
                  <button
                    type="button"
                    className="mt-3 sm:hidden text-xs font-sans text-primary"
                    onClick={() => setShowAllFeaturesMobile((prev) => !prev)}
                  >
                    {showAllFeaturesMobile ? t("search.showLess", "Voir moins") : t("search.showMore", "Voir plus")}
                  </button>
                )}
              </section>
            )}

            {(listing.video_url?.trim() || listing.virtual_tour_url?.trim()) && (
              <div>
                <h2 className="font-serif text-xl font-bold mb-3">{t("listing.mediaLinks", "Médias")}</h2>
                <div className="flex flex-wrap gap-3">
                  {listing.video_url?.trim() && (
                    <a
                      href={listing.video_url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-sans text-primary hover:underline"
                    >
                      <Video className="h-4 w-4 shrink-0" />
                      {t("listing.videoLink", "Vidéo")}
                    </a>
                  )}
                  {listing.virtual_tour_url?.trim() && (
                    <a
                      href={listing.virtual_tour_url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-sans text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      {t("listing.virtualTourLink", "Visite virtuelle")}
                    </a>
                  )}
                </div>
              </div>
            )}

            <ListingRelatedPromoted
              listingId={listing.id}
              ville={listing.ville}
              transaction={listing.transaction}
              type={listing.type}
            />
            <ListingPartnerAgencyStrip />
            <ListingSponsorBlock />

            <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="p-5 md:p-6 border-b border-border/80 bg-secondary/20">
                <h2 className="font-serif text-xl font-bold">{t("listing.locationMap", "Localisation")}</h2>
                <p className="text-[14px] text-muted-foreground font-sans mt-1.5 leading-relaxed">
                  {hasApproxMap
                    ? t(
                        "listing.locationApproxDesc",
                        "Zone approximative sur la carte (l’adresse exacte n’est pas affichée publiquement).",
                      )
                    : t("listing.locationNoCoords", "Aucune position carte n’a été enregistrée pour ce véhicule.")}
                </p>
              </div>
              <div className="p-4 md:p-5">
                {hasApproxMap && mapPublic ? (
                  <Suspense
                    fallback={
                      <div
                        className="h-[min(360px,55vh)] min-h-[240px] rounded-2xl bg-muted/40 flex items-center justify-center border border-border"
                        aria-busy
                      >
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }
                  >
                    <ListingLocationMap
                      lat={mapPublic.lat}
                      lng={mapPublic.lng}
                      title={listing.title}
                      addressLine={addressLine || undefined}
                    />
                  </Suspense>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/15 min-h-[200px] flex flex-col items-center justify-center text-center px-6 py-12">
                    <MapPin className="h-10 w-10 text-muted-foreground/80 mb-3" aria-hidden />
                    <p className="font-sans text-sm text-foreground max-w-md leading-relaxed">
                      {t(
                        "listing.mapFallback",
                        "La carte n’est pas disponible pour ce véhicule. L’adresse textuelle ci-dessus reste votre principal repère.",
                      )}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5 md:space-y-6">
            <div
              ref={contactSectionRef}
              id="listing-contact"
              className="rounded-2xl border border-border/75 bg-gradient-to-br from-card via-card to-secondary/20 p-4.5 md:p-6 space-y-4 lg:sticky lg:top-20 scroll-mt-24"
            >
              <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("listing.priorityContact", "Contact prioritaire")}</p>
              <div className="flex items-center gap-3">
                {listing.agency_logo ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-border">
                    <img
                      src={listing.agency_logo}
                      alt={listing.agency_name ?? ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => applyImageFallback(e.currentTarget)}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center border border-border">
                    <span className="font-serif text-lg font-bold text-muted-foreground">
                      {(listing.agency_name ?? listing.owner_name ?? "?").charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-sans text-xs text-muted-foreground">{t("listing.seller", "Vendeur")}</p>
                  <h3 className="font-serif font-bold">{listing.agency_name ?? listing.owner_name ?? t("listing.owner", "Vendeur")}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {sellerLabel && <Badge variant="outline" className="text-xs font-sans">{sellerLabel}</Badge>}
                    {listing.agency_verified && (
                      <Badge variant="secondary" className="text-xs font-sans">
                        {t("listing.verified", "Vérifié")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {contactTrustHints.length > 0 && (
                <div className="rounded-xl border border-border/80 bg-secondary/25 px-3 py-2.5">
                  {contactTrustHints.map((hint) => (
                    <p key={hint} className="inline-flex items-center gap-1.5 text-xs font-sans text-muted-foreground leading-relaxed mr-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      {hint}
                    </p>
                  ))}
                </div>
              )}

              <div className="hidden lg:grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  onClick={handleRevealPhone}
                  variant={phoneRevealed ? "outline" : "default"}
                  className={`w-full font-sans ${!phoneRevealed ? "gradient-primary border-0" : ""}`}
                  style={!phoneRevealed ? { color: "#FAFAFA" } : undefined}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {displayedPhone}
                </Button>
                {listing.has_whatsapp_contact ? (
                  <Button
                    type="button"
                    onClick={handleWhatsApp}
                    variant="outline"
                    className={cn("w-full font-sans", LISTING_WHATSAPP_BUTTON_CLASS)}
                    aria-label={t("listing.whatsappAria", "Contacter l’annonceur via WhatsApp")}
                  >
                    <FaWhatsapp className="shrink-0 text-[#25D366]" aria-hidden />
                    {t("listing.whatsapp", "WhatsApp")}
                  </Button>
                ) : null}
              </div>
              <p className="hidden lg:block text-xs font-sans text-muted-foreground">
                {t(
                  "listing.contactReassurance",
                  "Chaque action de contact est sécurisée et enregistrée pour garantir un échange fiable.",
                )}
              </p>

              <form onSubmit={handleContact} className="space-y-2.5 md:space-y-3">
                <h4 className="font-serif font-semibold">{t("listing.contact", "Écrire au vendeur")}</h4>
                <p className="hidden sm:block text-[13px] font-sans text-muted-foreground leading-relaxed">
                  {t("listing.contactHint", "Présentez votre besoin clairement pour obtenir une réponse plus rapide et utile.")}
                </p>
                <Input placeholder={t("auth.name")} value={contactName} onChange={(e) => setContactName(e.target.value)} className="font-sans min-h-11" maxLength={100} />
                <Input placeholder={t("auth.email")} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="font-sans min-h-11" maxLength={255} />
                <Input placeholder={t("auth.phone")} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="font-sans min-h-11" maxLength={30} />
                <Textarea placeholder={t("listing.yourMessage", "Votre message...")} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} className="font-sans min-h-24" rows={3} maxLength={1000} />
                <Button type="submit" disabled={sending} className="w-full gradient-primary border-0 font-sans focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2" style={{ color: "#FAFAFA" }}>
                  {sending ? t("common.loading") : t("listing.sendMessage", "Envoyer le message")}
                </Button>
                <p className="hidden sm:block text-[13px] font-sans text-muted-foreground leading-relaxed">
                  {t(
                    "listing.contactDecisionHint",
                    "Conseil: indiquez votre disponibilité, votre budget et votre canal préféré pour accélérer la réponse.",
                  )}
                </p>
              </form>

              {listing.agency_slug && (
                <Link to={`/agence/${listing.agency_slug}`} className="block text-center text-sm text-primary font-sans hover:underline">
                  {t("listing.viewAgencyListings", { name: listing.agency_name ?? "" })}
                </Link>
              )}
            </div>
          </div>
        </div>

        {filteredSimilar.length > 0 && (
          <section className="mt-16 border-t border-border/70 pt-10">
            <h2 className="font-serif text-2xl font-bold mb-1.5">{t("listing.similar")}</h2>
            <p className="mb-6 text-sm font-sans text-muted-foreground">
              {t("listing.similarHint", "Suggestions complémentaires pour élargir votre comparaison après avoir évalué cette annonce.")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredSimilar.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-8px_32px_rgba(0,0,0,0.12)] lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 px-4"
        role="region"
        aria-label={t("listing.contactActions", "Actions de contact")}
      >
        <div className="container mx-auto max-w-lg flex flex-col gap-1.5">
          <p className="px-0.5 font-sans text-xs text-muted-foreground">{t("listing.quickContact", "Contact rapide")}</p>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-sans min-h-12 touch-manipulation gap-2 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
              onClick={() => contactSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              {t("listing.contact", "Écrire au vendeur")}
            </Button>
            <Button
              type="button"
              onClick={handleRevealPhone}
              variant={phoneRevealed ? "outline" : "default"}
              className={`flex-1 min-w-0 font-sans text-xs sm:text-sm min-h-12 touch-manipulation gap-2 ${!phoneRevealed ? "gradient-primary border-0" : ""}`}
              style={!phoneRevealed ? { color: "#FAFAFA" } : undefined}
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span className="truncate">{displayedPhone}</span>
            </Button>
          </div>
          {listing.has_whatsapp_contact ? (
            <Button
              type="button"
              onClick={handleWhatsApp}
              variant="outline"
              className={cn("w-full font-sans min-h-12 touch-manipulation gap-2", LISTING_WHATSAPP_BUTTON_CLASS)}
              aria-label={t("listing.whatsappAria", "Contacter l’annonceur via WhatsApp")}
            >
              <FaWhatsapp className="shrink-0 text-[#25D366]" aria-hidden />
              {t("listing.whatsapp", "WhatsApp")}
            </Button>
          ) : null}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default ListingDetail;
