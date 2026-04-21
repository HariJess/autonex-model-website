import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { useMyFavoritesList } from "@/hooks/useFavorites";

const FavoritesPage = () => {
  const { t } = useTranslation();
  const { data: favorites, isLoading, error, refetch, isRefetching } = useMyFavoritesList();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{t("favorites.title")} · AutoNex</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-10">
        <section className="mb-6 md:mb-8">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 md:h-7 md:w-7 text-destructive fill-destructive" aria-hidden />
            {t("favorites.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground font-sans">
            {t("favorites.subtitle")}
          </p>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive font-sans mb-4">
              {t("favorites.loadError")}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={isRefetching}
            >
              {t("favorites.retry")}
            </Button>
          </div>
        ) : !favorites || favorites.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card p-8 md:p-12 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Heart className="h-7 w-7 text-muted-foreground" aria-hidden />
            </div>
            <h2 className="font-serif text-lg md:text-xl font-semibold text-foreground">
              {t("favorites.empty.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground font-sans max-w-md mx-auto">
              {t("favorites.empty.body")}
            </p>
            <div className="mt-5">
              <Button asChild className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
                <Link to="/recherche">{t("favorites.empty.cta")}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {favorites.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default FavoritesPage;
