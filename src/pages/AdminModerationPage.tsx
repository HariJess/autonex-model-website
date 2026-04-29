import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Loader2, ShieldAlert, Flag, CheckCircle2, XCircle, ArchiveRestore, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatAriary } from "@/config/monetization";

import {
  useAdminModerationQueue,
  type ModerationQueueFilter,
  type ModerationQueueRow,
} from "@/hooks/admin/useAdminModerationQueue";
import { useAdminListingActions } from "@/hooks/admin/useAdminListingActions";

const TABS: { value: ModerationQueueFilter; label: string }[] = [
  { value: "new", label: "Nouvelles annonces" },
  { value: "reports", label: "Signalements" },
  { value: "history", label: "Historique" },
];

const REASON_LABELS: Record<string, string> = {
  scam: "Arnaque",
  inappropriate: "Inapproprié",
  duplicate: "Doublon",
  wrong_price: "Prix aberrant",
  other: "Autre",
};

function AdminModerationPage() {
  const [tab, setTab] = useState<ModerationQueueFilter>("new");

  return (
    <>
      <Helmet>
        <title>Admin — Modération — AutoNex</title>
      </Helmet>
      <div className="space-y-5">
        <div>
          <h1 className="font-sans text-2xl font-bold">Modération</h1>
          <p className="text-sm text-muted-foreground font-sans">
            File d'attente des annonces à examiner : nouvelles publications, signalements utilisateurs, historique.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as ModerationQueueFilter)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="font-sans">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <ModerationQueue filter={t.value} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}

export default AdminModerationPage;

// -----------------------------------------------------------------------------
// Queue (one per tab)
// -----------------------------------------------------------------------------
function ModerationQueue({ filter }: { filter: ModerationQueueFilter }) {
  const { data, isLoading, error } = useAdminModerationQueue(filter);
  const rows = useMemo(() => data ?? [], [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive font-sans">
        {error instanceof Error ? error.message : "Erreur de chargement"}
      </p>
    );
  }

  if (rows.length === 0) {
    return <EmptyState filter={filter} />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <ListingCard key={row.listing_id} row={row} filter={filter} />
      ))}
    </div>
  );
}

function EmptyState({ filter }: { filter: ModerationQueueFilter }) {
  const messages: Record<ModerationQueueFilter, string> = {
    new: "Aucune nouvelle annonce à modérer.",
    reports: "Aucun signalement en attente.",
    history: "Aucun historique à afficher.",
    all: "Aucun élément.",
  };
  return <p className="text-sm text-muted-foreground font-sans">{messages[filter]}</p>;
}

// -----------------------------------------------------------------------------
// Card per listing
// -----------------------------------------------------------------------------
function ListingCard({ row, filter }: { row: ModerationQueueRow; filter: ModerationQueueFilter }) {
  const actions = useAdminListingActions();
  const [rejectMode, setRejectMode] = useState<"approve-reject" | "reports-validate" | null>(null);
  const [reason, setReason] = useState("");

  const submitDisabled = actions.reject.isPending || actions.validateReports.isPending;
  const reasonValid = reason.trim().length >= 3;

  const closeDialog = () => {
    setRejectMode(null);
    setReason("");
  };

  const handleApprove = () => {
    actions.approve.mutate({ listingId: row.listing_id, ownerId: row.owner_id });
  };

  const handleDismiss = () => {
    actions.dismissReports.mutate({ listingId: row.listing_id, ownerId: row.owner_id });
  };

  const handleReject = () => {
    if (!reasonValid) return;
    actions.reject.mutate(
      { listingId: row.listing_id, ownerId: row.owner_id, reason: reason.trim() },
      { onSuccess: closeDialog },
    );
  };

  const handleValidate = () => {
    if (!reasonValid) return;
    actions.validateReports.mutate(
      { listingId: row.listing_id, ownerId: row.owner_id, rejectionReason: reason.trim() },
      { onSuccess: closeDialog },
    );
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="font-sans text-base">
              <Link
                to={`/annonce/${row.listing_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {row.title}
              </Link>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs font-sans text-muted-foreground">
              <span>{formatAriary(row.price_mga ?? 0)}</span>
              {row.ville ? <span>· {row.ville}</span> : null}
              <span>· {row.owner_email ?? row.owner_id}</span>
              <span>· {new Date(row.created_at).toLocaleString("fr-MG")}</span>
            </div>
          </div>
          <StatusBadge status={row.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {row.reports_count > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <Flag className="h-3.5 w-3.5 text-destructive" aria-hidden />
            <span className="text-sm font-sans font-medium">
              {row.reports_count} signalement{row.reports_count > 1 ? "s" : ""} en attente
            </span>
            {row.reports_reasons?.map((reason) => (
              <Badge key={reason} variant="secondary" className="font-sans text-[11px]">
                {REASON_LABELS[reason] ?? reason}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {filter === "new" ? (
            <>
              <Button size="sm" onClick={handleApprove} disabled={actions.approve.isPending} className="font-sans">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectMode("approve-reject")}
                disabled={actions.reject.isPending}
                className="font-sans"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Rejeter
              </Button>
            </>
          ) : null}

          {filter === "reports" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                disabled={actions.dismissReports.isPending}
                className="font-sans"
              >
                <ArchiveRestore className="h-4 w-4 mr-1.5" />
                Rejeter les signalements (annonce OK)
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectMode("reports-validate")}
                disabled={actions.validateReports.isPending}
                className="font-sans"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Valider les signalements (rejeter l'annonce)
              </Button>
            </>
          ) : null}

          {filter === "history" ? (
            <p className="text-xs font-sans text-muted-foreground italic">Lecture seule</p>
          ) : null}
        </div>

        {rejectMode ? (
          <div className="space-y-2 rounded-lg border border-border bg-background/80 p-3">
            <Label htmlFor={`reason-${row.listing_id}`} className="text-sm font-sans">
              {rejectMode === "approve-reject"
                ? "Raison du rejet (visible par le propriétaire)"
                : "Raison (validation des signalements → rejet de l'annonce)"}
            </Label>
            <Textarea
              id={`reason-${row.listing_id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              className="font-sans"
              placeholder="Ex: contenu trompeur, doublon vérifié, prix manifestement erroné…"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={rejectMode === "approve-reject" ? handleReject : handleValidate}
                disabled={!reasonValid || submitDisabled}
                className="font-sans"
              >
                Confirmer
              </Button>
              <Button size="sm" variant="ghost" onClick={closeDialog} className="font-sans">
                Annuler
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: ModerationQueueRow["status"] }) {
  const config: Record<string, { label: string; className: string }> = {
    pending_review: { label: "En attente", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
    hidden_pending_review: { label: "Masquée", className: "bg-red-500/15 text-red-700 border-red-500/30" },
    active: { label: "Active", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
    rejected: { label: "Rejetée", className: "bg-neutral-500/15 text-neutral-700 border-neutral-500/30" },
  };
  const key = status ?? "unknown";
  const entry = config[key] ?? { label: key, className: "bg-muted text-muted-foreground border-border" };
  return (
    <Badge variant="outline" className={cn("font-sans", entry.className)}>
      <ShieldAlert className="h-3 w-3 mr-1" aria-hidden />
      {entry.label}
    </Badge>
  );
}
