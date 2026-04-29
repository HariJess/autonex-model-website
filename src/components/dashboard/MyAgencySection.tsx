import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMyAgency, useUpdateMyAgency } from "@/hooks/useMyAgency";
import { AgencyStatusBadge } from "@/components/admin/agencies/AgencyStatusBadge";
import {
  WEEKDAYS,
  WEEKDAY_LABELS_FR,
  type OpeningHours,
  type SocialLinks,
} from "@/types/agency";

interface UserFormState {
  email: string;
  phone: string;
  whatsapp_phone: string;
  logo_url: string;
  cover_image_url: string;
  bio: string;
  description_long: string;
  website_url: string;
  opening_hours: OpeningHours;
  social_links: SocialLinks;
}

const EMPTY: UserFormState = {
  email: "", phone: "", whatsapp_phone: "",
  logo_url: "", cover_image_url: "",
  bio: "", description_long: "", website_url: "",
  opening_hours: {}, social_links: {},
};

const nullIfEmpty = (v: string): string | null => {
  const t = v.trim();
  return t.length > 0 ? t : null;
};

export function MyAgencySection() {
  const { data: agency, isLoading, error } = useMyAgency();
  const update = useUpdateMyAgency();
  const [f, setF] = useState<UserFormState>(EMPTY);

  useEffect(() => {
    if (!agency) return;
    setF({
      email: agency.email ?? "",
      phone: agency.phone ?? "",
      whatsapp_phone: agency.whatsapp_phone ?? "",
      logo_url: agency.logo_url ?? "",
      cover_image_url: agency.cover_image_url ?? "",
      bio: agency.bio ?? "",
      description_long: agency.description_long ?? "",
      website_url: agency.website_url ?? "",
      opening_hours: agency.opening_hours ?? {},
      social_links: agency.social_links ?? {},
    });
  }, [agency]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground font-sans">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre agence...
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 text-sm text-destructive font-sans">
          {error instanceof Error ? error.message : "Erreur"}
        </CardContent>
      </Card>
    );
  }
  if (!agency) return null;

  const set = <K extends keyof UserFormState>(k: K, v: UserFormState[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));
  const setHour = (day: string, value: string) =>
    setF((prev) => ({ ...prev, opening_hours: { ...prev.opening_hours, [day]: value } }));
  const setSocial = (k: keyof SocialLinks, v: string) =>
    setF((prev) => ({ ...prev, social_links: { ...prev.social_links, [k]: v || null } }));

  const handleSave = () => {
    update.mutate({
      email: nullIfEmpty(f.email),
      phone: nullIfEmpty(f.phone),
      whatsapp_phone: nullIfEmpty(f.whatsapp_phone),
      logo_url: nullIfEmpty(f.logo_url),
      cover_image_url: nullIfEmpty(f.cover_image_url),
      bio: nullIfEmpty(f.bio),
      description_long: nullIfEmpty(f.description_long),
      website_url: nullIfEmpty(f.website_url),
      opening_hours: f.opening_hours,
      social_links: f.social_links,
    });
  };

  const statusBanner = (() => {
    if (agency.status === "pending_review") {
      return {
        color: "bg-amber-50 border-amber-200 text-amber-900",
        text: "Votre agence est en attente de validation par notre équipe. Cela prend généralement 24-48h. Vous pouvez déjà renseigner votre fiche.",
      };
    }
    if (agency.status === "rejected") {
      return {
        color: "bg-red-50 border-red-200 text-red-900",
        text: `Votre fiche a été rejetée. Raison : ${agency.rejection_reason ?? "non précisée"}. Corrigez les informations ci-dessous — notre équipe réexaminera votre fiche après sauvegarde.`,
      };
    }
    if (agency.status === "suspended") {
      return {
        color: "bg-red-100 border-red-300 text-red-950",
        text: `Votre agence est actuellement suspendue. Raison : ${agency.rejection_reason ?? "non précisée"}. Contactez le support pour plus d'informations.`,
      };
    }
    return null;
  })();

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {agency.logo_url ? (
              <img
                src={agency.logo_url}
                alt={agency.name}
                className="w-14 h-14 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center font-sans text-2xl font-bold text-muted-foreground">
                {agency.name.charAt(0)}
              </div>
            )}
            <div className="space-y-1">
              <CardTitle className="font-sans">{agency.name}</CardTitle>
              <AgencyStatusBadge status={agency.status} verified={agency.verified} />
            </div>
          </div>
          {agency.status === "approved" ? (
            <Button variant="outline" size="sm" asChild className="font-sans">
              <a href={`/concessionnaires/${agency.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Voir ma fiche publique
              </a>
            </Button>
          ) : null}
        </div>
        <CardDescription className="font-sans pt-2">
          Modifiez les informations visibles publiquement.
          Les champs légaux (nom, NIF, STAT, RC, adresse) restent gérés par l'admin.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 font-sans">
        {statusBanner ? (
          <div className={`rounded-xl border p-4 text-sm ${statusBanner.color}`}>
            {statusBanner.text}
          </div>
        ) : null}

        <section className="space-y-3">
          <h3 className="font-sans text-sm font-semibold">Identité visuelle</h3>
          <div>
            <Label htmlFor="my-logo">Logo URL</Label>
            <Input id="my-logo" type="url" value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="my-cover">Image de couverture URL</Label>
            <Input id="my-cover" type="url" value={f.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-sans text-sm font-semibold">Présentation</h3>
          <div>
            <Label htmlFor="my-bio">Bio (courte)</Label>
            <Textarea id="my-bio" rows={2} value={f.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="my-desc">Description détaillée</Label>
            <Textarea id="my-desc" rows={5} value={f.description_long} onChange={(e) => set("description_long", e.target.value)} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-sans text-sm font-semibold">Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="my-email">Email</Label>
              <Input id="my-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="my-phone">Téléphone</Label>
              <Input id="my-phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="my-wa">WhatsApp</Label>
              <Input id="my-wa" value={f.whatsapp_phone} onChange={(e) => set("whatsapp_phone", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="my-web">Site web</Label>
              <Input id="my-web" type="url" value={f.website_url} onChange={(e) => set("website_url", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-sans text-sm font-semibold">Horaires</h3>
          <div className="space-y-1.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="flex items-center gap-2">
                <Label className="w-24 font-normal">{WEEKDAY_LABELS_FR[day]}</Label>
                <Input
                  value={f.opening_hours[day] ?? ""}
                  onChange={(e) => setHour(day, e.target.value)}
                  placeholder="08:00-18:00"
                  className="h-8"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-sans text-sm font-semibold">Réseaux sociaux</h3>
          {(["facebook", "instagram", "linkedin", "youtube", "tiktok"] as const).map((k) => (
            <div key={k}>
              <Label htmlFor={`my-social-${k}`} className="capitalize">{k}</Label>
              <Input
                id={`my-social-${k}`}
                type="url"
                value={f.social_links[k] ?? ""}
                onChange={(e) => setSocial(k, e.target.value)}
              />
            </div>
          ))}
        </section>

        <Button onClick={handleSave} disabled={update.isPending} className="font-sans">
          {update.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}

export default MyAgencySection;
