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
import { Bed, Bath, Maximize, Phone, ChevronRight, Check, MapPin, Loader2, AlertCircle, Info, Video, ExternalLink, MessageSquare, CarFront } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useListing, useDbListings } from "@/hooks/useListings";
import { LISTING_TYPE_LABELS, TRANSACTION_LABELS } from "@/types/listing";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { toast } from "sonner";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import { toApproximatePublicCoordinates } from "@/lib/mapPrivacy";
import { contactLeadSchema } from "@/lib/validation";
import { buildWhatsAppUrl } from "@/lib/whatsappUrl";
import { getSearchSessionId } from "@/lib/searchSession";
import { buildCanonicalUrl, composePageTitle, toAbsoluteUrl, truncateMetaDescription } from "@/lib/seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { applyImageFallback } from "@/lib/imageFallback";
import { cn } from "@/lib/utils";
import {
  formatVehicleDoors,
  formatVehicleMileage,
  formatVehicleVersion,
  getVehicleDisplayTitle,
  getVehicleHeadline,
  getVehicleDoorsValue,
  getVehicleMileageValue,
  getVehicleVersionValue,
} from "@/lib/vehiclePresentation";
import {
  ListingSponsorBlock,
  ListingRelatedPromoted,
  ListingPartnerAgencyStrip,
} from "@/components/monetization/ListingDetailPlacements";

const ListingLocationMap = lazy(() => import("@/components/ListingLocationMap"));

/** Outline + hover/focus accents only; brand green is on the FaWhatsapp icon. */
const LISTING_WHATSAPP_BUTTON_CLASS =
  "border-emerald-200/85 bg-background text-foreground hover:bg-emerald-50/85 hover:border-emerald-300/95 hover:text-foreground dark:border-emerald-800/50 dark:hover:bg-emerald-950/40 dark:hover:border-emerald-600/55 focus-visible:ring-emerald-500/40";

function listingWhatsAppPrefill(title: string): string {
  const short = title.length > 80 ? `${title.slice(0, 77)}…` : title;
  return `Bonjour, je vous contacte au sujet de votre annonce sur AutoNex « ${short} ».`;
}

function cleanSpec(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const asString = String(value).trim();
  return asString.length > 0 ? asString : null;
}

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { formatPrice, formatPriceSecondary } = useCurrency();
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [selectedImg, setSelectedImg] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);
  const viewIncremented = useRef<string | null>(null);
  const lastContactSubmitAt = useRef(0);
  const lastWhatsAppAt = useRef(0);
  const contactSectionRef = useRef<HTMLDivElement | null>(null);

  const loginForContact = () => {
    toast.error(
      t("auth.loginRequiredForListingContact", "Connectez-vous pour contacter l’annonceur."),
    );
    navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
  };

  const { data: listing, isLoading, error: fetchError } = useListing(id);

  // Increment views once per listing per session (debounced)
  useEffect(() => {
    if (listing?.id && viewIncremented.current !== listing.id) {
      viewIncremented.current = listing.id;
      const timer = setTimeout(() => {
        const sessionId = getSearchSessionId();
        supabase
          .rpc("increment_views_public", { p_listing_id: listing.id, p_session_id: sessionId })
          .then(() => {});
      }, 2000); // 2s delay to filter bots/quick bounces
      return () => clearTimeout(timer);
    }
  }, [listing?.id]);

  // Fetch similar listings by same transaction + type + ville
  const { data: similar = [] } = useDbListings({
    ville: listing?.ville ?? undefined,
    types: listing?.type ? [listing.type] : undefined,
    transaction: listing?.transaction ?? undefined,
    limit: 5,
  });
  const filteredSimilar = similar.filter((l) => l.id !== listing?.id).slice(0, 4);

  const handleRevealPhone = async () => {
    if (!listing) return;
    if (!user) {
      loginForContact();
      return;
    }
    const { error: leadError } = await supabase.from("leads").insert({
      listing_id: listing.id,
      visitor_name: user.id,
      type: "phone_reveal" as const,
    });
    if (leadError) {
      toast.error(t("listing.phoneRevealError", "Impossible d'enregistrer la demande"));
      return;
    }
    const { data: phone, error: phoneErr } = await supabase.rpc("get_listing_owner_phone", {
      p_listing_id: listing.id,
    });
    if (phoneErr) {
      toast.error(t("listing.phoneRevealError", "Impossible d'enregistrer la demande"));
      return;
    }
    setPhoneRevealed(true);
    setRevealedPhone(typeof phone === "string" ? phone : null);
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    if (!user) {
      loginForContact();
      return;
    }
    const now = Date.now();
    if (now - lastContactSubmitAt.current < 4000) {
      toast.error(t("listing.contactTooFast", "Veuillez patienter quelques secondes avant de renvoyer."));
      return;
    }
    const parsed = contactLeadSchema.safeParse({
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      message: contactMessage,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("common.error"));
      return;
    }
    setSending(true);
    lastContactSubmitAt.current = now;
    const { error: leadError } = await supabase.from("leads").insert({
      listing_id: listing.id,
      visitor_name: parsed.data.name || null,
      visitor_email: parsed.data.email || null,
      visitor_phone: parsed.data.phone || null,
      message: parsed.data.message || null,
      type: "contact_form" as const,
    });
    if (leadError) {
      toast.error(leadError.message);
    } else {
      toast.success(t("listing.messageSent", "Message envoyé !"));
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setContactMessage("");
    }
    setSending(false);
  };

  const handleWhatsApp = async () => {
    if (!listing?.has_whatsapp_contact) return;
    if (!user) {
      loginForContact();
      return;
    }
    const now = Date.now();
    if (now - lastWhatsAppAt.current < 4000) {
      toast.error(t("listing.contactTooFast", "Veuillez patienter quelques secondes avant de renvoyer."));
      return;
    }
    const skipLead = user.id === listing.owner_id || isAdmin;
    if (!skipLead) {
      const { error: leadError } = await supabase.from("leads").insert({
        listing_id: listing.id,
        visitor_name: user.id,
        type: "whatsapp" as const,
      });
      if (leadError) {
        toast.error(t("listing.phoneRevealError", "Impossible d'enregistrer la demande"));
        return;
      }
    }
    const { data: phoneRaw, error: phoneErr } = await supabase.rpc("get_listing_whatsapp_phone", {
      p_listing_id: listing.id,
    });
    if (phoneErr) {
      toast.error(t("listing.phoneRevealError", "Impossible d'enregistrer la demande"));
      return;
    }
    const phone = typeof phoneRaw === "string" ? phoneRaw : null;
    if (!phone?.trim()) {
      toast.error(t("listing.whatsappUnavailable", "Numéro WhatsApp indisponible pour cette annonce."));
      return;
    }
    const url = buildWhatsAppUrl(phone, listingWhatsAppPrefill(listing.title));
    if (!url) {
      toast.error(t("listing.whatsappUnavailable", "Numéro WhatsApp indisponible pour cette annonce."));
      return;
    }
    lastWhatsAppAt.current = now;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
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

  if (fetchError && !listing) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">{t("common.error")}</h1>
          <p className="text-muted-foreground font-sans mb-6">
            {t(
              "listing.runtimeUnavailable",
              "Cette annonce est momentanément indisponible. Réessayez dans quelques instants.",
            )}
          </p>
          <Button variant="outline" onClick={() => navigate(-1)} className="font-sans">{t("common.back", "Retour")}</Button>
        </div>
        <Footer />
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">{t("listing.notFound", "Annonce introuvable")}</h1>
          <p className="text-muted-foreground font-sans mb-6">
            {t("listing.notFoundDesc", "Cette annonce n'existe pas ou a été supprimée.")}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="font-sans">{t("common.back", "Retour")}</Button>
            <Button onClick={() => navigate("/recherche")} className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
              {t("listing.viewAll", "Voir toutes les annonces")}
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const images = listing.images.length > 0
    ? listing.images
    : ["/placeholder.svg"];

  const transactionLabel = TRANSACTION_LABELS[listing.transaction] ?? listing.transaction;
  const typeLabel = LISTING_TYPE_LABELS[listing.type] ?? listing.type;
  const addressLine = [listing.ville, listing.arrondissement, listing.quartier, listing.region].filter(Boolean).join(", ");
  const hasExactCoords =
    listing.lat != null &&
    listing.lng != null &&
    isValidListingCoordinates(listing.lat, listing.lng);
  const mapPublic =
    hasExactCoords && listing.lat != null && listing.lng != null
      ? toApproximatePublicCoordinates(listing.lat, listing.lng, listing.id)
      : null;
  const hasApproxMap =
    mapPublic != null && isValidListingCoordinates(mapPublic.lat, mapPublic.lng);
  const isOwner = user?.id === listing.owner_id;
  const displayTitle = getVehicleDisplayTitle(listing);
  const versionLabel = formatVehicleVersion(getVehicleVersionValue(listing));
  const mileageValue = getVehicleMileageValue(listing);
  const mileageLabel = formatVehicleMileage(mileageValue);
  const doorsLabel = formatVehicleDoors(getVehicleDoorsValue(listing));
  const vehicleSummary = getVehicleHeadline(listing);
  const sellerLabel =
    listing.vehicle?.sellerType === "concessionnaire"
      ? t("listing.sellerDealer", "Concessionnaire")
      : listing.vehicle?.sellerType === "particulier"
        ? t("listing.sellerPrivate", "Particulier")
        : null;
  const vehicleSpecRows = [
    { label: "Marque", value: cleanSpec(listing.vehicle?.make) },
    { label: "Modèle", value: cleanSpec(listing.vehicle?.model) },
    { label: "Année", value: cleanSpec(listing.vehicle?.year) },
    { label: "Kilométrage", value: cleanSpec(mileageLabel) },
    { label: "Carburant", value: cleanSpec(listing.vehicle?.fuel) },
    { label: "Boîte", value: cleanSpec(listing.vehicle?.transmission) },
    { label: "Motricité", value: cleanSpec(listing.vehicle?.drivetrain) },
    { label: "Portes", value: cleanSpec(doorsLabel) },
    { label: "Places", value: listing.vehicle?.seats != null && listing.vehicle.seats > 0 ? `${listing.vehicle.seats}` : null },
    { label: "Carrosserie", value: cleanSpec(listing.vehicle?.bodyStyle) },
    { label: "État", value: cleanSpec(listing.vehicle?.condition) },
    { label: "Type vendeur", value: cleanSpec(sellerLabel) },
    { label: "Couleur ext.", value: cleanSpec(listing.vehicle?.exteriorColor) },
    { label: "Couleur int.", value: cleanSpec(listing.vehicle?.interiorColor) },
    { label: "Disponibilité", value: cleanSpec(listing.vehicle?.availabilityStatus) },
    { label: "Mode location", value: cleanSpec(listing.vehicle?.rentalMode) },
  ].filter((item) => item.value);
  const contactTrustHints = [
    sellerLabel ? `${t("listing.seller", "Vendeur")} : ${sellerLabel}` : null,
    listing.vehicle?.availabilityStatus ? `${t("listing.availability", "Disponibilité")} : ${listing.vehicle.availabilityStatus}` : null,
    listing.has_whatsapp_contact ? t("listing.whatsappReady", "Réponse WhatsApp disponible") : null,
  ].filter(Boolean);
  const ownerStatusHint = (() => {
    const s = listing.status;
    if (!isOwner || s === "active") return null;
    if (s === "pending_review")
      return t(
        "listing.ownerPendingReview",
        "Votre annonce est en cours de modération. Elle ne sera visible publiquement qu’après validation par notre équipe."
      );
    if (s === "pending_payment")
      return t(
        "listing.ownerPendingPayment",
        "Paiement ou justificatif en attente de vérification. L’annonce reste hors ligne jusqu’à confirmation."
      );
    if (s === "pending_payment_verification")
      return t(
        "listing.ownerPendingPaymentVerification",
        "Votre paiement est en cours de vérification par nos équipes. Les crédits seront attribués après validation du justificatif."
      );
    if (s === "rejected")
      return listing.rejection_reason?.trim()
        ? `${t("listing.ownerRejectedPrefix", "Annonce refusée")} : ${listing.rejection_reason.trim()}`
        : t("listing.ownerRejected", "Cette annonce a été refusée. Contactez le support pour plus d’informations.");
    if (s === "draft") return t("listing.ownerDraft", "Brouillon — terminez la publication depuis votre tableau de bord.");
    if (s === "paused") return t("listing.ownerPaused", "Annonce en pause — elle n’apparaît pas dans la recherche.");
    if (s === "expired") return t("listing.ownerExpired", "Annonce expirée.");
    return t("listing.ownerNonActive", "Cette annonce n’est pas publiée actuellement.");
  })();
  const canonical = buildCanonicalUrl(`/annonce/${listing.id}`);
  const listingTitle = composePageTitle(displayTitle);
  const listingDescription = truncateMetaDescription(
    [
      `${typeLabel} ${transactionLabel} a ${listing.ville || "Madagascar"}`,
      listing.price_mga ? `${listing.price_mga.toLocaleString("fr-FR")} Ar` : "",
      listing.description || "",
    ]
      .filter(Boolean)
      .join(" — "),
  );
  const seoImage = toAbsoluteUrl(images[0] || "/placeholder.svg");
  const listingJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayTitle,
    description: listingDescription,
    url: canonical,
    image: seoImage ? [seoImage] : undefined,
    datePosted: listing.created_at || undefined,
    address: listing.ville || listing.region
      ? {
          "@type": "PostalAddress",
          addressLocality: listing.ville || undefined,
          addressRegion: listing.region || undefined,
          addressCountry: "MG",
        }
      : undefined,
    category: typeLabel,
    brand: listing.vehicle?.make ? { "@type": "Brand", name: listing.vehicle.make } : undefined,
    model: listing.vehicle?.model ?? undefined,
    vehicleModelDate: listing.vehicle?.year ?? undefined,
    mileageFromOdometer: mileageValue && mileageValue > 0
      ? {
          "@type": "QuantitativeValue",
          value: mileageValue,
          unitText: "km",
        }
      : undefined,
    offers: {
      "@type": "Offer",
      price: listing.price_mga,
      priceCurrency: "MGA",
      availability: listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: canonical,
    },
  };

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
        <script type="application/ld+json">
          {JSON.stringify(listingJsonLd)}
        </script>
      </Helmet>
      <Header />
      <div className="container mx-auto px-4 py-4 md:py-6 pb-32 lg:pb-6">
        <nav className="flex items-center gap-2 text-xs md:text-sm font-sans text-muted-foreground mb-4 md:mb-6 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-primary">{t("nav.home", "Accueil")}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/recherche" className="hover:text-primary">{t("search.title")}</Link>
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
                  { list: listing.pending_boost_types.join(", ") }
                )}
              </AlertDescription>
            )}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <div className="space-y-2.5 md:space-y-3">
              <div className="rounded-2xl overflow-hidden aspect-video relative border border-border/70">
                <img
                  src={images[selectedImg]}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                  decoding="async"
                  onError={(e) => applyImageFallback(e.currentTarget)}
                />
                <div className="absolute left-3 bottom-3">
                  <Badge variant="secondary" className="font-sans text-xs bg-card/90">
                    {selectedImg + 1}/{images.length}
                  </Badge>
                </div>
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button key={i} type="button" onClick={() => setSelectedImg(i)} className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${i === selectedImg ? "border-primary" : "border-transparent"}`}>
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

            <ListingSponsorBlock />

            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="font-sans">{transactionLabel}</Badge>
                <Badge variant="outline" className="font-sans capitalize">{typeLabel}</Badge>
                {listing.vehicle?.isElectric && <Badge variant="secondary" className="font-sans">Électrique</Badge>}
                {listing.vehicle?.isHybrid && <Badge variant="secondary" className="font-sans">Hybride</Badge>}
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
              <h1 className="font-serif text-[1.45rem] leading-tight md:text-3xl font-bold text-foreground mb-2">{displayTitle}</h1>
              {vehicleSummary && (
                <p className="text-sm text-muted-foreground font-sans mb-1">{vehicleSummary}</p>
              )}
              {listing.internal_ref && isOwner && (
                <p className="text-xs text-muted-foreground font-sans mb-1">
                  {t("listing.internalRef", "Réf. interne : {{ref}}", { ref: listing.internal_ref })}
                </p>
              )}
                <p className="flex items-center gap-1 text-sm text-muted-foreground font-sans mb-4">
                <MapPin className="h-4 w-4 shrink-0" />
                {addressLine || t("listing.addressUnknown", "Adresse non précisée")}
              </p>
              <p className="text-[1.55rem] md:text-2xl font-bold text-primary font-sans">{formatPrice(listing.price_mga)}</p>
              <p className="text-sm text-muted-foreground font-sans">{formatPriceSecondary(listing.price_mga)}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
              {versionLabel && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Bed className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{versionLabel}</p><p className="text-xs text-muted-foreground font-sans">{t("listing.rooms")}</p></div>
                </div>
              )}
              {mileageLabel && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Maximize className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{mileageLabel}</p><p className="text-xs text-muted-foreground font-sans">{t("listing.surface")}</p></div>
                </div>
              )}
              {doorsLabel && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Bath className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{doorsLabel}</p><p className="text-xs text-muted-foreground font-sans">{t("listing.bathrooms")}</p></div>
                </div>
              )}
              {listing.toilets != null && listing.toilets > 0 && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Bath className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{listing.toilets}</p><p className="text-xs text-muted-foreground font-sans">{t("listing.toilets", "Toilettes")}</p></div>
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
                  {vehicleSpecRows.map((spec) => (
                    <div key={spec.label} className="flex items-start justify-between gap-3 border-b border-border/70 pb-2">
                      <span className="text-sm font-sans text-muted-foreground">{spec.label}</span>
                      <span className="text-sm font-sans font-semibold text-foreground text-right capitalize">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <div className="flex flex-wrap gap-2">
              {listing.vehicle?.fuel && <Badge variant="secondary" className="font-sans">{listing.vehicle.fuel}</Badge>}
              {listing.vehicle?.transmission && <Badge variant="secondary" className="font-sans">{listing.vehicle.transmission}</Badge>}
              {listing.vehicle?.drivetrain && <Badge variant="secondary" className="font-sans">{listing.vehicle.drivetrain}</Badge>}
              {listing.vehicle?.bodyStyle && <Badge variant="secondary" className="font-sans">{listing.vehicle.bodyStyle}</Badge>}
              {listing.vehicle?.rentalMode && <Badge variant="outline" className="font-sans capitalize">{listing.vehicle.rentalMode}</Badge>}
              {listing.vehicle?.seats != null && listing.vehicle.seats > 0 && (
                <Badge variant="outline" className="font-sans">{listing.vehicle.seats} places</Badge>
              )}
              {listing.vehicle?.availabilityStatus && (
                <Badge variant="outline" className="font-sans capitalize">{listing.vehicle.availabilityStatus}</Badge>
              )}
              {listing.vehicle?.isElectric && <Badge variant="secondary" className="font-sans">Électrique</Badge>}
              {listing.vehicle?.isHybrid && <Badge variant="secondary" className="font-sans">Hybride</Badge>}
              {listing.vehicle?.condition && <Badge variant="outline" className="font-sans capitalize">{listing.vehicle.condition}</Badge>}
              {listing.vehicle?.sellerType && <Badge variant="outline" className="font-sans capitalize">{listing.vehicle.sellerType}</Badge>}
            </div>

            {listing.description && (
              <div>
                <h2 className="font-serif text-xl font-bold mb-3">{t("listing.description")}</h2>
                <p className="font-sans text-muted-foreground leading-relaxed whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {listing.features.length > 0 && (
              <div>
                <h2 className="font-serif text-xl font-bold mb-3">{t("listing.features")}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {listing.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm font-sans">
                      <Check className="h-4 w-4 text-success" /> {f}
                    </div>
                  ))}
                </div>
              </div>
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

            <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="p-5 md:p-6 border-b border-border/80 bg-secondary/20">
                <h2 className="font-serif text-xl font-bold">{t("listing.locationMap", "Localisation")}</h2>
                <p className="text-sm text-muted-foreground font-sans mt-1.5 leading-relaxed">
                  {hasApproxMap
                    ? t(
                        "listing.locationApproxDesc",
                        "Zone approximative sur la carte (l’adresse exacte n’est pas affichée publiquement)."
                      )
                    : t("listing.locationNoCoords", "Aucune position carte n’a été enregistrée pour ce bien.")}
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
                        "La carte n’est pas disponible pour ce bien. L’adresse textuelle ci-dessus reste votre principal repère."
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
              className="bg-card rounded-2xl border border-border p-4.5 md:p-6 space-y-4 lg:sticky lg:top-20 scroll-mt-24"
            >
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
                  <h3 className="font-serif font-bold">{listing.agency_name ?? listing.owner_name ?? t("listing.owner", "Vendeur")}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {sellerLabel && <Badge variant="outline" className="text-xs font-sans">{sellerLabel}</Badge>}
                    {listing.agency_verified && <Badge variant="secondary" className="text-xs font-sans">{t("listing.verified", "Vérifié")}</Badge>}
                  </div>
                </div>
              </div>
              {contactTrustHints.length > 0 && (
                <div className="rounded-xl border border-border/80 bg-secondary/25 px-3 py-2.5">
                  {contactTrustHints.map((hint) => (
                    <p key={hint} className="text-xs font-sans text-muted-foreground leading-relaxed">• {hint}</p>
                  ))}
                </div>
              )}

              <Button
                onClick={handleRevealPhone}
                variant={phoneRevealed ? "outline" : "default"}
                className={`hidden w-full font-sans lg:inline-flex ${!phoneRevealed ? "gradient-primary border-0" : ""}`}
                style={!phoneRevealed ? { color: "#FAFAFA" } : undefined}
              >
                <Phone className="h-4 w-4 mr-2" />
                {phoneRevealed
                  ? (revealedPhone ?? listing.owner_phone ?? t("listing.noPhone", "Non renseigné"))
                  : t("listing.revealPhone")}
              </Button>

              {listing.has_whatsapp_contact ? (
                <Button
                  type="button"
                  onClick={handleWhatsApp}
                  variant="outline"
                  className={cn("hidden w-full font-sans lg:inline-flex", LISTING_WHATSAPP_BUTTON_CLASS)}
                  aria-label={t("listing.whatsappAria", "Contacter l’annonceur via WhatsApp")}
                >
                  <FaWhatsapp className="shrink-0 text-[#25D366]" aria-hidden />
                  {t("listing.whatsapp", "WhatsApp")}
                </Button>
              ) : null}

              <form onSubmit={handleContact} className="space-y-3">
                <h4 className="font-serif font-semibold">{t("listing.contact")}</h4>
                <Input placeholder={t("auth.name")} value={contactName} onChange={(e) => setContactName(e.target.value)} className="font-sans min-h-11" maxLength={100} />
                <Input placeholder={t("auth.email")} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="font-sans min-h-11" maxLength={255} />
                <Input placeholder={t("auth.phone")} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="font-sans min-h-11" maxLength={30} />
                <Textarea placeholder={t("listing.yourMessage", "Votre message...")} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} className="font-sans min-h-24" rows={3} maxLength={1000} />
                <Button type="submit" disabled={sending} className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
                  {sending ? t("common.loading") : t("common.send")}
                </Button>
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
          <section className="mt-16">
            <h2 className="font-serif text-2xl font-bold mb-6">{t("listing.similar")}</h2>
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
        <div className="container mx-auto max-w-lg flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-sans min-h-12 touch-manipulation gap-2"
              onClick={() => contactSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              {t("listing.contact")}
            </Button>
            <Button
              type="button"
              onClick={handleRevealPhone}
              variant={phoneRevealed ? "outline" : "default"}
              className={`flex-1 font-sans min-h-12 touch-manipulation gap-2 ${!phoneRevealed ? "gradient-primary border-0" : ""}`}
              style={!phoneRevealed ? { color: "#FAFAFA" } : undefined}
            >
              <Phone className="h-4 w-4 shrink-0" />
              {phoneRevealed
                ? (revealedPhone ?? listing.owner_phone ?? t("listing.noPhone", "Non renseigné"))
                : t("listing.revealPhone")}
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
