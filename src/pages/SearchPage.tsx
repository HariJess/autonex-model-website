import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import FilterSidebar from "@/components/FilterSidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, X, LayoutGrid, List, Map as MapIcon, ChevronRight, Home, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { LISTING_TYPE_LABELS_PLURAL, LISTING_TYPE_LABELS, TRANSACTION_LABELS } from "@/types/listing";
import { useDbListings } from "@/hooks/useListings";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMemo, useCallback, useState, useEffect, useRef, lazy, Suspense, type ReactNode } from "react";
import {
  searchStateFromParams,
  searchParamsFromState,
} from "@/lib/searchUrl";
import type { SearchFilters, SearchSortMode, SearchViewMode } from "@/types/search";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";
import { SearchTopBanner } from "@/components/monetization/SearchTopBanner";
import { SidebarPromoSlot } from "@/components/monetization/SidebarPromoSlot";
import { SponsoredNativeCard } from "@/components/monetization/SponsoredNativeCard";
import { FeaturedAgenciesSection } from "@/components/monetization/FeaturedAgenciesSection";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { rankSimilarListings } from "@/lib/searchSimilar";
import { recordSearchAnalytics } from "@/lib/searchAnalytics";
import type { DisplayListing } from "@/types/listing";
import {
  describeCloseMatchKind,
  matchesBathroomsStrict,
  matchesLocationSubareas,
  matchesPriceMaxStrict,
  matchesPriceMinStrict,
  matchesRoomsStrict,
  matchesSurfaceMaxStrict,
  matchesSurfaceMinStrict,
} from "@/lib/searchLocationMatch";

const ListingsMap = lazy(() => import("@/components/ListingsMap"));

function listingMatchesEquipments(features: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  const norm = (s: string) => s.toLowerCase().trim();
  const feats = features.map(norm);
  return required.every((eq) => {
    const e = norm(eq);
    return feats.some((f) => f.includes(e) || e.includes(f));
  });
}

const SearchPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  /** Draft filters while mobile sheet is open; URL updates only on Appliquer */
  const [mobileFilterDraft, setMobileFilterDraft] = useState<SearchFilters | null>(null);

  // IMPORTANT : filters/sort/viewMode doivent être déclarés AVANT les callbacks qui les utilisent
  // (sinon ReferenceError "Cannot access 'filters' before initialization" au runtime).
  const { filters, sort, view: viewMode } = useMemo(
    () => searchStateFromParams(searchParams),
    [searchParams]
  );

  const handleMobileSheetOpenChange = useCallback(
    (open: boolean) => {
      setMobileFiltersOpen(open);
      if (open) {
        setMobileFilterDraft({ ...filters });
      } else {
        setMobileFilterDraft(null);
      }
    },
    [filters],
  );

  const applyMobileFilters = useCallback(() => {
    updateFilters(mobileFilterDraft ?? filters);
    setMobileFiltersOpen(false);
    setMobileFilterDraft(null);
  }, [mobileFilterDraft, filters, updateFilters]);

  const pushSearchState = useCallback(
    (next: { filters?: SearchFilters; sort?: SearchSortMode; view?: SearchViewMode }) => {
      const f = next.filters ?? filters;
      const s = next.sort ?? sort;
      const v = next.view ?? viewMode;
      setSearchParams(searchParamsFromState(f, s, v), { replace: true });
    },
    [filters, sort, viewMode, setSearchParams]
  );

  const updateFilters = useCallback(
    (newFilters: SearchFilters) => pushSearchState({ filters: newFilters }),
    [pushSearchState]
  );

  const setSort = useCallback(
    (s: SearchSortMode) => pushSearchState({ sort: s }),
    [pushSearchState]
  );

  const setViewMode = useCallback(
    (v: SearchViewMode) => pushSearchState({ view: v }),
    [pushSearchState]
  );

  const qTrim = filters.quartierLibre.trim();

  const { data: dbListings = [], isLoading, error: queryError } = useDbListings({
    transaction: filters.transaction || undefined,
    types: filters.types.length > 0 ? filters.types : undefined,
    ville: filters.ville || undefined,
    freeText: qTrim.length >= 1 ? qTrim : undefined,
    priceMin: filters.priceMin || undefined,
    priceMax: filters.priceMax || undefined,
    rooms: filters.rooms.length > 0 ? filters.rooms : undefined,
    bathrooms: filters.bathrooms.length > 0 ? filters.bathrooms : undefined,
    surfaceMin: filters.surfaceMin || undefined,
    surfaceMax: filters.surfaceMax || undefined,
    searchRelaxation: true,
  });

  const equippedListings = useMemo(() => {
    let results = [...dbListings];
    if (filters.equipments.length > 0) {
      results = results.filter((l) => listingMatchesEquipments(l.features, filters.equipments));
    }
    return results;
  }, [dbListings, filters.equipments]);

  const exactMatchListings = useMemo(() => {
    let results = equippedListings;
    if (filters.ville && (filters.arrondissements.length > 0 || filters.quartiers.length > 0)) {
      results = results.filter((l) => matchesLocationSubareas(l, filters));
    }
    if (filters.priceMin > 0) {
      results = results.filter((l) => matchesPriceMinStrict(l.price_mga, filters.priceMin));
    }
    if (filters.priceMax > 0) {
      results = results.filter((l) => matchesPriceMaxStrict(l.price_mga, filters.priceMax));
    }
    if (filters.surfaceMin > 0) {
      results = results.filter((l) => matchesSurfaceMinStrict(l.surface, filters.surfaceMin));
    }
    if (filters.surfaceMax > 0) {
      results = results.filter((l) => matchesSurfaceMaxStrict(l.surface, filters.surfaceMax));
    }
    if (filters.rooms.length > 0) {
      results = results.filter((l) => matchesRoomsStrict(l.rooms, filters.rooms));
    }
    if (filters.bathrooms.length > 0) {
      results = results.filter((l) => matchesBathroomsStrict(l.bathrooms, filters.bathrooms));
    }
    return results;
  }, [equippedListings, filters]);

  const sortedExact = useMemo(() => {
    const results = [...exactMatchListings];
    if (sort === "priceAsc") {
      results.sort((a, b) => a.price_mga - b.price_mga);
    } else if (sort === "priceDesc") {
      results.sort((a, b) => b.price_mga - a.price_mga);
    } else if (sort === "recent") {
      results.sort((a, b) => {
        const sa = a.visibility_rank_score ?? new Date(a.created_at ?? 0).getTime();
        const sb = b.visibility_rank_score ?? new Date(b.created_at ?? 0).getTime();
        return sb - sa;
      });
    }
    return results;
  }, [exactMatchListings, sort]);

  const similarFallbackListings = useMemo(() => {
    if (sortedExact.length > 0) return [];
    return rankSimilarListings(equippedListings, filters, new Set(), 9);
  }, [sortedExact.length, equippedListings, filters]);

  const closeMatchLabel = useCallback(
    (listing: DisplayListing) => {
      const kind = describeCloseMatchKind(listing, filters);
      if (kind === "budget") return t("search.matchHintBudget", "Budget légèrement supérieur");
      if (kind === "location") return t("search.matchHintZone", "Résultat proche");
      return t("search.matchHintApprox", "Correspondance approximative");
    },
    [filters, t],
  );

  const alsoLikeListings = useMemo(() => {
    if (sortedExact.length < 1 || sortedExact.length > 3) return [];
    const exclude = new Set(sortedExact.map((l) => l.id));
    return rankSimilarListings(equippedListings, filters, exclude, 6);
  }, [sortedExact, equippedListings, filters]);

  /** Grille / liste / carte : résultats exacts, ou suggestions si aucun exact */
  const displayListings = sortedExact.length > 0 ? sortedExact : similarFallbackListings;

  const showCloseMatchBadges = sortedExact.length === 0 && similarFallbackListings.length > 0;

  const analyticsSentRef = useRef<string>("");
  useEffect(() => {
    if (isLoading || queryError) return;
    const key = JSON.stringify({
      f: filters,
      n: sortedExact.length,
      sim: similarFallbackListings.length,
      also: alsoLikeListings.length,
    });
    if (key === analyticsSentRef.current) return;
    analyticsSentRef.current = key;
    const timer = window.setTimeout(() => {
      recordSearchAnalytics({
        filters,
        exactResultCount: sortedExact.length,
        hadZeroExact: sortedExact.length === 0,
        showedSimilarFallback: sortedExact.length === 0 && similarFallbackListings.length > 0,
        showedAlsoLike: alsoLikeListings.length > 0,
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [
    isLoading,
    queryError,
    filters,
    sortedExact.length,
    similarFallbackListings.length,
    alsoLikeListings.length,
  ]);

  const activeChips = useMemo(() => {
    const chips: { label: string; key: string }[] = [];
    if (filters.transaction) {
      chips.push({
        label: TRANSACTION_LABELS[filters.transaction as keyof typeof TRANSACTION_LABELS] || filters.transaction,
        key: "transaction",
      });
    }
    filters.types.forEach((tp) =>
      chips.push({ label: LISTING_TYPE_LABELS[tp as keyof typeof LISTING_TYPE_LABELS] ?? tp, key: `type-${tp}` })
    );
    if (filters.ville) chips.push({ label: filters.ville, key: "ville" });
    filters.arrondissements.forEach((a) => chips.push({ label: a, key: `arr-${a}` }));
    filters.quartiers.forEach((q) => chips.push({ label: q, key: `q-${q}` }));
    if (filters.quartierLibre) chips.push({ label: filters.quartierLibre, key: "quartierLibre" });
    if (filters.priceMin || filters.priceMax) {
      chips.push({
        label: `${filters.priceMin ? (filters.priceMin / 1e6).toFixed(0) + "M" : "0"} - ${filters.priceMax ? (filters.priceMax / 1e6).toFixed(0) + "M" : "∞"} Ar`,
        key: "price",
      });
    }
    if (filters.surfaceMin || filters.surfaceMax) {
      chips.push({
        label: `${filters.surfaceMin || 0} - ${filters.surfaceMax ? filters.surfaceMax + " m²" : "∞"}`,
        key: "surface",
      });
    }
    filters.rooms.forEach((r) =>
      chips.push({ label: `${r === 0 ? "Studio" : r + " ch."}`, key: `room-${r}` })
    );
    filters.bathrooms.forEach((b) =>
      chips.push({ label: `${b}${b === 4 ? "+" : ""} sdb`, key: `bath-${b}` })
    );
    filters.equipments.forEach((e) => chips.push({ label: e, key: `eq-${e}` }));
    return chips;
  }, [filters]);

  const removeChip = (key: string) => {
    const newFilters = { ...filters };
    if (key === "transaction") newFilters.transaction = "";
    else if (key.startsWith("type-")) newFilters.types = newFilters.types.filter((tp) => tp !== key.slice(5));
    else if (key === "ville") {
      newFilters.ville = "";
      newFilters.arrondissements = [];
      newFilters.quartiers = [];
      newFilters.quartierLibre = "";
    } else if (key.startsWith("arr-")) {
      const name = key.slice(4);
      newFilters.arrondissements = newFilters.arrondissements.filter((a) => a !== name);
    } else if (key.startsWith("q-")) newFilters.quartiers = newFilters.quartiers.filter((q) => q !== key.slice(2));
    else if (key === "quartierLibre") newFilters.quartierLibre = "";
    else if (key === "price") {
      newFilters.priceMin = 0;
      newFilters.priceMax = 0;
    } else if (key === "surface") {
      newFilters.surfaceMin = 0;
      newFilters.surfaceMax = 0;
    } else if (key.startsWith("room-")) newFilters.rooms = newFilters.rooms.filter((r) => r !== Number(key.slice(5)));
    else if (key.startsWith("bath-")) newFilters.bathrooms = newFilters.bathrooms.filter((b) => b !== Number(key.slice(5)));
    else if (key.startsWith("eq-")) newFilters.equipments = newFilters.equipments.filter((e) => e !== key.slice(3));
    updateFilters(newFilters);
  };

  const activeFilterCount = activeChips.length;

  const transactionOnlyHref = useMemo(() => {
    if (!filters.transaction) return "/recherche";
    const p = searchParamsFromState(
      { ...EMPTY_SEARCH_FILTERS, transaction: filters.transaction },
      "recent",
      "grid"
    );
    const qs = p.toString();
    return qs ? `/recherche?${qs}` : "/recherche";
  }, [filters.transaction]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; to?: string }[] = [{ label: t("nav.home", "Accueil"), to: "/" }];
    if (filters.transaction) {
      crumbs.push({
        label: TRANSACTION_LABELS[filters.transaction as keyof typeof TRANSACTION_LABELS] || filters.transaction,
        to: transactionOnlyHref,
      });
    }
    if (filters.ville) crumbs.push({ label: filters.ville });
    return crumbs;
  }, [filters.transaction, filters.ville, t, transactionOnlyHref]);

  const pageTitle = useMemo(() => {
    const parts: string[] = [];
    if (filters.types.length === 1) {
      parts.push(LISTING_TYPE_LABELS_PLURAL[filters.types[0] as keyof typeof LISTING_TYPE_LABELS_PLURAL] || filters.types[0]);
    } else {
      parts.push(t("search.properties", "Biens immobiliers"));
    }
    if (filters.transaction === "vente") parts.push(t("search.forSale", "à vendre"));
    else if (filters.transaction === "location") parts.push(t("search.forRent", "à louer"));
    else if (filters.transaction === "location_vacances")
      parts.push(t("search.titleVacationPhrase", "— courte durée / vacances"));
    if (filters.ville) parts.push(`à ${filters.ville}`);
    return parts.join(" ");
  }, [filters, t]);

  const errorMessage =
    queryError instanceof Error ? queryError.message : queryError != null ? String(queryError) : "";

  const showToolbar = !isLoading;
  const showResults = !isLoading && !queryError && displayListings.length > 0;
  const showEmpty = !isLoading && !queryError && displayListings.length === 0;
  const showSimilarBanner = !isLoading && !queryError && sortedExact.length === 0 && similarFallbackListings.length > 0;
  const showAlsoLikeBlock =
    !isLoading && !queryError && sortedExact.length >= 1 && sortedExact.length <= 3 && alsoLikeListings.length > 0;

  return (
    <>
      <Helmet>
        <title>
          {queryError ? t("search.title", "Recherche") : pageTitle} — ImmoNex
        </title>
      </Helmet>
      <Header />

      <div className="container mx-auto px-4 pt-4 pb-2">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm font-sans text-muted-foreground mb-3" aria-label="Breadcrumb">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
              {i === 0 && bc.to ? (
                <Link to={bc.to} className="hover:text-primary transition-colors flex items-center gap-1">
                  <Home className="h-3.5 w-3.5" />
                  {bc.label}
                </Link>
              ) : i < breadcrumbs.length - 1 && bc.to ? (
                <Link to={bc.to} className="hover:text-primary transition-colors">
                  {bc.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{bc.label}</span>
              )}
            </span>
          ))}
        </nav>

        <h1 className="font-serif text-xl md:text-2xl font-bold mb-2">
          {queryError ? t("search.title", "Recherche") : pageTitle}{" "}
          {!queryError && (
            <span className="text-muted-foreground font-normal text-lg">
              {sortedExact.length > 0 ? (
                <>
                  ({sortedExact.length}{" "}
                  {t("search.listingCount", "annonce")}
                  {sortedExact.length !== 1 ? "s" : ""})
                </>
              ) : similarFallbackListings.length > 0 ? (
                <>
                  ({similarFallbackListings.length}{" "}
                  {similarFallbackListings.length > 1
                    ? t("search.suggestionsShort", "suggestions")
                    : t("search.suggestionShort", "suggestion")}
                  )
                </>
              ) : (
                <>({t("search.zeroListingsHeadline", "0 annonce")})</>
              )}
            </span>
          )}
        </h1>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 lg:gap-1.5">
            {activeChips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                role="button"
                tabIndex={0}
                className="font-sans gap-1.5 cursor-pointer hover:bg-destructive/10 transition-colors touch-manipulation max-lg:min-h-10 max-lg:py-2 max-lg:px-2.5 max-lg:text-sm text-xs"
                onClick={() => removeChip(chip.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    removeChip(chip.key);
                  }
                }}
              >
                {chip.label}
                <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-sans text-muted-foreground h-6 max-lg:min-h-10 max-lg:px-3 touch-manipulation"
              onClick={() => updateFilters({ ...EMPTY_SEARCH_FILTERS })}
            >
              {t("common.clearAll", "Effacer tout")}
            </Button>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-80 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <FilterSidebar filters={filters} onFiltersChange={updateFilters} idPrefix="desktop" />
            <SidebarPromoSlot />
            {MONETIZATION_PLACEMENTS.searchFeaturedAgencies && (
              <div className="mt-6">
                <FeaturedAgenciesSection title={t("search.partnerAgencies", "Agences partenaires")} variant="embedded" limit={6} />
              </div>
            )}
          </aside>

          <main className="flex-1 min-w-0">
            <SearchTopBanner />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 bg-card rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <Sheet open={mobileFiltersOpen} onOpenChange={handleMobileSheetOpenChange}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden font-sans gap-2 shrink-0 min-h-11 touch-manipulation">
                      <SlidersHorizontal className="h-4 w-4" />
                      {t("search.filters")}
                      {activeFilterCount > 0 && (
                        <Badge
                          variant="default"
                          className="h-5 min-w-5 px-1 flex items-center justify-center text-[10px] gradient-primary border-0"
                          style={{ color: "#FAFAFA" }}
                        >
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="flex flex-col w-full sm:max-w-lg p-0 gap-0 h-[100dvh] max-h-[100dvh] overflow-hidden border-l"
                  >
                    <FilterSidebar
                      filters={mobileFilterDraft ?? filters}
                      onFiltersChange={setMobileFilterDraft}
                      isMobile
                      idPrefix="mobile"
                      onClose={() => handleMobileSheetOpenChange(false)}
                      onMobileApply={applyMobileFilters}
                    />
                  </SheetContent>
                </Sheet>

                <p className="font-sans text-sm text-muted-foreground">
                  {queryError ? (
                    <span className="text-destructive font-medium">{t("search.resultsUnavailable", "Résultats indisponibles")}</span>
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">
                        {sortedExact.length > 0 ? sortedExact.length : displayListings.length}
                      </span>{" "}
                      {sortedExact.length === 0 && similarFallbackListings.length > 0
                        ? t("search.resultsSimilarLabel", "suggestions")
                        : t("search.results")}
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
                <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
                  {(
                    [
                      { mode: "grid" as const, icon: LayoutGrid, label: t("search.viewGrid", "Grille") },
                      { mode: "list" as const, icon: List, label: t("search.viewList", "Liste") },
                      { mode: "map" as const, icon: MapIcon, label: t("search.viewMap", "Carte") },
                    ] as const
                  ).map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`inline-flex items-center justify-center min-h-11 min-w-11 p-2 touch-manipulation transition-colors sm:min-h-10 sm:min-w-10 ${viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      aria-label={label}
                      aria-pressed={viewMode === mode}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>

                <Select value={sort} onValueChange={(v) => setSort(v as SearchSortMode)}>
                  <SelectTrigger className="w-full sm:w-40 font-sans text-sm min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">{t("search.recent")}</SelectItem>
                    <SelectItem value="priceAsc">{t("search.priceAsc")}</SelectItem>
                    <SelectItem value="priceDesc">{t("search.priceDesc")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {sort === "recent" && (
              <p className="text-xs text-muted-foreground font-sans -mt-2 mb-2 max-w-3xl">
                {t(
                  "search.recentSortHint",
                  "Les annonces avec options de visibilité (top, à la une, actualisation) apparaissent en priorité, puis les plus récentes.",
                )}
              </p>
            )}

            {showSimilarBanner && (
              <div className="mb-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-muted/30 to-muted/20 px-4 py-4 lg:py-3 shadow-sm">
                <div className="flex gap-3">
                  <div className="shrink-0 mt-0.5 rounded-full bg-primary/15 p-2">
                    <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-sans text-sm font-semibold text-foreground leading-snug">
                      {t("search.noExactMatchTitle", "Aucun bien ne correspond exactement à votre recherche.")}
                    </p>
                    <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                      {t(
                        "search.similarIntro",
                        "Voici des biens similaires susceptibles de vous intéresser (même ville, critères assouplis).",
                      )}
                    </p>
                    <p className="font-sans text-xs text-muted-foreground/90 pt-0.5">
                      {t(
                        "search.similarResultsBadgeHint",
                        "Chaque carte indique pourquoi le bien est proposé (budget, zone, etc.).",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {queryError && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-2">
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <p className="font-serif text-lg text-foreground mb-1">{t("common.error")}</p>
                <p className="font-sans text-sm text-muted-foreground max-w-md">{errorMessage}</p>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
                <span className="sr-only">{t("common.loading", "Chargement")}</span>
              </div>
            )}

            {showResults && viewMode === "map" && (
              <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[min(600px,70vh)]">
                <div className="w-full lg:w-[58%] h-[min(420px,50vh)] lg:h-full min-h-[280px]">
                  <Suspense
                    fallback={
                      <div className="h-full min-h-[280px] flex items-center justify-center rounded-xl border border-border bg-muted/30">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    }
                  >
                    <ListingsMap listings={displayListings} onMarkerClick={(id) => navigate(`/annonce/${id}`)} />
                  </Suspense>
                </div>
                <div className="w-full lg:w-[42%] overflow-y-auto space-y-3 max-h-[min(520px,55vh)] lg:max-h-none pr-1">
                  {displayListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      matchBadge={showCloseMatchBadges ? closeMatchLabel(listing) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {showResults && viewMode === "list" && (
              <div className="space-y-4">
                {displayListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex flex-col sm:flex-row bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <Link to={`/annonce/${listing.id}`} className="w-full sm:w-72 h-48 flex-shrink-0 block">
                      <img
                        src={listing.images[0] ?? "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                      <div>
                        <Link to={`/annonce/${listing.id}`} className="block">
                          <h2 className="font-serif font-semibold text-lg hover:text-primary transition-colors">
                            {listing.title}
                          </h2>
                        </Link>
                        {showCloseMatchBadges && (
                          <Badge variant="secondary" className="mt-1.5 text-[10px] font-sans font-normal">
                            {closeMatchLabel(listing)}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground font-sans mt-1 line-clamp-2">{listing.description}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm font-sans text-muted-foreground">
                          {listing.surface != null && listing.surface > 0 && <span>{listing.surface} m²</span>}
                          {listing.rooms != null && listing.rooms > 0 && <span>{listing.rooms} ch.</span>}
                          {listing.rooms === 0 && ["appartement", "villa", "maison"].includes(listing.type) && (
                            <span>Studio</span>
                          )}
                          {listing.bathrooms != null && listing.bathrooms > 0 && <span>{listing.bathrooms} sdb</span>}
                          <span>{listing.ville}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 gap-2">
                        <span className="font-serif font-bold text-lg text-primary">{formatPrice(listing.price_mga)}</span>
                        <Button variant="outline" size="sm" className="font-sans shrink-0" asChild>
                          <Link to={`/annonce/${listing.id}`}>{t("search.seeListing", "Voir l’annonce")}</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showResults && viewMode === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 max-lg:gap-6">
                {displayListings.flatMap((listing, index): ReactNode[] => {
                  const out: ReactNode[] = [];
                  if (MONETIZATION_PLACEMENTS.searchSponsoredCard && index === 2) {
                    out.push(<SponsoredNativeCard key="monetization-sponsored" />);
                  }
                  out.push(
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      matchBadge={showCloseMatchBadges ? closeMatchLabel(listing) : undefined}
                    />,
                  );
                  return out;
                })}
              </div>
            )}

            {showAlsoLikeBlock && (
              <div className="mt-8 pt-6 border-t border-border max-lg:mt-10">
                <h2 className="font-serif text-xl max-lg:font-bold font-semibold mb-2 max-lg:mb-3">
                  {t("search.youMayAlsoLike", "Vous pouvez aussi aimer")}
                </h2>
                <p className="font-sans text-sm text-muted-foreground mb-4 max-lg:leading-relaxed">
                  {t("search.alsoLikeHint", "Autres annonces proches de votre recherche, en complément des résultats ci-dessus.")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {alsoLikeListings.map((listing) => (
                    <ListingCard key={`also-${listing.id}`} listing={listing} />
                  ))}
                </div>
              </div>
            )}

            {showEmpty && (
              <div className="text-center py-16 md:py-20 px-2">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Home className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-serif text-xl text-foreground mb-2">{t("search.noResults", "Aucune annonce ne correspond")}</p>
                <p className="font-sans text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  {t("search.tryDifferentWiden", "Élargissez la ville, le budget ou les quartiers, ou réinitialisez les filtres.")}
                </p>
                <Button variant="outline" className="font-sans" onClick={() => updateFilters({ ...EMPTY_SEARCH_FILTERS })}>
                  {t("search.resetFilters", "Réinitialiser les filtres")}
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SearchPage;
