import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, PowerOff, ShieldCheck, Users, Pencil, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AgencyStatusBadge } from "./AgencyStatusBadge";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { RejectSuspendDialog } from "./RejectSuspendDialog";
import AgencyFormDialog from "./AgencyFormDialog";
import { AgencyMembersDialog } from "./AgencyMembersDialog";
import { useAdminAgencyActions } from "@/hooks/admin/useAdminAgencies";
import type { AgencyDetail } from "@/types/agency";

interface AgencyActionsPanelProps {
  detail: AgencyDetail;
}

type Dialog =
  | null
  | "approve"
  | "reject"
  | "suspend"
  | "unsuspend"
  | "toggle-verified"
  | "edit"
  | "members";

export function AgencyActionsPanel({ detail }: AgencyActionsPanelProps) {
  const { approveAgency, rejectAgency, suspendAgency, unsuspendAgency } =
    useAdminAgencyActions();
  const [dialog, setDialog] = useState<Dialog>(null);
  const { agency, members } = detail;

  const close = () => setDialog(null);

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="font-sans text-lg">Actions</CardTitle>
          <div className="pt-2">
            <AgencyStatusBadge status={agency.status} verified={agency.verified} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {agency.status === "pending_review" ? (
            <>
              <Button variant="default" className="w-full justify-start font-sans" onClick={() => setDialog("approve")}>
                <Check className="h-4 w-4 mr-2" /> Approuver
              </Button>
              <Button variant="outline" className="w-full justify-start font-sans text-destructive hover:text-destructive" onClick={() => setDialog("reject")}>
                Rejeter
              </Button>
            </>
          ) : null}

          {agency.status === "approved" ? (
            <>
              <Button variant="outline" className="w-full justify-start font-sans" onClick={() => setDialog("toggle-verified")}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {agency.verified ? "Retirer le badge Partenaire" : "Marquer comme Partenaire"}
              </Button>
              <Button variant="outline" className="w-full justify-start font-sans text-destructive hover:text-destructive" onClick={() => setDialog("suspend")}>
                <PowerOff className="h-4 w-4 mr-2" /> Suspendre
              </Button>
            </>
          ) : null}

          {agency.status === "rejected" ? (
            <Button variant="default" className="w-full justify-start font-sans" onClick={() => setDialog("approve")}>
              <Check className="h-4 w-4 mr-2" /> Approuver (réexaminer)
            </Button>
          ) : null}

          {agency.status === "suspended" ? (
            <Button variant="default" className="w-full justify-start font-sans" onClick={() => setDialog("unsuspend")}>
              Rétablir
            </Button>
          ) : null}

          <div className="pt-2 border-t border-border space-y-2">
            <Button variant="outline" className="w-full justify-start font-sans" onClick={() => setDialog("edit")}>
              <Pencil className="h-4 w-4 mr-2" /> Modifier les infos
            </Button>
            <Button variant="outline" className="w-full justify-start font-sans" onClick={() => setDialog("members")}>
              <Users className="h-4 w-4 mr-2" /> Gérer les membres ({members.length})
            </Button>
            {agency.status === "approved" ? (
              <Button variant="ghost" className="w-full justify-start font-sans" asChild>
                <Link to={`/concessionnaires/${agency.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Voir la fiche publique
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AdminConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(v) => (v ? null : close())}
        title="Approuver l'agence"
        description={
          <>
            Approuver <strong>{agency.name}</strong> et la rendre visible publiquement ?
          </>
        }
        confirmLabel="Approuver"
        isPending={approveAgency.isPending}
        onConfirm={() =>
          approveAgency.mutate(
            { id: agency.id, verified: agency.verified },
            { onSuccess: close },
          )
        }
      />

      <AdminConfirmDialog
        open={dialog === "toggle-verified"}
        onOpenChange={(v) => (v ? null : close())}
        title={agency.verified ? "Retirer le badge Partenaire" : "Attribuer le badge Partenaire"}
        description={
          agency.verified
            ? "L'agence restera visible mais perdra son badge Partenaire AutoNex."
            : "L'agence sera marquée comme Partenaire AutoNex (badge doré)."
        }
        confirmLabel="Confirmer"
        isPending={approveAgency.isPending}
        onConfirm={() =>
          approveAgency.mutate(
            { id: agency.id, verified: !agency.verified },
            { onSuccess: close },
          )
        }
      />

      <AdminConfirmDialog
        open={dialog === "unsuspend"}
        onOpenChange={(v) => (v ? null : close())}
        title="Rétablir l'agence"
        description={
          <>
            Repasser <strong>{agency.name}</strong> en approuvée ? Elle redeviendra visible
            publiquement.
          </>
        }
        confirmLabel="Rétablir"
        isPending={unsuspendAgency.isPending}
        onConfirm={() => unsuspendAgency.mutate(agency.id, { onSuccess: close })}
      />

      <RejectSuspendDialog
        open={dialog === "reject"}
        mode="reject"
        agencyName={agency.name}
        isPending={rejectAgency.isPending}
        onOpenChange={(v) => (v ? null : close())}
        onConfirm={(reason) =>
          rejectAgency.mutate({ id: agency.id, reason }, { onSuccess: close })
        }
      />

      <RejectSuspendDialog
        open={dialog === "suspend"}
        mode="suspend"
        agencyName={agency.name}
        isPending={suspendAgency.isPending}
        onOpenChange={(v) => (v ? null : close())}
        onConfirm={(reason) =>
          suspendAgency.mutate({ id: agency.id, reason }, { onSuccess: close })
        }
      />

      <AgencyFormDialog
        open={dialog === "edit"}
        mode="edit"
        target={agency}
        onOpenChange={(v) => (v ? null : close())}
      />

      <AgencyMembersDialog
        open={dialog === "members"}
        agencyId={agency.id}
        agencyName={agency.name}
        members={members}
        onOpenChange={(v) => (v ? null : close())}
      />
    </>
  );
}
