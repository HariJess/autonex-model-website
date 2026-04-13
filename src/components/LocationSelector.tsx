import { forwardRef, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { villes } from "@/data/madagascar-locations";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Search, X, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type LocationSelection = {
  ville: string;
  /** Whole arrondissement(s) — OR with quartiers */
  arrondissements: string[];
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

function findArrForQuartier(villeName: string, quartierName: string) {
  const v = villes.find((x) => x.name === villeName);
  if (!v) return undefined;
  return v.arrondissements.find((a) => a.quartiers.some((q) => q.name === quartierName));
}

const LocationSelector = forwardRef<HTMLDivElement, LocationSelectorProps>((props, ref) => {
  const { t } = useTranslation();
  const onClose = props.onClose;

  const committed: LocationSelection = isApplyMode(props)
    ? props.committed
    : props.value;

  const [draft, setDraft] = useState<LocationSelection>(committed);

  const isApply = isApplyMode(props);
  const committedKey = `${committed.ville}\u0001${committed.arrondissements.join("\u0002")}\u0001${committed.quartiers.join("\u0002")}\u0001${committed.quartierLibre}`;

  useEffect(() => {
    if (isApply) {
      setDraft({
        ville: committed.ville,
        arrondissements: [...committed.arrondissements],
        quartiers: [...committed.quartiers],
        quartierLibre: committed.quartierLibre,
      });
    }
  }, [isApply, committedKey]);

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
      if (live.arrondissements.includes(arr.name)) {
        needExpand.push(arr.name);
        continue;
      }
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
  }, [live.ville, live.quartiers, live.arrondissements, quartiersKey]);

  const filteredVilles = useMemo(() => {
    if (!search) return villes;
    const s = search.toLowerCase();
    return villes.filter(
      (v) =>
        v.name.toLowerCase().includes(s) ||
        v.arrondissements.some(
          (a) =>
            a.name.toLowerCase().includes(s) ||
            a.quartiers.some((q) => q.name.toLowerCase().includes(s)),
        ),
    );
  }, [search]);

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
      setLive({
        ville: "",
        arrondissements: [],
        quartiers: [],
        quartierLibre: live.quartierLibre,
      });
    } else {
      setLive({
        ville: villeName,
        arrondissements: [],
        quartiers: [],
        quartierLibre: live.quartierLibre,
      });
      if (!expandedVilles.includes(villeName)) {
        setExpandedVilles([...expandedVilles, villeName]);
      }
    }
    setSearch("");
  };

  const toggleArrExpand = (arrName: string) => {
    setExpandedArrs((prev) => (prev.includes(arrName) ? prev.filter((x) => x !== arrName) : [...prev, arrName]));
  };

  const toggleWholeArrondissement = (arrName: string, villeName: string) => {
    const v = villes.find((x) => x.name === villeName);
    const arr = v?.arrondissements.find((a) => a.name === arrName);
    if (!arr) return;

    const isOn = live.arrondissements.includes(arrName);
    if (isOn) {
      setLive({
        ...live,
        arrondissements: live.arrondissements.filter((a) => a !== arrName),
      });
      return;
    }
    const qNames = new Set(arr.quartiers.map((q) => q.name));
    setLive({
      ...live,
      arrondissements: [...live.arrondissements, arrName],
      quartiers: live.quartiers.filter((q) => !qNames.has(q)),
    });
  };

  const toggleQuartier = (qName: string, villeName: string) => {
    const arr = findArrForQuartier(villeName, qName);
    const arrName = arr?.name;
    const isOn = live.quartiers.includes(qName);
    if (isOn) {
      setLive({
        ...live,
        quartiers: live.quartiers.filter((q) => q !== qName),
      });
      return;
    }
    let nextArr = live.arrondissements;
    if (arrName && live.arrondissements.includes(arrName)) {
      nextArr = live.arrondissements.filter((a) => a !== arrName);
    }
    setLive({
      ...live,
      arrondissements: nextArr,
      quartiers: [...live.quartiers, qName],
    });
  };

  const chips: { label: string; kind: "ville" | "arr" | "quartier" | "libre" }[] = [
    ...(live.ville ? [{ label: live.ville, kind: "ville" as const }] : []),
    ...live.arrondissements.map((a) => ({ label: a, kind: "arr" as const })),
    ...live.quartiers.map((q) => ({ label: q, kind: "quartier" as const })),
    ...(live.quartierLibre.trim() ? [{ label: live.quartierLibre.trim(), kind: "libre" as const }] : []),
  ];

  const removeChip = (label: string, kind: typeof chips[number]["kind"]) => {
    if (kind === "ville") {
      setLive({ ville: "", arrondissements: [], quartiers: [], quartierLibre: live.quartierLibre });
    } else if (kind === "arr") {
      setLive({
        ...live,
        arrondissements: live.arrondissements.filter((a) => a !== label),
      });
    } else if (kind === "quartier") {
      setLive({ ...live, quartiers: live.quartiers.filter((q) => q !== label) });
    } else {
      setLive({ ...live, quartierLibre: "" });
    }
  };

  const handleApply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isApplyMode(props)) {
      props.onCommit(draft);
      toast({
        title: t("search.locationAppliedTitle", "Localisation appliquée"),
        description: t(
          "search.locationAppliedBody",
          "Les filtres de lieu ont été mis à jour. Les résultats se rechargent.",
        ),
      });
      onClose?.();
    }
  };

  const handleResetDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isApplyMode(props)) {
      setDraft({ ville: "", arrondissements: [], quartiers: [], quartierLibre: "" });
    }
  };

  return (
    <div ref={ref} className="w-full flex flex-col min-h-0">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
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

      <div className="relative mb-3 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t("search.locationSearchPlaceholder", "Ville, quartier, zone…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 font-sans text-sm"
        />
      </div>

      {live.ville && quartierSearchHits && (
        <div className="mb-2 rounded-lg border border-border bg-muted/20 px-2 py-2 shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-sans mb-1.5">
            {t("search.quartierQuickPick", "Quartiers correspondants")}
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto overscroll-contain touch-pan-y">
            {quartierSearchHits.map(({ arrName, qName }) => (
              <label
                key={`${arrName}-${qName}`}
                className="flex items-center gap-1.5 text-xs font-sans cursor-pointer rounded-md border border-border/60 px-2 py-1 hover:bg-muted"
              >
                <Checkbox
                  checked={live.quartiers.includes(qName)}
                  onCheckedChange={() => toggleQuartier(qName, live.ville)}
                  className="h-3.5 w-3.5"
                />
                <span>{qName}</span>
                <span className="text-muted-foreground truncate max-w-[140px]">({arrName})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div
        className="max-h-64 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pr-1 -mr-1 [scrollbar-gutter:stable]"
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5 pb-1">
          {filteredVilles.map((ville) => {
            const isVilleExpanded = expandedVilles.includes(ville.name);
            const isVilleSelected = live.ville === ville.name;
            const wholeCityActive =
              isVilleSelected && live.arrondissements.length === 0 && live.quartiers.length === 0;
            return (
              <div key={ville.name}>
                <div className="flex items-stretch gap-1">
                  <button
                    type="button"
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-sans hover:bg-muted transition-colors text-left ${
                      wholeCityActive ? "bg-primary/10 text-primary font-medium" : ""
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
                </div>
                {isVilleExpanded && live.ville === ville.name && (
                  <p className="text-[10px] text-muted-foreground font-sans px-2 py-1">
                    {t(
                      "search.locationHierarchyHint",
                      "Toute la ville si rien n’est coché en dessous. Cochez un arrondissement entier ou des quartiers précis — cumul possible.",
                    )}
                  </p>
                )}

                {isVilleExpanded && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {ville.arrondissements.map((arr) => {
                      const isArrExpanded = expandedArrs.includes(arr.name);
                      const wholeArr = live.arrondissements.includes(arr.name);
                      const hasQuartierPick = arr.quartiers.some((q) => live.quartiers.includes(q.name));
                      return (
                        <div key={arr.name}>
                          <div
                            className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-sm font-sans hover:bg-muted transition-colors ${
                              wholeArr || hasQuartierPick ? "text-primary font-medium" : "text-muted-foreground"
                            }`}
                          >
                            <button
                              type="button"
                              className="p-0.5 shrink-0 rounded hover:bg-muted-foreground/10"
                              onClick={() => toggleArrExpand(arr.name)}
                              aria-expanded={isArrExpanded}
                            >
                              {isArrExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                            <Checkbox
                              checked={wholeArr}
                              onCheckedChange={() => {
                                if (!live.ville) return;
                                toggleWholeArrondissement(arr.name, ville.name);
                              }}
                              className="h-3.5 w-3.5 shrink-0"
                              disabled={!live.ville || live.ville !== ville.name}
                            />
                            <button
                              type="button"
                              className="flex-1 text-left text-xs py-0.5"
                              onClick={() => toggleArrExpand(arr.name)}
                            >
                              {arr.name}
                            </button>
                            <span className="text-[10px] text-muted-foreground font-sans shrink-0">
                              {t("search.wholeArrondissementShort", "Tout")}
                            </span>
                          </div>

                          {isArrExpanded && (
                            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border/60 pl-2">
                              {arr.quartiers.map((q) => (
                                <label
                                  key={q.name}
                                  className="flex items-center gap-2 px-2 py-0.5 rounded text-xs font-sans hover:bg-muted cursor-pointer"
                                >
                                  <Checkbox
                                    checked={live.quartiers.includes(q.name)}
                                    onCheckedChange={() => {
                                      if (!live.ville) return;
                                      toggleQuartier(q.name, ville.name);
                                    }}
                                    disabled={!live.ville || live.ville !== ville.name}
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
      </div>

      <div className="mt-3 pt-3 border-t border-border shrink-0">
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
        <div className="flex flex-wrap gap-2 mt-4 shrink-0">
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
