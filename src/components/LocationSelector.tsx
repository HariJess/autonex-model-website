import { useState, useMemo } from "react";
import { villes } from "@/data/madagascar-locations";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Search, X, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LocationSelectorProps {
  selectedVille: string;
  selectedArr: string;
  selectedQuartiers: string[];
  quartierLibre: string;
  onVilleChange: (v: string) => void;
  onArrChange: (a: string) => void;
  onQuartiersChange: (q: string[]) => void;
  onQuartierLibreChange: (q: string) => void;
  onClose?: () => void;
}

const LocationSelector = ({
  selectedVille,
  selectedArr,
  selectedQuartiers,
  quartierLibre,
  onVilleChange,
  onArrChange,
  onQuartiersChange,
  onQuartierLibreChange,
  onClose,
}: LocationSelectorProps) => {
  const [search, setSearch] = useState("");
  const [expandedVilles, setExpandedVilles] = useState<string[]>(selectedVille ? [selectedVille] : []);
  const [expandedArrs, setExpandedArrs] = useState<string[]>(selectedArr ? [selectedArr] : []);

  const toggleExpand = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const filteredVilles = useMemo(() => {
    if (!search) return villes;
    const s = search.toLowerCase();
    return villes.filter(
      (v) =>
        v.name.toLowerCase().includes(s) ||
        v.arrondissements.some(
          (a) =>
            a.name.toLowerCase().includes(s) ||
            a.quartiers.some((q) => q.name.toLowerCase().includes(s))
        )
    );
  }, [search]);

  const handleSelectVille = (villeName: string) => {
    if (selectedVille === villeName) {
      onVilleChange("");
      onArrChange("");
      onQuartiersChange([]);
    } else {
      onVilleChange(villeName);
      onArrChange("");
      onQuartiersChange([]);
      if (!expandedVilles.includes(villeName)) {
        setExpandedVilles([...expandedVilles, villeName]);
      }
    }
  };

  const handleSelectArr = (arrName: string) => {
    if (selectedArr === arrName) {
      onArrChange("");
      onQuartiersChange([]);
    } else {
      onArrChange(arrName);
      onQuartiersChange([]);
      if (!expandedArrs.includes(arrName)) {
        setExpandedArrs([...expandedArrs, arrName]);
      }
    }
  };

  const toggleQuartier = (qName: string) => {
    onQuartiersChange(
      selectedQuartiers.includes(qName)
        ? selectedQuartiers.filter((q) => q !== qName)
        : [...selectedQuartiers, qName]
    );
  };

  const chips = [
    ...(selectedVille ? [{ label: selectedVille, type: "ville" as const }] : []),
    ...(selectedArr ? [{ label: selectedArr, type: "arr" as const }] : []),
    ...selectedQuartiers.map((q) => ({ label: q, type: "quartier" as const })),
  ];

  const removeChip = (chip: { label: string; type: string }) => {
    if (chip.type === "ville") {
      onVilleChange("");
      onArrChange("");
      onQuartiersChange([]);
    } else if (chip.type === "arr") {
      onArrChange("");
      onQuartiersChange([]);
    } else {
      onQuartiersChange(selectedQuartiers.filter((q) => q !== chip.label));
    }
  };

  return (
    <div className="w-full">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {chips.map((c) => (
            <Badge
              key={c.label}
              variant="secondary"
              className="font-sans text-xs gap-1 cursor-pointer hover:bg-destructive/10"
              onClick={() => removeChip(c)}
            >
              {c.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une ville, un quartier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 font-sans text-sm"
        />
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-0.5">
          {filteredVilles.map((ville) => {
            const isVilleExpanded = expandedVilles.includes(ville.name);
            const isVilleSelected = selectedVille === ville.name;
            return (
              <div key={ville.name}>
                <button
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-sans hover:bg-muted transition-colors ${
                    isVilleSelected ? "bg-primary/10 text-primary font-medium" : ""
                  }`}
                  onClick={() => {
                    handleSelectVille(ville.name);
                    toggleExpand(expandedVilles, ville.name, setExpandedVilles);
                  }}
                >
                  {isVilleExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>{ville.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{ville.region}</span>
                </button>

                {isVilleExpanded && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {ville.arrondissements.map((arr) => {
                      const isArrExpanded = expandedArrs.includes(arr.name);
                      const isArrSelected = selectedArr === arr.name;
                      return (
                        <div key={arr.name}>
                          <button
                            className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-sm font-sans hover:bg-muted transition-colors ${
                              isArrSelected ? "bg-primary/5 text-primary font-medium" : "text-muted-foreground"
                            }`}
                            onClick={() => {
                              handleSelectArr(arr.name);
                              toggleExpand(expandedArrs, arr.name, setExpandedArrs);
                            }}
                          >
                            {isArrExpanded ? (
                              <ChevronDown className="h-3 w-3 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3 w-3 shrink-0" />
                            )}
                            <span className="text-xs">{arr.name}</span>
                          </button>

                          {isArrExpanded && (
                            <div className="ml-5 mt-0.5 space-y-0.5">
                              {arr.quartiers.map((q) => (
                                <label
                                  key={q.name}
                                  className="flex items-center gap-2 px-2 py-0.5 rounded text-xs font-sans hover:bg-muted cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selectedQuartiers.includes(q.name)}
                                    onCheckedChange={() => toggleQuartier(q.name)}
                                    className="h-3.5 w-3.5"
                                  />
                                  {q.name}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="mt-3 pt-3 border-t border-border">
        <label className="text-xs text-muted-foreground font-sans mb-1 block">
          Autre quartier (si absent de la liste)
        </label>
        <Input
          value={quartierLibre}
          onChange={(e) => onQuartierLibreChange(e.target.value)}
          placeholder="Ex: Galaxy Andraharo..."
          className="font-sans text-sm"
        />
      </div>
    </div>
  );
};

export default LocationSelector;
