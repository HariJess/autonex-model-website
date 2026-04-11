import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDbListings } from "@/hooks/useListings";

const AgencyProfile = () => {
  const { slug } = useParams();

  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ["agency", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase
        .from("agencies")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  // Get profiles linked to this agency to find their listings
  const { data: agentIds = [] } = useQuery({
    queryKey: ["agency-agents", agency?.id],
    queryFn: async () => {
      if (!agency?.id) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("agency_id", agency.id);
      return data?.map((p) => p.id) ?? [];
    },
    enabled: !!agency?.id,
  });

  const { data: allListings = [] } = useDbListings({});
  const listings = allListings.filter((l) => agentIds.includes(l.owner_id));

  if (agencyLoading) {
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

  if (!agency) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">Agence introuvable</h1>
          <p className="text-muted-foreground font-sans mb-6">Cette agence n'existe pas ou a été supprimée.</p>
          <Link to="/agences">
            <Button className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>Voir toutes les agences</Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet><title>{agency.name} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl border border-border p-8 flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border border-border flex-shrink-0 bg-muted flex items-center justify-center">
            {agency.logo_url ? (
              <img src={agency.logo_url} alt={agency.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-serif text-2xl font-bold text-muted-foreground">{agency.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h1 className="font-serif text-2xl font-bold">{agency.name}</h1>
              {agency.verified && <Badge className="bg-success font-sans text-xs" style={{ color: "#FAFAFA" }}>Vérifié</Badge>}
            </div>
            <p className="text-muted-foreground font-sans mt-2">{agency.bio || "Aucune description disponible."}</p>
            <p className="text-sm font-sans text-primary mt-1">{listings.length} annonce{listings.length !== 1 ? "s" : ""} active{listings.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="font-serif text-xl font-bold mb-4">Annonces de {agency.name}</h2>
            {listings.length === 0 ? (
              <p className="text-muted-foreground font-sans py-8 text-center">Aucune annonce active pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {listings.map((l) => (
                  <ListingCard key={l.id} listing={l} agencyName={agency.name} agencyLogo={agency.logo_url ?? undefined} />
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 sticky top-20">
              <h3 className="font-serif font-bold">Contacter {agency.name}</h3>
              {agency.phone && <p className="text-sm font-sans text-muted-foreground">📞 {agency.phone}</p>}
              {agency.email && <p className="text-sm font-sans text-muted-foreground">✉️ {agency.email}</p>}
              <Input placeholder="Nom" className="font-sans" />
              <Input placeholder="Email" type="email" className="font-sans" />
              <Input placeholder="Téléphone" className="font-sans" />
              <Textarea placeholder="Message..." className="font-sans" rows={3} />
              <Button className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>Envoyer</Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AgencyProfile;
