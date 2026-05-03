import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { MyListingsFilter } from "@/features/listings/hooks/useMyListings";

interface MyListingsTabsProps {
  activeFilter: MyListingsFilter;
  onFilterChange: (f: MyListingsFilter) => void;
  counts: Record<MyListingsFilter, number>;
}

const TABS: Array<{ id: MyListingsFilter; i18nKey: string; fallback: string }> = [
  { id: "all", i18nKey: "myListings.tabs.all", fallback: "Toutes" },
  { id: "active", i18nKey: "myListings.tabs.active", fallback: "Actives" },
  { id: "expiring_soon", i18nKey: "myListings.tabs.expiringSoon", fallback: "Expire bientôt" },
  { id: "expired", i18nKey: "myListings.tabs.expired", fallback: "Expirées" },
  { id: "sold", i18nKey: "myListings.tabs.sold", fallback: "Vendues" },
  { id: "draft", i18nKey: "myListings.tabs.draft", fallback: "Brouillons" },
];

/**
 * 6 tabs + counts en badge. Indicateur orange (point) sur "Expire bientôt"
 * si counts > 0 — alerte douce, pas d'animation casino.
 *
 * Mobile : Tabs shadcn déborde horizontalement avec scroll-x natif via
 * overflow-x-auto sur le wrapper parent. La grid de cards sous les tabs
 * gère son propre wrap.
 */
export function MyListingsTabs({ activeFilter, onFilterChange, counts }: MyListingsTabsProps) {
  const { t } = useTranslation();

  return (
    <Tabs
      value={activeFilter}
      onValueChange={(v) => onFilterChange(v as MyListingsFilter)}
      className="w-full"
      data-testid="my-listings-tabs"
    >
      <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <TabsList className="inline-flex w-max gap-1 md:flex md:w-full md:flex-wrap">
          {TABS.map((tab) => {
            const count = counts[tab.id] ?? 0;
            const isExpiringWithItems = tab.id === "expiring_soon" && count > 0;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                data-testid={`tab-${tab.id}`}
                className="relative gap-1.5 px-3 py-1.5 text-sm"
              >
                <span>{t(tab.i18nKey, tab.fallback)}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0 text-[10px] font-semibold",
                    activeFilter === tab.id
                      ? "bg-primary/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                  data-testid={`tab-${tab.id}-count`}
                >
                  {count}
                </span>
                {isExpiringWithItems && (
                  <span
                    aria-hidden="true"
                    data-testid={`tab-${tab.id}-alert-dot`}
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500"
                  />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </Tabs>
  );
}
