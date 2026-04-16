import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import FilterSidebar from "@/components/FilterSidebar";
import { ChevronRight, Home, Loader2, Sparkles } from "lucide-react";
import { LISTING_TYPE_LABELS_PLURAL, LISTING_TYPE_LABELS, TRANSACTION_LABELS } from "@/types/listing";
import { useDbListings } from "@/hooks/useListings";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMemo, useCallback, useState, useEffect, useRef, lazy, Suspense } from "react";
import {
  searchStateFromParams,
  searchParamsFromState,
} from "@/lib/searchUrl";
import type { SearchFilters, SearchSortMode, SearchViewMode } from "@/types/search";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";
import { SearchTopBanner } from "@/components/monetization/SearchTopBanner";
import { SidebarPromoSlot } from "@/components/monetization/SidebarPromoSlot";
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
import { buildCanonicalUrl, composePageTitle, truncateMetaDescription } from "@/lib/seo";
import { SearchToolbar } from "@/pages/search/components/SearchToolbar";
import { SearchActiveChips } from "@/pages/search/components/SearchActiveChips";
import { SearchResultsGrid } from "@/pages/search/components/SearchResultsGrid";
import { SearchResultsList } from "@/pages/search/components/SearchResultsList";
import { SearchEmptyState } from "@/pages/search/components/SearchEmptyState";
import { SearchLoadingState } from "@/pages/search/components/SearchLoadingState";
import { SearchErrorState } from "@/pages/search/components/SearchErrorState";
import { AUTO_SEARCH_VEHICLE_TYPE_OPTIONS } from "@/data/automotiveCatalog";
import { listingTypesForTransaction } from "@/lib/listingRules";

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

function normalizeSearchToken(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

  const vehicleTypeOptionMap = useMemo(
    () => new Map(AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.map((option) => [option.id, option])),
    [],
  );

  const normalizeFiltersForSearch = useCallback(
    (incoming: SearchFilters): SearchFilters => {
      const allowedListingTypes = new Set(listingTypesForTransaction(incoming.transaction));
      const validVehicleTypes = incoming.vehicleTypes.filter((id) => vehicleTypeOptionMap.has(id));
      const mappedTypesFromVehicleType = Array.from(
        new Set(
          validVehicleTypes
            .flatMap((id) => vehicleTypeOptionMap.get(id)?.listingTypes ?? [])
            .filter((type) => allowedListingTypes.has(type as keyof typeof LISTING_TYPE_LABELS)),
        ),
      );
      const explicitValidTypes = incoming.types.filter((type) =>
        allowedListingTypes.has(type as keyof typeof LISTING_TYPE_LABELS),
      );

      // Keep legacy explicit `type` URLs when no vehicle type is selected,
      // but always prioritize mapped types when `vehicleTypes` is active.
      const nextTypes =
        validVehicleTypes.length > 0 ? mappedTypesFromVehicleType : explicitValidTypes;

      return {
        ...incoming,
        vehicleTypes: validVehicleTypes,
        types: nextTypes,
      };
    },
    [vehicleTypeOptionMap],
  );

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
    (newFilters: SearchFilters) =>
      pushSearchState({ filters: normalizeFiltersForSearch(newFilters) }),
    [pushSearchState, normalizeFiltersForSearch]
  );

  const setSort = useCallback(
    (s: SearchSortMode) => pushSearchState({ sort: s }),
    [pushSearchState]
  );

  const setViewMode = useCallback(
    (v: SearchViewMode) => pushSearchState({ view: v }),
    [pushSearchState]
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

  const qTrim = filters.quartierLibre.trim();

  const { data: dbListings = [], isLoading, error: queryError } = useDbListings({
    transaction: filters.transaction || undefined,
    vehicleTypes: filters.vehicleTypes.length > 0 ? filters.vehicleTypes : undefined,
    types: filters.types.length > 0 ? filters.types : undefined,
    ville: filters.ville || undefined,
    freeText: qTrim.length >= 1 ? qTrim : undefined,
    priceMin: filters.priceMin || undefined,
    priceMax: filters.priceMax || undefined,
    rooms: filters.rooms.length > 0 ? filters.rooms : undefined,
    bathrooms: filters.bathrooms.length > 0 ? filters.bathrooms : undefined,
    surfaceMin: filters.surfaceMin || undefined,
    surfaceMax: filters.surfaceMax || undefined,
    brands: filters.brands.length > 0 ? filters.brands : undefined,
    modelQuery: filters.modelQuery.trim() || undefined,
    yearMin: filters.yearMin || undefined,
    yearMax: filters.yearMax || undefined,
    fuels: filters.fuels.length > 0 ? filters.fuels : undefined,
    transmissions: filters.transmissions.length > 0 ? filters.transmissions : undefined,
    drivetrains: filters.drivetrains.length > 0 ? filters.drivetrains : undefined,
    conditions: filters.conditions.length > 0 ? filters.conditions : undefined,
    sellerTypes: filters.sellerTypes.length > 0 ? filters.sellerTypes : undefined,
    searchRelaxation: true,
  });

  const equippedListings = useMemo(() => {
    let results = [...dbListings];
    if (filters.equipments.length > 0) {
      results = results.filter((l) => listingMatchesEquipments(l.features, filters.equipments));
    }
    if (filters.fuels.length > 0) {
      const wanted = new Set(filters.fuels.map((v) => normalizeSearchToken(v)));
      results = results.filter((l) => wanted.has(normalizeSearchToken(l.vehicle?.fuel)));
    }
    if (filters.transmissions.length > 0) {
      const wanted = new Set(filters.transmissions.map((v) => normalizeSearchToken(v)));
      results = results.filter((l) => wanted.has(normalizeSearchToken(l.vehicle?.transmission)));
    }
    if (filters.drivetrains.length > 0) {
      const wanted = new Set(filters.drivetrains.map((v) => normalizeSearchToken(v)));
      results = results.filter((l) => wanted.has(normalizeSearchToken(l.vehicle?.drivetrain)));
    }
    if (filters.conditions.length > 0) {
      const wanted = new Set(filters.conditions.map((v) => normalizeSearchToken(v)));
      results = results.filter((l) => wanted.has(normalizeSearchToken(l.vehicle?.condition)));
    }
    if (filters.sellerTypes.length > 0) {
      const wanted = new Set(filters.sellerTypes.map((v) => normalizeSearchToken(v)));
      results = results.filter((l) => wanted.has(normalizeSearchToken(l.vehicle?.sellerType)));
    }
    if (filters.brands.length > 0) {
      const wanted = new Set(filters.brands.map((v) => normalizeSearchToken(v)));
      results = results.filter((l) => wanted.has(normalizeSearchToken(l.vehicle?.make)));
    }
    if (filters.modelQuery.trim()) {
      const q = normalizeSearchToken(filters.modelQuery);
      results = results.filter((l) => normalizeSearchToken(l.vehicle?.model).includes(q));
    }
    if (filters.yearMin > 0) {
      results = results.filter((l) => (l.vehicle?.year ?? 0) >= filters.yearMin);
    }
    if (filters.yearMax > 0) {
      results = results.filter((l) => (l.vehicle?.year ?? 0) <= filters.yearMax);
    }
    return results;
  }, [
    dbListings,
    filters.equipments,
    filters.fuels,
    filters.transmissions,
    filters.drivetrains,
    filters.conditions,
    filters.sellerTypes,
    filters.brands,
    filters.modelQuery,
    filters.yearMin,
    filters.yearMax,
  ]);

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
    const vehicleTypeLabelMap = new Map(AUTO_SEARCH_VEHICLE_TYPE_OPTIONS.map((opt) => [opt.id, opt.label]));
    filters.vehicleTypes.forEach((vehicleTypeId) =>
      chips.push({ label: vehicleTypeLabelMap.get(vehicleTypeId) ?? vehicleTypeId, key: `vehicleType-${vehicleTypeId}` }),
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
        label: `${filters.surfaceMin || 0} - ${filters.surfaceMax ? `${filters.surfaceMax.toLocaleString("fr-FR")} km` : "∞ km"}`,
        key: "surface",
      });
    }
    filters.rooms.forEach((r) =>
      chips.push({ label: `${r === 0 ? "Base" : `Version ${r}`}`, key: `room-${r}` })
    );
    filters.bathrooms.forEach((b) =>
      chips.push({ label: `${b}${b === 4 ? "+" : ""} portes`, key: `bath-${b}` })
    );
    filters.equipments.forEach((e) => chips.push({ label: e, key: `eq-${e}` }));
    filters.fuels.forEach((f) => chips.push({ label: f, key: `fuel-${f}` }));
    filters.transmissions.forEach((g) => chips.push({ label: g, key: `gear-${g}` }));
    filters.drivetrains.forEach((d) => chips.push({ label: d, key: `drive-${d}` }));
    filters.conditions.forEach((c) => chips.push({ label: c, key: `condition-${c}` }));
    filters.sellerTypes.forEach((s) => chips.push({ label: s, key: `seller-${s}` }));
    filters.brands.forEach((b) => chips.push({ label: b, key: `brand-${b}` }));
    if (filters.modelQuery.trim()) chips.push({ label: `Modèle: ${filters.modelQuery.trim()}`, key: "modelQuery" });
    if (filters.yearMin > 0 || filters.yearMax > 0) {
      chips.push({ label: `Année ${filters.yearMin || 0} - ${filters.yearMax || "..."}`, key: "yearRange" });
    }
    return chips;
  }, [filters]);

  const removeChip = (key: string) => {
    const newFilters = { ...filters };
    if (key === "transaction") newFilters.transaction = "";
    else if (key.startsWith("vehicleType-")) newFilters.vehicleTypes = newFilters.vehicleTypes.filter((id) => id !== key.slice(12));
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
    else if (key.startsWith("fuel-")) newFilters.fuels = newFilters.fuels.filter((f) => f !== key.slice(5));
    else if (key.startsWith("gear-")) newFilters.transmissions = newFilters.transmissions.filter((g) => g !== key.slice(5));
    else if (key.startsWith("drive-")) newFilters.drivetrains = newFilters.drivetrains.filter((d) => d !== key.slice(6));
    else if (key.startsWith("condition-")) newFilters.conditions = newFilters.conditions.filter((c) => c !== key.slice(10));
    else if (key.startsWith("seller-")) newFilters.sellerTypes = newFilters.sellerTypes.filter((s) => s !== key.slice(7));
    else if (key.startsWith("brand-")) newFilters.brands = newFilters.brands.filter((b) => b !== key.slice(6));
    else if (key === "modelQuery") newFilters.modelQuery = "";
    else if (key === "yearRange") {
      newFilters.yearMin = 0;
      newFilters.yearMax = 0;
    }
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
      parts.push(t("search.properties", "Véhicules"));
    }
    if (filters.transaction === "vente") parts.push(t("search.forSale", "à vendre"));
    else if (filters.transaction === "location") parts.push(t("search.forRent", "à louer"));
    else if (filters.transaction === "location_vacances")
      parts.push(t("search.titleVacationPhrase", "— courte durée / vacances"));
    if (filters.ville) parts.push(`à ${filters.ville}`);
    return parts.join(" ");
  }, [filters, t]);
  const metaDescription = useMemo(() => {
    const typePart =
      filters.types.length === 1
        ? LISTING_TYPE_LABELS_PLURAL[filters.types[0] as keyof typeof LISTING_TYPE_LABELS_PLURAL] || filters.types[0]
        : "véhicules";
    const transactionPart =
      filters.transaction === "vente"
        ? "à vendre"
        : filters.transaction === "location"
          ? "à louer"
          : filters.transaction === "location_vacances"
            ? "en location vacances"
            : "";
    const cityPart = filters.ville ? ` à ${filters.ville}` : " à Madagascar";
    return truncateMetaDescription(
      `Consultez les ${typePart} ${transactionPart}${cityPart} sur AutoNex, avec des filtres par prix, budget et localisation.`,
    );
  }, [filters]);
  const canonicalSearch = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("sort");
    params.delete("view");
    const qs = params.toString();
    return buildCanonicalUrl("/recherche", qs ? `?${qs}` : "");
  }, [searchParams]);
  const noisyFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.arrondissements.length > 0) count += 1;
    if (filters.quartiers.length > 0) count += 1;
    if (filters.quartierLibre.trim()) count += 1;
    if (filters.priceMin > 0 || filters.priceMax > 0) count += 1;
    if (filters.surfaceMin > 0 || filters.surfaceMax > 0) count += 1;
    if (filters.rooms.length > 0) count += 1;
    if (filters.bathrooms.length > 0) count += 1;
    if (filters.equipments.length > 0) count += 1;
    if (filters.fuels.length > 0) count += 1;
    if (filters.transmissions.length > 0) count += 1;
    if (filters.drivetrains.length > 0) count += 1;
    if (filters.conditions.length > 0) count += 1;
    if (filters.sellerTypes.length > 0) count += 1;
    if (filters.brands.length > 0) count += 1;
    if (filters.modelQuery.trim()) count += 1;
    if (filters.yearMin > 0 || filters.yearMax > 0) count += 1;
    return count;
  }, [filters]);
  const robotsContent = noisyFiltersCount >= 4 ? "noindex,follow" : "index,follow";

  const errorMessage = useMemo(() => {
    if (!queryError) return "";
    const raw = queryError instanceof Error ? queryError.message : String(queryError);
    const lowered = raw.toLowerCase();
    if (
      lowered.includes("schema cache") ||
      lowered.includes("could not find the table") ||
      lowered.includes("relation") ||
      lowered.includes("supabase") ||
      lowered.includes("public.listings")
    ) {
      return t(
        "search.runtimeDataUnavailable",
        "Le catalogue est momentanément indisponible. Vous pouvez réessayer dans quelques instants.",
      );
    }
    return t(
      "search.runtimeGenericError",
      "Impossible de charger les annonces pour le moment. Vérifiez votre connexion puis réessayez.",
    );
  }, [queryError, t]);

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
          {queryError ? composePageTitle(t("search.title", "Recherche")) : composePageTitle(pageTitle)}
        </title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalSearch} />
        <meta name="robots" content={robotsContent} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={queryError ? composePageTitle(t("search.title", "Recherche")) : composePageTitle(pageTitle)} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalSearch} />
      </Helmet>
      <Header />

      <div className="container mx-auto px-4 pt-3 md:pt-4 pb-2 md:pb-3">
        <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-secondary/20 px-4 py-3.5 md:px-5 md:py-4">
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

        <h1 className="font-serif text-xl md:text-3xl font-bold mb-2 leading-snug">
          {queryError ? t("search.title", "Recherche") : pageTitle}{" "}
          {!queryError && (
            <span className="text-muted-foreground font-normal text-base md:text-lg">
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
        <p className="font-sans text-sm text-muted-foreground max-w-3xl mb-3">
          Explorez des annonces vérifiées avec des filtres avancés pour trouver plus vite le bon véhicule.
        </p>

        <SearchActiveChips
          chips={activeChips}
          clearAllLabel={t("common.clearAll", "Effacer tout")}
          onRemoveChip={removeChip}
          onClearAll={() => updateFilters({ ...EMPTY_SEARCH_FILTERS })}
        />
        </section>
      </div>

      <div className="container mx-auto px-4 pb-8 md:pb-10">
        <div className="flex gap-6 lg:gap-7">
          <aside className="hidden lg:block w-80 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <FilterSidebar filters={filters} onFiltersChange={updateFilters} idPrefix="desktop" />
            <SidebarPromoSlot />
            {MONETIZATION_PLACEMENTS.searchFeaturedAgencies && (
              <div className="mt-6">
                <FeaturedAgenciesSection title={t("search.partnerAgencies", "Concessionnaires premium")} variant="embedded" limit={6} />
              </div>
            )}
          </aside>

          <main className="flex-1 min-w-0">
            <SearchTopBanner />
            <SearchToolbar
              filters={filters}
              mobileFilterDraft={mobileFilterDraft}
              mobileFiltersOpen={mobileFiltersOpen}
              activeFilterCount={activeFilterCount}
              queryError={Boolean(queryError)}
              queryErrorLabel={t("search.resultsUnavailable", "Résultats indisponibles")}
              resultCount={sortedExact.length > 0 ? sortedExact.length : displayListings.length}
              resultLabel={
                sortedExact.length === 0 && similarFallbackListings.length > 0
                  ? t("search.resultsSimilarLabel", "suggestions")
                  : t("search.results")
              }
              viewMode={viewMode}
              sort={sort}
              filtersLabel={t("search.filters")}
              sortRecentLabel={t("search.recent")}
              sortPriceAscLabel={t("search.priceAsc")}
              sortPriceDescLabel={t("search.priceDesc")}
              viewGridLabel={t("search.viewGrid", "Grille")}
              viewListLabel={t("search.viewList", "Liste")}
              viewMapLabel={t("search.viewMap", "Carte")}
              onOpenMobileFilters={handleMobileSheetOpenChange}
              onMobileDraftChange={(next) => setMobileFilterDraft(next)}
              onMobileApply={applyMobileFilters}
              onSetViewMode={setViewMode}
              onSetSort={setSort}
            />
            {sort === "recent" && (
              <p className="text-xs text-muted-foreground font-sans -mt-1 mb-3 max-w-3xl">
                {t(
                  "search.recentSortHint",
                  "Les annonces avec options de visibilité (top, à la une, actualisation) apparaissent en priorité, puis les plus récentes.",
                )}
              </p>
            )}

            {showSimilarBanner && (
              <div className="mb-4 rounded-2xl border border-border/75 bg-gradient-to-br from-card via-card to-secondary/20 px-3.5 py-3.5 lg:py-3.5 shadow-sm">
                <div className="flex gap-3">
                  <div className="shrink-0 mt-0.5 rounded-full border border-border/60 bg-background/85 p-2">
                    <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-sans text-sm font-semibold text-foreground leading-snug">
                      {t("search.noExactMatchTitle", "Aucun véhicule ne correspond exactement à votre recherche.")}
                    </p>
                    <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                      {t(
                        "search.similarIntro",
                        "Voici des véhicules similaires susceptibles de vous intéresser (même ville, critères assouplis).",
                      )}
                    </p>
                    <p className="font-sans text-xs text-muted-foreground/90 pt-0.5">
                      {t(
                        "search.similarResultsBadgeHint",
                        "Chaque carte indique pourquoi le véhicule est proposé (budget, zone, etc.).",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {queryError && !isLoading && (
              <SearchErrorState
                title={t("search.resultsUnavailable", "Résultats indisponibles")}
                message={errorMessage}
                onRetry={() => window.location.reload()}
              />
            )}

            {isLoading && <SearchLoadingState loadingLabel={t("common.loading", "Chargement")} />}

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
                <div className="w-full lg:w-[42%] h-auto lg:h-full lg:max-h-full overflow-y-visible lg:overflow-y-auto space-y-3 pr-1 min-h-0">
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
              <SearchResultsList
                listings={displayListings}
                showCloseMatchBadges={showCloseMatchBadges}
                getCloseMatchLabel={closeMatchLabel}
                formatPrice={formatPrice}
                seeListingLabel={t("search.seeListing", "Voir l’annonce")}
              />
            )}

            {showResults && viewMode === "grid" && (
              <SearchResultsGrid
                listings={displayListings}
                showCloseMatchBadges={showCloseMatchBadges}
                getCloseMatchLabel={closeMatchLabel}
              />
            )}

            {showAlsoLikeBlock && (
              <div className="mt-8 pt-6 border-t border-border/70 max-lg:mt-8">
                <h2 className="font-serif text-xl max-lg:font-bold font-semibold mb-2 max-lg:mb-3">
                  {t("search.youMayAlsoLike", "Vous pouvez aussi aimer")}
                </h2>
                <p className="font-sans text-sm text-muted-foreground mb-4 max-lg:leading-relaxed">
                  {t("search.alsoLikeHint", "Autres annonces proches de votre recherche, en complément des résultats ci-dessus.")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {alsoLikeListings.map((listing) => (
                    <ListingCard key={`also-${listing.id}`} listing={listing} />
                  ))}
                </div>
              </div>
            )}

            {showEmpty && (
              <SearchEmptyState
                title={t("search.noResults", "Aucune annonce ne correspond")}
                description={t("search.tryDifferentWiden", "Élargissez la ville, le budget ou les quartiers, ou réinitialisez les filtres.")}
                resetLabel={t("search.resetFilters", "Réinitialiser les filtres")}
                onReset={() => updateFilters({ ...EMPTY_SEARCH_FILTERS })}
              />
            )}
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SearchPage;
