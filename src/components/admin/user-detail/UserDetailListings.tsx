import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type AdminListingRow,
  type ListingStatus,
  parseRejectionReason,
} from "@/types/admin";
import { cn } from "@/lib/utils";

interface UserDetailListingsProps {
  listings: AdminListingRow[];
}

interface BadgeMeta {
  label: string;
  className: string;
}

const STATUS_BADGES: Record<ListingStatus, BadgeMeta> = {
  active: {
    label: "Active",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  pending_review: {
    label: "En modération",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  pending_payment: {
    label: "Paiement en attente",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  pending_payment_verification: {
    label: "Vérification paiement",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  rejected: {
    label: "Rejetée",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  expired: {
    label: "Expirée",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  draft: {
    label: "Brouillon",
    className: "bg-gray-50 text-gray-600 border-gray-200",
  },
  paused: {
    label: "En pause",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  archived: {
    label: "Archivée",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  hidden_pending_review: {
    label: "Masquée (signalements)",
    className: "bg-orange-200 text-orange-900 border-orange-300",
  },
};

const OWNER_SUSPENDED_BADGE: BadgeMeta = {
  label: "Suspendue (owner banni)",
  className: "bg-red-200 text-red-900 border-red-300",
};

const UNKNOWN_STATUS_BADGE: BadgeMeta = {
  label: "Inconnu",
  className: "bg-gray-100 text-gray-600 border-gray-200",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-MG");
}

function formatPrice(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-MG").format(value) + " Ar";
}

function StatusBadge({ listing }: { listing: AdminListingRow }) {
  const parsed = parseRejectionReason(listing.rejection_reason);
  const meta =
    listing.status === "rejected" && parsed.ownerSuspended
      ? OWNER_SUSPENDED_BADGE
      : listing.status
        ? STATUS_BADGES[listing.status]
        : UNKNOWN_STATUS_BADGE;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-sans font-medium",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function UserDetailListings({ listings }: UserDetailListingsProps) {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="font-serif text-lg">
          Annonces ({listings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {listings.length === 0 ? (
          <p className="p-4 text-sm font-sans text-muted-foreground">
            Aucune annonce.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Titre</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium text-right">Prix</th>
                  <th className="p-3 font-medium">Créée le</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <p className="font-medium">{l.title?.trim() || "—"}</p>
                        <p className="text-xs text-muted-foreground">{l.id}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <StatusBadge listing={l} />
                    </td>
                    <td className="p-3 text-right">{formatPrice(l.price_mga)}</td>
                    <td className="p-3">{formatDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
