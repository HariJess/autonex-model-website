import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { useAdminAgencyActions } from "@/hooks/admin/useAdminAgencies";
import type { AgencyMember } from "@/types/agency";

interface AgencyMembersDialogProps {
  open: boolean;
  agencyId: string | null;
  agencyName: string;
  members: AgencyMember[];
  onOpenChange: (open: boolean) => void;
}

export function AgencyMembersDialog({
  open,
  agencyId,
  agencyName,
  members,
  onOpenChange,
}: AgencyMembersDialogProps) {
  const { linkUser, unlinkUser } = useAdminAgencyActions();
  const [linkUserId, setLinkUserId] = useState("");
  const [unlinkTarget, setUnlinkTarget] = useState<AgencyMember | null>(null);

  const handleLink = () => {
    if (!agencyId) return;
    const id = linkUserId.trim();
    if (id.length === 0) return;
    linkUser.mutate(
      { userId: id, agencyId },
      {
        onSuccess: () => {
          setLinkUserId("");
        },
      },
    );
  };

  const handleUnlink = () => {
    if (!agencyId || !unlinkTarget) return;
    unlinkUser.mutate(
      { userId: unlinkTarget.id, agencyId },
      { onSuccess: () => setUnlinkTarget(null) },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Membres de {agencyName}</DialogTitle>
            <DialogDescription className="font-sans">
              Liste des utilisateurs liés. Lier/délier via UUID utilisateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 font-sans">
            <div className="space-y-1.5">
              <Label htmlFor="link-uid" className="text-xs">
                Lier un utilisateur (UUID)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="link-uid"
                  value={linkUserId}
                  onChange={(e) => setLinkUserId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleLink}
                  disabled={linkUser.isPending || linkUserId.trim().length === 0}
                  className="shrink-0"
                >
                  {linkUser.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" /> Lier
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Le rôle de l'utilisateur sera promu à "agence".
              </p>
            </div>

            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Membre</th>
                    <th className="p-3 font-medium">Rôle</th>
                    <th className="p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground text-sm">
                        Aucun membre lié.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="p-3">
                          <Link
                            to={`/admin/utilisateurs/${m.id}`}
                            className="font-medium hover:underline"
                            onClick={() => onOpenChange(false)}
                          >
                            {m.full_name?.trim() || m.email || m.id.slice(0, 8)}
                          </Link>
                          {m.email ? (
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          ) : null}
                        </td>
                        <td className="p-3 text-muted-foreground">{m.role}</td>
                        <td className="p-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setUnlinkTarget(m)}
                            aria-label={`Détacher ${m.full_name ?? m.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={unlinkTarget !== null}
        onOpenChange={(v) => {
          if (!v) setUnlinkTarget(null);
        }}
        title="Détacher l'utilisateur"
        description={
          unlinkTarget ? (
            <>
              Détacher <strong>{unlinkTarget.full_name ?? unlinkTarget.email}</strong> de
              l'agence ? Son rôle sera rétrogradé à "particulier".
            </>
          ) : null
        }
        confirmLabel="Détacher"
        destructive
        isPending={unlinkUser.isPending}
        onConfirm={handleUnlink}
      />
    </>
  );
}
