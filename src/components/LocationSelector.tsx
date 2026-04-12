import { forwardRef, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { villes } from "@/data/madagascar-locations";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Search, X, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export type LocationSelection = {
  ville: string;
  quartiers: string[];
  quartierLibre: string;
};

type LocationSelectorBaseProps = {
  onClose?: () => void;
};

type LocationSelectorImmediateProps = LocationSelectorBaseProps & {
  mode?: "immediate";
  value: LocationSelection;
  onChange: (next: LocationSelection) => void;
};

type LocationSelectorApplyProps = LocationSelectorBaseProps & {
  mode: "apply";
  committed: LocationSelection;
  onCommit: (next: LocationSelection) => void;
};

export type LocationSelectorProps = LocationSelectorImmediateProps | LocationSelectorApplyProps;

function isApplyMode(p: LocationSelectorProps): p is LocationSelectorApplyProps {
  return p.mode === "apply";
}

const LocationSelector = forwardRef<HTMLDivElement, LocationSelectorProps>((props, ref) => {
  const { t } = useTranslation();
  const onClose = props.onClose;

  const committed: LocationSelection = isApplyMode(props)
    ? props.committed
    : props.value;

  const [draft, setDraft] = useState<LocationSelection>(committed);

  // Extraction des valeurs pour que React puisse analyser les dépendances correctement
  const isApply = isApplyMode(props);
  const committedVille = isApply ? props.committed.ville : "";
  const committedQuartiersKey = isApply ? props.committed.quartiers.join("\u0001") : "";
  const committedQuartierLibre = isApply ? props.committed.quartierLibre : "";

  useEffect(() => {
    if (isApply) {
      setDraft({
        ville: committedVille,
        quartiers: committedQuartiersKey ? committedQuartiersKey.split("\u0001") : [],
        quartierLibre: committedQuartierLibre,
      });
    }
  }, [isApply, committedVille, committedQuartiersKey, committedQuartierLibre]);

  const live = isApply ? draft : props.value;

  const setLive = (next: LocationSelection) => {
    if (isApply) {
      setDraft(next);
    } else if (!isApplyMode(props)) {
      props.onChange(next);
    }
  };

  const [search, setSearch] = useState("");
  const [expandedVilles, setExpandedVilles] = useState<string[]>(live.ville ? [live.ville] : []);
  const [expandedArrs, setExpandedArrs] = useState<string[]>([]);

  const toggleExpand = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const quartiersKey = live.quartiers.join("\u0001");

  useEffect(() => {
    if (!live.ville) return;
    const v = villes.find((x) => x.name === live.ville);
    if (!v) return;
    const needExpand: string[] = [];
    for (const arr of v.arrondissements) {
      for (const q of arr.quartiers) {
        if (live.quartiers.includes(q.name)) {
          needExpand.push(arr.name);
          break;
        }
      }
    }
    if (needExpand.length) {
      setExpandedArrs((prev) => [...new Set([...prev, ...needExpand])]);
    }
  }, [live.ville, live.quartiers, quartiersKey]);

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

  /** Quartier-first search hits: flat list with grouping label */
  const quartierSearchHits = useMemo(() => {
    if (!search.trim() || !live.ville) return null;
    const s = search.toLowerCase().trim();
    const v = villes.find((x) => x.name === live.ville);
    if (!v) return null;
    const hits: { arrName: string; qName: string }[] = [];
    for (const arr of v.arrondissements) {
      for (const q of arr.quartiers) {
        if (q.name.toLowerCase().includes(s) || arr.name.toLowerCase().includes(s)) {
          hits.push({ arrName: arr.name, qName: q.name });
        }
      }
    }
    return hits.length ? hits : null;
  }, [search, live.ville]);

  const handleSelectVille = (villeName: string) => {
    if (live.ville === villeName) {
      setLive({ ville: "", quartiers: [], quartierLibre: live.quartierLibre });
    } else {
      setLive({ ville: villeName, quartiers: [], quartierLibre: live.quartierLibre });
      if (!expandedVilles.includes(villeName)) {
        setExpandedVilles([...expandedVilles, villeName]);
      }
    }
    setSearch("");
  };

  const toggleArrExpand = (arrName: string) => {
    setExpandedArrs((prev) => (prev.includes(arrName) ? prev.filter((x) => x !== arrName) : [...prev, arrName]));
  };

  const toggleQuartier = (qName: string) => {
    const next = live.quartiers.includes(qName)
      ? live.quartiers.filter((q) => q !== qName)
      : [...live.quartiers, qName];
    setLive({ ...live, quartiers: next });
  };

  const chips: { label: string; kind: "ville" | "quartier" | "libre" }[] = [
    ...(live.ville ? [{ label: live.ville, kind: "ville" as const }] : []),
    ...live.quartiers.map((q) => ({ label: q, kind: "quartier" as const })),
    ...(live.quartierLibre.trim() ? [{ label: live.quartierLibre.trim(), kind: "libre" as const }] : []),
  ];

  const removeChip = (label: string, kind: typeof chips[number]["kind"]) => {
    if (kind === "ville") {
      setLive({ ville: "", quartiers: [], quartierLibre: live.quartierLibre });
    } else if (kind === "quartier") {
      setLive({ ...live, quartiers: live.quartiers.filter((q) => q !== label) });
    } else {
      setLive({ ...live, quartierLibre: "" });
    }
  };

  const handleApply = () => {
    if (isApplyMode(props)) {
      props.onCommit(draft);
      onClose?.();
    }
  };

  const handleResetDraft = () => {
    if (isApplyMode(props)) {
      setDraft({ ville: "", quartiers: [], quartierLibre: "" });
    }
  };

  return (
    <div ref={ref} className="w-full">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {chips.map((c) => (
            <Badge
              key={`${c.kind}-${c.label}`}
              variant="secondary"
              className="font-sans text-xs gap-1 cursor-pointer hover:bg-destructive/10"
              onClick={() => removeChip(c.label, c.kind)}
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
          placeholder={t("search.locationSearchPlaceholder", "Ville, quartier, zone…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 font-sans text-sm"
        />
      </div>

      {live.ville && quartierSearchHits && (
        <div className="mb-2 rounded-lg border border-border bg-muted/20 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-sans mb-1.5">
            {t("search.quartierQuickPick", "Quartiers correspondants")}
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {quartierSearchHits.map(({ arrName, qName }) => (
              <label
                key={`${arrName}-${qName}`}
                className="flex items-center gap-1.5 text-xs font-sans cursor-pointer rounded-md border border-border/60 px-2 py-1 hover:bg-muted"
              >
                <Checkbox
                  checked={live.quartiers.includes(qName)}
                  onCheckedChange={() => toggleQuartier(qName)}
                  className="h-3.5 w-3.5"
                />
                <span>{qName}</span>
                <span className="text-muted-foreground truncate max-w-[140px]">({arrName})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="max-h-64">
        <div className="space-y-0.5">
          {filteredVilles.map((ville) => {
            const isVilleExpanded = expandedVilles.includes(ville.name);
            const isVilleSelected = live.ville === ville.name;
            return (
              <div key={ville.name}>
                <button
                  type="button"
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
                    <p className="text-[10px] text-muted-foreground font-sans px-2 py-0.5">
                      {t("search.quartiersGroupedHint", "Cochez un ou plusieurs quartiers — tous conservés.")}
                    </p>
                    {ville.arrondissements.map((arr) => {
                      const isArrExpanded = expandedArrs.includes(arr.name);
                      const hasSelected = arr.quartiers.some((q) => live.quartiers.includes(q.name));
                      return (
                        <div key={arr.name}>
                          <button
                            type="button"
                            className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-sm font-sans hover:bg-muted transition-colors ${
                              hasSelected ? "text-primary font-medium" : "text-muted-foreground"
                            }`}
                            onClick={() => toggleArrExpand(arr.name)}
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
                                    checked={live.quartiers.includes(q.name)}
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
          {t("search.otherQuartierLabel", "Autre zone (hors liste)")}
        </label>
        <Input
          value={live.quartierLibre}
          onChange={(e) => setLive({ ...live, quartierLibre: e.target.value })}
          placeholder={t("search.otherQuartierPlaceholder", "Ex. : lotissement, zone industrielle…")}
          className="font-sans text-sm"
        />
      </div>

      {isApplyMode(props) && (
        <div className="flex flex-wrap gap-2 mt-4">
          <Button type="button" className="font-sans flex-1 min-w-[120px]" onClick={handleApply}>
            {t("search.applyLocation", "Appliquer")}
          </Button>
          <Button type="button" variant="outline" className="font-sans" onClick={handleResetDraft}>
            {t("search.resetLocationDraft", "Réinitialiser")}
          </Button>
        </div>
      )}
    </div>
  );
});

LocationSelector.displayName = "LocationSelector";

export default LocationSelector;
