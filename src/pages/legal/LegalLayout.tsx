import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { buildCanonicalUrl } from "@/lib/seo";

type LegalLayoutProps = {
  title: string;
  description: string;
  canonicalPath: string;
  lastUpdated: string;
  jsonLd?: Record<string, unknown>;
  children: ReactNode;
};

const LEGAL_LINKS: { to: string; label: string }[] = [
  { to: "/legal/mentions", label: "Mentions légales" },
  { to: "/legal/confidentialite", label: "Politique de confidentialité" },
  { to: "/legal/cgu", label: "CGU" },
  { to: "/legal/cookies", label: "Cookies" },
  { to: "/legal/suppression-donnees", label: "Suppression des données" },
];

export function LegalLayout({
  title,
  description,
  canonicalPath,
  lastUpdated,
  jsonLd,
  children,
}: LegalLayoutProps) {
  const canonical = buildCanonicalUrl(canonicalPath);
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        {jsonLd ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null}
      </Helmet>
      <Header />
      <main className="container mx-auto py-8 md:py-12">
        <nav className="mb-6 flex flex-wrap gap-2 text-sm font-sans">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full border border-border px-3 py-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <article className="mx-auto max-w-3xl space-y-6 font-sans leading-relaxed text-foreground [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-2 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-1 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top">
          {children}
          <footer className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">
            Dernière mise à jour : {lastUpdated}
          </footer>
        </article>
      </main>
      <Footer />
    </>
  );
}
