import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, MapPin, Euro, Banknote } from "lucide-react";
import { useState, useMemo } from "react";
import LocationSelector from "@/components/LocationSelector";
import BudgetRangeSlider, { formatBudgetLabel } from "@/components/BudgetRangeSlider";
import { LISTING_TYPE_LABELS, LISTING_TYPES_WITHOUT_ROOM_FILTERS } from "@/types/listing";
import type { ListingType } from "@/types/listing";
import { searchPathFromFilters } from "@/lib/searchUrl";
import type { SearchFilters } from "@/types/search";
import { EMPTY_SEARCH_FILTERS } from "@/types/search";
import { listingTypesForTransaction } from "@/lib/listingRules";

const TRANSACTIONS = [
  { value: "vente", labelKey: "nav.buy" },
  { value: "location", labelKey: "nav.rent" },
  { value: "location_vacances", labelKey: "search.vacationRental" },
];

const ROOM_OPTIONS = [
  { label: "Studio", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5+", value: "5" },
];

const NO_ROOMS_TYPES = new Set<string>(LISTING_TYPES_WITHOUT_ROOM_FILTERS);

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
    if (NO_ROOMS_TYPES.has(v)) setRooms("");
  };
  const [ville, setVille] = useState("");
  const [arrondissement, setArrondissement] = useState("");
  const [quartiers, setQuartiers] = useState<string[]>([]);
  const [quartierLibre, setQuartierLibre] = useState("");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [rooms, setRooms] = useState("");
  const [desktopLocationOpen, setDesktopLocationOpen] = useState(false);
  const [mobileLocationOpen, setMobileLocationOpen] = useState(false);
  const [desktopBudgetOpen, setDesktopBudgetOpen] = useState(false);
  const [mobileBudgetOpen, setMobileBudgetOpen] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState<"MGA" | "EUR">("MGA");

  const showRooms = !type || !NO_ROOMS_TYPES.has(type);

  const buildFilters = (): SearchFilters => {
    const roomNums =
      rooms !== "" && showRooms
        ? [parseInt(rooms, 10)].filter((n) => !Number.isNaN(n) && n >= 0 && n <= 99)
        : [];
    const allowed = new Set(listingTypesForTransaction(transaction));
    const types: string[] = type && allowed.has(type as ListingType) ? [type] : [];
    return {
      ...EMPTY_SEARCH_FILTERS,
      transaction: TRANSACTIONS.some((tr) => tr.value === transaction) ? transaction : "vente",
      types,
      ville,
      arrondissement,
      quartiers,
      quartierLibre,
      priceMin,
      priceMax,
      rooms: roomNums,
    };
  };

  const handleSearch = () => {
    navigate(searchPathFromFilters(buildFilters()));
  };

  const locationLabel = ville
    ? quartiers.length > 0
      ? `${ville} — ${quartiers.slice(0, 2).join(", ")}${quartiers.length > 2 ? "..." : ""}`
      : quartierLibre.trim()
        ? `${ville} — ${quartierLibre.trim()}`
        : arrondissement
          ? `${ville}, ${arrondissement}`
          : ville
    : quartierLibre.trim();

  const budgetLabel = formatBudgetLabel(priceMin, priceMax, budgetCurrency);
  const BudgetIcon = budgetCurrency === "EUR" ? Euro : Banknote;

  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div className="absolute inset-0 gradient-primary opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />

      <div className="relative container mx-auto px-4 text-center">
        <h1
          className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight"
          style={{ color: "#FAFAFA" }}
        >
          {t("hero.title")}
        </h1>
        <p
          className="text-lg md:text-xl mb-10 font-sans max-w-2xl mx-auto"
          style={{ color: "rgba(250,250,250,0.85)" }}
        >
          {t("hero.subtitle")}
        </p>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-1 mb-0">
            {TRANSACTIONS.map((tr) => (
              <button
                key={tr.value}
                type="button"
                onClick={() => handleTransactionChange(tr.value)}
                className={`px-6 py-2.5 rounded-t-xl font-sans font-semibold text-sm transition-all ${
                  transaction === tr.value
                    ? "gradient-primary text-white shadow-lg"
                    : "bg-white/20 text-white/80 hover:bg-white/30 backdrop-blur-sm"
                }`}
              >
                {t(tr.labelKey)}
              </button>
            ))}
          </div>

          <div className="bg-card rounded-b-2xl rounded-tr-2xl shadow-2xl p-3 md:p-4 -mb-12 relative z-10">
            <div className="hidden lg:flex items-center gap-0 bg-background rounded-xl border border-border">
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
                    selectedVille={ville}
                    selectedArr={arrondissement}
                    selectedQuartiers={quartiers}
                    quartierLibre={quartierLibre}
                    onVilleChange={setVille}
                    onArrChange={setArrondissement}
                    onQuartiersChange={setQuartiers}
                    onQuartierLibreChange={setQuartierLibre}
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

              {showRooms && (
                <div className="flex-shrink-0 w-32 border-r border-border px-3 py-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block text-left">
                    {t("hero.rooms")}
                  </label>
                  <Select value={rooms} onValueChange={setRooms}>
                    <SelectTrigger className="border-0 shadow-none p-0 h-7 font-sans text-sm focus:ring-0">
                      <SelectValue placeholder={t("hero.allRooms")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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

            <div className="lg:hidden space-y-3">
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger className="font-sans">
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
                  <Button type="button" variant="outline" className="w-full justify-start font-sans text-sm gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    {locationLabel || t("hero.location")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] max-w-md p-4" align="start">
                  <LocationSelector
                    selectedVille={ville}
                    selectedArr={arrondissement}
                    selectedQuartiers={quartiers}
                    quartierLibre={quartierLibre}
                    onVilleChange={setVille}
                    onArrChange={setArrondissement}
                    onQuartiersChange={setQuartiers}
                    onQuartierLibreChange={setQuartierLibre}
                    onClose={() => setMobileLocationOpen(false)}
                  />
                </PopoverContent>
              </Popover>

              <Popover open={mobileBudgetOpen} onOpenChange={setMobileBudgetOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start font-sans text-sm gap-2">
                    <BudgetIcon className="h-4 w-4 text-accent shrink-0" />
                    {budgetLabel || t("search.budget", "Budget")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] max-w-md p-4" align="start">
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

              {showRooms && (
                <Select value={rooms} onValueChange={setRooms}>
                  <SelectTrigger className="font-sans">
                    <SelectValue placeholder={t("hero.rooms")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                type="button"
                onClick={handleSearch}
                className="w-full gradient-primary border-0 font-semibold font-sans gap-2 h-12"
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
