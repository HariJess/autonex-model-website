import { Link } from "react-router-dom";
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
import { AlertCircle, Home, Loader2, Pause, Play, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Listing = Tables<"listings">;

type DashboardListingsSectionProps = {
  title: string;
  listingsLoading: boolean;
  listingsErrorMessage?: string;
  publishedListings: Listing[];
  formatPrice: (price: number) => string;
  statusLabels: Record<string, string>;
  boostLabels: Record<string, string>;
  boostsByListing: Map<string, string[]>;
  pendingBoostsLabel: (raw: unknown) => string | null;
  labels: {
    noListings: string;
    publish: string;
    pause: string;
    activate: string;
    delete: string;
    pendingBoosts: string;
    activeBoosts: string;
    listing: string;
    price: string;
    status: string;
    views: string;
    actions: string;
    deleteConfirm: string;
    deleteDesc: string;
    cancel: string;
  };
  onToggleStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
};

function statusVariant(status: string | null) {
  if (status === "active") return "default" as const;
  if (status === "rejected") return "destructive" as const;
  return "secondary" as const;
}

export function DashboardListingsSection({
  title,
  listingsLoading,
  listingsErrorMessage,
  publishedListings,
  formatPrice,
  statusLabels,
  boostLabels,
  boostsByListing,
  pendingBoostsLabel,
  labels,
  onToggleStatus,
  onDelete,
}: DashboardListingsSectionProps) {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold mb-4">{title}</h2>

      {listingsErrorMessage && (
        <div className="flex items-center gap-2 text-destructive mb-4">
          <AlertCircle className="h-5 w-5" />
          <p className="font-sans text-sm">{listingsErrorMessage}</p>
        </div>
      )}

      {listingsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : publishedListings.length === 0 ? (
        <div className="text-center py-12">
          <Home className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-sans mb-4">{labels.noListings}</p>
          <Link to="/publier">
            <Button className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
              {labels.publish}
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {publishedListings.map((listing) => {
              const boostsLine = pendingBoostsLabel(listing.pending_boost_types);
              const activeBoostTypes = boostsByListing.get(listing.id) ?? [];
              const activeBoostLine = activeBoostTypes.length > 0 ? activeBoostTypes.map((x) => boostLabels[x] ?? x).join(", ") : null;
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
                      <p className="text-sm font-sans font-medium">{formatPrice(listing.price_mga)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(listing.status)} className="font-sans text-xs">
                        {statusLabels[listing.status ?? "draft"] ?? listing.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-sans">{listing.views_count ?? 0} vues</span>
                    </div>
                    {listing.status === "pending_review" && boostsLine && (
                      <p className="text-[11px] text-muted-foreground font-sans">
                        {labels.pendingBoosts}: {boostsLine}
                      </p>
                    )}
                    {listing.status === "active" && activeBoostLine && (
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-500 font-sans">
                        {labels.activeBoosts}: {activeBoostLine}
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-1.5">
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
                            <AlertDialogTitle className="font-serif">{labels.deleteConfirm}</AlertDialogTitle>
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
                    const boostsLine = pendingBoostsLabel(listing.pending_boost_types);
                    const activeBoostTypes = boostsByListing.get(listing.id) ?? [];
                    const activeBoostLine = activeBoostTypes.length > 0 ? activeBoostTypes.map((x) => boostLabels[x] ?? x).join(", ") : null;
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
                            {listing.status === "pending_review" && boostsLine && (
                              <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
                                {labels.pendingBoosts}: {boostsLine}
                              </p>
                            )}
                            {listing.status === "active" && activeBoostLine && (
                              <p className="text-[11px] text-emerald-800 dark:text-emerald-500 font-sans mt-0.5">
                                {labels.activeBoosts}: {activeBoostLine}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-sans text-sm hidden sm:table-cell">{formatPrice(listing.price_mga)}</td>
                        <td className="p-4">
                          <Badge variant={statusVariant(listing.status)} className="font-sans text-xs">
                            {statusLabels[listing.status ?? "draft"] ?? listing.status}
                          </Badge>
                        </td>
                        <td className="p-4 font-sans text-sm hidden md:table-cell">{listing.views_count ?? 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
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
                                  <AlertDialogTitle className="font-serif">{labels.deleteConfirm}</AlertDialogTitle>
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
    </div>
  );
}

