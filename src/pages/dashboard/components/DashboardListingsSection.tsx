import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPriceCompact, mgaToEur } from "@/config/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, CarFront, Flame, Pause, Pencil, Play, Rocket, Trash2, X } from "lucide-react";
import { WheelSpinner } from "@/components/ui/wheel-spinner";
import type { Tables } from "@/integrations/supabase/types";
import { isEditablePublishedListingStatus } from "@/lib/publishDraft";
import {
  formatBoostEndDateFr,
  isListingEligibleForPostPublishBoost,
  type ListingBoostPartition,
} from "@/lib/listingBoosts";
// PROMPT 6 — DashboardBoostPurchaseDialog deprecated. Le boost est désormais
// géré exclusivement depuis /mes-annonces (cf. MyListingCard + BoostModal).
import { BoostModal } from "@/components/listings/BoostModal";
import { DealActivationModal } from "@/features/deals/components/DealActivationModal";
import { DealStatusBadge } from "@/features/deals/components/DealStatusBadge";
import { useCancelDeal } from "@/features/deals/hooks/useDealMutations";

// Boost denormalized cols — pas dans Tables<"listings"> tant que les types Supabase
// n'ont pas été régénérés post-migration boost_system. Cohérent avec
// `ListingRowLite` dans useListings.ts. La query Dashboard.tsx (`select("*")`)
// les charge bien au runtime.
type Listing = Tables<"listings"> & {
  last_bumped_at?: string | null;
  featured_until?: string | null;
  top_ad_until?: string | null;
};

type DashboardListingsSectionProps = {
  title: string;
  /**
   * Action optionnelle rendue à droite du titre (pattern flex justify-between).
   * Typiquement un Button "Gérer mes annonces →" pour navigate /mes-annonces.
   * Si null/undefined, le titre est rendu seul (comportement legacy préservé).
   */
  headerAction?: ReactNode;
  listingsLoading: boolean;
  listingsErrorMessage?: string;
  publishedListings: Listing[];
  statusLabels: Record<string, string>;
  boostLabels: Record<string, string>;
  listingBoostPartitions: Map<string, ListingBoostPartition>;
  pendingBoostsLabel: (raw: unknown) => string | null;
  labels: {
    noListings: string;
    publish: string;
    pause: string;
    activate: string;
    delete: string;
    pendingBoosts: string;
    activeBoosts: string;
    expiredBoosts: string;
    boostPendingReviewNote: string;
    listing: string;
    price: string;
    status: string;
    views: string;
    actions: string;
    deleteConfirm: string;
    deleteDesc: string;
    cancel: string;
    edit: string;
  };
  onToggleStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
};

function statusVariant(status: string | null) {
  if (status === "active") return "default" as const;
  if (status === "rejected") return "destructive" as const;
  return "secondary" as const;
}

function ListingBoostNotes({
  listing,
  partition,
  boostLabels,
  pendingBoostsLabel,
  labels,
}: {
  listing: Listing;
  partition: ListingBoostPartition | undefined;
  boostLabels: Record<string, string>;
  pendingBoostsLabel: (raw: unknown) => string | null;
  labels: DashboardListingsSectionProps["labels"];
}) {
  const boostsLine = pendingBoostsLabel(listing.pending_boost_types);
  const showPublishedBoostBlock = listing.status === "active" || listing.status === "paused";

  return (
    <>
      {listing.status === "pending_review" && boostsLine && (
        <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
          <span className="font-medium text-foreground/90">{labels.pendingBoosts} :</span> {boostsLine}
        </p>
      )}
      {listing.status === "pending_review" && (
        <p className="text-[11px] text-muted-foreground font-sans mt-0.5 leading-snug">{labels.boostPendingReviewNote}</p>
      )}
      {showPublishedBoostBlock && partition && partition.active.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          <p className="text-[11px] font-medium text-emerald-900 dark:text-emerald-400 font-sans">{labels.activeBoosts}</p>
          {partition.active.map((b) => (
            <p key={`${b.type}-${b.ends_at}`} className="text-[11px] text-emerald-800 dark:text-emerald-500 font-sans">
              {boostLabels[b.type] ?? b.type} — actif jusqu’au {formatBoostEndDateFr(b.ends_at)}
            </p>
          ))}
        </div>
      )}
      {showPublishedBoostBlock && partition && partition.expired.length > 0 && (
        <p className="text-[11px] text-muted-foreground font-sans mt-0.5 leading-snug">
          <span className="font-medium">{labels.expiredBoosts} :</span>{" "}
          {partition.expired
            .map((b) => `${boostLabels[b.type] ?? b.type} (fin ${formatBoostEndDateFr(b.ends_at)})`)
            .join(" · ")}
        </p>
      )}
    </>
  );
}

export function DashboardListingsSection({
  title,
  headerAction,
  listingsLoading,
  listingsErrorMessage,
  publishedListings,
  statusLabels,
  boostLabels,
  listingBoostPartitions,
  pendingBoostsLabel,
  labels,
  onToggleStatus,
  onDelete,
}: DashboardListingsSectionProps) {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  // Sprint 5 — format compact dans le dashboard pour cohérence avec la
  // grille publique. Le vendeur connaît son prix, on lui évite les 9
  // chiffres qui cassent la lisibilité du tableau.
  const formatPriceCompactInDashboard = (mga: number) =>
    currency === "EUR"
      ? formatPriceCompact(mgaToEur(mga), "EUR")
      : formatPriceCompact(mga, "MGA");
  const [dealModalListing, setDealModalListing] = useState<Listing | null>(null);
  const [boostModalListing, setBoostModalListing] = useState<Listing | null>(null);
  const cancelDeal = useCancelDeal();

  const handleCancelDeal = (listingId: string) => {
    const confirmMsg = t(
      "deals.confirm.cancel",
      "Êtes-vous sûr de vouloir annuler ce deal ? Le prix verrouillé sera maintenu pendant 30 jours.",
    );
    if (typeof window !== "undefined" && !window.confirm(confirmMsg)) return;
    cancelDeal.mutate(listingId);
  };

  return (
    <div>
      {/* Header : titre seul (legacy) ou titre + action droite (flex justify-between) */}
      {headerAction ? (
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sans text-xl font-bold">{title}</h2>
          {headerAction}
        </div>
      ) : (
        <h2 className="font-sans text-xl font-bold mb-4">{title}</h2>
      )}

      {listingsErrorMessage && (
        <div className="flex items-center gap-2 text-destructive mb-4">
          <AlertCircle className="h-5 w-5" />
          <p className="font-sans text-sm">{listingsErrorMessage}</p>
        </div>
      )}

      {listingsLoading ? (
        <div className="flex justify-center py-8">
          <WheelSpinner size="md" />
        </div>
      ) : publishedListings.length === 0 ? (
        <div className="text-center py-12">
          <CarFront className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-sans mb-4">{labels.noListings}</p>
          <Link to="/publier">
            <Button variant="hero" className="font-sans">
              {labels.publish}
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {publishedListings.map((listing) => {
              const partition = listingBoostPartitions.get(listing.id);
              return (
                <Card key={`mobile-${listing.id}`} className="rounded-2xl">
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <Link to={`/annonce/${listing.id}`} className="font-sans text-sm font-semibold hover:text-primary transition-colors line-clamp-2">
                        {listing.title}
                      </Link>
                      <p className="text-xs text-muted-foreground font-sans">
                        {listing.ville}
                        {listing.quartier ? ` • ${listing.quartier}` : ""}
                      </p>
                      {listing.deal_active && listing.deal_original_price_mga && listing.deal_ends_at && listing.deal_discount_percent != null ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground font-sans line-through">
                            {formatPriceCompactInDashboard(Number(listing.deal_original_price_mga))}
                          </span>
                          <span className="text-sm font-sans font-semibold text-orange-700 dark:text-orange-300">
                            {formatPriceCompactInDashboard(listing.price_mga)}
                          </span>
                          <DealStatusBadge
                            discountPercent={listing.deal_discount_percent}
                            endsAt={listing.deal_ends_at}
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-sans font-medium">{formatPriceCompactInDashboard(listing.price_mga)}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(listing.status)} className="font-sans text-xs">
                        {statusLabels[listing.status ?? "draft"] ?? listing.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-sans">{listing.views_count ?? 0} vues</span>
                    </div>
                    <ListingBoostNotes
                      listing={listing}
                      partition={partition}
                      boostLabels={boostLabels}
                      pendingBoostsLabel={pendingBoostsLabel}
                      labels={labels}
                    />
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {/* PROMPT 6 : bouton « Booster » déplacé dans /mes-annonces (MyListingCard + BoostModal). */}
                      {listing.status === "active" && listing.transaction === "vente" && !listing.deal_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-sans touch-manipulation h-9 px-2 border-orange-600/40 text-orange-900 dark:text-orange-200"
                          onClick={() => setDealModalListing(listing)}
                        >
                          <Flame className="h-3.5 w-3.5 mr-1 shrink-0" />
                          {t("deals.dashboardButton.activate", "Mettre en bonne affaire")}
                        </Button>
                      )}
                      {listing.deal_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-sans touch-manipulation h-9 px-2 border-red-600/40 text-red-700 dark:text-red-300"
                          onClick={() => handleCancelDeal(listing.id)}
                          disabled={cancelDeal.isPending}
                        >
                          <X className="h-3.5 w-3.5 mr-1 shrink-0" />
                          {t("deals.dashboardButton.cancel", "Annuler le deal")}
                        </Button>
                      )}
                      {isListingEligibleForPostPublishBoost(listing.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-sans touch-manipulation h-9 px-2 border-amber-600/40 text-amber-900 dark:text-amber-200"
                          onClick={() => setBoostModalListing(listing)}
                        >
                          <Rocket className="h-3.5 w-3.5 mr-1 shrink-0" />
                          {t("dashboard.boostListing", "Booster")}
                        </Button>
                      )}
                      {isEditablePublishedListingStatus(listing.status) && (
                        <Button variant="outline" size="sm" className="font-sans touch-manipulation h-9 px-2" asChild>
                          <Link to={`/publier?edit=${listing.id}`}>
                            <Pencil className="h-3.5 w-3.5 mr-1 shrink-0" />
                            {labels.edit}
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={listing.status === "active" ? labels.pause : labels.activate}
                        onClick={() => onToggleStatus(listing.id, listing.status ?? "draft")}
                        disabled={!["active", "paused"].includes(listing.status ?? "")}
                        className="min-h-10 min-w-10 touch-manipulation"
                      >
                        {listing.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title={labels.delete} className="min-h-10 min-w-10 touch-manipulation">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-sans">{labels.deleteConfirm}</AlertDialogTitle>
                            <AlertDialogDescription className="font-sans">{labels.deleteDesc}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="font-sans">{labels.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(listing.id)} className="bg-destructive text-destructive-foreground font-sans">
                              {labels.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">{labels.listing}</th>
                    <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground hidden sm:table-cell">{labels.price}</th>
                    <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">{labels.status}</th>
                    <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground hidden md:table-cell">{labels.views}</th>
                    <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedListings.map((listing) => {
                    const partition = listingBoostPartitions.get(listing.id);
                    return (
                      <tr key={listing.id} className="border-b border-border last:border-0">
                        <td className="p-4">
                          <div>
                            <Link to={`/annonce/${listing.id}`} className="font-sans text-sm font-medium hover:text-primary transition-colors">
                              {listing.title}
                            </Link>
                            <p className="text-xs text-muted-foreground font-sans">
                              {listing.ville}
                              {listing.quartier ? ` • ${listing.quartier}` : ""}
                            </p>
                            <ListingBoostNotes
                              listing={listing}
                              partition={partition}
                              boostLabels={boostLabels}
                              pendingBoostsLabel={pendingBoostsLabel}
                              labels={labels}
                            />
                          </div>
                        </td>
                        <td className="p-4 font-sans text-sm hidden sm:table-cell">
                          {listing.deal_active && listing.deal_original_price_mga && listing.deal_ends_at && listing.deal_discount_percent != null ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPriceCompactInDashboard(Number(listing.deal_original_price_mga))}
                              </span>
                              <span className="font-semibold text-orange-700 dark:text-orange-300">
                                {formatPriceCompactInDashboard(listing.price_mga)}
                              </span>
                              <DealStatusBadge
                                discountPercent={listing.deal_discount_percent}
                                endsAt={listing.deal_ends_at}
                              />
                            </div>
                          ) : (
                            formatPriceCompactInDashboard(listing.price_mga)
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={statusVariant(listing.status)} className="font-sans text-xs">
                            {statusLabels[listing.status ?? "draft"] ?? listing.status}
                          </Badge>
                        </td>
                        <td className="p-4 font-sans text-sm hidden md:table-cell">{listing.views_count ?? 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* PROMPT 6 : bouton « Booster » déplacé dans /mes-annonces. */}
                            {listing.status === "active" && listing.transaction === "vente" && !listing.deal_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-sans h-8 px-2 border-orange-600/40 text-orange-900 dark:text-orange-200"
                                onClick={() => setDealModalListing(listing)}
                              >
                                <Flame className="h-3.5 w-3.5 mr-1 shrink-0" />
                                {t("deals.dashboardButton.activate", "Mettre en bonne affaire")}
                              </Button>
                            )}
                            {listing.deal_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-sans h-8 px-2 border-red-600/40 text-red-700 dark:text-red-300"
                                onClick={() => handleCancelDeal(listing.id)}
                                disabled={cancelDeal.isPending}
                              >
                                <X className="h-3.5 w-3.5 mr-1 shrink-0" />
                                {t("deals.dashboardButton.cancel", "Annuler le deal")}
                              </Button>
                            )}
                            {isListingEligibleForPostPublishBoost(listing.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-sans h-8 px-2 border-amber-600/40 text-amber-900 dark:text-amber-200"
                                onClick={() => setBoostModalListing(listing)}
                              >
                                <Rocket className="h-3.5 w-3.5 mr-1 shrink-0" />
                                {t("dashboard.boostListing", "Booster")}
                              </Button>
                            )}
                            {isEditablePublishedListingStatus(listing.status) && (
                              <Button variant="outline" size="sm" className="font-sans h-8 px-2" asChild>
                                <Link to={`/publier?edit=${listing.id}`}>
                                  <Pencil className="h-3.5 w-3.5 mr-1 shrink-0" />
                                  {labels.edit}
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title={listing.status === "active" ? labels.pause : labels.activate}
                              onClick={() => onToggleStatus(listing.id, listing.status ?? "draft")}
                              disabled={!["active", "paused"].includes(listing.status ?? "")}
                            >
                              {listing.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title={labels.delete}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-sans">{labels.deleteConfirm}</AlertDialogTitle>
                                  <AlertDialogDescription className="font-sans">{labels.deleteDesc}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="font-sans">{labels.cancel}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDelete(listing.id)} className="bg-destructive text-destructive-foreground font-sans">
                                    {labels.delete}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {dealModalListing && (
        <DealActivationModal
          listing={{
            id: dealModalListing.id,
            title: dealModalListing.title,
            price_mga: dealModalListing.price_mga,
          }}
          open={dealModalListing !== null}
          onOpenChange={(open) => {
            if (!open) setDealModalListing(null);
          }}
          onSuccess={() => setDealModalListing(null)}
        />
      )}

      {boostModalListing && (
        <BoostModal
          listingId={boostModalListing.id}
          listingTitle={boostModalListing.title}
          lastBumpedAt={boostModalListing.last_bumped_at ?? null}
          featuredUntil={boostModalListing.featured_until ?? null}
          topAdUntil={boostModalListing.top_ad_until ?? null}
          open={boostModalListing !== null}
          onOpenChange={(open) => {
            if (!open) setBoostModalListing(null);
          }}
        />
      )}
    </div>
  );
}
