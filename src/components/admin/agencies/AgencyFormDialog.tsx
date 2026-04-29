import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminAgencyActions } from "@/hooks/admin/useAdminAgencies";
import {
  WEEKDAYS,
  WEEKDAY_LABELS_FR,
  type Agency,
  type OpeningHours,
  type SocialLinks,
} from "@/types/agency";

interface AgencyFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  target: Agency | null;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  slug: string;
  email: string;
  phone: string;
  whatsapp_phone: string;
  commercial_contact_name: string;
  address: string;
  city: string;
  region: string;
  nif: string;
  stat: string;
  reg_commerce: string;
  logo_url: string;
  cover_image_url: string;
  bio: string;
  description_long: string;
  website_url: string;
  opening_hours: OpeningHours;
  social_links: SocialLinks;
  verified: boolean;
}

const EMPTY_FORM: FormState = {
  name: "", slug: "", email: "", phone: "", whatsapp_phone: "",
  commercial_contact_name: "", address: "", city: "", region: "",
  nif: "", stat: "", reg_commerce: "",
  logo_url: "", cover_image_url: "", bio: "", description_long: "",
  website_url: "", opening_hours: {}, social_links: {}, verified: false,
};

function hydrateForm(a: Agency): FormState {
  return {
    name: a.name,
    slug: a.slug,
    email: a.email ?? "",
    phone: a.phone ?? "",
    whatsapp_phone: a.whatsapp_phone ?? "",
    commercial_contact_name: a.commercial_contact_name ?? "",
    address: a.address ?? "",
    city: a.city ?? "",
    region: a.region ?? "",
    nif: a.nif ?? "",
    stat: a.stat ?? "",
    reg_commerce: a.reg_commerce ?? "",
    logo_url: a.logo_url ?? "",
    cover_image_url: a.cover_image_url ?? "",
    bio: a.bio ?? "",
    description_long: a.description_long ?? "",
    website_url: a.website_url ?? "",
    opening_hours: a.opening_hours ?? {},
    social_links: a.social_links ?? {},
    verified: a.verified,
  };
}

const nullIfEmpty = (v: string): string | null => {
  const t = v.trim();
  return t.length > 0 ? t : null;
};

function AgencyFormDialog({ open, mode, target, onOpenChange }: AgencyFormDialogProps) {
  const { createAgency, updateAgency } = useAdminAgencyActions();
  const isEdit = mode === "edit" && target !== null;
  const [f, setF] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setF(isEdit && target ? hydrateForm(target) : EMPTY_FORM);
  }, [open, isEdit, target]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const setHour = (day: string, value: string) =>
    setF((prev) => ({ ...prev, opening_hours: { ...prev.opening_hours, [day]: value } }));

  const setSocial = (k: keyof SocialLinks, v: string) =>
    setF((prev) => ({ ...prev, social_links: { ...prev.social_links, [k]: v || null } }));

  const nameValid = f.name.trim().length > 0;
  const canSubmit = nameValid && !createAgency.isPending && !updateAgency.isPending;
  const isPending = createAgency.isPending || updateAgency.isPending;

  const handleSubmit = () => {
    const shared = {
      name: f.name.trim(),
      email: nullIfEmpty(f.email),
      phone: nullIfEmpty(f.phone),
      whatsapp_phone: nullIfEmpty(f.whatsapp_phone),
      commercial_contact_name: nullIfEmpty(f.commercial_contact_name),
      address: nullIfEmpty(f.address),
      city: nullIfEmpty(f.city),
      region: nullIfEmpty(f.region),
      nif: nullIfEmpty(f.nif),
      stat: nullIfEmpty(f.stat),
      reg_commerce: nullIfEmpty(f.reg_commerce),
      logo_url: nullIfEmpty(f.logo_url),
      bio: nullIfEmpty(f.bio),
      website_url: nullIfEmpty(f.website_url),
    };

    if (isEdit && target) {
      updateAgency.mutate(
        {
          ...shared,
          id: target.id,
          slug: f.slug.trim(),
          cover_image_url: nullIfEmpty(f.cover_image_url),
          description_long: nullIfEmpty(f.description_long),
          opening_hours: f.opening_hours,
          social_links: f.social_links,
          verified: f.verified,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createAgency.mutate(shared, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-sans">
            {isEdit ? `Modifier ${target?.name}` : "Nouvelle agence"}
          </DialogTitle>
          <DialogDescription className="font-sans">
            {isEdit
              ? "Édition complète admin. Slug modifiable (impact SEO)."
              : "Création manuelle. L'agence sera automatiquement approuvée."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 font-sans">
          <section className="space-y-3">
            <h3 className="font-sans text-sm font-semibold">Identité</h3>
            <div>
              <Label htmlFor="ag-name">Nom *</Label>
              <Input id="ag-name" value={f.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            {isEdit ? (
              <div>
                <Label htmlFor="ag-slug">Slug</Label>
                <Input id="ag-slug" value={f.slug} onChange={(e) => set("slug", e.target.value)} />
              </div>
            ) : null}
            <div>
              <Label htmlFor="ag-contact">Contact commercial</Label>
              <Input id="ag-contact" value={f.commercial_contact_name} onChange={(e) => set("commercial_contact_name", e.target.value)} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-sans text-sm font-semibold">Légal (Madagascar)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label htmlFor="ag-nif">NIF</Label>
                <Input id="ag-nif" value={f.nif} onChange={(e) => set("nif", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ag-stat">STAT</Label>
                <Input id="ag-stat" value={f.stat} onChange={(e) => set("stat", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ag-rc">RC</Label>
                <Input id="ag-rc" value={f.reg_commerce} onChange={(e) => set("reg_commerce", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-sans text-sm font-semibold">Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label htmlFor="ag-email">Email</Label>
                <Input id="ag-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ag-phone">Téléphone</Label>
                <Input id="ag-phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ag-wa">WhatsApp</Label>
                <Input id="ag-wa" value={f.whatsapp_phone} onChange={(e) => set("whatsapp_phone", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ag-web">Site web</Label>
                <Input id="ag-web" type="url" value={f.website_url} onChange={(e) => set("website_url", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-sans text-sm font-semibold">Adresse</h3>
            <div>
              <Label htmlFor="ag-addr">Adresse</Label>
              <Input id="ag-addr" value={f.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="ag-city">Ville</Label>
                <Input id="ag-city" value={f.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ag-region">Région</Label>
                <Input id="ag-region" value={f.region} onChange={(e) => set("region", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-sans text-sm font-semibold">Identité visuelle</h3>
            <div>
              <Label htmlFor="ag-logo">Logo URL</Label>
              <Input id="ag-logo" type="url" value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} />
            </div>
            {isEdit ? (
              <div>
                <Label htmlFor="ag-cover">Image de couverture URL</Label>
                <Input id="ag-cover" type="url" value={f.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} />
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="font-sans text-sm font-semibold">Présentation</h3>
            <div>
              <Label htmlFor="ag-bio">Bio (court)</Label>
              <Textarea id="ag-bio" rows={2} value={f.bio} onChange={(e) => set("bio", e.target.value)} />
            </div>
            {isEdit ? (
              <div>
                <Label htmlFor="ag-desc">Description longue</Label>
                <Textarea id="ag-desc" rows={5} value={f.description_long} onChange={(e) => set("description_long", e.target.value)} />
              </div>
            ) : null}
          </section>

          {isEdit ? (
            <>
              <section className="space-y-3">
                <h3 className="font-sans text-sm font-semibold">Horaires d'ouverture</h3>
                <p className="text-xs text-muted-foreground">
                  Format : "08:00-18:00" ou "closed" (vide = non renseigné)
                </p>
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
                    <Label htmlFor={`ag-social-${k}`} className="capitalize">{k}</Label>
                    <Input
                      id={`ag-social-${k}`}
                      type="url"
                      value={f.social_links[k] ?? ""}
                      onChange={(e) => setSocial(k, e.target.value)}
                    />
                  </div>
                ))}
              </section>

              <section className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ag-verified"
                    checked={f.verified}
                    onCheckedChange={(v) => set("verified", v === true)}
                  />
                  <Label htmlFor="ag-verified" className="font-normal">
                    Partenaire AutoNex vérifié (badge public)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le statut (en attente / approuvée / rejetée / suspendue) se gère depuis le panneau Actions.
                </p>
              </section>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="font-sans">
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="font-sans">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AgencyFormDialog;
