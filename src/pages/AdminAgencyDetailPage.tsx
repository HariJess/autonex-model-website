import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAgencyDetail } from "@/hooks/admin/useAdminAgencies";
import { AgencyActionsPanel } from "@/components/admin/agencies/AgencyActionsPanel";
import { WEEKDAYS, WEEKDAY_LABELS_FR } from "@/types/agency";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-MG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 py-1.5 text-sm">
      <dt className="font-sans text-muted-foreground">{label}</dt>
      <dd className="font-sans break-words">{value}</dd>
    </div>
  );
}

function AdminAgencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useAdminAgencyDetail(id);

  return (
    <>
      <Helmet>
        <title>Admin — {data?.agency.name ?? "Agence"} — AutoNex</title>
      </Helmet>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </div>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive font-sans">
            {error instanceof Error ? error.message : "Erreur de chargement"}
          </p>
          <Button variant="outline" size="sm" asChild className="font-sans">
            <Link to="/admin/agences">Retour</Link>
          </Button>
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground font-sans">Agence introuvable.</p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <Button variant="ghost" size="sm" asChild className="font-sans -ml-2">
              <Link to="/admin/agences" className="flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour aux agences
              </Link>
            </Button>
            <h1 className="font-sans text-2xl font-bold">{data.agency.name}</h1>
            <p className="font-sans text-sm text-muted-foreground">{data.agency.slug}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-sans text-lg">Identité</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl>
                    <Row label="Nom" value={data.agency.name} />
                    <Row label="Slug" value={data.agency.slug} />
                    <Row label="Contact commercial" value={data.agency.commercial_contact_name ?? "—"} />
                    <Row label="NIF" value={data.agency.nif ?? "—"} />
                    <Row label="STAT" value={data.agency.stat ?? "—"} />
                    <Row label="RC" value={data.agency.reg_commerce ?? "—"} />
                  </dl>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-sans text-lg">Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl>
                    <Row label="Email" value={data.agency.email ?? "—"} />
                    <Row label="Téléphone" value={data.agency.phone ?? "—"} />
                    <Row label="WhatsApp" value={data.agency.whatsapp_phone ?? "—"} />
                    <Row label="Site web" value={data.agency.website_url ?? "—"} />
                  </dl>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-sans text-lg">Adresse</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl>
                    <Row label="Adresse" value={data.agency.address ?? "—"} />
                    <Row label="Ville" value={data.agency.city ?? "—"} />
                    <Row label="Région" value={data.agency.region ?? "—"} />
                  </dl>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-sans text-lg">Présentation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 font-sans text-sm">
                  {data.agency.bio ? <p className="italic">{data.agency.bio}</p> : <p className="text-muted-foreground">Pas de bio.</p>}
                  {data.agency.description_long ? (
                    <p className="whitespace-pre-wrap">{data.agency.description_long}</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-sans text-lg">Horaires</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl>
                    {WEEKDAYS.map((day) => (
                      <Row
                        key={day}
                        label={WEEKDAY_LABELS_FR[day]}
                        value={data.agency.opening_hours[day] ?? "—"}
                      />
                    ))}
                  </dl>
                </CardContent>
              </Card>

              {data.agency.status !== "approved" && data.agency.rejection_reason ? (
                <Card className="rounded-2xl border-destructive/40">
                  <CardHeader>
                    <CardTitle className="font-sans text-lg text-destructive">
                      Raison du statut actuel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-sans text-sm">{data.agency.rejection_reason}</p>
                    <p className="mt-2 text-xs text-muted-foreground font-sans">
                      Revue le {formatDate(data.agency.reviewed_at)}
                    </p>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div className="lg:col-span-1 space-y-6">
              <AgencyActionsPanel detail={data} />
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-sans text-lg">Traces</CardTitle>
                </CardHeader>
                <CardContent className="font-sans text-sm space-y-1">
                  <p className="text-muted-foreground">
                    Soumis le <span className="text-foreground">{formatDate(data.agency.submitted_at)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Créée le <span className="text-foreground">{formatDate(data.agency.created_at)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Membres : <span className="text-foreground font-medium">{data.members.length}</span>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminAgencyDetailPage;
