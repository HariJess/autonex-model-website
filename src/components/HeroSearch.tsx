import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, MapPin, Home, DollarSign, BedDouble } from "lucide-react";
import { villes } from "@/data/madagascar-locations";
import { useState } from "react";
import LocationSelector from "@/components/LocationSelector";
import BudgetRangeSlider, { formatBudgetLabel } from "@/components/BudgetRangeSlider";

const TRANSACTIONS = [
  { value: "vente", label: "Acheter" },
  { value: "location", label: "Louer" },
  { value: "location_vacances", label: "Location vacances" },
];

const ROOM_OPTIONS = [
  { label: "Studio", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5+", value: "5" },
];

const HeroSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState("vente");
  const [type, setType] = useState("");
  const [ville, setVille] = useState("");
  const [arrondissement, setArrondissement] = useState("");
  const [quartiers, setQuartiers] = useState<string[]>([]);
  const [quartierLibre, setQuartierLibre] = useState("");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [rooms, setRooms] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (transaction) params.set("transaction", transaction);
    if (type) params.set("type", type);
    if (ville) params.set("ville", ville);
    if (arrondissement) params.set("arr", arrondissement);
    if (quartiers.length) params.set("quartiers", quartiers.join(","));
    if (priceMin) params.set("prix_min", String(priceMin));
    if (priceMax) params.set("prix_max", String(priceMax));
    if (rooms) params.set("chambres", rooms);
    navigate(`/recherche?${params.toString()}`);
  };

  const locationLabel = ville
    ? quartiers.length > 0
      ? `${ville} — ${quartiers.slice(0, 2).join(", ")}${quartiers.length > 2 ? "..." : ""}`
      : arrondissement
      ? `${ville}, ${arrondissement}`
      : ville
    : "";

  const budgetLabel =
    priceMin || priceMax
      ? `${priceMin ? (priceMin / 1_000_000).toFixed(0) + "M" : "0"} - ${priceMax ? (priceMax / 1_000_000).toFixed(0) + "M" : "∞"} Ar`
      : "";

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

        {/* Transaction Tabs */}
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-1 mb-0">
            {TRANSACTIONS.map((tr) => (
              <button
                key={tr.value}
                onClick={() => setTransaction(tr.value)}
                className={`px-6 py-2.5 rounded-t-xl font-sans font-semibold text-sm transition-all ${
                  transaction === tr.value
                    ? "gradient-primary text-white shadow-lg"
                    : "bg-white/20 text-white/80 hover:bg-white/30 backdrop-blur-sm"
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="bg-card rounded-b-2xl rounded-tr-2xl shadow-2xl p-3 md:p-4 -mb-12 relative z-10">
            {/* Desktop: horizontal */}
            <div className="hidden lg:flex items-center gap-0 bg-background rounded-xl border border-border">
              {/* Type */}
              <div className="flex-1 border-r border-border px-3 py-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block text-left">
                  Type de bien
                </label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="border-0 shadow-none p-0 h-7 font-sans text-sm focus:ring-0">
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appartement">Appartement</SelectItem>
                    <SelectItem value="villa">Villa / Maison</SelectItem>
                    <SelectItem value="terrain">Terrain</SelectItem>
                    <SelectItem value="commercial">Local commercial</SelectItem>
                    <SelectItem value="bureau">Bureau</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                <PopoverTrigger asChild>
                  <button className="flex-1 border-r border-border px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block">
                      Localisation
                    </label>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className={`font-sans text-sm truncate ${locationLabel ? "text-foreground" : "text-muted-foreground"}`}>
                        {locationLabel || "Ville, quartier..."}
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
                    onClose={() => setLocationOpen(false)}
                  />
                </PopoverContent>
              </Popover>

              {/* Budget */}
              <Popover open={budgetOpen} onOpenChange={setBudgetOpen}>
                <PopoverTrigger asChild>
                  <button className="flex-1 border-r border-border px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block">
                      Budget
                    </label>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className={`font-sans text-sm truncate ${budgetLabel ? "text-foreground" : "text-muted-foreground"}`}>
                        {budgetLabel || "Min - Max"}
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
                  />
                </PopoverContent>
              </Popover>

              {/* Rooms */}
              <div className="flex-shrink-0 w-32 border-r border-border px-3 py-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans font-medium mb-0.5 block text-left">
                  Chambres
                </label>
                <Select value={rooms} onValueChange={setRooms}>
                  <SelectTrigger className="border-0 shadow-none p-0 h-7 font-sans text-sm focus:ring-0">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button */}
              <div className="px-2">
                <Button
                  onClick={handleSearch}
                  className="gradient-primary border-0 font-semibold font-sans gap-2 h-12 px-6 rounded-xl"
                  style={{ color: "#FAFAFA" }}
                >
                  <Search className="h-5 w-5" />
                  {t("hero.search")}
                </Button>
              </div>
            </div>

            {/* Mobile: vertical */}
            <div className="lg:hidden space-y-3">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="font-sans">
                  <SelectValue placeholder="Type de bien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appartement">Appartement</SelectItem>
                  <SelectItem value="villa">Villa / Maison</SelectItem>
                  <SelectItem value="terrain">Terrain</SelectItem>
                  <SelectItem value="commercial">Local commercial</SelectItem>
                  <SelectItem value="bureau">Bureau</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-sans text-sm gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    {locationLabel || "Localisation"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] p-4" align="start">
                  <LocationSelector
                    selectedVille={ville}
                    selectedArr={arrondissement}
                    selectedQuartiers={quartiers}
                    quartierLibre={quartierLibre}
                    onVilleChange={setVille}
                    onArrChange={setArrondissement}
                    onQuartiersChange={setQuartiers}
                    onQuartierLibreChange={setQuartierLibre}
                  />
                </PopoverContent>
              </Popover>

              <div className="flex gap-2">
                <Input
                  placeholder="Budget min"
                  type="number"
                  value={priceMin || ""}
                  onChange={(e) => setPriceMin(Number(e.target.value))}
                  className="font-sans"
                />
                <Input
                  placeholder="Budget max"
                  type="number"
                  value={priceMax || ""}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="font-sans"
                />
              </div>

              <Button
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
