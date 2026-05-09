import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Flame, SlidersHorizontal } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import { useActiveDeals } from "@/hooks/useDeals";
import { getDealMeta } from "@/lib/deals";
import { YasBackButton } from "@/features/yas-app/components/YasBackButton";

const PAGE_SIZE = 24;

interface FilterValues {
  minDiscount: number;
  maxPriceMga: number;
  ville: string;
  make: string;
}

const EMPTY_FILTERS: FilterValues = {
  minDiscount: 0,
  maxPriceMga: 0,
  ville: "",
  make: "",
};

function FilterPanel({
  draft,
  onChange,
  onReset,
}: {
  draft: FilterValues;
  onChange: (next: FilterValues) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="font-sans text-sm">{t("bonnesAffaires.filters.make", "Marque")}</Label>
        <Input
          type="text"
          value={draft.make}
          onChange={(e) => onChange({ ...draft, make: e.target.value })}
          placeholder="Toyota, Mazda…"
          className="font-sans"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="font-sans text-sm">{t("bonnesAffaires.filters.minDiscount", "Remise minimum")}</Label>
        <Input
          type="number"
          min={0}
          max={30}
          step={5}
          value={draft.minDiscount > 0 ? draft.minDiscount : ""}
          onChange={(e) => onChange({ ...draft, minDiscount: Number(e.target.value) || 0 })}
          placeholder="0"
          className="font-sans"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="font-sans text-sm">{t("bonnesAffaires.filters.maxPrice", "Budget max")}</Label>
        <Input
          type="number"
          min={0}
          value={draft.maxPriceMga > 0 ? draft.maxPriceMga : ""}
          onChange={(e) => onChange({ ...draft, maxPriceMga: Number(e.target.value) || 0 })}
          placeholder="20000000"
          className="font-sans"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="font-sans text-sm">{t("bonnesAffaires.filters.ville", "Ville")}</Label>
        <Input
          type="text"
          value={draft.ville}
          onChange={(e) => onChange({ ...draft, ville: e.target.value })}
          placeholder="Antananarivo, Toamasina…"
          className="font-sans"
        />
      </div>
      <Button type="button" variant="outline" className="w-full font-sans" onClick={onReset}>
        {t("bonnesAffaires.filters.reset", "Réinitialiser")}
      </Button>
    </div>
  );
}

const BonnesAffairesPage = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileDraft, setMobileDraft] = useState<FilterValues>(EMPTY_FILTERS);

  const { data, isLoading, isError } = useActiveDeals({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    minDiscount: filters.minDiscount,
    maxPriceMga: filters.maxPriceMga,
    ville: filters.ville || undefined,
    make: filters.make || undefined,
  });

  const listings = useMemo(() => data?.listings ?? [], [data]);
  const totalCount = data?.count ?? 0;

  // Calcule dealMeta côté front via getDealMeta — il lit en priorité les
  // champs deal_* (tous présents dans les rows retournés ici), donc on a
  // bien isVerified=true partout.
  const enrichedListings = useMemo(
    () => listings.map((listing) => ({ listing, deal: getDealMeta(listing) })),
    [listings],
  );

  // Compteur de filtres actifs (sert le badge du bouton « Filtres » mobile).
  const activeFiltersCount =
    (filters.minDiscount > 0 ? 1 : 0) +
    (filters.maxPriceMga > 0 ? 1 : 0) +
    (filters.ville.trim().length > 0 ? 1 : 0) +
    (filters.make.trim().length > 0 ? 1 : 0);

  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setMobileDraft(EMPTY_FILTERS);
    setPage(0);
  };

  const applyMobileFilters = () => {
    setFilters(mobileDraft);
    setPage(0);
    setMobileFiltersOpen(false);
  };

  const seoTitle = t("bonnesAffaires.seo.title", "Bonnes affaires véhicules à Madagascar — AutoNex");
  const seoDescription = t(
    "bonnesAffaires.seo.description",
    "Découvrez les meilleures bonnes affaires automobiles à Madagascar. Annonces avec prix réellement réduits, vérifiées et garanties par AutoNex.",
  );

  const canLoadMore = listings.length < totalCount;

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={t("bonnesAffaires.seo.ogTitle", "Bonnes affaires auto à Madagascar — AutoNex")} />
        <meta
          property="og:description"
          content={t("bonnesAffaires.seo.ogDescription", "Voitures à prix réduits, sans faux rabais. La promesse AutoNex.")}
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://autonex.mg/bonnes-affaires" />
        <link rel="canonical" href="https://autonex.mg/bonnes-affaires" />
        <meta name="robots" content="index,follow" />
      </Helmet>

      <Header />

      <div className="container mx-auto pt-2.5 md:pt-4 pb-2 md:pb-3">
        {/* Sprint 5 fix #13 — header compact pour tenir sous 200px en mobile.
            Title + count inline sur une ligne, sous-titre court, version
            desktop reste plus aérée. */}
        <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-orange-100/20 px-3 py-2.5 md:px-5 md:py-4 dark:to-orange-950/10">
          <YasBackButton />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="font-sans text-lg md:text-3xl font-bold text-foreground leading-tight inline-flex items-center gap-1.5">
              <Flame className="h-4 w-4 md:h-5 md:w-5 text-orange-600 shrink-0" aria-hidden />
              {t("bonnesAffaires.title", "Bonnes affaires véhicules à Madagascar")}
            </h1>
            {!isLoading && !isError && totalCount > 0 && (
              <span className="font-sans text-sm md:text-base text-muted-foreground font-medium">
                ({totalCount})
              </span>
            )}
          </div>
          <p className="font-sans text-xs md:text-sm text-muted-foreground leading-relaxed mt-0.5">
            {t("bonnesAffaires.subtitle", "Annonces avec prix réellement réduits, vérifiées sur AutoNex.")}
          </p>
        </section>
      </div>

      <div className="container mx-auto pb-8 md:pb-10">
        <div className="flex gap-6 lg:gap-7">
          {/* Sidebar desktop */}
          <aside className="hidden md:block w-64 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-4">
              <h2 className="font-sans text-sm font-semibold text-foreground">
                {t("bonnesAffaires.filters.title", "Filtres")}
              </h2>
              <FilterPanel
                draft={filters}
                onChange={(next) => {
                  setFilters(next);
                  setPage(0);
                }}
                onReset={reset}
              />
            </div>
          </aside>

          <main className="flex-1 min-w-0 space-y-4">
            {/* Bouton filtres mobile — compact (auto width, badge count des
                filtres actifs). Aligné à gauche dans son row. */}
            <div className="md:hidden">
              <Sheet open={mobileFiltersOpen} onOpenChange={(open) => {
                if (open) setMobileDraft(filters);
                setMobileFiltersOpen(open);
              }}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="font-sans gap-2" type="button">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t("bonnesAffaires.filters.title", "Filtres")}
                    {activeFiltersCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="font-sans">
                      {t("bonnesAffaires.filters.title", "Filtres")}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <FilterPanel
                      draft={mobileDraft}
                      onChange={setMobileDraft}
                      onReset={() => {
                        setMobileDraft(EMPTY_FILTERS);
                      }}
                    />
                    <Button
                      type="button"
                      className="mt-4 w-full font-sans"
                      onClick={applyMobileFilters}
                    >
                      {t("bonnesAffaires.filters.apply", "Appliquer")}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {isLoading && (
              <div className="flex justify-center py-12">
                <WheelSpinner size="lg" />
              </div>
            )}

            {isError && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
                <p className="font-sans text-sm text-destructive">
                  {t("bonnesAffaires.error", "Impossible de charger les bonnes affaires. Réessayez dans un instant.")}
                </p>
              </div>
            )}

            {!isLoading && !isError && enrichedListings.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 px-4 py-10 text-center">
                <p className="font-sans text-sm text-muted-foreground">
                  {t("bonnesAffaires.empty", "Aucune bonne affaire pour le moment. Revenez bientôt !")}
                </p>
              </div>
            )}

            {!isLoading && !isError && enrichedListings.length > 0 && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                  {enrichedListings.map(({ listing, deal }) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      dealMeta={deal}
                      layout="compact"
                      feedContext="deals"
                    />
                  ))}
                </div>
                {/* Sprint 5 fix #15 — pagination stylée : compteur narratif
                    « 2 sur 2 véhicules affichés » + bouton « Voir plus »
                    si applicable. Plus clair que le « 2 / 2 » brut. */}
                {totalCount > 0 && (
                  <div className="flex flex-col items-center gap-2 pt-4 border-t border-border/40">
                    <span className="font-sans text-xs text-muted-foreground">
                      {t("bonnesAffaires.pagination.shown", {
                        shown: listings.length,
                        total: totalCount,
                        defaultValue: "{{shown}} sur {{total}} véhicules affichés",
                      })}
                    </span>
                    {canLoadMore && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-sans"
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {t("bonnesAffaires.loadMore", "Voir plus")}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default BonnesAffairesPage;
