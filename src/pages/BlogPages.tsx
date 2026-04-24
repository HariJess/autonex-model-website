import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";
import { seedBlogPosts, type SeedBlogCallout } from "@/data/seed-listings";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const calloutStyles: Record<
  SeedBlogCallout["type"],
  { border: string; bg: string; iconColor: string; Icon: typeof Info; defaultTitle: string }
> = {
  tip: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    Icon: Lightbulb,
    defaultTitle: "Astuce",
  },
  warning: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    Icon: AlertTriangle,
    defaultTitle: "Attention",
  },
  info: {
    border: "border-l-sky-500",
    bg: "bg-sky-500/10",
    iconColor: "text-sky-600",
    Icon: Info,
    defaultTitle: "À savoir",
  },
};

const Callout = ({ callout }: { callout: SeedBlogCallout }) => {
  const style = calloutStyles[callout.type];
  const Icon = style.Icon;
  return (
    <div className={`rounded-r-xl border-l-4 ${style.border} ${style.bg} p-4 sm:p-5`}>
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.iconColor}`} aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-serif font-semibold text-foreground">{callout.title ?? style.defaultTitle}</p>
          <p className="text-sm sm:text-base text-muted-foreground leading-7">{callout.text}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Blog uses seed data consistently (no hybrid DB/seed).
 * When real DB blog content is ready, switch entirely to DB.
 */

const BlogList = () => {
  const { t } = useTranslation();
  const posts = seedBlogPosts;
  const fallbackCover = "/placeholder.svg";
  const canonical = typeof window !== "undefined"
    ? `${window.location.origin}/conseils`
    : "https://autonex.mg/conseils";

  return (
    <>
      <Helmet>
        <title>{t("nav.advice")} — AutoNex</title>
        <meta
          name="description"
          content="Conseils auto à Madagascar : achat, vente, entretien, financement et guides pratiques pour choisir votre véhicule."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <Header />
      <div className="container mx-auto py-6 md:py-8">
        <h1 className="font-serif text-3xl font-bold mb-6">{t("nav.advice")}</h1>

        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground font-sans py-12">
            {t("blog.noPosts", "Aucun article pour le moment.")}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} to={`/conseils/${post.slug}`} className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.cover}
                    alt={post.coverAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallbackApplied) {
                        img.dataset.fallbackApplied = "1";
                        img.src = fallbackCover;
                      }
                    }}
                  />
                </div>
                <div className="p-5 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.category && <Badge variant="secondary" className="font-sans text-xs">{post.category}</Badge>}
                    <span className="text-xs text-muted-foreground font-sans">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString("fr-FR") : ""}
                    </span>
                    <span className="text-xs text-muted-foreground font-sans">• {post.readingTime}</span>
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
  const post = seedBlogPosts.find((p) => p.slug === slug);
  const fallbackCover = "/placeholder.svg";
  const canonical = typeof window !== "undefined"
    ? `${window.location.origin}/conseils/${slug}`
    : `https://autonex.mg/conseils/${slug}`;

  if (!post) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">{t("blog.notFound", "Article introuvable")}</h1>
          <p className="text-muted-foreground font-sans mb-6">{t("blog.notFoundDesc", "Cet article n'existe pas ou a été supprimé.")}</p>
          <Link to="/conseils">
            <Button variant="outline" className="font-sans">{t("blog.viewAll", "Voir tous les articles")}</Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.seoTitle} — AutoNex</title>
        <meta name="description" content={post.metaDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.seoTitle} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:image" content={post.cover} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.seoTitle} />
        <meta name="twitter:description" content={post.metaDescription} />
        <meta name="twitter:image" content={post.cover} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.seoTitle,
            description: post.metaDescription,
            image: [post.cover],
            datePublished: post.published_at,
            dateModified: post.updated_at,
            mainEntityOfPage: canonical,
            author: { "@type": "Organization", name: "AutoNex" },
            publisher: { "@type": "Organization", name: "AutoNex" },
            keywords: post.tags.join(", "),
          })}
        </script>
        {post.faq.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: post.faq.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: f.answer,
                },
              })),
            })}
          </script>
        )}
      </Helmet>
      <Header />
      <article className="container mx-auto py-6 md:py-8 max-w-3xl">
        <nav className="flex items-center gap-2 text-sm font-sans text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">{t("nav.home", "Accueil")}</Link>
          <span>›</span>
          <Link to="/conseils" className="hover:text-primary">{t("nav.advice")}</Link>
          <span>›</span>
          <span className="text-foreground">{post.title}</span>
        </nav>
        {post.category && <Badge variant="secondary" className="font-sans text-xs mb-4">{post.category}</Badge>}
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight break-words">{post.title}</h1>
        <div className="text-muted-foreground font-sans mb-6 md:mb-8 text-sm flex flex-wrap items-center gap-2">
          <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("fr-FR") : ""}</span>
          <span>•</span>
          <span>{post.readingTime}</span>
          <span>•</span>
          <span>Mis à jour le {post.updated_at ? new Date(post.updated_at).toLocaleDateString("fr-FR") : ""}</span>
        </div>
        {post.cover && (
          <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
            <img
              src={post.cover}
              alt={post.coverAlt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallbackApplied) {
                  img.dataset.fallbackApplied = "1";
                  img.src = fallbackCover;
                }
              }}
            />
          </div>
        )}
        <div className="space-y-7 md:space-y-8 font-sans">
          <p className="text-base sm:text-lg leading-relaxed text-foreground font-medium">{post.intro}</p>

          {post.sections.length > 1 && (
            <nav aria-label={t("blog.toc", "Sommaire")} className="rounded-2xl border border-border bg-secondary/30 p-4 sm:p-5">
              <p className="font-serif font-semibold text-foreground mb-2">{t("blog.toc", "Sommaire")}</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                {post.sections.map((section) => (
                  <li key={section.heading}>
                    <a href={`#${slugify(section.heading)}`} className="hover:text-primary hover:underline">
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {post.sections.map((section) => {
            const sectionId = slugify(section.heading);
            const ListTag = section.numbered ? "ol" : "ul";
            const bulletListClass = section.numbered
              ? "list-decimal pl-5 space-y-3 text-muted-foreground marker:font-semibold marker:text-foreground"
              : "list-disc pl-5 space-y-2 text-muted-foreground";
            return (
              <section key={section.heading} id={sectionId} className="space-y-4 scroll-mt-24">
                <h2 className="font-serif text-2xl font-bold text-foreground">{section.heading}</h2>
                {section.paragraphs?.map((paragraph, idx) => (
                  <p key={idx} className="text-muted-foreground leading-7 sm:leading-8">{paragraph}</p>
                ))}

                {section.table && (
                  <figure className="space-y-2">
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-secondary/50">
                          <tr>
                            {section.table.headers.map((header) => (
                              <th key={header} className="px-3 py-2.5 text-left font-serif font-semibold text-foreground border-b border-border">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.table.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="even:bg-secondary/20">
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-3 py-2.5 text-muted-foreground border-b border-border last:border-b-0 align-top">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {section.table.caption && (
                      <figcaption className="text-xs text-muted-foreground italic text-center">
                        {section.table.caption}
                      </figcaption>
                    )}
                  </figure>
                )}

                {section.bulletsTitle && (
                  <h3 className="font-serif text-lg font-semibold text-foreground">{section.bulletsTitle}</h3>
                )}
                {section.bullets && section.bullets.length > 0 && (
                  <ListTag className={bulletListClass}>
                    {section.bullets.map((item, idx) => (
                      <li key={idx} className="leading-7 sm:leading-8 pl-1">{item}</li>
                    ))}
                  </ListTag>
                )}
                {section.checklistTitle && (
                  <h3 className="font-serif text-lg font-semibold text-foreground">{section.checklistTitle}</h3>
                )}
                {section.checklist && section.checklist.length > 0 && (
                  <ul className="space-y-2">
                    {section.checklist.map((item) => (
                      <li key={item} className="rounded-xl border border-border bg-secondary/30 px-3 py-2 text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {section.callout && <Callout callout={section.callout} />}
              </section>
            );
          })}

          {post.faq.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">FAQ</h2>
              <div className="space-y-3">
                {post.faq.map((item) => (
                  <div key={item.question} className="rounded-2xl border border-border p-4 bg-card">
                    <h3 className="font-serif text-lg font-semibold text-foreground">{item.question}</h3>
                    <p className="text-muted-foreground mt-2 leading-7">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="font-serif text-xl font-bold text-foreground mb-2">En conclusion</h2>
            <p className="text-muted-foreground leading-7">{post.conclusion}</p>
          </section>
        </div>
      </article>
      <Footer />
    </>
  );
};

export { BlogList, BlogArticle };
