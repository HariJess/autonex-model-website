import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/HeroSearch";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { seedListings, seedAgencies, seedBlogPosts } from "@/data/seed-listings";
import { villes } from "@/data/madagascar-locations";

const Index = () => {
  const { t } = useTranslation();
  const featured = seedListings.filter((l) => l.badge).slice(0, 8);
  const getAgency = (id: string) => seedAgencies.find((a) => a.id === id);

  return (
    <>
      <Helmet>
        <title>ImmoNex Madagascar — Portail immobilier N°1</title>
        <meta name="description" content="Trouvez votre futur chez-vous à Madagascar. Vente, location, projets neufs dans toutes les villes." />
      </Helmet>
      <Header />

      <HeroSearch />

      {/* Featured listings */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{t("sections.featured")}</h2>
          <Link to="/recherche" className="text-primary font-sans text-sm font-medium flex items-center gap-1 hover:underline">
            {t("sections.viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((listing) => {
            const agency = getAgency(listing.agency_id);
            return <ListingCard key={listing.id} listing={listing} agencyName={agency?.name} agencyLogo={agency?.logo} />;
          })}
        </div>
      </section>

      {/* Nos villes */}
      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Nos villes</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {villes.map((ville) => {
              const count = seedListings.filter((l) => l.city === ville.name || l.region === ville.region).length;
              return (
                <Link key={ville.name} to={`/recherche?ville=${ville.name}`} className="group relative rounded-2xl overflow-hidden aspect-[3/2]">
                  <img src={ville.image} alt={ville.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <h3 className="font-serif font-bold text-lg" style={{ color: "#FAFAFA" }}>{ville.name}</h3>
                    <p className="text-xs font-sans opacity-80" style={{ color: "#FAFAFA" }}>{ville.description} • {count} annonces</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partner agencies */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">{t("sections.agencies")}</h2>
        <div className="flex flex-wrap justify-center gap-8">
          {seedAgencies.map((agency) => (
            <Link key={agency.id} to={`/agence/${agency.slug}`} className="flex flex-col items-center gap-2 group">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border shadow-sm group-hover:shadow-md transition-shadow">
                <img src={agency.logo} alt={agency.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-sans font-medium text-foreground">{agency.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Blog */}
      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{t("sections.blog")}</h2>
            <Link to="/conseils" className="text-primary font-sans text-sm font-medium flex items-center gap-1 hover:underline">
              {t("sections.viewAll")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {seedBlogPosts.slice(0, 3).map((post) => (
              <Link key={post.id} to={`/conseils/${post.slug}`} className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all">
                <div className="aspect-video overflow-hidden">
                  <img src={post.cover} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5 space-y-2">
                  <span className="text-xs font-sans font-medium text-primary">{post.category}</span>
                  <h3 className="font-serif font-semibold text-foreground leading-tight">{post.title}</h3>
                  <p className="text-sm font-sans text-muted-foreground line-clamp-2">{post.excerpt}</p>
                </div>
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
