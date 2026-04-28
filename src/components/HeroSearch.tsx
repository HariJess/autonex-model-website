import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Euro, Banknote, ChevronDown } from "lucide-react";
import { useState, useMemo, useCallback, type CSSProperties } from "react";
import LocationSelector from "@/components/LocationSelector";
import BudgetRangeSlider, { formatBudgetLabel } from "@/components/BudgetRangeSlider";
import { Checkbox } from "@/components/ui/checkbox";
import { LISTING_TYPES_WITHOUT_ROOM_FILTERS } from "@/types/listing";
import type { ListingType } from "@/types/listing";
import { searchPathFromFilters } from "@/lib/searchUrl";
import type { SearchFilters } from "@/types/search";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";
import { listingTypesForTransaction } from "@/lib/listingRules";
import { AUTO_SEARCH_FUEL_OPTIONS, AUTO_SEARCH_VEHICLE_TYPE_OPTIONS, TOP_AUTO_BRANDS, resolveVehicleTypeFilters } from "@/data/automotiveCatalog";
import BrandLogo from "@/components/BrandLogo";
import { useFilteredActiveListingCount } from "@/hooks/useListings";
import { buildSearchStrictCountFilters } from "@/lib/searchListingFilters";
import { HeroModelCombobox } from "@/components/hero/HeroModelCombobox";
import { VEHICLE_UI_CATALOG_BY_MAKE } from "@/data/vehicleUiCatalog";
import { cn } from "@/lib/utils";

const TRANSACTIONS = [
  { value: "vente", labelKey: "nav.buy" },
  { value: "location", labelKey: "nav.rent" },
  { value: "location_vacances", labelKey: "search.vacationRental" },
];

const NO_ROOMS_TYPES = new Set<string>(LISTING_TYPES_WITHOUT_ROOM_FILTERS);
const HERO_YEAR_PRESETS = [
  { value: "all", label: "all", min: 0, max: 0 },
  { value: "2025", label: "2025+", min: 2025, max: 0 },
  { value: "2020", label: "2020+", min: 2020, max: 0 },
  { value: "2015", label: "2015+", min: 2015, max: 0 },
  { value: "2010", label: "2010+", min: 2010, max: 0 },
  { value: "2005", label: "2005+", min: 2005, max: 0 },
  { value: "2000", label: "2000+", min: 2000, max: 0 },
  { value: "1990", label: "1990+", min: 1990, max: 0 },
  { value: "1980", label: "1980+", min: 1980, max: 0 },
  { value: "before-1980", label: "Avant 1980", min: 0, max: 1979 },
] as const;

function summarizeSelection(
  labels: string[],
  pluralNoun: string,
  joiner = ", ",
): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) {
    const joined = `${labels[0]}${joiner}${labels[1]}`;
    return joined.length > 28 ? `2 ${pluralNoun} sélectionnés` : joined;
  }
  return `${labels[0]}${joiner}${labels[1]} +${labels.length - 2}`;
}

type HeroSearchProps = {
  hideHeader?: boolean;
  hideBackground?: boolean;
};

const HeroSearch = ({ hideHeader = false, hideBackground = false }: HeroSearchProps = {}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState("vente");
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const heroTypeOptions = useMemo(() => AUTO_SEARCH_VEHICLE_TYPE_OPTIONS, []);
  const allowedListingTypes = useMemo(() => new Set(listingTypesForTransaction(transaction)), [transaction]);

  const handleTransactionChange = (tr: string) => {
    setTransaction(tr);
    setVehicleTypes((prev) => {
      const nextAllowed = new Set(listingTypesForTransaction(tr));
      return prev.filter((selectedId) => {
        const next = heroTypeOptions.find((opt) => opt.id === selectedId);
        return !next?.listingTypes?.length || next.listingTypes.some((lt) => nextAllowed.has(lt as ListingType));
      });
    });
  };
  const toggleVehicleType = (id: string) => {
    setVehicleTypes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const [ville, setVille] = useState("");
  const [arrondissements, setArrondissements] = useState<string[]>([]);
  const [quartiers, setQuartiers] = useState<string[]>([]);
  const [quartierLibre, setQuartierLibre] = useState("");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [brands, setBrands] = useState<string[]>([]);
  const [desktopLocationOpen, setDesktopLocationOpen] = useState(false);
  const [mobileLocationOpen, setMobileLocationOpen] = useState(false);
  const [desktopBudgetOpen, setDesktopBudgetOpen] = useState(false);
  const [mobileBudgetOpen, setMobileBudgetOpen] = useState(false);
  const [showMobileAdvanced, setShowMobileAdvanced] = useState(false);
  const [showDesktopAdvanced, setShowDesktopAdvanced] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState<"MGA" | "EUR">("MGA");
  const [modelQuery, setModelQuery] = useState("");
  const [yearPreset, setYearPreset] = useState<(typeof HERO_YEAR_PRESETS)[number]["value"]>("all");
  const [fuels, setFuels] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [mobileRentOpen, setMobileRentOpen] = useState(false);

  const selectedVehicleTypeFilters = useMemo(
    () => resolveVehicleTypeFilters(vehicleTypes),
    [vehicleTypes],
  );
  const showBrand = !selectedVehicleTypeFilters.listingTypes.some((lt) => NO_ROOMS_TYPES.has(lt));
  const selectedTypeLabels = heroTypeOptions.filter((opt) => vehicleTypes.includes(opt.id)).map((opt) => opt.label);
  const typeLabel = vehicleTypes.length === 0
    ? t("hero.allTypes")
    : summarizeSelection(selectedTypeLabels, "types");
  const brandLabel = brands.length === 0
    ? t("hero.allBrands", "Toutes les marques")
    : summarizeSelection(brands, "marques");
  const fuelLabel = fuels.length === 0
    ? t("hero.allFuels", "Tous carburants")
    : summarizeSelection(fuels, "carburants", " + ");
  const visibleTopBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return TOP_AUTO_BRANDS;
    return TOP_AUTO_BRANDS.filter((brand) => brand.toLowerCase().includes(q));
  }, [brandSearch]);

  // Modèle options: union of models for selected brand(s), or all models if no brand selected.
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    if (brands.length === 0) {
      Object.values(VEHICLE_UI_CATALOG_BY_MAKE).forEach((models) => {
        models.forEach((m) => set.add(m));
      });
    } else {
      brands.forEach((brand) => {
        (VEHICLE_UI_CATALOG_BY_MAKE[brand] ?? []).forEach((m) => set.add(m));
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [brands]);

  const searchFilters = useMemo<SearchFilters>(() => {
    const mappedTypes = selectedVehicleTypeFilters.listingTypes.filter((lt) => allowedListingTypes.has(lt as ListingType));
    const fuelsValue = Array.from(new Set([...fuels, ...selectedVehicleTypeFilters.fuels]));
    const selectedYearPreset = HERO_YEAR_PRESETS.find((preset) => preset.value === yearPreset) ?? HERO_YEAR_PRESETS[0];
    return {
      ...EMPTY_SEARCH_FILTERS,
      transaction: TRANSACTIONS.some((tr) => tr.value === transaction) ? transaction : "vente",
      vehicleTypes,
      types: mappedTypes,
      ville,
      arrondissements,
      quartiers,
      quartierLibre,
      priceMin,
      priceMax,
      transmissions: [],
      drivetrains: [],
      conditions: [],
      sellerTypes: [],
      brands,
      modelQuery: modelQuery.trim(),
      yearMin: selectedYearPreset.min,
      yearMax: selectedYearPreset.max,
      fuels: fuelsValue,
    };
  }, [
    selectedVehicleTypeFilters.listingTypes,
    selectedVehicleTypeFilters.fuels,
    allowedListingTypes,
    fuels,
    yearPreset,
    transaction,
    vehicleTypes,
    ville,
    arrondissements,
    quartiers,
    quartierLibre,
    priceMin,
    priceMax,
    brands,
    modelQuery,
  ]);

  const canEstimateResultCount = useMemo(() => {
    return (
      vehicleTypes.length > 0 ||
      ville.trim().length > 0 ||
      quartierLibre.trim().length > 0 ||
      priceMin > 0 ||
      priceMax > 0 ||
      brands.length > 0 ||
      modelQuery.trim().length > 0 ||
      fuels.length > 0 ||
      yearPreset !== "all"
    );
  }, [vehicleTypes, ville, quartierLibre, priceMin, priceMax, brands, modelQuery, fuels, yearPreset]);

  const filteredCountFilters = useMemo(
    () =>
      canEstimateResultCount ? buildSearchStrictCountFilters(searchFilters) : { limit: 0 },
    [canEstimateResultCount, searchFilters],
  );

  // Total count (no filters) — shown by default in the CTA. staleTime 30s prevents hot-loop refetch.
  const { data: totalCount = 0, isLoading: totalLoading } = useFilteredActiveListingCount({});
  // Filtered count — only hits the DB when user actually poses filters (early-return 0 otherwise).
  const { data: filteredCount = 0, isLoading: filteredLoading } = useFilteredActiveListingCount(filteredCountFilters);

  const ctaCount = canEstimateResultCount ? filteredCount : totalCount;
  const ctaLoading = canEstimateResultCount ? filteredLoading : totalLoading;
  const ctaLabel = useMemo(
    () =>
      ctaLoading
        ? t("hero.searching", "Recherche...")
        : t("hero.seeXListings", "Voir {{count}} annonces", { count: ctaCount }),
    [ctaLoading, ctaCount, t],
  );

  const advancedFiltersActiveCount = useMemo(() => {
    let n = 0;
    if (brands.length > 0) n += 1;
    if (modelQuery.trim().length > 0) n += 1;
    if (yearPreset !== "all") n += 1;
    if (fuels.length > 0) n += 1;
    return n;
  }, [brands, modelQuery, yearPreset, fuels]);

  const refineLabel = advancedFiltersActiveCount > 0
    ? t("hero.refineSearchWithCount", "Affiner la recherche ({{count}})", { count: advancedFiltersActiveCount })
    : t("hero.refineSearch", "Affiner la recherche");

  const handleSearch = () => {
    navigate(searchPathFromFilters(searchFilters));
  };

  const locationLabel = useMemo(() => {
    if (!ville && !quartierLibre.trim()) return "";
    if (!ville) return quartierLibre.trim();
    const tail =
      quartiers.length > 0
        ? quartiers.slice(0, 2).join(", ") + (quartiers.length > 2 ? "…" : "")
        : arrondissements.length > 0
          ? arrondissements.slice(0, 2).join(", ") + (arrondissements.length > 2 ? "…" : "")
          : quartierLibre.trim() || "";
    return tail ? `${ville} — ${tail}` : ville;
  }, [ville, quartiers, arrondissements, quartierLibre]);

  const onLocationChange = useCallback((v: { ville: string; arrondissements: string[]; quartiers: string[]; quartierLibre: string }) => {
    setVille(v.ville);
    setArrondissements(v.arrondissements);
    setQuartiers(v.quartiers);
    setQuartierLibre(v.quartierLibre);
  }, []);

  const budgetLabel = formatBudgetLabel(priceMin, priceMax, budgetCurrency);
  const BudgetIcon = budgetCurrency === "EUR" ? Euro : Banknote;

  // Class forks for the glass / on-dark variant used inside HeroCinematic.
  // Default rendering (hideBackground=false) is unchanged.
  const outerCardClass = hideBackground
    ? "bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-black/20 p-4 md:p-6 relative z-10"
    : "bg-card/98 rounded-2xl shadow-2xl p-3 md:p-4 -mb-8 md:-mb-12 relative z-10 border border-border/70";
  const desktopPillClass = hideBackground
    ? "hidden lg:flex items-center gap-0 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 overflow-hidden"
    : "hidden lg:flex items-center gap-0 bg-background rounded-xl border border-border/80 overflow-hidden";
  const pillBorderClass = hideBackground ? "border-white/15" : "border-border";
  const pillLabelClass = hideBackground
    ? "text-[10px] uppercase tracking-wider text-white/60 font-sans font-medium mb-0.5 block text-left"
    : "text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block text-left";
  const pillValueIdleClass = hideBackground ? "text-white/60" : "text-muted-foreground";
  const pillValueSetClass = hideBackground ? "text-white" : "text-foreground";
  const pillIconClass = hideBackground ? "text-white/70" : "text-accent";
  const pillHoverClass = hideBackground ? "hover:bg-white/10 transition-colors" : "hover:bg-muted/50 transition-colors";
  const ctaClass = hideBackground
    ? "bg-white hover:bg-white/90 text-slate-900 font-semibold font-sans gap-2 shadow-lg shadow-black/20"
    : "gradient-primary border-0 font-semibold font-sans gap-2";
  const ctaStyle: CSSProperties | undefined = hideBackground ? undefined : { color: "#FAFAFA" };
  const mobileOutlineClass = hideBackground
    ? "bg-white/10 hover:bg-white/15 border-white/15 text-white backdrop-blur-sm"
    : "";
  const mobileAdvancedShellClass = hideBackground
    ? "space-y-2.5 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-2.5"
    : "space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-2.5";
  const desktopAdvancedShellBaseClass = hideBackground
    ? "hidden lg:grid gap-3 mt-2 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-3"
    : "hidden lg:grid gap-3 mt-2 rounded-xl border border-border/70 bg-background/70 p-3";
  const trustWrapperClass = hideBackground
    ? "mt-4 md:mt-6 flex flex-nowrap items-center justify-center gap-x-2.5 md:gap-x-8 text-white/80 text-[11px] md:text-sm font-sans tracking-tight md:tracking-normal px-2"
    : "mt-12 md:mt-16 flex flex-nowrap items-center justify-center gap-x-2.5 md:gap-x-8 text-white/80 text-[11px] md:text-sm font-sans tracking-tight md:tracking-normal px-2";

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        !hideBackground && "py-10 sm:py-16 lg:py-28",
      )}
    >
      {!hideBackground ? (
        <>
          <div className="absolute inset-0 gradient-primary" />
          <div className="absolute inset-0 bg-[radial-gradient(1000px_420px_at_50%_-5%,rgba(255,255,255,0.14),transparent)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/30" />
        </>
      ) : null}

      <div className="relative container mx-auto text-center">
        {!hideHeader ? (
          <>
            <h1
              className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 leading-tight px-1"
              style={{ color: "#FAFAFA" }}
            >
              {t("hero.title")}
            </h1>
            <p
              className="text-sm sm:text-lg md:text-xl mb-5 md:mb-9 font-sans max-w-2xl mx-auto px-1 leading-relaxed"
              style={{ color: "rgba(250,250,250,0.85)" }}
            >
              {t("hero.subtitle")}
            </p>
          </>
        ) : null}

        <div className="max-w-4xl mx-auto">
          {/* Desktop: 3 onglets visibles (Acheter / Longue / Courte) */}
          <div className="hidden md:flex justify-center gap-1.5 mb-2 max-w-full overflow-x-auto pb-0.5 px-1 [-webkit-overflow-scrolling:touch]">
            {TRANSACTIONS.map((tr) => (
              <button
                key={tr.value}
                type="button"
                onClick={() => handleTransactionChange(tr.value)}
                className={`shrink-0 px-3 sm:px-5 py-2.5 rounded-xl font-sans font-semibold text-xs sm:text-sm transition-all touch-manipulation min-h-11 border ${
                  transaction === tr.value
                    ? "bg-white text-[#0B1C38] border-white shadow-lg"
                    : "bg-white/10 text-white/90 border-white/20 hover:bg-white/16 backdrop-blur-sm"
                }`}
              >
                {t(tr.labelKey)}
              </button>
            ))}
          </div>

          {/* Mobile: 2 onglets (Acheter + Location en dropdown pour LLD/LCD) — Lot 5.2 */}
          <div className="flex md:hidden justify-center gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => handleTransactionChange("vente")}
              className={`shrink-0 px-3 py-2.5 rounded-xl font-sans font-semibold text-xs transition-all touch-manipulation min-h-11 border ${
                transaction === "vente"
                  ? "bg-white text-[#0B1C38] border-white shadow-lg"
                  : "bg-white/10 text-white/90 border-white/20 hover:bg-white/16 backdrop-blur-sm"
              }`}
            >
              {t("nav.buy")}
            </button>
            <Popover open={mobileRentOpen} onOpenChange={setMobileRentOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (transaction !== "location" && transaction !== "location_vacances") {
                      handleTransactionChange("location");
                    }
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-sans font-semibold text-xs transition-all touch-manipulation min-h-11 border ${
                    transaction === "location" || transaction === "location_vacances"
                      ? "bg-white text-[#0B1C38] border-white shadow-lg"
                      : "bg-white/10 text-white/90 border-white/20 hover:bg-white/16 backdrop-blur-sm"
                  }`}
                  aria-label={t("hero.rentTab", "Location")}
                >
                  {transaction === "location"
                    ? t("hero.rentLongShort", "Longue durée")
                    : transaction === "location_vacances"
                      ? t("hero.rentShortShort", "Courte durée")
                      : t("hero.rentTab", "Location")}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-56 p-1">
                <button
                  type="button"
                  onClick={() => {
                    handleTransactionChange("location");
                    setMobileRentOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-sans text-sm transition-colors ${
                    transaction === "location"
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "hover:bg-accent/60"
                  }`}
                >
                  {t("nav.rent")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleTransactionChange("location_vacances");
                    setMobileRentOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-sans text-sm transition-colors ${
                    transaction === "location_vacances"
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "hover:bg-accent/60"
                  }`}
                >
                  {t("search.vacationRental")}
                </button>
              </PopoverContent>
            </Popover>
          </div>

          <div className={outerCardClass}>
            <div className={desktopPillClass}>
              <div className={cn("flex-1 border-r px-3 py-2", pillBorderClass)}>
                <label className={pillLabelClass}>
                  {t("hero.type")}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full border-0 shadow-none p-0 h-7 font-sans text-sm text-left truncate",
                        hideBackground && "text-white",
                      )}
                    >
                      {typeLabel}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">{t("hero.type")}</p>
                      {vehicleTypes.length > 0 && (
                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setVehicleTypes([])}>
                          Effacer
                        </button>
                      )}
                    </div>
                    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                      {heroTypeOptions.map((option) => (
                        <label key={option.id} className="flex items-center gap-2 py-1 text-sm font-sans cursor-pointer">
                          <Checkbox checked={vehicleTypes.includes(option.id)} onCheckedChange={() => toggleVehicleType(option.id)} />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Popover open={desktopLocationOpen} onOpenChange={setDesktopLocationOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn("flex-1 border-r px-3 py-2 text-left", pillBorderClass, pillHoverClass)}
                  >
                    <label className={cn(pillLabelClass, "text-left")}>
                      {t("hero.location")}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <MapPin className={cn("h-3.5 w-3.5 shrink-0", pillIconClass)} />
                      <span className={cn("font-sans text-sm truncate", locationLabel ? pillValueSetClass : pillValueIdleClass)}>
                        {locationLabel || t("hero.location")}
                      </span>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4" align="start">
                  <LocationSelector
                    value={{ ville, arrondissements, quartiers, quartierLibre }}
                    onChange={onLocationChange}
                    onClose={() => setDesktopLocationOpen(false)}
                  />
                </PopoverContent>
              </Popover>

              <Popover open={desktopBudgetOpen} onOpenChange={setDesktopBudgetOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn("flex-1 px-3 py-2 text-left", pillHoverClass)}
                  >
                    <label className={cn(pillLabelClass, "text-left")}>
                      {t("search.budget")}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <BudgetIcon className={cn("h-3.5 w-3.5 shrink-0", pillIconClass)} />
                      <span className={cn("font-sans text-sm truncate", budgetLabel ? pillValueSetClass : pillValueIdleClass)}>
                        {budgetLabel || t("search.budget")}
                      </span>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                  <BudgetRangeSlider
                    transaction={transaction}
                    minValue={priceMin}
                    maxValue={priceMax}
                    onMinChange={setPriceMin}
                    onMaxChange={setPriceMax}
                    onClose={() => setDesktopBudgetOpen(false)}
                    onCurrencyChange={setBudgetCurrency}
                  />
                </PopoverContent>
              </Popover>

            </div>

            {/* Desktop: CTA "Voir X annonces" plein-largeur juste sous la pill (Lot 4.4b) */}
            <Button
              type="button"
              onClick={handleSearch}
              className={cn("hidden lg:flex mt-3 w-full h-12 rounded-xl", ctaClass)}
              style={ctaStyle}
            >
              <Search className="h-5 w-5" />
              {ctaLabel}
            </Button>

            {/* Desktop: toggle accordéon "Affiner la recherche" avec badge de filtres actifs */}
            <button
              type="button"
              onClick={() => setShowDesktopAdvanced((prev) => !prev)}
              className={cn(
                "hidden lg:flex mt-2 w-full items-center justify-center gap-2 px-3 py-2 font-sans text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
                hideBackground
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/50",
              )}
              aria-expanded={showDesktopAdvanced}
              aria-controls="hero-advanced-filters-desktop"
            >
              <span>{refineLabel}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showDesktopAdvanced ? "rotate-180" : ""}`} />
            </button>

            {/* Desktop: contenu déplié — Marque (conditionnel) / Modèle / Année / Carburant */}
            {showDesktopAdvanced && (
              <div
                id="hero-advanced-filters-desktop"
                className={cn(desktopAdvancedShellBaseClass, showBrand ? "lg:grid-cols-4" : "lg:grid-cols-3")}
              >
                {showBrand && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-1 block text-left">
                      {t("search.brand", "Marque")}
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start font-sans text-sm h-9 truncate">
                          {brandLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3" align="start">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">{t("search.brand", "Marque")}</p>
                          {brands.length > 0 && (
                            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setBrands([])}>
                              Effacer
                            </button>
                          )}
                        </div>
                        <Input
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          placeholder={t("hero.brandSearchPlaceholder", "Rechercher une marque...")}
                          className="h-8 text-xs mb-2"
                        />
                        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                          {visibleTopBrands.map((b) => (
                            <label key={b} className="flex items-center gap-2 py-1 text-sm font-sans cursor-pointer">
                              <Checkbox checked={brands.includes(b)} onCheckedChange={() => setBrands((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b])} />
                              <BrandLogo
                                brand={b}
                                className="h-7 w-10 rounded-md bg-background"
                                imgClassName="max-h-4"
                                labelClassName="text-[10px]"
                              />
                              <span>{b}</span>
                            </label>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-1 block text-left">
                    {t("search.model", "Modèle")}
                  </label>
                  <HeroModelCombobox
                    value={modelQuery}
                    options={modelOptions}
                    onSelect={setModelQuery}
                    placeholder={t("hero.modelPlaceholder", "Modèle (ex: RAV4, Hilux, NMAX...)")}
                    searchPlaceholder={t("hero.modelSearchPlaceholder", "Rechercher un modèle...")}
                    emptyLabel={t("hero.modelEmpty", "Aucun modèle trouvé")}
                    freeTextLabel={t("hero.modelFreeText", "Utiliser « {{query}} » comme modèle")}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-1 block text-left">
                    {t("search.year", "Année")}
                  </label>
                  <Select value={yearPreset} onValueChange={(v) => setYearPreset(v as (typeof HERO_YEAR_PRESETS)[number]["value"])}>
                    <SelectTrigger className="h-9 font-sans text-sm">
                      <SelectValue placeholder={t("hero.allYears", "Toutes années")} />
                    </SelectTrigger>
                    <SelectContent>
                      {HERO_YEAR_PRESETS.map((yearPresetOption) => (
                        <SelectItem key={yearPresetOption.value} value={yearPresetOption.value}>
                          {yearPresetOption.value === "all" ? t("hero.allYears", "Toutes années") : yearPresetOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-1 block text-left">
                    {t("search.fuel", "Carburant")}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start font-sans text-sm h-9 truncate">
                        {fuelLabel}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">{t("search.fuel", "Carburant")}</p>
                        {fuels.length > 0 && (
                          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setFuels([])}>
                            Effacer
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {AUTO_SEARCH_FUEL_OPTIONS.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 py-1 text-sm font-sans cursor-pointer">
                            <Checkbox checked={fuels.includes(opt)} onCheckedChange={() => setFuels((prev) => prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt])} />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="lg:hidden space-y-2.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className={cn("w-full justify-start font-sans text-sm gap-2 min-h-11 touch-manipulation truncate", mobileOutlineClass)}>
                    {typeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] max-w-md max-h-[min(75dvh,520px)] overflow-y-auto overscroll-contain p-4" align="start" sideOffset={8}>
                  <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">{t("hero.type")}</p>
                    {vehicleTypes.length > 0 && (
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setVehicleTypes([])}>
                        Effacer
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {heroTypeOptions.map((option) => (
                      <label key={option.id} className="flex items-center gap-2 py-1 text-sm font-sans cursor-pointer">
                        <Checkbox checked={vehicleTypes.includes(option.id)} onCheckedChange={() => toggleVehicleType(option.id)} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={mobileLocationOpen} onOpenChange={setMobileLocationOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className={cn("w-full justify-start font-sans text-sm gap-2 min-h-11 touch-manipulation", mobileOutlineClass)}>
                    <MapPin className={cn("h-4 w-4", hideBackground ? "text-white/70" : "text-accent")} />
                    {locationLabel || t("hero.location")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100vw-2rem)] max-w-md max-h-[min(75dvh,520px)] overflow-y-auto overscroll-contain p-4"
                  align="start"
                  sideOffset={8}
                >
                  <LocationSelector
                    value={{ ville, arrondissements, quartiers, quartierLibre }}
                    onChange={onLocationChange}
                    onClose={() => setMobileLocationOpen(false)}
                  />
                </PopoverContent>
              </Popover>

              <Popover open={mobileBudgetOpen} onOpenChange={setMobileBudgetOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className={cn("w-full justify-start font-sans text-sm gap-2 min-h-11 touch-manipulation", mobileOutlineClass)}>
                    <BudgetIcon className={cn("h-4 w-4 shrink-0", hideBackground ? "text-white/70" : "text-accent")} />
                    {budgetLabel || t("search.budget", "Budget")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100vw-2rem)] max-w-md max-h-[min(75dvh,480px)] overflow-y-auto overscroll-contain p-4"
                  align="start"
                  sideOffset={8}
                >
                  <BudgetRangeSlider
                    transaction={transaction}
                    minValue={priceMin}
                    maxValue={priceMax}
                    onMinChange={setPriceMin}
                    onMaxChange={setPriceMax}
                    onClose={() => setMobileBudgetOpen(false)}
                    onCurrencyChange={setBudgetCurrency}
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMobileAdvanced((prev) => !prev)}
                className={cn("w-full justify-center font-sans text-sm min-h-11", mobileOutlineClass)}
              >
                {showMobileAdvanced
                  ? t("hero.hideAdvancedMobile", "Masquer les filtres avancés")
                  : t("hero.showAdvancedMobile", "Afficher plus de filtres")}
              </Button>

              {showMobileAdvanced && (
                <div className={mobileAdvancedShellClass}>
                  {showBrand && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start font-sans text-sm gap-2 min-h-11 touch-manipulation truncate">
                          {brandLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[calc(100vw-2rem)] max-w-md max-h-[min(75dvh,520px)] overflow-y-auto overscroll-contain p-4" align="start" sideOffset={8}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">{t("search.brand", "Marque")}</p>
                          {brands.length > 0 && (
                            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setBrands([])}>
                              Effacer
                            </button>
                          )}
                        </div>
                        <Input
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          placeholder={t("hero.brandSearchPlaceholder", "Rechercher une marque...")}
                          className="text-sm mb-2"
                        />
                        <div className="space-y-1">
                          {visibleTopBrands.map((b) => (
                            <label key={b} className="flex items-center gap-2 py-1 text-sm font-sans cursor-pointer">
                              <Checkbox checked={brands.includes(b)} onCheckedChange={() => setBrands((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b])} />
                              <BrandLogo
                                brand={b}
                                className="h-8 w-12 rounded-md bg-background"
                                imgClassName="max-h-5"
                                labelClassName="text-[10px]"
                              />
                              <span>{b}</span>
                            </label>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}

                  <HeroModelCombobox
                    value={modelQuery}
                    options={modelOptions}
                    onSelect={setModelQuery}
                    placeholder={t("hero.modelPlaceholder", "Modèle (ex: RAV4, Hilux, NMAX...)")}
                    searchPlaceholder={t("hero.modelSearchPlaceholder", "Rechercher un modèle...")}
                    emptyLabel={t("hero.modelEmpty", "Aucun modèle trouvé")}
                    freeTextLabel={t("hero.modelFreeText", "Utiliser « {{query}} » comme modèle")}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Select value={yearPreset} onValueChange={(v) => setYearPreset(v as (typeof HERO_YEAR_PRESETS)[number]["value"])}>
                      <SelectTrigger className="font-sans">
                        <SelectValue placeholder={t("search.year", "Année")} />
                      </SelectTrigger>
                      <SelectContent>
                        {HERO_YEAR_PRESETS.map((yearPresetOption) => (
                          <SelectItem key={yearPresetOption.value} value={yearPresetOption.value}>
                            {yearPresetOption.value === "all" ? t("hero.allYears", "Toutes années") : yearPresetOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start font-sans text-sm gap-2 min-h-11 touch-manipulation truncate">
                          {fuelLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[calc(100vw-2rem)] max-w-md max-h-[min(75dvh,520px)] overflow-y-auto overscroll-contain p-4" align="start" sideOffset={8}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">{t("search.fuel", "Carburant")}</p>
                          {fuels.length > 0 && (
                            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setFuels([])}>
                              Effacer
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {AUTO_SEARCH_FUEL_OPTIONS.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 py-1 text-sm font-sans cursor-pointer">
                              <Checkbox checked={fuels.includes(opt)} onCheckedChange={() => setFuels((prev) => prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt])} />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleSearch}
                className={cn("w-full h-12 touch-manipulation min-h-12", ctaClass)}
                style={ctaStyle}
              >
                <Search className="h-5 w-5" />
                {ctaLabel}
              </Button>
            </div>
          </div>

          {/* Trust signals sobres sous la card search — Lot 4.4e */}
          <div className={trustWrapperClass}>
            <span className="inline-flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M12 2 L4 5 V12 C4 17 7.5 21 12 22 C16.5 21 20 17 20 12 V5 L12 2Z"
                  fill="#059669"
                />
                <path
                  d="M8 12 L11 15 L16 9"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="md:hidden">{t("hero.trustModeratedShort", "Modérées")}</span>
              <span className="hidden md:inline">{t("hero.trustModerated", "Annonces modérées")}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
              <svg
                viewBox="0 0 24 16"
                className="h-4 w-6 shrink-0 rounded-sm"
                aria-hidden="true"
              >
                <rect x="0" y="0" width="8" height="16" fill="#FFFFFF" />
                <rect x="8" y="0" width="16" height="8" fill="#FC3D32" />
                <rect x="8" y="8" width="16" height="8" fill="#007E3A" />
              </svg>
              <span className="md:hidden">{t("hero.trustMadeInMgShort", "Malgache")}</span>
              <span className="hidden md:inline">{t("hero.trustMadeInMg", "100% Malgache")}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" fill="#059669" />
                <path
                  d="M8 12 L11 15 L16 9"
                  stroke="white"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="md:hidden">{t("hero.trustEstimationFreeShort", "Estimation")}</span>
              <span className="hidden md:inline">{t("hero.trustEstimationFree", "Estimation gratuite")}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
