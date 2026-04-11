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
import { Bed, Bath, Maximize, Phone, ChevronRight, Check, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { useListing, useDbListings } from "@/hooks/useListings";
import { LISTING_TYPE_LABELS, TRANSACTION_LABELS } from "@/types/listing";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatPrice, formatPriceSecondary } = useCurrency();
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);
  const viewIncremented = useRef<string | null>(null);

  const { data: listing, isLoading, error: fetchError } = useListing(id);

  // Increment views once per listing per page load
  useEffect(() => {
    if (listing?.id && viewIncremented.current !== listing.id) {
      viewIncremented.current = listing.id;
      supabase.rpc("increment_views", { listing_uuid: listing.id }).then(() => {});
    }
  }, [listing?.id]);

  // Fetch similar listings by same type + ville
  const { data: similar = [] } = useDbListings({
    ville: listing?.ville ?? undefined,
    types: listing?.type ? [listing.type] : undefined,
    limit: 5,
  });
  const filteredSimilar = similar.filter((l) => l.id !== listing?.id).slice(0, 4);

  const handleRevealPhone = async () => {
    if (!listing) return;
    setPhoneRevealed(true);
    const { error: leadError } = await supabase.from("leads").insert({
      listing_id: listing.id,
      visitor_name: "Visiteur",
      type: "phone_reveal" as const,
    });
    if (leadError) {
      console.error("Failed to track phone reveal:", leadError.message);
    }
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    if (!contactName.trim() && !contactEmail.trim()) {
      toast.error(t("common.error"));
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
      toast.success("Message envoyé !");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setContactMessage("");
    }
    setSending(false);
  };

  // Loading state
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

  // Error state (distinct from not found)
  if (fetchError && !listing) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">{t("common.error")}</h1>
          <p className="text-muted-foreground font-sans mb-6">{(fetchError as Error).message}</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="font-sans">Retour</Button>
        </div>
        <Footer />
      </>
    );
  }

  // Not found state
  if (!listing) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">Annonce introuvable</h1>
          <p className="text-muted-foreground font-sans mb-6">
            Cette annonce n'existe pas ou a été supprimée.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="font-sans">Retour</Button>
            <Button onClick={() => navigate("/recherche")} className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
              Voir toutes les annonces
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

  return (
    <>
      <Helmet><title>{listing.title} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-2 text-sm font-sans text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/recherche" className="hover:text-primary">{t("search.title")}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden aspect-video">
                <img src={images[selectedImg]} alt={listing.title} className="w-full h-full object-cover" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImg(i)} className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${i === selectedImg ? "border-primary" : "border-transparent"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="font-sans">{transactionLabel}</Badge>
                <Badge variant="outline" className="font-sans capitalize">{typeLabel}</Badge>
                {listing.badge && (
                  <Badge className={`font-sans text-xs ${listing.badge === "boost" ? "gradient-primary" : "bg-accent"}`} style={{ color: "#FAFAFA" }}>
                    {listing.badge === "boost" ? t("listing.boost") : t("listing.favorite")}
                  </Badge>
                )}
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">{listing.title}</h1>
              <p className="flex items-center gap-1 text-sm text-muted-foreground font-sans mb-4">
                <MapPin className="h-4 w-4" />
                {[listing.ville, listing.arrondissement, listing.quartier, listing.region].filter(Boolean).join(", ")}
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
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 sticky top-20">
              {/* Owner / Agency info */}
              <div className="flex items-center gap-3">
                {listing.agency_logo ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-border">
                    <img src={listing.agency_logo} alt={listing.agency_name ?? ""} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center border border-border">
                    <span className="font-serif text-lg font-bold text-muted-foreground">
                      {(listing.agency_name ?? listing.owner_name ?? "?").charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-serif font-bold">{listing.agency_name ?? listing.owner_name ?? "Propriétaire"}</h3>
                  {listing.agency_verified && <Badge variant="secondary" className="text-xs font-sans">Vérifié</Badge>}
                </div>
              </div>

              <Button
                onClick={handleRevealPhone}
                variant={phoneRevealed ? "outline" : "default"}
                className={`w-full font-sans ${!phoneRevealed ? "gradient-primary border-0" : ""}`}
                style={!phoneRevealed ? { color: "#FAFAFA" } : undefined}
              >
                <Phone className="h-4 w-4 mr-2" />
                {phoneRevealed
                  ? (listing.owner_phone || "Non renseigné")
                  : t("listing.revealPhone")}
              </Button>

              <form onSubmit={handleContact} className="space-y-3">
                <h4 className="font-serif font-semibold">{t("listing.contact")}</h4>
                <Input placeholder={t("auth.name")} value={contactName} onChange={(e) => setContactName(e.target.value)} className="font-sans" />
                <Input placeholder={t("auth.email")} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="font-sans" />
                <Input placeholder={t("auth.phone")} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="font-sans" />
                <Textarea placeholder="Votre message..." value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} className="font-sans" rows={3} />
                <Button type="submit" disabled={sending} className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
                  {sending ? t("common.loading") : t("common.send")}
                </Button>
              </form>

              {listing.agency_slug && (
                <Link to={`/agence/${listing.agency_slug}`} className="block text-center text-sm text-primary font-sans hover:underline">
                  Voir toutes les annonces de {listing.agency_name}
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
      <Footer />
    </>
  );
};

export default ListingDetail;
