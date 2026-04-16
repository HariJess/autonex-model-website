import { forwardRef, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { villes } from "@/data/madagascar-locations";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Search, X, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type LocationSelection = {
  ville: string;
  /** Whole arrondissement(s) — OR with quartiers */
  arrondissements: string[];
  quartiers: string[];
  quartierLibre: string;
};

type LocationSelectorBaseProps = {
  onClose?: () => void;
  /** Larger touch targets & quartier-first layout (e.g. mobile filter sheet) */
  variant?: "default" | "sheet";
  /** When true, do not show Appliquer / Réinitialiser (use parent sheet actions) */
  hideApplyRow?: boolean;
  /** Skip toast when applying (embedded draft flows) */
  suppressApplyToast?: boolean;
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
  const variant = props.variant ?? "default";
  const hideApplyRow = props.hideApplyRow ?? false;
  const suppressApplyToast = props.suppressApplyToast ?? false;
  const isSheet = variant === "sheet";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- committedKey sérialise déjà tous les champs de committed
  }, [isApply, committedKey]);

  const live = isApply ? draft : props.value;

  const setLive = (next: LocationSelection) => {
    if (isApply) {
      setDraft(next);
      /** Parent sheet holds a single draft; sync location immediately (local Apply row hidden). */
      if (hideApplyRow && isApplyMode(props)) {
        props.onCommit(next);
      }
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
      if (!suppressApplyToast) {
        toast({
          title: t("search.locationAppliedTitle", "Localisation appliquée"),
          description: t(
            "search.locationAppliedBody",
            "Les filtres de lieu ont été mis à jour. Les résultats se rechargent.",
          ),
        });
      }
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

  const listScrollClass = isSheet
    ? "min-h-[180px] max-h-[min(52vh,440px)] sm:max-h-80"
    : "max-h-64";

  return (
    <div ref={ref} className="w-full flex flex-col min-h-0">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {chips.map((c) => (
            <Badge
              key={`${c.kind}-${c.label}`}
              variant="secondary"
              className={cn(
                "font-sans gap-1.5 cursor-pointer hover:bg-destructive/10 touch-manipulation",
                isSheet ? "text-sm py-1.5 px-2.5 min-h-9" : "text-xs",
              )}
              onClick={() => removeChip(c.label, c.kind)}
            >
              {c.label}
              <X className={isSheet ? "h-3.5 w-3.5" : "h-3 w-3"} />
            </Badge>
          ))}
        </div>
      )}

      <div className={cn("relative mb-3 shrink-0", isSheet && "mb-4")}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t("search.locationSearchPlaceholder", "Ville, quartier, zone…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn("pl-9 font-sans", isSheet ? "min-h-12 text-base" : "text-sm")}
        />
      </div>

      {live.ville && quartierSearchHits && (
        <div
          className={cn(
            "mb-3 rounded-xl border border-primary/15 bg-primary/[0.06] shrink-0",
            isSheet ? "px-3 py-3" : "px-2 py-2",
          )}
        >
          <p className="text-[11px] uppercase tracking-wide text-primary font-sans font-semibold mb-2">
            {t("search.quartierZonesFirst", "Quartiers & zones")}
          </p>
          <p className="text-xs text-muted-foreground font-sans mb-2 leading-snug">
            {t(
              "search.quartierZonesHint",
              "Sélectionnez des quartiers précis — le plus courant à Madagascar pour affiner la recherche.",
            )}
          </p>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto overscroll-contain touch-pan-y">
            {quartierSearchHits.map(({ arrName, qName }) => (
              <label
                key={`${arrName}-${qName}`}
                className={cn(
                  "flex items-center gap-3 font-sans cursor-pointer rounded-lg border border-border/70 bg-card/80 px-3 touch-manipulation",
                  isSheet ? "min-h-12 text-sm py-2" : "text-xs py-1",
                )}
              >
                <Checkbox
                  checked={live.quartiers.includes(qName)}
                  onCheckedChange={() => toggleQuartier(qName, live.ville)}
                  className={isSheet ? "h-4 w-4 shrink-0" : "h-3.5 w-3.5"}
                />
                <span className="font-medium text-foreground">{qName}</span>
                <span className="text-muted-foreground truncate text-xs ml-auto max-w-[45%] text-right">{arrName}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {isSheet && live.ville && (
        <p className="text-xs font-semibold font-sans text-foreground mb-2 shrink-0">
          {t("search.browseByAreaTitle", "Ville complète & arrondissements")}
        </p>
      )}

      <div
        className={cn(
          listScrollClass,
          "min-h-0 overflow-y-auto overscroll-contain touch-pan-y pr-1 -mr-1 [scrollbar-gutter:stable]",
        )}
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
                    className={cn(
                      "flex-1 flex items-center gap-2 rounded-lg font-sans hover:bg-muted transition-colors text-left touch-manipulation",
                      isSheet ? "min-h-12 px-3 py-2 text-sm" : "px-2 py-1.5 text-sm",
                      wholeCityActive ? "bg-primary/10 text-primary font-medium" : "",
                    )}
                    onClick={() => {
                      handleSelectVille(ville.name);
                      toggleExpand(expandedVilles, ville.name, setExpandedVilles);
                    }}
                  >
                    {isVilleExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <MapPin className="h-4 w-4 shrink-0 text-accent" />
                    <span>{ville.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{ville.region}</span>
                  </button>
                </div>
                {isVilleExpanded && live.ville === ville.name && (
                  <p className={cn("text-muted-foreground font-sans px-2 py-1 leading-snug", isSheet ? "text-xs" : "text-[10px]")}>
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
                            className={cn(
                              "w-full flex items-center gap-2 rounded-md font-sans hover:bg-muted transition-colors touch-manipulation",
                              isSheet ? "min-h-11 px-2 py-1.5 text-sm" : "px-2 py-1 text-sm",
                              wholeArr || hasQuartierPick ? "text-primary font-medium" : "text-muted-foreground",
                            )}
                          >
                            <button
                              type="button"
                              className={cn("shrink-0 rounded hover:bg-muted-foreground/10", isSheet ? "p-1.5" : "p-0.5")}
                              onClick={() => toggleArrExpand(arr.name)}
                              aria-expanded={isArrExpanded}
                            >
                              {isArrExpanded ? (
                                <ChevronDown className={isSheet ? "h-4 w-4" : "h-3 w-3"} />
                              ) : (
                                <ChevronRight className={isSheet ? "h-4 w-4" : "h-3 w-3"} />
                              )}
                            </button>
                            <Checkbox
                              checked={wholeArr}
                              onCheckedChange={() => {
                                if (!live.ville) return;
                                toggleWholeArrondissement(arr.name, ville.name);
                              }}
                              className={isSheet ? "h-4 w-4 shrink-0" : "h-3.5 w-3.5 shrink-0"}
                              disabled={!live.ville || live.ville !== ville.name}
                            />
                            <button
                              type="button"
                              className={cn("flex-1 text-left", isSheet ? "text-sm py-1" : "text-xs py-0.5")}
                              onClick={() => toggleArrExpand(arr.name)}
                            >
                              {arr.name}
                            </button>
                            <span className="text-[10px] text-muted-foreground font-sans shrink-0">
                              {t("search.wholeArrondissementShort", "Tout")}
                            </span>
                          </div>

                          {isArrExpanded && (
                            <div className={cn("ml-5 mt-0.5 border-l border-border/60 pl-2", isSheet ? "space-y-1" : "space-y-0.5")}>
                              {arr.quartiers.map((q) => (
                                <label
                                  key={q.name}
                                  className={cn(
                                    "flex items-center gap-2 rounded font-sans hover:bg-muted cursor-pointer touch-manipulation",
                                    isSheet ? "min-h-11 px-2 py-1.5 text-sm" : "px-2 py-0.5 text-xs",
                                  )}
                                >
                                  <Checkbox
                                    checked={live.quartiers.includes(q.name)}
                                    onCheckedChange={() => {
                                      if (!live.ville) return;
                                      toggleQuartier(q.name, ville.name);
                                    }}
                                    disabled={!live.ville || live.ville !== ville.name}
                                    className={isSheet ? "h-4 w-4" : "h-3.5 w-3.5"}
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

      <div className={cn("mt-3 pt-3 border-t border-border shrink-0", isSheet && "mt-4")}>
        <label className="text-xs text-muted-foreground font-sans mb-1.5 block">
          {t("search.otherQuartierLabel", "Autre zone")}
        </label>
        <Input
          value={live.quartierLibre}
          onChange={(e) => setLive({ ...live, quartierLibre: e.target.value })}
          placeholder={t("search.otherQuartierPlaceholder", "Ex. : lotissement, zone industrielle…")}
          className={cn("font-sans", isSheet ? "min-h-12 text-base" : "text-sm")}
        />
      </div>

      {isApplyMode(props) && !hideApplyRow && (
        <div className="flex flex-wrap gap-2 mt-4 shrink-0">
          <Button type="button" className="font-sans flex-1 min-w-[120px] touch-manipulation min-h-11" onClick={handleApply}>
            {t("search.applyLocation", "Appliquer")}
          </Button>
          <Button type="button" variant="outline" className="font-sans touch-manipulation min-h-11" onClick={handleResetDraft}>
            {t("search.resetLocationDraft", "Réinitialiser")}
          </Button>
        </div>
      )}
    </div>
  );
});

LocationSelector.displayName = "LocationSelector";

export default LocationSelector;
