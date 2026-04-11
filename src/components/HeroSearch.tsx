import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { regionNames } from "@/data/madagascar-regions";
import { useState } from "react";

const HeroSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [type, setType] = useState("");
  const [region, setRegion] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (region) params.set("region", region);
    if (budgetMin) params.set("prixMin", budgetMin);
    if (budgetMax) params.set("prixMax", budgetMax);
    navigate(`/recherche?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Gradient background */}
      <div className="absolute inset-0 gradient-primary opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />

      <div className="relative container mx-auto px-4 text-center">
        <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight" style={{ color: '#FAFAFA' }}>
          {t("hero.title")}
        </h1>
        <p className="text-lg md:text-xl mb-10 font-sans max-w-2xl mx-auto" style={{ color: 'rgba(250,250,250,0.85)' }}>
          {t("hero.subtitle")}
        </p>

        {/* Search bar */}
        <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select onValueChange={setType}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder={t("hero.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appartement">Appartement</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="terrain">Terrain</SelectItem>
                <SelectItem value="commercial">Local commercial</SelectItem>
                <SelectItem value="bureau">Bureau</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={setRegion}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder={t("hero.region")} />
              </SelectTrigger>
              <SelectContent>
                {regionNames.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder={t("hero.budgetMin")}
              type="number"
              value={budgetMin}
              onChange={e => setBudgetMin(e.target.value)}
              className="font-sans"
            />
            <Input
              placeholder={t("hero.budgetMax")}
              type="number"
              value={budgetMax}
              onChange={e => setBudgetMax(e.target.value)}
              className="font-sans"
            />

            <Button onClick={handleSearch} className="gradient-primary border-0 font-semibold gap-2" style={{ color: '#FAFAFA' }}>
              <Search className="h-4 w-4" />
              {t("hero.search")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
