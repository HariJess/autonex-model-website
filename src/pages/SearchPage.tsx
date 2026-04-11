import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import FilterSidebar, { type SearchFilters } from "@/components/FilterSidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, X, LayoutGrid, List, Map as MapIcon, ChevronRight, Home, Loader2, AlertCircle } from "lucide-react";
import { LISTING_TYPE_LABELS_PLURAL, LISTING_TYPE_LABELS, TRANSACTION_LABELS } from "@/types/listing";
import type { DisplayListing } from "@/types/listing";
import { useDbListings } from "@/hooks/useListings";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState, useMemo, useCallback, lazy, Suspense } from "react";

const ListingsMap = lazy(() => import("@/components/ListingsMap"));

type ViewMode = "grid" | "list" | "map";

/** Parse filters from URLSearchParams — single source of truth */
function filtersFromParams(sp: URLSearchParams): SearchFilters {
  return {
    transaction: sp.get("transaction") || "",
    types: sp.get("type") ? sp.get("type")!.split(",").filter(Boolean) : [],
    ville: sp.get("ville") || "",
    arrondissement: sp.get("arr") || "",
    quartiers: sp.get("quartiers") ? sp.get("quartiers")!.split(",").filter(Boolean) : [],
    quartierLibre: sp.get("q") || "",
    priceMin: Number(sp.get("prix_min")) || 0,
    priceMax: Number(sp.get("prix_max")) || 0,
    surfaceMin: Number(sp.get("surface_min")) || 0,
    surfaceMax: Number(sp.get("surface_max")) || 0,
    rooms: sp.get("chambres") ? sp.get("chambres")!.split(",").map(Number).filter((n) => !isNaN(n)) : [],
    bathrooms: sp.get("sdb") ? sp.get("sdb")!.split(",").map(Number).filter((n) => !isNaN(n)) : [],
    equipments: [],
    proximities: [],
  };
}

/** Serialize filters to URLSearchParams */
function filtersToParams(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.transaction) p.set("transaction", f.transaction);
  if (f.types.length) p.set("type", f.types.join(","));
  if (f.ville) p.set("ville", f.ville);
  if (f.arrondissement) p.set("arr", f.arrondissement);
  if (f.quartiers.length) p.set("quartiers", f.quartiers.join(","));
  if (f.quartierLibre.trim()) p.set("q", f.quartierLibre.trim());
  if (f.priceMin) p.set("prix_min", String(f.priceMin));
  if (f.priceMax) p.set("prix_max", String(f.priceMax));
  if (f.surfaceMin) p.set("surface_min", String(f.surfaceMin));
  if (f.surfaceMax && f.surfaceMax < 1000) p.set("surface_max", String(f.surfaceMax));
  if (f.rooms.length) p.set("chambres", f.rooms.join(","));
  if (f.bathrooms.length) p.set("sdb", f.bathrooms.join(","));
  return p;
}

const SearchPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [sort, setSort] = useState("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [hoveredListingId, setHoveredListingId] = useState<string>();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // URL is source of truth — derive filters from it
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setSearchParams(filtersToParams(newFilters), { replace: true });
  }, [setSearchParams]);

  // Fetch from DB with server-side filters
  const { data: dbListings = [], isLoading, error: queryError } = useDbListings({
    transaction: filters.transaction || undefined,
    types: filters.types.length > 0 ? filters.types : undefined,
    ville: filters.ville || undefined,
    priceMin: filters.priceMin || undefined,
    priceMax: filters.priceMax || undefined,
    rooms: filters.rooms.length > 0 ? filters.rooms : undefined,
    surfaceMin: filters.surfaceMin || undefined,
    surfaceMax: filters.surfaceMax || undefined,
  });

  // Client-side filter for features/equipments, bathrooms and text search
  const filtered = useMemo(() => {
    let results = [...dbListings];

    // Filter by bathrooms (client-side)
    if (filters.bathrooms.length > 0) {
      const hasHighEnd = filters.bathrooms.includes(4);
      results = results.filter((l) => {
        if (l.bathrooms == null) return false;
        if (hasHighEnd && l.bathrooms >= 4) return true;
        return filters.bathrooms.includes(l.bathrooms);
      });
    }

    // Filter by equipments (client-side, uses features jsonb)
    if (filters.equipments.length > 0) {
      results = results.filter((l) =>
        filters.equipments.every((eq) =>
          l.features.some((f) => f.toLowerCase().includes(eq.toLowerCase()))
        )
      );
    }

    // Filter by arrondissement / quartiers (client-side text match)
    if (filters.arrondissement) {
      const normalizedArr = filters.arrondissement.toLowerCase();
      results = results.filter((l) =>
        (l.arrondissement?.toLowerCase() ?? "").includes(normalizedArr)
      );
    }
    if (filters.quartiers.length > 0) {
      results = results.filter((l) =>
        filters.quartiers.some(
          (q) =>
            (l.quartier?.toLowerCase() ?? "").includes(q.toLowerCase()) ||
            (l.quartier_libre?.toLowerCase() ?? "").includes(q.toLowerCase())
        )
      );
    }
    if (filters.quartierLibre.trim()) {
      const q = filters.quartierLibre.toLowerCase();
      results = results.filter((l) =>
        (l.quartier_libre?.toLowerCase() ?? "").includes(q) ||
        (l.quartier?.toLowerCase() ?? "").includes(q) ||
        (l.title?.toLowerCase() ?? "").includes(q) ||
        (l.description?.toLowerCase() ?? "").includes(q)
      );
    }

    // Sort
    results.sort((a, b) => {
      if (sort === "priceAsc") return a.price_mga - b.price_mga;
      if (sort === "priceDesc") return b.price_mga - a.price_mga;
      return 0;
    });

    return results;
  }, [dbListings, filters, sort]);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: { label: string; key: string }[] = [];
    if (filters.transaction) {
      chips.push({ label: TRANSACTION_LABELS[filters.transaction as keyof typeof TRANSACTION_LABELS] || filters.transaction, key: "transaction" });
    }
    filters.types.forEach((tp) => chips.push({ label: LISTING_TYPE_LABELS[tp as keyof typeof LISTING_TYPE_LABELS] ?? tp, key: `type-${tp}` }));
    if (filters.ville) chips.push({ label: filters.ville, key: "ville" });
    if (filters.arrondissement) chips.push({ label: filters.arrondissement, key: "arr" });
    filters.quartiers.forEach((q) => chips.push({ label: q, key: `q-${q}` }));
    if (filters.quartierLibre) chips.push({ label: filters.quartierLibre, key: "quartierLibre" });
    if (filters.priceMin || filters.priceMax) {
      chips.push({
        label: `${filters.priceMin ? (filters.priceMin / 1e6).toFixed(0) + "M" : "0"} - ${filters.priceMax ? (filters.priceMax / 1e6).toFixed(0) + "M" : "∞"} Ar`,
        key: "price",
      });
    }
    if (filters.surfaceMin || (filters.surfaceMax && filters.surfaceMax < 1000)) {
      chips.push({
        label: `${filters.surfaceMin || 0} - ${filters.surfaceMax && filters.surfaceMax < 1000 ? filters.surfaceMax : "∞"} m²`,
        key: "surface",
      });
    }
    filters.rooms.forEach((r) => chips.push({ label: `${r === 0 ? "Studio" : r + " ch."}`, key: `room-${r}` }));
    filters.bathrooms.forEach((b) => chips.push({ label: `${b}${b === 4 ? "+" : ""} sdb`, key: `bath-${b}` }));
    filters.equipments.forEach((e) => chips.push({ label: e, key: `eq-${e}` }));
    return chips;
  }, [filters]);

  const removeChip = (key: string) => {
    const newFilters = { ...filters };
    if (key === "transaction") newFilters.transaction = "";
    else if (key.startsWith("type-")) newFilters.types = newFilters.types.filter((t) => t !== key.slice(5));
    else if (key === "ville") { newFilters.ville = ""; newFilters.arrondissement = ""; newFilters.quartiers = []; newFilters.quartierLibre = ""; }
    else if (key === "arr") { newFilters.arrondissement = ""; newFilters.quartiers = []; }
    else if (key.startsWith("q-")) newFilters.quartiers = newFilters.quartiers.filter((q) => q !== key.slice(2));
    else if (key === "quartierLibre") newFilters.quartierLibre = "";
    else if (key === "price") { newFilters.priceMin = 0; newFilters.priceMax = 0; }
    else if (key === "surface") { newFilters.surfaceMin = 0; newFilters.surfaceMax = 0; }
    else if (key.startsWith("room-")) newFilters.rooms = newFilters.rooms.filter((r) => r !== Number(key.slice(5)));
    else if (key.startsWith("bath-")) newFilters.bathrooms = newFilters.bathrooms.filter((b) => b !== Number(key.slice(5)));
    else if (key.startsWith("eq-")) newFilters.equipments = newFilters.equipments.filter((e) => e !== key.slice(3));
    updateFilters(newFilters);
  };

  const activeFilterCount = activeChips.length;

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; to?: string }[] = [{ label: t("nav.buy").includes("Ach") ? "Accueil" : "Home", to: "/" }];
    if (filters.transaction) {
      crumbs.push({ label: TRANSACTION_LABELS[filters.transaction as keyof typeof TRANSACTION_LABELS] || filters.transaction, to: `/recherche?transaction=${filters.transaction}` });
    }
    if (filters.ville) crumbs.push({ label: filters.ville });
    return crumbs;
  }, [filters, t]);

  const pageTitle = useMemo(() => {
    const parts: string[] = [];
    if (filters.types.length === 1) {
      parts.push(LISTING_TYPE_LABELS_PLURAL[filters.types[0] as keyof typeof LISTING_TYPE_LABELS_PLURAL] || filters.types[0]);
    } else {
      parts.push("Biens immobiliers");
    }
    if (filters.transaction === "vente") parts.push("à vendre");
    else if (filters.transaction === "location") parts.push("à louer");
    else if (filters.transaction === "location_vacances") parts.push("en location vacances");
    if (filters.ville) parts.push(`à ${filters.ville}`);
    return parts.join(" ");
  }, [filters]);

  const emptyFilters: SearchFilters = {
    transaction: "", types: [], ville: "", arrondissement: "",
    quartiers: [], quartierLibre: "", priceMin: 0, priceMax: 0,
    surfaceMin: 0, surfaceMax: 0, rooms: [], bathrooms: [],
    equipments: [], proximities: [],
  };

  return (
    <>
      <Helmet><title>{pageTitle} — ImmoNex</title></Helmet>
      <Header />

      <div className="container mx-auto px-4 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-sm font-sans text-muted-foreground mb-3">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {i === 0 && bc.to ? (
                <Link to={bc.to} className="hover:text-primary transition-colors flex items-center gap-1">
                  <Home className="h-3.5 w-3.5" />
                  {bc.label}
                </Link>
              ) : i < breadcrumbs.length - 1 && bc.to ? (
                <Link to={bc.to} className="hover:text-primary transition-colors">{bc.label}</Link>
              ) : (
                <span className="text-foreground font-medium">{bc.label}</span>
              )}
            </span>
          ))}
        </nav>

        <h1 className="font-serif text-xl md:text-2xl font-bold mb-2">
          {pageTitle}{" "}
          <span className="text-muted-foreground font-normal text-lg">({filtered.length} annonce{filtered.length !== 1 ? "s" : ""})</span>
        </h1>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {activeChips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="font-sans text-xs gap-1 cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={() => removeChip(chip.key)}
              >
                {chip.label}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="text-xs font-sans text-muted-foreground h-6" onClick={() => updateFilters(emptyFilters)}>
              Effacer tout
            </Button>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-80 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <FilterSidebar filters={filters} onFiltersChange={updateFilters} />
          </aside>

          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 bg-card rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden font-sans gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      {t("search.filters")}
                      {activeFilterCount > 0 && (
                        <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] gradient-primary text-white border-0">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full sm:w-96 p-4 overflow-y-auto">
                    <FilterSidebar filters={filters} onFiltersChange={updateFilters} isMobile onClose={() => setMobileFiltersOpen(false)} />
                  </SheetContent>
                </Sheet>

                <p className="font-sans text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filtered.length}</span> {t("search.results")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center border border-border rounded-lg overflow-hidden">
                  {([
                    { mode: "grid" as ViewMode, icon: LayoutGrid },
                    { mode: "list" as ViewMode, icon: List },
                    { mode: "map" as ViewMode, icon: MapIcon },
                  ]).map(({ mode, icon: Icon }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`p-2 transition-colors ${viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>

                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-40 font-sans text-sm">
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

            {/* Error state */}
            {queryError && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <p className="font-serif text-lg text-foreground mb-1">{t("common.error")}</p>
                <p className="font-sans text-sm text-muted-foreground">{(queryError as Error).message}</p>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Results */}
            {!isLoading && !queryError && viewMode === "map" ? (
              <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[600px]">
                <div className="w-full lg:w-[60%] h-[400px] lg:h-full">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                    <ListingsMap listings={filtered} onMarkerClick={(id) => navigate(`/annonce/${id}`)} hoveredId={hoveredListingId} />
                  </Suspense>
                </div>
                <div className="w-full lg:w-[40%] overflow-y-auto space-y-3 max-h-[600px]">
                  {filtered.map((listing) => (
                    <div key={listing.id} onMouseEnter={() => setHoveredListingId(listing.id)} onMouseLeave={() => setHoveredListingId(undefined)}>
                      <ListingCard listing={listing} />
                    </div>
                  ))}
                </div>
              </div>
            ) : !isLoading && !queryError && viewMode === "list" ? (
              <div className="space-y-4">
                {filtered.map((listing) => (
                  <div key={listing.id} className="flex flex-col sm:flex-row bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
                    <Link to={`/annonce/${listing.id}`} className="w-full sm:w-72 h-48 flex-shrink-0">
                      <img src={listing.images[0] ?? "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"} alt={listing.title} className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <Link to={`/annonce/${listing.id}`}>
                          <h3 className="font-serif font-semibold text-lg hover:text-primary transition-colors">{listing.title}</h3>
                        </Link>
                        <p className="text-sm text-muted-foreground font-sans mt-1 line-clamp-2">{listing.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm font-sans text-muted-foreground">
                          {listing.surface != null && listing.surface > 0 && <span>{listing.surface} m²</span>}
                          {listing.rooms != null && listing.rooms > 0 && <span>{listing.rooms} ch.</span>}
                          {listing.bathrooms != null && listing.bathrooms > 0 && <span>{listing.bathrooms} sdb</span>}
                          <span>{listing.ville}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-serif font-bold text-lg text-primary">{formatPrice(listing.price_mga)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !isLoading && !queryError ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : null}

            {/* Empty state */}
            {!isLoading && !queryError && filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Home className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-serif text-xl text-foreground mb-2">Aucune annonce ne correspond</p>
                <p className="font-sans text-sm text-muted-foreground mb-4">Essayez de modifier ou réinitialiser vos filtres</p>
                <Button variant="outline" className="font-sans" onClick={() => updateFilters(emptyFilters)}>
                  Réinitialiser les filtres
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
