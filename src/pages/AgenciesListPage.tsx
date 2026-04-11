import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { seedAgencies } from "@/data/seed-listings";

const AgenciesListPage = () => {
  return (
    <>
      <Helmet><title>Agences immobilières — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl font-bold mb-8">Agences partenaires</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seedAgencies.map((agency) => (
            <Link key={agency.id} to={`/agence/${agency.slug}`}
              className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all flex items-start gap-4 group">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-border flex-shrink-0">
                <img src={agency.logo} alt={agency.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-serif font-bold group-hover:text-primary transition-colors">{agency.name}</h3>
                  {agency.verified && <Badge className="bg-success text-xs font-sans" style={{ color: "#FAFAFA" }}>Vérifié</Badge>}
                </div>
                <p className="text-sm text-muted-foreground font-sans line-clamp-2">{agency.bio}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AgenciesListPage;
