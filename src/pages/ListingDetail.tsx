import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Maximize, Car, Phone, ChevronRight, Check, MapPin } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { seedListings, seedAgencies } from "@/data/seed-listings";
import { useState } from "react";
import { toast } from "sonner";

const ListingDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { formatPrice, formatPriceSecondary } = useCurrency();
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);

  const listing = seedListings.find((l) => l.id === id);
  if (!listing) return <div className="min-h-screen flex items-center justify-center font-serif text-xl">Annonce introuvable</div>;

  const agency = seedAgencies.find((a) => a.id === listing.agency_id);
  const similar = seedListings.filter((l) => l.id !== listing.id && l.region === listing.region).slice(0, 4);
  const getAgency = (aid: string) => seedAgencies.find((a) => a.id === aid);

  const transactionLabel = listing.transaction === "vente" ? "Vente" : listing.transaction === "location" ? "Location" : "Location vacances";

  const handleRevealPhone = async () => {
    setPhoneRevealed(true);
    // Track lead
    try {
      await supabase.from("leads").insert({
        listing_id: listing.id,
        visitor_name: "Visiteur",
        type: "phone_reveal" as const,
      });
    } catch {}
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName && !contactEmail) {
      toast.error("Veuillez renseigner votre nom ou email");
      return;
    }
    setSending(true);
    try {
      await supabase.from("leads").insert({
        listing_id: listing.id,
        visitor_name: contactName,
        visitor_email: contactEmail,
        visitor_phone: contactPhone,
        message: contactMessage,
        type: "contact_form" as const,
      });
      toast.success("Message envoyé !");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setContactMessage("");
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
    setSending(false);
  };

  return (
    <>
      <Helmet><title>{listing.title} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-2 text-sm font-sans text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/recherche" className="hover:text-primary">Recherche</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{listing.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden aspect-video">
                <img src={listing.images[selectedImg]} alt={listing.title} className="w-full h-full object-cover" />
              </div>
              {listing.images.length > 1 && (
                <div className="flex gap-2">
                  {listing.images.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImg(i)} className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === selectedImg ? "border-primary" : "border-transparent"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="font-sans">{transactionLabel}</Badge>
                <Badge variant="outline" className="font-sans capitalize">{listing.type}</Badge>
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">{listing.title}</h1>
              <p className="flex items-center gap-1 text-sm text-muted-foreground font-sans mb-4">
                <MapPin className="h-4 w-4" /> {listing.city}, {listing.region}
              </p>
              <p className="text-2xl font-bold text-primary font-sans">{formatPrice(listing.price_mga)}</p>
              <p className="text-sm text-muted-foreground font-sans">{formatPriceSecondary(listing.price_mga)}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {listing.rooms > 0 && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Bed className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{listing.rooms}</p><p className="text-xs text-muted-foreground font-sans">{t("listing.rooms")}</p></div>
                </div>
              )}
              <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                <Maximize className="h-5 w-5 text-primary" />
                <div><p className="font-semibold font-sans">{listing.surface}m²</p><p className="text-xs text-muted-foreground font-sans">{t("listing.surface")}</p></div>
              </div>
              {listing.bathrooms > 0 && (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                  <Bath className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold font-sans">{listing.bathrooms}</p><p className="text-xs text-muted-foreground font-sans">{t("listing.bathrooms")}</p></div>
                </div>
              )}
              <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-4">
                <Car className="h-5 w-5 text-primary" />
                <div><p className="font-semibold font-sans">1</p><p className="text-xs text-muted-foreground font-sans">{t("listing.parking")}</p></div>
              </div>
            </div>

            <div>
              <h2 className="font-serif text-xl font-bold mb-3">{t("listing.description")}</h2>
              <p className="font-sans text-muted-foreground leading-relaxed">{listing.description}</p>
            </div>

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
          </div>

          <div className="space-y-6">
            {agency && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4 sticky top-20">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-border">
                    <img src={agency.logo} alt={agency.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold">{agency.name}</h3>
                    {agency.verified && <Badge variant="secondary" className="text-xs font-sans">Vérifié</Badge>}
                  </div>
                </div>

                <Button onClick={handleRevealPhone} variant={phoneRevealed ? "outline" : "default"} className={`w-full font-sans ${!phoneRevealed ? "gradient-primary border-0" : ""}`} style={!phoneRevealed ? { color: "#FAFAFA" } : undefined}>
                  <Phone className="h-4 w-4 mr-2" />
                  {phoneRevealed ? "+261 34 12 345 67" : t("listing.revealPhone")}
                </Button>

                <form onSubmit={handleContact} className="space-y-3">
                  <h4 className="font-serif font-semibold">{t("listing.contact")}</h4>
                  <Input placeholder={t("auth.name")} value={contactName} onChange={(e) => setContactName(e.target.value)} className="font-sans" />
                  <Input placeholder={t("auth.email")} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="font-sans" />
                  <Input placeholder={t("auth.phone")} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="font-sans" />
                  <Textarea placeholder="Votre message..." value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} className="font-sans" rows={3} />
                  <Button type="submit" disabled={sending} className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
                    {sending ? "..." : t("common.send")}
                  </Button>
                </form>

                <Link to={`/agence/${agency.slug}`} className="block text-center text-sm text-primary font-sans hover:underline">
                  Voir toutes les annonces de {agency.name}
                </Link>
              </div>
            )}
          </div>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="font-serif text-2xl font-bold mb-6">{t("listing.similar")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {similar.map((l) => {
                const ag = getAgency(l.agency_id);
                return <ListingCard key={l.id} listing={l} agencyName={ag?.name} agencyLogo={ag?.logo} />;
              })}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
};

export default ListingDetail;
