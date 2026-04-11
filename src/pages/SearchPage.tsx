import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import FilterSidebar, { type SearchFilters } from "@/components/FilterSidebar";
import ListingsMap from "@/components/ListingsMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, X, LayoutGrid, List, Map, ChevronRight, Home } from "lucide-react";
import { seedListings, seedAgencies, type SeedListing } from "@/data/seed-listings";
import { villes } from "@/data/madagascar-locations";
import { useState, useMemo, useCallback, Suspense, lazy } from "react";

type ViewMode = "grid" | "list" | "map";

const normalizeLocationText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const buildListingLocationIndex = (listing: SeedListing) =>
  normalizeLocationText(
    [listing.title, listing.description, listing.city, listing.region, listing.features.join(" ")].join(" ")
  );

const LISTING_LOCATION_INDEX = new Map(
  seedListings.map((listing) => [listing.id, buildListingLocationIndex(listing)])
);

const SearchPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sort, setSort] = useState("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [hoveredListingId, setHoveredListingId] = useState<string>();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Parse URL params into filters
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    transaction: searchParams.get("transaction") || "",
    types: searchParams.get("type") ? [searchParams.get("type")!] : [],
    ville: searchParams.get("ville") || "",
    arrondissement: searchParams.get("arr") || "",
    quartiers: searchParams.get("quartiers") ? searchParams.get("quartiers")!.split(",") : [],
    quartierLibre: searchParams.get("q") || "",
    priceMin: Number(searchParams.get("prix_min")) || 0,
    priceMax: Number(searchParams.get("prix_max")) || 0,
    surfaceMin: 0,
    surfaceMax: 0,
    rooms: searchParams.get("chambres") ? searchParams.get("chambres")!.split(",").map(Number) : [],
    bathrooms: [],
    equipments: [],
    proximities: [],
  }));

  // Sync filters to URL
  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.transaction) params.set("transaction", newFilters.transaction);
    if (newFilters.types.length === 1) params.set("type", newFilters.types[0]);
    if (newFilters.types.length > 1) params.set("type", newFilters.types.join(","));
    if (newFilters.ville) params.set("ville", newFilters.ville);
    if (newFilters.arrondissement) params.set("arr", newFilters.arrondissement);
    if (newFilters.quartiers.length) params.set("quartiers", newFilters.quartiers.join(","));
    if (newFilters.quartierLibre.trim()) params.set("q", newFilters.quartierLibre.trim());
    if (newFilters.priceMin) params.set("prix_min", String(newFilters.priceMin));
    if (newFilters.priceMax) params.set("prix_max", String(newFilters.priceMax));
    if (newFilters.rooms.length) params.set("chambres", newFilters.rooms.join(","));
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Filter listings
  const filtered = useMemo(() => {
    let results = [...seedListings];
    const selectedVille = normalizeLocationText(filters.ville);
    const selectedQuartiers = filters.quartiers.map(normalizeLocationText);
    const quartierLibre = normalizeLocationText(filters.quartierLibre);
    const selectedVilleData = villes.find((ville) => ville.name === filters.ville);
    const selectedArrData = selectedVilleData?.arrondissements.find((arr) => arr.name === filters.arrondissement);
    const arrondissementKeywords = [
      normalizeLocationText(filters.arrondissement),
      ...(selectedArrData?.quartiers.map((quartier) => normalizeLocationText(quartier.name)) ?? []),
    ].filter(Boolean);
    const getLocationText = (listing: SeedListing) => LISTING_LOCATION_INDEX.get(listing.id) ?? "";

    if (filters.transaction) results = results.filter((l) => l.transaction === filters.transaction);
    if (filters.types.length) results = results.filter((l) => filters.types.includes(l.type));
    if (filters.ville) {
      results = results.filter((listing) => {
        const locationText = getLocationText(listing);
        return (
          normalizeLocationText(listing.city) === selectedVille ||
          normalizeLocationText(listing.region).includes(selectedVille) ||
          locationText.includes(selectedVille)
        );
      });
    }
    if (filters.arrondissement) {
      results = results.filter((listing) => {
        const locationText = getLocationText(listing);
        return arrondissementKeywords.some((keyword) => locationText.includes(keyword));
      });
    }
    if (filters.quartiers.length) {
      results = results.filter((listing) => {
        const locationText = getLocationText(listing);
        return selectedQuartiers.some((quartier) => locationText.includes(quartier));
      });
    }
    if (quartierLibre) {
      results = results.filter((listing) => getLocationText(listing).includes(quartierLibre));
    }
    if (filters.priceMin) results = results.filter((l) => l.price_mga >= filters.priceMin);
    if (filters.priceMax) results = results.filter((l) => l.price_mga <= filters.priceMax);
    if (filters.rooms.length) {
      results = results.filter((l) => {
        if (filters.rooms.includes(5)) {
          return filters.rooms.includes(l.rooms) || l.rooms >= 5;
        }
        return filters.rooms.includes(l.rooms);
      });
    }
    if (filters.bathrooms.length) {
      results = results.filter((l) => {
        if (filters.bathrooms.includes(4)) {
          return filters.bathrooms.includes(l.bathrooms) || l.bathrooms >= 4;
        }
        return filters.bathrooms.includes(l.bathrooms);
      });
    }
    if (filters.surfaceMin) results = results.filter((l) => l.surface >= filters.surfaceMin);
    if (filters.surfaceMax) results = results.filter((l) => l.surface <= filters.surfaceMax);
    if (filters.equipments.length) {
      results = results.filter((l) =>
        filters.equipments.every((eq) =>
          l.features.some((f) => f.toLowerCase().includes(eq.toLowerCase()))
        )
      );
    }

    // Sort: boosted first, then by sort param
    results.sort((a, b) => {
      if (a.badge === "boost" && b.badge !== "boost") return -1;
      if (b.badge === "boost" && a.badge !== "boost") return 1;
      if (sort === "priceAsc") return a.price_mga - b.price_mga;
      if (sort === "priceDesc") return b.price_mga - a.price_mga;
      return 0;
    });

    return results;
  }, [filters, sort]);

  const getAgency = (id: string) => seedAgencies.find((a) => a.id === id);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: { label: string; key: string }[] = [];
    if (filters.transaction) {
      const labels: Record<string, string> = { vente: "Vente", location: "Location", location_vacances: "Location vacances" };
      chips.push({ label: labels[filters.transaction] || filters.transaction, key: "transaction" });
    }
    filters.types.forEach((t) => chips.push({ label: t, key: `type-${t}` }));
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
    filters.rooms.forEach((r) => chips.push({ label: `${r === 0 ? "Studio" : r + " ch."}`, key: `room-${r}` }));
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
    else if (key.startsWith("room-")) newFilters.rooms = newFilters.rooms.filter((r) => r !== Number(key.slice(5)));
    else if (key.startsWith("eq-")) newFilters.equipments = newFilters.equipments.filter((e) => e !== key.slice(3));
    updateFilters(newFilters);
  };

  const activeFilterCount = activeChips.length;

  // Breadcrumb
  const breadcrumbs = [
    { label: "Accueil", href: "/" },
    ...(filters.transaction ? [{ label: filters.transaction === "vente" ? "Acheter" : filters.transaction === "location" ? "Louer" : "Location vacances", href: "#" }] : []),
    ...(filters.ville ? [{ label: filters.ville, href: "#" }] : []),
    ...(filters.arrondissement ? [{ label: filters.arrondissement, href: "#" }] : []),
  ];

  // Page title
  const pageTitle = useMemo(() => {
    const parts: string[] = [];
    if (filters.types.length === 1) {
      const labels: Record<string, string> = { appartement: "Appartements", villa: "Villas", terrain: "Terrains", commercial: "Locaux commerciaux", bureau: "Bureaux" };
      parts.push(labels[filters.types[0]] || filters.types[0]);
    } else {
      parts.push("Biens immobiliers");
    }
    if (filters.transaction === "vente") parts.push("à vendre");
    else if (filters.transaction === "location") parts.push("à louer");
    else if (filters.transaction === "location_vacances") parts.push("en location vacances");
    if (filters.quartiers.length) parts.push(`à ${filters.quartiers.join(", ")}`);
    else if (filters.quartierLibre) parts.push(`à ${filters.quartierLibre}`);
    else if (filters.arrondissement) parts.push(`à ${filters.arrondissement}`);
    else if (filters.ville) parts.push(`à ${filters.ville}`);
    return parts.join(" ");
  }, [filters]);

  return (
    <>
      <Helmet><title>{pageTitle} — ImmoNex</title></Helmet>
      <Header />

      <div className="container mx-auto px-4 pt-4 pb-2">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm font-sans text-muted-foreground mb-3">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {i === 0 ? (
                <Link to={bc.href} className="hover:text-primary transition-colors flex items-center gap-1">
                  <Home className="h-3.5 w-3.5" />
                  {bc.label}
                </Link>
              ) : i === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{bc.label}</span>
              ) : (
                <Link to={bc.href} className="hover:text-primary transition-colors">{bc.label}</Link>
              )}
            </span>
          ))}
        </nav>

        {/* Page Title */}
        <h1 className="font-serif text-xl md:text-2xl font-bold mb-2">
          {pageTitle}{" "}
          <span className="text-muted-foreground font-normal text-lg">({filtered.length} annonces)</span>
        </h1>

        {/* Active filter chips */}
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
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-sans text-muted-foreground h-6"
              onClick={() => updateFilters({
                transaction: "", types: [], ville: "", arrondissement: "",
                quartiers: [], quartierLibre: "", priceMin: 0, priceMax: 0,
                surfaceMin: 0, surfaceMax: 0, rooms: [], bathrooms: [],
                equipments: [], proximities: [],
              })}
            >
              Effacer tout
            </Button>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-80 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <FilterSidebar
              filters={filters}
              onFiltersChange={updateFilters}
              listings={seedListings}
            />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-4 bg-card rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                {/* Mobile filter button */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden font-sans gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtres
                      {activeFilterCount > 0 && (
                        <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] gradient-primary text-white border-0">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full sm:w-96 p-4 overflow-y-auto">
                    <FilterSidebar
                      filters={filters}
                      onFiltersChange={updateFilters}
                      listings={seedListings}
                      isMobile
                      onClose={() => setMobileFiltersOpen(false)}
                    />
                  </SheetContent>
                </Sheet>

                <p className="font-sans text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filtered.length}</span> résultats
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View toggles */}
                <div className="hidden md:flex items-center border border-border rounded-lg overflow-hidden">
                  {([
                    { mode: "grid" as ViewMode, icon: LayoutGrid },
                    { mode: "list" as ViewMode, icon: List },
                    { mode: "map" as ViewMode, icon: Map },
                  ]).map(({ mode, icon: Icon }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`p-2 transition-colors ${
                        viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
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
                    <SelectItem value="recent">Plus récents</SelectItem>
                    <SelectItem value="priceAsc">Prix ↑</SelectItem>
                    <SelectItem value="priceDesc">Prix ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results */}
            {viewMode === "map" ? (
              <div className="flex gap-4 h-[600px]">
                <div className="w-[60%]">
                  <ListingsMap
                    listings={filtered}
                    hoveredId={hoveredListingId}
                    onMarkerClick={(id) => navigate(`/annonce/${id}`)}
                  />
                </div>
                <div className="w-[40%] overflow-y-auto space-y-3">
                  {filtered.map((listing) => {
                    const agency = getAgency(listing.agency_id);
                    return (
                      <div
                        key={listing.id}
                        onMouseEnter={() => setHoveredListingId(listing.id)}
                        onMouseLeave={() => setHoveredListingId(undefined)}
                      >
                        <ListingCard listing={listing} agencyName={agency?.name} agencyLogo={agency?.logo} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-4">
                {filtered.map((listing) => {
                  const agency = getAgency(listing.agency_id);
                  return (
                    <div
                      key={listing.id}
                      className="flex bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <Link to={`/annonce/${listing.id}`} className="w-72 h-48 flex-shrink-0">
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      </Link>
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                          <Link to={`/annonce/${listing.id}`}>
                            <h3 className="font-serif font-semibold text-lg hover:text-primary transition-colors">
                              {listing.title}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground font-sans mt-1 line-clamp-2">
                            {listing.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm font-sans text-muted-foreground">
                            {listing.surface > 0 && <span>{listing.surface} m²</span>}
                            {listing.rooms > 0 && <span>{listing.rooms} ch.</span>}
                            {listing.bathrooms > 0 && <span>{listing.bathrooms} sdb</span>}
                            <span>{listing.city}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-serif font-bold text-lg text-primary">
                            {listing.price_mga.toLocaleString("fr-FR")} Ar
                          </span>
                          {agency && (
                            <span className="text-xs text-muted-foreground font-sans">{agency.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((listing) => {
                  const agency = getAgency(listing.agency_id);
                  return <ListingCard key={listing.id} listing={listing} agencyName={agency?.name} agencyLogo={agency?.logo} />;
                })}
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Home className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-serif text-xl text-foreground mb-2">Aucune annonce ne correspond</p>
                <p className="font-sans text-sm text-muted-foreground mb-4">
                  Essayez de modifier ou réinitialiser vos filtres
                </p>
                <Button
                  variant="outline"
                  className="font-sans"
                  onClick={() => updateFilters({
                    transaction: "", types: [], ville: "", arrondissement: "",
                    quartiers: [], quartierLibre: "", priceMin: 0, priceMax: 0,
                    surfaceMin: 0, surfaceMax: 0, rooms: [], bathrooms: [],
                    equipments: [], proximities: [],
                  })}
                >
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
