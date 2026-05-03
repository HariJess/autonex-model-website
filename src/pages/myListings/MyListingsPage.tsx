import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { YasBackButton } from "@/features/yas-app/components/YasBackButton";
import {
  useMyListings,
  type MyListingsFilter,
  type MyListingRow,
} from "@/features/listings/hooks/useMyListings";
import { MyListingsTabs } from "@/features/listings/components/MyListingsTabs";
import { MyListingCard } from "@/features/listings/components/MyListingCard";
import { RenewListingModal } from "@/features/listings/components/RenewListingModal";
import { MarkSoldModal } from "@/features/listings/components/MarkSoldModal";

/**
 * Page /mes-annonces — point central de gestion des annonces propriétaire.
 *
 * Layout :
 *   - Header AutoNex
 *   - Title + count total + CTA "Publier"
 *   - Tabs (6 filtres avec counts)
 *   - Grid responsive de cards (1 col mobile, 2 cols md, 3 cols xl)
 *   - Empty state si aucune annonce dans le tab actif
 *   - Modals Renew + MarkSold conditionnellement ouverts
 *
 * Sidebar stats globales : skipped pour V1 (cf. brief PROMPT 4 décision Ali).
 */
export default function MyListingsPage() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<MyListingsFilter>("all");
  const [renewTarget, setRenewTarget] = useState<MyListingRow | null>(null);
  const [soldTarget, setSoldTarget] = useState<MyListingRow | null>(null);

  const { listings, counts, isLoading, error, refetch } = useMyListings(activeFilter);

  const totalAll = counts.all;

  return (
    <>
      <Helmet>
        <title>{t("myListings.title", "Mes annonces")} — AutoNex</title>
        <meta
          name="description"
          content={t(
            "myListings.subtitle",
            "Gérez vos annonces, suivez leurs performances, et boostez votre visibilité.",
          )}
        />
      </Helmet>
      <Header />
      <main className="container mx-auto py-6 space-y-6 sm:py-8">
        <YasBackButton />

        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {t("myListings.title", "Mes annonces")}
              {totalAll > 0 && (
                <span className="ml-2 text-base font-medium text-muted-foreground">
                  ({totalAll})
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "myListings.subtitle",
                "Gérez vos annonces, suivez leurs performances, et boostez votre visibilité.",
              )}
            </p>
          </div>
          <Button asChild className="gradient-primary border-0 self-start sm:self-auto">
            <Link to="/publier">
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("nav.publish", "Publier une annonce")}
            </Link>
          </Button>
        </header>

        <MyListingsTabs
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />

        {error ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
            data-testid="my-listings-error"
          >
            <p className="font-semibold">
              {t("myListings.error.title", "Impossible de charger vos annonces.")}
            </p>
            <p className="mt-1">{error.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
              {t("myListings.error.retry", "Réessayer")}
            </Button>
          </div>
        ) : isLoading ? (
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            data-testid="my-listings-loading"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center"
            data-testid="my-listings-empty"
          >
            <p className="text-lg font-semibold text-foreground">
              {t("myListings.empty.title", "Aucune annonce dans cette catégorie")}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {t(
                "myListings.empty.body",
                "Publiez votre première annonce pour commencer à vendre votre véhicule.",
              )}
            </p>
            <Button asChild className="mt-2 gradient-primary border-0">
              <Link to="/publier">
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("myListings.empty.cta", "Publier ma première annonce")}
              </Link>
            </Button>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            data-testid="my-listings-grid"
          >
            {listings.map((listing) => (
              <MyListingCard
                key={listing.id}
                listing={listing}
                onRenew={(l) => setRenewTarget(l)}
                onMarkSold={(l) => setSoldTarget(l)}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />

      <RenewListingModal
        open={renewTarget !== null}
        onOpenChange={(open) => !open && setRenewTarget(null)}
        listing={renewTarget}
      />
      <MarkSoldModal
        open={soldTarget !== null}
        onOpenChange={(open) => !open && setSoldTarget(null)}
        listing={soldTarget}
      />
    </>
  );
}
