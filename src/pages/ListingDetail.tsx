import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Maximize, Phone, ChevronRight, Check, MapPin, Loader2, AlertCircle, Info, Video, ExternalLink, MessageSquare } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useListing, useDbListings } from "@/hooks/useListings";
import { LISTING_TYPE_LABELS, TRANSACTION_LABELS } from "@/types/listing";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { toast } from "sonner";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import { toApproximatePublicCoordinates } from "@/lib/mapPrivacy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ListingSponsorBlock,
  ListingRelatedPromoted,
  ListingPartnerAgencyStrip,
} from "@/components/monetization/ListingDetailPlacements";

const ListingLocationMap = lazy(() => import("@/components/ListingLocationMap"));

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
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
  const contactSectionRef = useRef<HTMLDivElement | null>(null);

  const { data: listing, isLoading, error: fetchError } = useListing(id);

  // Increment views once per listing per session (debounced)
  useEffect(() => {
    if (listing?.id && viewIncremented.current !== listing.id) {
      viewIncremented.current = listing.id;
      const timer = setTimeout(() => {
        supabase.rpc("increment_views", { listing_uuid: listing.id }).then(() => {});
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
    const { error: leadError } = await supabase.from("leads").insert({
      listing_id: listing.id,
      visitor_name: "Visiteur",
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
    if (!contactName.trim() && !contactEmail.trim()) {
      toast.error(t("listing.contactNameOrEmail", "Veuillez renseigner au moins votre nom ou email"));
      return;
    }
    setSending(true);
    const { error: leadError } = await supabase.from("leads").insert({
      listing_id: listing.id,
      visitor_name: contactName.trim() || null,
      visitor_email: contactEmail.trim() || null,
      visitor_phone: contactPhone.trim() || null,
      message: contactMessage.trim() || null,
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
            {fetchError instanceof Error ? fetchError.message : String(fetchError)}
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
    : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop"];

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

  return (
    <>
      <Helmet><title>{listing.title} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-6 pb-28 lg:pb-6">
        <nav className="flex items-center gap-2 text-sm font-sans text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">{t("nav.home", "Accueil")}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/recherche" className="hover:text-primary">{t("search.title")}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{listing.title}</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden aspect-video">
                <img src={images[selectedImg]} alt={listing.title} className="w-full h-full object-cover" decoding="async" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} type="button" onClick={() => setSelectedImg(i)} className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${i === selectedImg ? "border-primary" : "border-transparent"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">{listing.title}</h1>
              {listing.internal_ref && isOwner && (
                <p className="text-xs text-muted-foreground font-sans mb-1">
                  {t("listing.internalRef", "Réf. interne : {{ref}}", { ref: listing.internal_ref })}
                </p>
              )}
                <p className="flex items-center gap-1 text-sm text-muted-foreground font-sans mb-4">
                <MapPin className="h-4 w-4 shrink-0" />
                {addressLine || t("listing.addressUnknown", "Adresse non précisée")}
              </p>
              <p className="text-2xl font-bold text-primary font-sans">{formatPrice(listing.price_mga)}</p>
              <p className="text-sm text-muted-foreground font-sans">{formatPriceSecondary(listing.price_mga)}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {listing.rooms != null && listing.rooms > 0 && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Bed className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{listing.rooms}</p><p className="text-xs text-muted-foreground font-sans">{t("listing.rooms")}</p></div>
                </div>
              )}
              {listing.surface != null && listing.surface > 0 && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Maximize className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{listing.surface}m²</p><p className="text-xs text-muted-foreground font-sans">{t("listing.surface")}</p></div>
                </div>
              )}
              {listing.bathrooms != null && listing.bathrooms > 0 && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Bath className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{listing.bathrooms}</p><p className="text-xs text-muted-foreground font-sans">{t("listing.bathrooms")}</p></div>
                </div>
              )}
              {listing.toilets != null && listing.toilets > 0 && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Bath className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{listing.toilets}</p><p className="text-xs text-muted-foreground font-sans">{t("listing.toilets", "Toilettes")}</p></div>
                </div>
              )}
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

          <div className="space-y-6">
            <div
              ref={contactSectionRef}
              id="listing-contact"
              className="bg-card rounded-2xl border border-border p-6 space-y-4 lg:sticky lg:top-20 scroll-mt-24"
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
                  <h3 className="font-serif font-bold">{listing.agency_name ?? listing.owner_name ?? t("listing.owner", "Propriétaire")}</h3>
                  {listing.agency_verified && <Badge variant="secondary" className="text-xs font-sans">{t("listing.verified", "Vérifié")}</Badge>}
                </div>
              </div>

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

              <form onSubmit={handleContact} className="space-y-3">
                <h4 className="font-serif font-semibold">{t("listing.contact")}</h4>
                <Input placeholder={t("auth.name")} value={contactName} onChange={(e) => setContactName(e.target.value)} className="font-sans" maxLength={100} />
                <Input placeholder={t("auth.email")} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="font-sans" maxLength={255} />
                <Input placeholder={t("auth.phone")} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="font-sans" maxLength={30} />
                <Textarea placeholder={t("listing.yourMessage", "Votre message...")} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} className="font-sans" rows={3} maxLength={1000} />
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
        <div className="container mx-auto flex gap-2 max-w-lg">
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
      </div>

      <Footer />
    </>
  );
};

export default ListingDetail;
