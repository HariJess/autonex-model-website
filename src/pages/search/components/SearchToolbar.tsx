import FilterSidebar from "@/components/FilterSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { SearchFilters, SearchSortMode, SearchViewMode } from "@/types/search";
import { LayoutGrid, List, Map as MapIcon, SlidersHorizontal } from "lucide-react";

type SearchToolbarProps = {
  filters: SearchFilters;
  mobileFilterDraft: SearchFilters | null;
  mobileFiltersOpen: boolean;
  activeFilterCount: number;
  queryError: boolean;
  queryErrorLabel: string;
  resultCount: number;
  resultLabel: string;
  viewMode: SearchViewMode;
  sort: SearchSortMode;
  filtersLabel: string;
  sortRecentLabel: string;
  sortPriceAscLabel: string;
  sortPriceDescLabel: string;
  viewGridLabel: string;
  viewListLabel: string;
  viewMapLabel: string;
  onOpenMobileFilters: (open: boolean) => void;
  onMobileDraftChange: (next: SearchFilters) => void;
  onMobileApply: () => void;
  onSetViewMode: (next: SearchViewMode) => void;
  onSetSort: (next: SearchSortMode) => void;
};

export function SearchToolbar({
  filters,
  mobileFilterDraft,
  mobileFiltersOpen,
  activeFilterCount,
  queryError,
  queryErrorLabel,
  resultCount,
  resultLabel,
  viewMode,
  sort,
  filtersLabel,
  sortRecentLabel,
  sortPriceAscLabel,
  sortPriceDescLabel,
  viewGridLabel,
  viewListLabel,
  viewMapLabel,
  onOpenMobileFilters,
  onMobileDraftChange,
  onMobileApply,
  onSetViewMode,
  onSetSort,
}: SearchToolbarProps) {
  return (
    <div className="mb-2.5 rounded-xl border border-border/65 bg-card/90 p-2.5 md:p-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 min-w-0">
        <Sheet open={mobileFiltersOpen} onOpenChange={onOpenMobileFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden font-sans gap-2 shrink-0 min-h-11 rounded-lg border-border/70 bg-background/80 touch-manipulation">
              <SlidersHorizontal className="h-4 w-4" />
              {filtersLabel}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1 flex items-center justify-center text-[10px] border border-border">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex flex-col w-full sm:max-w-lg p-0 gap-0 h-[100dvh] max-h-[100dvh] overflow-hidden border-l"
          >
            <FilterSidebar
              filters={mobileFilterDraft ?? filters}
              onFiltersChange={onMobileDraftChange}
              isMobile
              idPrefix="mobile"
              onClose={() => onOpenMobileFilters(false)}
              onMobileApply={onMobileApply}
            />
          </SheetContent>
        </Sheet>

        <div className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 flex-1 lg:flex-initial min-w-0">
          {queryError ? (
            <p className="font-sans text-sm font-medium text-destructive truncate">{queryErrorLabel}</p>
          ) : (
            <p className="font-sans text-sm text-muted-foreground truncate">
              <span className="font-semibold text-foreground">{resultCount}</span> {resultLabel}
            </p>
          )}
        </div>
        </div>

        <div className="flex items-center gap-2 justify-between lg:justify-end w-full lg:w-auto">
          <div className="flex items-center rounded-lg border border-border/70 bg-background/70 p-1 overflow-hidden shrink-0">
          {(
            [
              { mode: "grid" as const, icon: LayoutGrid, label: viewGridLabel },
              { mode: "list" as const, icon: List, label: viewListLabel },
              { mode: "map" as const, icon: MapIcon, label: viewMapLabel },
            ] as const
          ).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSetViewMode(mode)}
              className={`inline-flex items-center justify-center rounded-lg min-h-11 min-w-11 p-2 touch-manipulation transition-colors sm:min-h-10 sm:min-w-10 ${viewMode === mode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground active:bg-muted"}`}
              aria-label={label}
              aria-pressed={viewMode === mode}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-1.5 py-1 sm:px-2">
            <Select value={sort} onValueChange={(v) => onSetSort(v as SearchSortMode)}>
              <SelectTrigger className="flex-1 border-0 bg-transparent shadow-none sm:flex-none sm:w-44 font-sans text-sm min-w-[8.25rem] min-h-9 px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{sortRecentLabel}</SelectItem>
                <SelectItem value="priceAsc">{sortPriceAscLabel}</SelectItem>
                <SelectItem value="priceDesc">{sortPriceDescLabel}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
