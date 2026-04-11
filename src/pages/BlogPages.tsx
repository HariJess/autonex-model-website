import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { seedBlogPosts } from "@/data/seed-listings";

const BlogList = () => {
  const { t } = useTranslation();
  const categories = ["Tous", "Acheter", "Louer", "Construire", "Investir", "Fiscalité"];

  return (
    <>
      <Helmet><title>Conseils immobiliers — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl font-bold mb-6">{t("nav.advice")}</h1>
        <div className="flex gap-2 mb-8 flex-wrap">
          {categories.map(cat => (
            <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-sans px-4 py-2">
              {cat}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seedBlogPosts.map(post => (
            <Link key={post.id} to={`/conseils/${post.slug}`} className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all">
              <div className="aspect-video overflow-hidden">
                <img src={post.cover} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-sans text-xs">{post.category}</Badge>
                  <span className="text-xs text-muted-foreground font-sans">{post.published_at}</span>
                </div>
                <h3 className="font-serif font-semibold text-foreground leading-tight">{post.title}</h3>
                <p className="text-sm font-sans text-muted-foreground line-clamp-2">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
};

const BlogArticle = () => {
  const { slug } = useParams();
  const post = seedBlogPosts.find(p => p.slug === slug);
  
  if (!post) return <div className="min-h-screen flex items-center justify-center font-serif text-xl">Article introuvable</div>;

  return (
    <>
      <Helmet><title>{post.title} — ImmoNex</title></Helmet>
      <Header />
      <article className="container mx-auto px-4 py-8 max-w-3xl">
        <Badge variant="secondary" className="font-sans text-xs mb-4">{post.category}</Badge>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
        <p className="text-muted-foreground font-sans mb-8">{post.published_at}</p>
        <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
          <img src={post.cover} alt={post.title} className="w-full h-full object-cover" />
        </div>
        <div className="prose prose-lg max-w-none font-sans">
          <p className="text-lg font-medium text-foreground">{post.excerpt}</p>
          <p className="mt-4 text-muted-foreground leading-relaxed">{post.content}</p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Madagascar offre de nombreuses opportunités immobilières, que ce soit pour l'habitation, l'investissement locatif 
            ou le tourisme. Chaque région a ses spécificités et ses avantages. Il est essentiel de bien se renseigner sur 
            les procédures locales, la situation foncière et les prix du marché avant de se lancer.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            N'hésitez pas à contacter nos agences partenaires pour un accompagnement personnalisé dans votre projet immobilier 
            à Madagascar. Elles connaissent parfaitement le terrain et pourront vous guider dans toutes les étapes de votre acquisition.
          </p>
        </div>
      </article>
      <Footer />
    </>
  );
};

export { BlogList, BlogArticle };
