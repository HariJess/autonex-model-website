import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { useAdminUserActions } from "@/hooks/admin/useAdminUserActions";
import {
  type AdminUserOverview,
  type UserRole,
  USER_ROLES,
} from "@/types/admin";

interface UserDetailActionsProps {
  profile: AdminUserOverview;
  currentAdminId: string | undefined;
}

type OpenDialog =
  | null
  | "grant"
  | "role"
  | "suspend"
  | "unsuspend"
  | "delete";

export function UserDetailActions({ profile, currentAdminId }: UserDetailActionsProps) {
  const [open, setOpen] = useState<OpenDialog>(null);
  const actions = useAdminUserActions(profile.user_id);
  const isSelf = currentAdminId === profile.user_id;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="font-sans text-lg">Actions admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start font-sans"
          onClick={() => setOpen("grant")}
        >
          Ajuster les crédits
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start font-sans"
          onClick={() => setOpen("role")}
          disabled={isSelf}
          title={isSelf ? "Vous ne pouvez pas modifier votre propre rôle." : undefined}
        >
          Changer le rôle
        </Button>

        {profile.suspended ? (
          <Button
            variant="outline"
            className="w-full justify-start font-sans"
            onClick={() => setOpen("unsuspend")}
          >
            Réactiver l'utilisateur
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full justify-start font-sans text-destructive hover:text-destructive"
            onClick={() => setOpen("suspend")}
            disabled={isSelf}
            title={isSelf ? "Vous ne pouvez pas vous suspendre." : undefined}
          >
            Suspendre l'utilisateur
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full justify-start font-sans text-destructive hover:text-destructive border-destructive/40"
          onClick={() => setOpen("delete")}
          disabled={isSelf}
          title={isSelf ? "Vous ne pouvez pas vous supprimer." : undefined}
        >
          Supprimer l'utilisateur
        </Button>

        {isSelf ? (
          <p className="pt-2 text-xs font-sans text-muted-foreground">
            Les actions destructives sont désactivées sur votre propre compte.
          </p>
        ) : null}
      </CardContent>

      <GrantCreditsDialog
        open={open === "grant"}
        onOpenChange={(v) => setOpen(v ? "grant" : null)}
        profile={profile}
        isPending={actions.grantCredits.isPending}
        onSubmit={(amount, reason) =>
          actions.grantCredits.mutate(
            { userId: profile.user_id, amount, reason },
            { onSuccess: () => setOpen(null) },
          )
        }
      />

      <ChangeRoleDialog
        open={open === "role"}
        onOpenChange={(v) => setOpen(v ? "role" : null)}
        profile={profile}
        isPending={actions.changeRole.isPending}
        onSubmit={(newRole) =>
          actions.changeRole.mutate(
            { userId: profile.user_id, newRole },
            { onSuccess: () => setOpen(null) },
          )
        }
      />

      <SuspendUserDialog
        open={open === "suspend"}
        onOpenChange={(v) => setOpen(v ? "suspend" : null)}
        profile={profile}
        isPending={actions.suspend.isPending}
        onSubmit={(reason) =>
          actions.suspend.mutate(
            { userId: profile.user_id, reason },
            { onSuccess: () => setOpen(null) },
          )
        }
      />

      <UnsuspendUserDialog
        open={open === "unsuspend"}
        onOpenChange={(v) => setOpen(v ? "unsuspend" : null)}
        profile={profile}
        isPending={actions.unsuspend.isPending}
        onConfirm={() =>
          actions.unsuspend.mutate(
            { userId: profile.user_id },
            { onSuccess: () => setOpen(null) },
          )
        }
      />

      <DeleteUserDialog
        open={open === "delete"}
        onOpenChange={(v) => setOpen(v ? "delete" : null)}
        profile={profile}
        isPending={actions.deleteUser.isPending}
        onSubmit={(email) =>
          actions.deleteUser.mutate(
            { userId: profile.user_id, confirmationEmail: email },
            { onSuccess: () => setOpen(null) },
          )
        }
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-dialogs
// ---------------------------------------------------------------------------

interface DialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: AdminUserOverview;
  isPending: boolean;
}

function GrantCreditsDialog({
  open,
  onOpenChange,
  profile,
  isPending,
  onSubmit,
}: DialogBaseProps & { onSubmit: (amount: number, reason: string) => void }) {
  const [amountStr, setAmountStr] = useState("");
  const [reason, setReason] = useState("");

  const amount = Number.parseInt(amountStr, 10);
  const amountValid = Number.isFinite(amount) && amount !== 0;
  const reasonValid = reason.trim().length >= 3;
  const disabled = !amountValid || !reasonValid;

  const reset = () => {
    setAmountStr("");
    setReason("");
  };

  return (
    <AdminConfirmDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
      title="Ajuster les crédits"
      description={
        <>
          Ajouter (valeur positive) ou retirer (valeur négative) des crédits pour{" "}
          <strong>{profile.full_name?.trim() || profile.email || profile.user_id}</strong>.
          Solde actuel : <strong>{profile.credits_balance ?? 0}</strong>.
        </>
      }
      confirmLabel="Appliquer"
      isPending={isPending}
      disabled={disabled}
      onConfirm={() => onSubmit(amount, reason.trim())}
    >
      <div className="space-y-1">
        <Label htmlFor="admin-grant-amount" className="text-xs">
          Montant (négatif pour retirer)
        </Label>
        <Input
          id="admin-grant-amount"
          type="number"
          inputMode="numeric"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="ex: 50 ou -20"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="admin-grant-reason" className="text-xs">
          Raison (obligatoire)
        </Label>
        <Textarea
          id="admin-grant-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: compensation bug paiement du 15/04"
          rows={3}
        />
      </div>
    </AdminConfirmDialog>
  );
}

function ChangeRoleDialog({
  open,
  onOpenChange,
  profile,
  isPending,
  onSubmit,
}: DialogBaseProps & { onSubmit: (newRole: UserRole) => void }) {
  const [newRole, setNewRole] = useState<UserRole>(profile.role);
  const disabled = newRole === profile.role;

  return (
    <AdminConfirmDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setNewRole(profile.role);
        onOpenChange(v);
      }}
      title="Changer le rôle"
      description={
        <>
          Rôle actuel : <strong>{profile.role}</strong>. Sélectionnez le nouveau rôle.
        </>
      }
      confirmLabel="Changer"
      isPending={isPending}
      disabled={disabled}
      onConfirm={() => onSubmit(newRole)}
    >
      <div className="space-y-1">
        <Label className="text-xs">Nouveau rôle</Label>
        <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </AdminConfirmDialog>
  );
}

function SuspendUserDialog({
  open,
  onOpenChange,
  profile,
  isPending,
  onSubmit,
}: DialogBaseProps & { onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const disabled = trimmed.length < 10;

  return (
    <AdminConfirmDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setReason("");
        onOpenChange(v);
      }}
      title="Suspendre l'utilisateur"
      description={
        <>
          Les annonces actives de{" "}
          <strong>{profile.full_name?.trim() || profile.email || profile.user_id}</strong>{" "}
          seront rejetées avec le préfixe <code>owner_suspended:</code>. Brouillons et
          annonces déjà rejetées ne sont pas affectés.
        </>
      }
      confirmLabel="Suspendre"
      destructive
      isPending={isPending}
      disabled={disabled}
      onConfirm={() => onSubmit(trimmed)}
    >
      <div className="space-y-1">
        <Label htmlFor="admin-suspend-reason" className="text-xs">
          Raison de la suspension (10 caractères minimum)
        </Label>
        <Textarea
          id="admin-suspend-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: fausses annonces répétées malgré avertissement"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {trimmed.length} / 10 caractères
        </p>
      </div>
    </AdminConfirmDialog>
  );
}

function UnsuspendUserDialog({
  open,
  onOpenChange,
  profile,
  isPending,
  onConfirm,
}: DialogBaseProps & { onConfirm: () => void }) {
  return (
    <AdminConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Réactiver l'utilisateur"
      description={
        <>
          Retirer le flag <code>suspended</code> du compte{" "}
          <strong>{profile.full_name?.trim() || profile.email || profile.user_id}</strong>.
          Les annonces rejetées <em>ne seront pas</em> réactivées automatiquement (action
          manuelle requise depuis la modération).
        </>
      }
      confirmLabel="Réactiver"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}

function DeleteUserDialog({
  open,
  onOpenChange,
  profile,
  isPending,
  onSubmit,
}: DialogBaseProps & { onSubmit: (email: string) => void }) {
  const email = profile.email ?? "";
  const canUse = email.length > 0;

  if (!canUse) {
    return (
      <AdminConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Suppression impossible"
        description="L'email de ce compte est introuvable — suppression sécurisée impossible. Contactez le support Supabase."
        confirmLabel="OK"
        onConfirm={() => onOpenChange(false)}
      />
    );
  }

  return (
    <AdminConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer définitivement l'utilisateur"
      description={
        <>
          Cette action est <strong>irréversible</strong>. Elle supprime le compte
          <code className="mx-1">{email}</code>
          ainsi que profil, annonces, crédits, favoris et transactions. Les posts de blog
          seront anonymisés (author_id → NULL).
        </>
      }
      confirmLabel="Supprimer"
      destructive
      isPending={isPending}
      requireType={email}
      requireTypeLabel={
        <>
          Pour confirmer, tapez l'email du compte : <strong>{email}</strong>
        </>
      }
      onConfirm={() => onSubmit(email)}
    />
  );
}
