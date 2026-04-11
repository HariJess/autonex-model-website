import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import LocationPicker from "@/components/LocationPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { seedListings, seedAgencies } from "@/data/seed-listings";
import { useState, useMemo } from "react";

const SearchPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState("recent");
  const [filterType, setFilterType] = useState(searchParams.get("type") || "");
  const [filterTransaction, setFilterTransaction] = useState(searchParams.get("transaction") || "");
  const [filterVille, setFilterVille] = useState(searchParams.get("ville") || "");
  const [filterArr, setFilterArr] = useState("");
  const [filterQuartier, setFilterQuartier] = useState("");
  const [filterQuartierLibre, setFilterQuartierLibre] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState(searchParams.get("prixMin") || "");
  const [filterPriceMax, setFilterPriceMax] = useState(searchParams.get("prixMax") || "");

  const filtered = useMemo(() => {
    let results = [...seedListings];
    if (filterType) results = results.filter((l) => l.type === filterType);
    if (filterTransaction) results = results.filter((l) => l.transaction === filterTransaction);
    if (filterVille) results = results.filter((l) => l.city === filterVille || l.region.toLowerCase().includes(filterVille.toLowerCase()));
    if (filterQuartier) results = results.filter((l) => l.city === filterVille); // quartier filtering for seed data
    if (filterPriceMin) results = results.filter((l) => l.price_mga >= Number(filterPriceMin));
    if (filterPriceMax) results = results.filter((l) => l.price_mga <= Number(filterPriceMax));

    results.sort((a, b) => {
      if (a.badge === "boost" && b.badge !== "boost") return -1;
      if (b.badge === "boost" && a.badge !== "boost") return 1;
      if (sort === "priceAsc") return a.price_mga - b.price_mga;
      if (sort === "priceDesc") return b.price_mga - a.price_mga;
      return 0;
    });
    return results;
  }, [filterType, filterTransaction, filterVille, filterQuartier, filterPriceMin, filterPriceMax, sort]);

  const getAgency = (id: string) => seedAgencies.find((a) => a.id === id);

  const resetFilters = () => {
    setFilterType("");
    setFilterTransaction("");
    setFilterVille("");
    setFilterArr("");
    setFilterQuartier("");
    setFilterQuartierLibre("");
    setFilterPriceMin("");
    setFilterPriceMax("");
  };

  return (
    <>
      <Helmet><title>Recherche — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className={`lg:w-72 flex-shrink-0 space-y-6 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div className="flex items-center justify-between lg:hidden">
              <h3 className="font-serif font-bold text-lg">{t("search.filters")}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}><X className="h-5 w-5" /></Button>
            </div>

            <div className="space-y-4 bg-card rounded-2xl border border-border p-5">
              <h3 className="font-serif font-semibold">{t("search.transaction")}</h3>
              <Select value={filterTransaction} onValueChange={setFilterTransaction}>
                <SelectTrigger className="font-sans"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vente">{t("search.sale")}</SelectItem>
                  <SelectItem value="location">{t("search.rental")}</SelectItem>
                  <SelectItem value="location_vacances">{t("search.vacationRental")}</SelectItem>
                </SelectContent>
              </Select>

              <h3 className="font-serif font-semibold">{t("search.propertyType")}</h3>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="font-sans"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="appartement">{t("search.apartment")}</SelectItem>
                  <SelectItem value="villa">Villa / Maison</SelectItem>
                  <SelectItem value="terrain">{t("search.land")}</SelectItem>
                  <SelectItem value="commercial">{t("search.commercial")}</SelectItem>
                  <SelectItem value="bureau">{t("search.office")}</SelectItem>
                </SelectContent>
              </Select>

              <h3 className="font-serif font-semibold">Localisation</h3>
              <LocationPicker
                ville={filterVille}
                arrondissement={filterArr}
                quartier={filterQuartier}
                quartierLibre={filterQuartierLibre}
                onVilleChange={setFilterVille}
                onArrondissementChange={setFilterArr}
                onQuartierChange={setFilterQuartier}
                onQuartierLibreChange={setFilterQuartierLibre}
                compact
              />

              <h3 className="font-serif font-semibold">Prix (Ar)</h3>
              <div className="flex gap-2">
                <Input placeholder="Min" type="number" value={filterPriceMin} onChange={(e) => setFilterPriceMin(e.target.value)} className="font-sans" />
                <Input placeholder="Max" type="number" value={filterPriceMax} onChange={(e) => setFilterPriceMax(e.target.value)} className="font-sans" />
              </div>

              <Button variant="outline" className="w-full font-sans text-sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
            </div>
          </aside>

          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setShowFilters(true)}>
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
                <p className="font-sans text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filtered.length}</span> {t("search.results")}
                </p>
              </div>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-48 font-sans"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">{t("search.recent")}</SelectItem>
                  <SelectItem value="priceAsc">{t("search.priceAsc")}</SelectItem>
                  <SelectItem value="priceDesc">{t("search.priceDesc")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((listing) => {
                const agency = getAgency(listing.agency_id);
                return <ListingCard key={listing.id} listing={listing} agencyName={agency?.name} agencyLogo={agency?.logo} />;
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <p className="font-serif text-xl text-muted-foreground">Aucun résultat trouvé</p>
                <p className="font-sans text-sm text-muted-foreground mt-2">Essayez de modifier vos filtres</p>
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
