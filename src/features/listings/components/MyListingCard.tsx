import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  MessageSquare,
  Heart,
  Pencil,
  CheckCircle2,
  RefreshCw,
  Rocket,
  Trash2,
  ImageIcon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatAriary } from "@/config/monetization";
import { LISTING_RENEWAL_CREDIT_COST } from "@/config/monetization";
import type { MyListingRow } from "@/features/listings/hooks/useMyListings";

interface MyListingCardProps {
  listing: MyListingRow;
  onRenew: (listing: MyListingRow) => void;
  onMarkSold: (listing: MyListingRow) => void;
  onDeleteDraft?: (listing: MyListingRow) => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const URGENT_THRESHOLD_DAYS = 3;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-MG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  const diff = target - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

type CardVariant = "active" | "expiring_soon" | "expired" | "sold" | "draft" | "other";

function resolveVariant(listing: MyListingRow): CardVariant {
  const status = listing.status;
  if (status === "draft") return "draft";
  if (status === "sold") return "sold";
  const expiresMs = listing.expires_at ? new Date(listing.expires_at).getTime() : null;
  if (status === "expired" || (expiresMs !== null && expiresMs <= Date.now())) return "expired";
  if (
    (status === "active" || status === "expiring_soon") &&
    expiresMs !== null &&
    expiresMs > Date.now() &&
    expiresMs - Date.now() <= SEVEN_DAYS_MS
  ) return "expiring_soon";
  if (status === "active") return "active";
  return "other";
}

const VARIANT_BADGE_CLASS: Record<CardVariant, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  expiring_soon: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const VARIANT_BADGE_LABEL: Record<CardVariant, { i18nKey: string; fallback: string }> = {
  active: { i18nKey: "myListings.card.badge.active", fallback: "Active" },
  expiring_soon: { i18nKey: "myListings.card.badge.expiringSoon", fallback: "Expire bientôt" },
  expired: { i18nKey: "myListings.card.badge.expired", fallback: "Expirée" },
  sold: { i18nKey: "myListings.card.badge.sold", fallback: "Vendue" },
  draft: { i18nKey: "myListings.card.badge.draft", fallback: "Brouillon" },
  other: { i18nKey: "myListings.card.badge.other", fallback: "—" },
};

/**
 * Card unique pour la page /mes-annonces.
 * 5 variants principaux (active/expiring_soon/expired/sold/draft) + fallback "other"
 * pour statuts résiduels (paused, pending_review, etc.).
 */
export function MyListingCard({ listing, onRenew, onMarkSold, onDeleteDraft }: MyListingCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const variant = resolveVariant(listing);
  const days = daysUntil(listing.expires_at);
  const isUrgent = variant === "expiring_soon" && days !== null && days <= URGENT_THRESHOLD_DAYS;

  // Progression : (now - published_at) / (expires_at - published_at) * 100
  let progressPct: number | null = null;
  if (listing.published_at && listing.expires_at) {
    const start = new Date(listing.published_at).getTime();
    const end = new Date(listing.expires_at).getTime();
    if (end > start) {
      const elapsed = Date.now() - start;
      progressPct = Math.max(0, Math.min(100, (elapsed / (end - start)) * 100));
    }
  }

  const cover = listing.cover_url;
  const cityType = [listing.ville, listing.type].filter(Boolean).join(" · ");
  // Booleans calculés une fois — évite le narrowing TS qui éliminait 'sold'
  // de l'union dans les branches conditionnelles ultérieures.
  const isSold: boolean = variant === "sold";
  const isDraft: boolean = variant === "draft";
  const isActiveLike: boolean = variant === "active" || variant === "expiring_soon";
  const isExpired: boolean = variant === "expired";
  const isShowingActions: boolean = !isSold;
  const isShowingMarkSold: boolean = isActiveLike;
  const isShowingRenew: boolean = isExpired || variant === "expiring_soon";
  const isShowingBoost: boolean = isActiveLike;

  return (
    <article
      data-testid={`my-listing-${listing.id}`}
      data-variant={variant}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex gap-3">
        {/* Cover */}
        <div className="flex-shrink-0">
          {cover ? (
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="h-20 w-20 rounded-lg object-cover sm:h-24 sm:w-24 md:h-[100px] md:w-[100px]"
              data-testid={`my-listing-${listing.id}-cover`}
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:h-24 sm:w-24 md:h-[100px] md:w-[100px]"
              data-testid={`my-listing-${listing.id}-cover-placeholder`}
              aria-hidden="true"
            >
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Header info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="truncate text-sm font-semibold text-foreground sm:text-base"
              data-testid={`my-listing-${listing.id}-title`}
            >
              {listing.title}
            </h3>
            <span
              data-testid={`my-listing-${listing.id}-badge`}
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                VARIANT_BADGE_CLASS[variant],
              )}
            >
              {t(VARIANT_BADGE_LABEL[variant].i18nKey, VARIANT_BADGE_LABEL[variant].fallback)}
            </span>
          </div>
          <p className="mt-1 text-base font-bold text-foreground sm:text-lg">
            {formatAriary(listing.price_mga ?? 0)}
          </p>
          {cityType && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{cityType}</p>
          )}
        </div>
      </div>

      {/* Countdown / state line */}
      {variant === "active" && days !== null && (
        <p className="text-xs text-muted-foreground" data-testid={`my-listing-${listing.id}-countdown`}>
          {t("myListings.card.expiresInDays", "Expire dans {{count}} jours", { count: days ?? 0 })}
        </p>
      )}
      {variant === "expiring_soon" && days !== null && (
        <p
          className={cn(
            "text-xs font-medium",
            isUrgent ? "text-red-600 dark:text-red-400" : "text-orange-700 dark:text-orange-300",
          )}
          data-testid={`my-listing-${listing.id}-countdown`}
        >
          {t("myListings.card.expiresInDays", "Expire dans {{count}} jours", { count: days ?? 0 })}
        </p>
      )}
      {variant === "expired" && (
        <p className="text-xs text-red-600 dark:text-red-400" data-testid={`my-listing-${listing.id}-countdown`}>
          {t("myListings.card.expiredOn", "Expirée le {{date}}", {
            date: formatDate(listing.expires_at),
          })}
        </p>
      )}
      {variant === "sold" && (
        <p className="text-xs text-blue-700 dark:text-blue-300" data-testid={`my-listing-${listing.id}-countdown`}>
          {t("myListings.card.soldOn", "Vendue le {{date}}", { date: formatDate(listing.sold_at) })}
          {listing.sold_price ? ` · ${formatAriary(listing.sold_price)}` : ""}
        </p>
      )}

      {/* Progress bar (active + expiring_soon uniquement) */}
      {isActiveLike && progressPct !== null && (
        <Progress
          value={progressPct ?? 0}
          aria-label={t("myListings.card.progressAria", "Progression de la durée de vie")}
          data-testid={`my-listing-${listing.id}-progress`}
        />
      )}

      {/* Perf metrics (toutes variants sauf draft) */}
      {!isDraft && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground" data-testid={`my-listing-${listing.id}-metrics`}>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {listing.views_count ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {listing.contact_count ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            {listing.favorite_count ?? 0}
          </span>
        </div>
      )}

      {/* Actions */}
      {isShowingActions && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {isShowingBoost && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled
              title={t("myListings.actions.boostComingSoon", "Bientôt disponible")}
              data-testid={`my-listing-${listing.id}-boost`}
              className="flex-1 gap-1.5"
            >
              <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
              {t("myListings.actions.boost", "Booster")}
            </Button>
          )}
          {isShowingRenew && (
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => onRenew(listing)}
              data-testid={`my-listing-${listing.id}-renew`}
              className="flex-1 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("myListings.actions.renew", "Renouveler ({{cost}} crédits)", {
                cost: LISTING_RENEWAL_CREDIT_COST.toLocaleString("fr-FR"),
              })}
            </Button>
          )}
          {!isDraft && !isSold && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate(`/publier?edit=${listing.id}`)}
              data-testid={`my-listing-${listing.id}-edit`}
              className="flex-1 gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              {t("myListings.actions.edit", "Modifier")}
            </Button>
          )}
          {isDraft && (
            <>
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => navigate(`/publier?draft=${listing.id}`)}
                data-testid={`my-listing-${listing.id}-continue-draft`}
                className="flex-1 gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                {t("myListings.actions.continueDraft", "Continuer la rédaction")}
              </Button>
              {onDeleteDraft && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onDeleteDraft(listing)}
                  data-testid={`my-listing-${listing.id}-delete-draft`}
                  className="gap-1.5 text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("myListings.actions.deleteDraft", "Supprimer")}
                </Button>
              )}
            </>
          )}
          {isShowingMarkSold && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onMarkSold(listing)}
              data-testid={`my-listing-${listing.id}-mark-sold`}
              className="flex-1 gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t("myListings.actions.markSold", "Marquer vendue")}
            </Button>
          )}
        </div>
      )}

      {/* Sold variant : juste un lien Voir détails */}
      {isSold && (
        <div>
          <Button
            asChild
            type="button"
            size="sm"
            variant="outline"
            data-testid={`my-listing-${listing.id}-view`}
            className="gap-1.5"
          >
            <Link to={`/annonce/${listing.id}`}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              {t("myListings.actions.viewDetails", "Voir détails")}
            </Link>
          </Button>
        </div>
      )}
    </article>
  );
}
