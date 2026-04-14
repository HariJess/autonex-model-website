import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Euro, Banknote } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import LocationSelector from "@/components/LocationSelector";
import BudgetRangeSlider, { formatBudgetLabel } from "@/components/BudgetRangeSlider";
import { LISTING_TYPE_LABELS, LISTING_TYPES_WITHOUT_ROOM_FILTERS } from "@/types/listing";
import type { ListingType } from "@/types/listing";
import { searchPathFromFilters } from "@/lib/searchUrl";
import type { SearchFilters } from "@/types/search";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";
import { listingTypesForTransaction } from "@/lib/listingRules";
import { TOP_AUTO_BRANDS } from "@/data/automotiveCatalog";

const TRANSACTIONS = [
  { value: "vente", labelKey: "nav.buy" },
  { value: "location", labelKey: "nav.rent" },
  { value: "location_vacances", labelKey: "search.vacationRental" },
];

const NO_ROOMS_TYPES = new Set<string>(LISTING_TYPES_WITHOUT_ROOM_FILTERS);
const HERO_FUEL_OPTIONS = ["Essence", "Diesel", "Hybride", "Électrique"];
const HERO_YEAR_OPTIONS = Array.from({ length: 27 }, (_, idx) => String(2026 - idx));

const HeroSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState("vente");
  const [type, setType] = useState("");
  const heroTypeOptions = useMemo(() => listingTypesForTransaction(transaction), [transaction]);

  const handleTransactionChange = (tr: string) => {
    setTransaction(tr);
    setType((prev) => {
      const allowed = new Set(listingTypesForTransaction(tr));
      return allowed.has(prev as ListingType) ? prev : "";
    });
  };

  const handleTypeChange = (v: string) => {
    setType(v);
    if (NO_ROOMS_TYPES.has(v)) setBrand("");
  };
  const [ville, setVille] = useState("");
  const [arrondissements, setArrondissements] = useState<string[]>([]);
  const [quartiers, setQuartiers] = useState<string[]>([]);
  const [quartierLibre, setQuartierLibre] = useState("");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [brand, setBrand] = useState("");
  const [desktopLocationOpen, setDesktopLocationOpen] = useState(false);
  const [mobileLocationOpen, setMobileLocationOpen] = useState(false);
  const [desktopBudgetOpen, setDesktopBudgetOpen] = useState(false);
  const [mobileBudgetOpen, setMobileBudgetOpen] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState<"MGA" | "EUR">("MGA");
  const [modelQuery, setModelQuery] = useState("");
  const [yearMin, setYearMin] = useState(0);
  const [fuel, setFuel] = useState("");

  const showBrand = !type || !NO_ROOMS_TYPES.has(type);

  const buildFilters = (): SearchFilters => {
    const allowed = new Set(listingTypesForTransaction(transaction));
    const types: string[] = type && allowed.has(type as ListingType) ? [type] : [];
    return {
      ...EMPTY_SEARCH_FILTERS,
      transaction: TRANSACTIONS.some((tr) => tr.value === transaction) ? transaction : "vente",
      types,
      ville,
      arrondissements,
      quartiers,
      quartierLibre,
      priceMin,
      priceMax,
      rooms: [],
      transmissions: [],
      drivetrains: [],
      conditions: [],
      sellerTypes: [],
      brands: brand ? [brand] : [],
      modelQuery,
      yearMin,
      yearMax: 0,
      fuels: fuel ? [fuel] : [],
    };
  };

  const handleSearch = () => {
    navigate(searchPathFromFilters(buildFilters()));
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

  return (
    <section className="relative overflow-hidden py-14 sm:py-16 lg:py-28">
      <div className="absolute inset-0 gradient-primary" />
      <div className="absolute inset-0 bg-[radial-gradient(1000px_420px_at_50%_-5%,rgba(255,255,255,0.14),transparent)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/30" />

      <div className="relative container mx-auto px-4 text-center">
        <h1
          className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight"
          style={{ color: "#FAFAFA" }}
        >
          {t("hero.title")}
        </h1>
        <p
          className="text-base sm:text-lg md:text-xl mb-7 md:mb-9 font-sans max-w-2xl mx-auto"
          style={{ color: "rgba(250,250,250,0.85)" }}
        >
          {t("hero.subtitle")}
        </p>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-1.5 mb-2 max-w-full overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
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

          <div className="bg-card/98 rounded-2xl shadow-2xl p-3 md:p-4 -mb-10 md:-mb-12 relative z-10 border border-border/70">
            <div className="hidden lg:flex items-center gap-0 bg-background rounded-xl border border-border/80 overflow-hidden">
              <div className="flex-1 border-r border-border px-3 py-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block text-left">
                  {t("hero.type")}
                </label>
                <Select value={type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="border-0 shadow-none p-0 h-7 font-sans text-sm focus:ring-0">
                    <SelectValue placeholder={t("hero.allTypes")} />
                  </SelectTrigger>
                  <SelectContent>
                    {heroTypeOptions.map((lt) => (
                      <SelectItem key={lt} value={lt}>{LISTING_TYPE_LABELS[lt]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Popover open={desktopLocationOpen} onOpenChange={setDesktopLocationOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex-1 border-r border-border px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                  >
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block">
                      {t("hero.location")}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className={`font-sans text-sm truncate ${locationLabel ? "text-foreground" : "text-muted-foreground"}`}>
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
                    className="flex-1 border-r border-border px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                  >
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block">
                      {t("search.budget", "Budget")}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <BudgetIcon className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className={`font-sans text-sm truncate ${budgetLabel ? "text-foreground" : "text-muted-foreground"}`}>
                        {budgetLabel || t("search.budget", "Budget")}
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

              {showBrand && (
                <div className="flex-shrink-0 w-32 border-r border-border px-3 py-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block text-left">
                    Marque
                  </label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger className="border-0 shadow-none p-0 h-7 font-sans text-sm focus:ring-0">
                      <SelectValue placeholder="Toutes marques" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOP_AUTO_BRANDS.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="px-2">
                <Button
                  type="button"
                  onClick={handleSearch}
                  className="gradient-primary border-0 font-semibold font-sans gap-2 h-12 px-6 rounded-xl"
                  style={{ color: "#FAFAFA" }}
                >
                  <Search className="h-5 w-5" />
                  {t("hero.search")}
                </Button>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-12 gap-2 mt-2 rounded-xl border border-border/70 bg-background/70 p-2">
              <div className="col-span-6">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-1 block text-left">
                  Modèle
                </label>
                <Input
                  value={modelQuery}
                  onChange={(e) => setModelQuery(e.target.value)}
                  placeholder="Ex: RAV4, Hilux, NMAX..."
                  className="h-9 font-sans text-sm"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-1 block text-left">
                  Année
                </label>
                <Select value={yearMin ? String(yearMin) : "all"} onValueChange={(v) => setYearMin(v === "all" ? 0 : Number(v))}>
                  <SelectTrigger className="h-9 font-sans text-sm">
                    <SelectValue placeholder="Toutes années" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes années</SelectItem>
                    {HERO_YEAR_OPTIONS.map((year) => (
                      <SelectItem key={year} value={year}>{year}+</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-1 block text-left">
                  Carburant
                </label>
                <Select value={fuel || "all"} onValueChange={(v) => setFuel(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 font-sans text-sm">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {HERO_FUEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="lg:hidden space-y-3">
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger className="font-sans min-h-11">
                  <SelectValue placeholder={t("hero.type")} />
                </SelectTrigger>
                <SelectContent>
                  {heroTypeOptions.map((lt) => (
                    <SelectItem key={lt} value={lt}>{LISTING_TYPE_LABELS[lt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover open={mobileLocationOpen} onOpenChange={setMobileLocationOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start font-sans text-sm gap-2 min-h-11 touch-manipulation">
                    <MapPin className="h-4 w-4 text-accent" />
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
                  <Button type="button" variant="outline" className="w-full justify-start font-sans text-sm gap-2 min-h-11 touch-manipulation">
                    <BudgetIcon className="h-4 w-4 text-accent shrink-0" />
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

              {showBrand && (
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger className="font-sans min-h-11">
                    <SelectValue placeholder="Marque" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOP_AUTO_BRANDS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Input
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder="Modèle (ex: RAV4, Hilux...)"
                className="font-sans min-h-11"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={yearMin ? String(yearMin) : "all"} onValueChange={(v) => setYearMin(v === "all" ? 0 : Number(v))}>
                  <SelectTrigger className="font-sans min-h-11">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes années</SelectItem>
                    {HERO_YEAR_OPTIONS.map((year) => (
                      <SelectItem key={year} value={year}>{year}+</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={fuel || "all"} onValueChange={(v) => setFuel(v === "all" ? "" : v)}>
                  <SelectTrigger className="font-sans min-h-11">
                    <SelectValue placeholder="Carburant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous carburants</SelectItem>
                    {HERO_FUEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                onClick={handleSearch}
                className="w-full gradient-primary border-0 font-semibold font-sans gap-2 h-12 touch-manipulation min-h-12"
                style={{ color: "#FAFAFA" }}
              >
                <Search className="h-5 w-5" />
                {t("hero.search")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
