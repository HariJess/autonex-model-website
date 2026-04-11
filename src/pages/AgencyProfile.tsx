import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { seedAgencies, seedListings } from "@/data/seed-listings";

const AgencyProfile = () => {
  const { slug } = useParams();
  const agency = seedAgencies.find(a => a.slug === slug);
  
  if (!agency) return <div className="min-h-screen flex items-center justify-center font-serif text-xl">Agence introuvable</div>;

  const listings = seedListings.filter(l => l.agency_id === agency.id);

  return (
    <>
      <Helmet><title>{agency.name} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Agency header */}
        <div className="bg-card rounded-2xl border border-border p-8 flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border border-border flex-shrink-0">
            <img src={agency.logo} alt={agency.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h1 className="font-serif text-2xl font-bold">{agency.name}</h1>
              {agency.verified && <Badge className="bg-success font-sans text-xs" style={{ color: '#FAFAFA' }}>Vérifié</Badge>}
            </div>
            <p className="text-muted-foreground font-sans mt-2">{agency.bio}</p>
            <p className="text-sm font-sans text-primary mt-1">{listings.length} annonces actives</p>
          </div>
        </div>

        {/* Contact form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="font-serif text-xl font-bold mb-4">Annonces de {agency.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {listings.map(l => (
                <ListingCard key={l.id} listing={l} agencyName={agency.name} agencyLogo={agency.logo} />
              ))}
            </div>
          </div>
          <div>
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 sticky top-20">
              <h3 className="font-serif font-bold">Contacter {agency.name}</h3>
              <Input placeholder="Nom" className="font-sans" />
              <Input placeholder="Email" type="email" className="font-sans" />
              <Input placeholder="Téléphone" className="font-sans" />
              <Textarea placeholder="Message..." className="font-sans" rows={3} />
              <Button className="w-full gradient-primary border-0 font-sans" style={{ color: '#FAFAFA' }}>Envoyer</Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AgencyProfile;
