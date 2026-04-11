import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { seedBlogPosts } from "@/data/seed-listings";

/** Try DB first, fallback to seed posts */
function useBlogPosts() {
  return useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("published_at", { ascending: false });
      if (error || !data || data.length === 0) {
        // Fallback to seed data
        return seedBlogPosts.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          content: p.content,
          cover_url: p.cover,
          category: p.category,
          published_at: p.published_at,
          author_id: null,
        }));
      }
      return data;
    },
  });
}

const BlogList = () => {
  const { t } = useTranslation();
  const { data: posts = [], isLoading } = useBlogPosts();

  return (
    <>
      <Helmet><title>{t("nav.advice")} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl font-bold mb-6">{t("nav.advice")}</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-muted-foreground font-sans py-12">Aucun article pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} to={`/conseils/${post.slug}`} className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all">
                <div className="aspect-video overflow-hidden">
                  <img src={post.cover_url ?? ""} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    {post.category && <Badge variant="secondary" className="font-sans text-xs">{post.category}</Badge>}
                    <span className="text-xs text-muted-foreground font-sans">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString("fr-FR") : ""}
                    </span>
                  </div>
                  <h3 className="font-serif font-semibold text-foreground leading-tight">{post.title}</h3>
                  <p className="text-sm font-sans text-muted-foreground line-clamp-2">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

const BlogArticle = () => {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { data: posts = [], isLoading } = useBlogPosts();
  const post = posts.find((p) => p.slug === slug);

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

  if (!post) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">Article introuvable</h1>
          <p className="text-muted-foreground font-sans mb-6">Cet article n'existe pas ou a été supprimé.</p>
          <Link to="/conseils">
            <Button variant="outline" className="font-sans">Voir tous les articles</Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet><title>{post.title} — ImmoNex</title></Helmet>
      <Header />
      <article className="container mx-auto px-4 py-8 max-w-3xl">
        <nav className="flex items-center gap-2 text-sm font-sans text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span>›</span>
          <Link to="/conseils" className="hover:text-primary">{t("nav.advice")}</Link>
          <span>›</span>
          <span className="text-foreground">{post.title}</span>
        </nav>
        {post.category && <Badge variant="secondary" className="font-sans text-xs mb-4">{post.category}</Badge>}
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
        <p className="text-muted-foreground font-sans mb-8">
          {post.published_at ? new Date(post.published_at).toLocaleDateString("fr-FR") : ""}
        </p>
        {post.cover_url && (
          <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
            <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="prose prose-lg max-w-none font-sans">
          <p className="text-lg font-medium text-foreground">{post.excerpt}</p>
          {post.content && <p className="mt-4 text-muted-foreground leading-relaxed">{post.content}</p>}
        </div>
      </article>
      <Footer />
    </>
  );
};

export { BlogList, BlogArticle };
