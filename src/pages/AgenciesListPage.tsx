import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { PARTNER_DEALERS } from "@/data/agencies";
import { useAgenciesList } from "@/hooks/useAgenciesList";

const CITIES = [
  "Antananarivo",
  "Toamasina",
  "Antsirabe",
  "Mahajanga",
  "Fianarantsoa",
  "Toliara",
];

interface AgenciesListPageProps {
  heading?: string;
}

const AgenciesListPage = ({ heading }: AgenciesListPageProps = {}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filters = useMemo(
    () => ({
      search: search.trim(),
      city: city === "all" ? null : city,
      verifiedOnly,
    }),
    [search, city, verifiedOnly],
  );

  const { data: agencies = [], isLoading, error } = useAgenciesList(filters);

  const canonical =
    typeof window !== "undefined"
      ? `${window.location.origin}/agences`
      : "https://autonex.mg/agences";

  const title = heading ?? "Concessionnaires AutoNex";

  return (
    <>
      {!heading ? (
        <Helmet>
          <title>{t("agencies.title")} — AutoNex</title>
          <meta
            name="description"
            content="Annuaire des concessionnaires à Madagascar : comparez les professionnels, consultez leurs annonces et contactez-les directement."
          />
          <link rel="canonical" href={canonical} />
        </Helmet>
      ) : null}
      <Header />
      <div className="container mx-auto py-6 md:py-8">
        <h1 className="font-serif text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm md:text-base text-muted-foreground font-sans mb-6">
          Retrouvez nos partenaires officiels et les concessionnaires présents sur la plateforme.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end mb-8">
          <div className="flex-1 min-w-[200px] max-w-md">
            <Label htmlFor="ag-search" className="font-sans text-xs">Rechercher</Label>
            <Input
              id="ag-search"
              placeholder="Nom de l'agence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="font-sans"
            />
          </div>
          <div className="w-48">
            <Label className="font-sans text-xs">Ville</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="font-sans">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="ag-verified"
              checked={verifiedOnly}
              onCheckedChange={(v) => setVerifiedOnly(v === true)}
            />
            <Label htmlFor="ag-verified" className="font-sans text-sm font-normal">
              Partenaires vérifiés uniquement
            </Label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive mb-4">
            <AlertCircle className="h-5 w-5" />
            <p className="font-sans text-sm">{(error as Error).message}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {PARTNER_DEALERS.length > 0 && !search && !verifiedOnly && city === "all" ? (
              <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h2 className="font-serif text-xl font-bold">Partenaires officiels AutoNex</h2>
                  <Badge variant="secondary" className="font-sans text-xs">Partenaire AutoNex</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-sans mb-4">
                  Des concessionnaires sélectionnés et mis en avant par AutoNex.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {PARTNER_DEALERS.map((dealer) => (
                    <Link
                      key={dealer.id}
                      to={`/concessionnaires/${dealer.slug}`}
                      className="rounded-2xl border border-border/80 bg-secondary/15 p-5 hover:border-primary/35 hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl border border-border/80 bg-card p-2.5 flex items-center justify-center shadow-sm">
                          <img src={dealer.logoPath} alt={dealer.name} className="h-full w-full object-contain object-center" loading="lazy" decoding="async" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-lg font-bold group-hover:text-primary transition-colors">{dealer.name}</h3>
                            <Badge className="bg-success text-xs font-sans" style={{ color: "#FAFAFA" }}>Partenaire</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-sans">{dealer.city}, {dealer.area}</p>
                          <p className="text-xs text-muted-foreground font-sans mt-1">{dealer.brands.slice(0, 3).join(" • ")}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm font-sans text-primary">Voir le stock</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="font-serif text-xl font-bold mb-1">Annuaire des concessionnaires</h2>
              <p className="text-sm text-muted-foreground font-sans mb-4">
                {agencies.length} concessionnaire{agencies.length > 1 ? "s" : ""} trouvé{agencies.length > 1 ? "s" : ""}.
              </p>
              {agencies.length === 0 ? (
                <p className="text-center text-muted-foreground font-sans py-8">
                  {t("agencies.noDirectoryAgencies", "Aucun concessionnaire ne correspond aux critères.")}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {agencies.map((agency) => (
                    <Link
                      key={agency.id}
                      to={`/concessionnaires/${agency.slug}`}
                      className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all flex items-start gap-4 group"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-border flex-shrink-0 bg-muted flex items-center justify-center">
                        {agency.logo_url ? (
                          <img
                            src={agency.logo_url}
                            alt={agency.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="font-serif text-xl font-bold text-muted-foreground">{agency.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-serif font-bold group-hover:text-primary transition-colors">{agency.name}</h3>
                          {agency.verified && (
                            <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs font-sans font-medium text-amber-800">
                              <ShieldCheck className="h-3 w-3" /> Partenaire
                            </span>
                          )}
                        </div>
                        {agency.city ? (
                          <p className="text-xs text-muted-foreground font-sans mb-1">📍 {agency.city}</p>
                        ) : null}
                        <p className="text-sm text-muted-foreground font-sans line-clamp-2">
                          {agency.bio || t("agencies.noDescription")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default AgenciesListPage;
