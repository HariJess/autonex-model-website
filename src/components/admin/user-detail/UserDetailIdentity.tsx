import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminUserOverview } from "@/types/admin";

interface UserDetailIdentityProps {
  profile: AdminUserOverview;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-MG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
      <dt className="font-sans text-muted-foreground">{label}</dt>
      <dd className="font-sans break-all">{value}</dd>
    </div>
  );
}

export function UserDetailIdentity({ profile }: UserDetailIdentityProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="font-serif text-lg">Identité</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>
          <Row label="Email" value={profile.email ?? "—"} />
          <Row label="Nom complet" value={profile.full_name?.trim() || "—"} />
          <Row label="Téléphone" value={profile.phone ?? "—"} />
          <Row label="WhatsApp" value={profile.whatsapp_phone ?? "—"} />
          <Row label="Type vendeur" value={profile.seller_type ?? "—"} />
          <Row label="Rôle" value={profile.role} />
          <Row label="Créé le" value={formatDate(profile.created_at)} />
          <Row
            label="Dernière connexion"
            value={formatDate(profile.last_sign_in_at)}
          />
          {profile.suspended ? (
            <>
              <Row label="Suspendu depuis" value={formatDate(profile.suspended_at)} />
              <Row
                label="Raison suspension"
                value={profile.suspended_reason ?? "—"}
              />
            </>
          ) : null}
          <Row label="UUID" value={profile.user_id} />
        </dl>
      </CardContent>
    </Card>
  );
}
