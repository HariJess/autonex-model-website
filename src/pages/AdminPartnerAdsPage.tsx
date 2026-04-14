import { Helmet } from "react-helmet-async";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PARTNER_AD_PLACEMENT_KEYS, type PartnerAdPlacementKey } from "@/lib/partnerAds";

type CampaignRow = Tables<"partner_ad_campaigns">;
type StatusFilter = "all" | "active" | "inactive";

const placementLabels: Record<PartnerAdPlacementKey, string> = {
  homeBillboard: "Accueil — Billboard",
  homeSponsorStrip: "Accueil — Bandeau sponsor",
  searchTopBanner: "Recherche — Bandeau haut",
  listingSponsor: "Fiche annonce — Bloc sponsor",
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const emptyForm = {
  id: null as string | null,
  advertiser_name: "",
  internal_title: "",
  internal_description: "",
  placement_key: "homeBillboard" as PartnerAdPlacementKey,
  image_url: "",
  destination_url: "",
  cta_label: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  priority: 0,
};

const AdminPartnerAdsPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["admin-partner-campaigns"],
    queryFn: async (): Promise<CampaignRow[]> => {
      const { data, error } = await supabase
        .from("partner_ad_campaigns")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const filteredCampaigns = useMemo(() => {
    if (statusFilter === "all") return campaigns;
    if (statusFilter === "active") return campaigns.filter((c) => c.is_active);
    return campaigns.filter((c) => !c.is_active);
  }, [campaigns, statusFilter]);

  const saveCampaign = useMutation({
    mutationFn: async () => {
      const payload: Tables<"partner_ad_campaigns">["Insert"] = {
        advertiser_name: form.advertiser_name.trim(),
        internal_title: form.internal_title.trim(),
        internal_description: form.internal_description.trim() || null,
        placement_key: form.placement_key,
        media_type: "image",
        image_url: form.image_url.trim(),
        destination_url: form.destination_url.trim() || null,
        cta_label: form.cta_label.trim() || null,
        starts_at: fromLocalInputValue(form.starts_at) ?? new Date().toISOString(),
        ends_at: fromLocalInputValue(form.ends_at),
        is_active: form.is_active,
        priority: Number(form.priority) || 0,
      };
      if (!payload.advertiser_name || !payload.internal_title || !payload.image_url) {
        throw new Error("Champs obligatoires manquants (annonceur, titre interne, image).");
      }

      if (form.id) {
        const { error } = await supabase.from("partner_ad_campaigns").update(payload).eq("id", form.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("partner_ad_campaigns").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["partner-campaign"] });
      toast.success(form.id ? "Campagne mise à jour." : "Campagne créée.");
      setForm({ ...emptyForm });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase
        .from("partner_ad_campaigns")
        .update({ is_active: next })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["partner-campaign"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onEdit = (c: CampaignRow) => {
    setForm({
      id: c.id,
      advertiser_name: c.advertiser_name,
      internal_title: c.internal_title,
      internal_description: c.internal_description ?? "",
      placement_key: c.placement_key as PartnerAdPlacementKey,
      image_url: c.image_url,
      destination_url: c.destination_url ?? "",
      cta_label: c.cta_label ?? "",
      starts_at: toLocalInputValue(c.starts_at),
      ends_at: toLocalInputValue(c.ends_at),
      is_active: c.is_active,
      priority: c.priority ?? 0,
    });
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${cleanExt || "jpg"}`;
      const { error: uploadError } = await supabase.storage.from("partner-ads").upload(path, file, {
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = supabase.storage.from("partner-ads").getPublicUrl(path);
      setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
      toast.success("Image chargée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors du chargement d’image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin — Campagnes partenaires — ImmoNex</title>
      </Helmet>
      <div className="max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="font-sans">
            <Link to="/admin/monetisation">
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin monétisation
            </Link>
          </Button>
          <h1 className="font-serif text-2xl font-bold">Campagnes publicitaires partenaires (admin)</h1>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">Créer / modifier une campagne</CardTitle>
            <CardDescription className="font-sans">
              Gestion interne uniquement. Aucune auto-gestion publique par les partenaires.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Annonceur</Label>
              <Input
                value={form.advertiser_name}
                onChange={(e) => setForm((p) => ({ ...p, advertiser_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Titre interne</Label>
              <Input
                value={form.internal_title}
                onChange={(e) => setForm((p) => ({ ...p, internal_title: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description interne (optionnel)</Label>
              <Textarea
                rows={2}
                value={form.internal_description}
                onChange={(e) => setForm((p) => ({ ...p, internal_description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Placement</Label>
              <Select
                value={form.placement_key}
                onValueChange={(v: PartnerAdPlacementKey) => setForm((p) => ({ ...p, placement_key: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_AD_PLACEMENT_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {placementLabels[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Input
                type="number"
                value={String(form.priority)}
                onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="https://..."
              />
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="partner-ad-file"
                  className="inline-flex items-center gap-2 text-xs cursor-pointer rounded-md border px-2 py-1 hover:bg-muted"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Chargement..." : "Charger une image"}
                </Label>
                <input
                  id="partner-ad-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL destination (optionnel)</Label>
              <Input
                value={form.destination_url}
                onChange={(e) => setForm((p) => ({ ...p, destination_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Label CTA (optionnel)</Label>
              <Input
                value={form.cta_label}
                onChange={(e) => setForm((p) => ({ ...p, cta_label: e.target.value }))}
                placeholder="Découvrir"
              />
            </div>
            <div className="space-y-2">
              <Label>Début</Label>
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fin (optionnel)</Label>
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
              <Label>Campagne active</Label>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Button className="font-sans" onClick={() => saveCampaign.mutate()} disabled={saveCampaign.isPending}>
                {saveCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {form.id ? "Mettre à jour" : "Créer la campagne"}
              </Button>
              {form.id ? (
                <Button variant="outline" className="font-sans" onClick={() => setForm({ ...emptyForm })}>
                  Annuler l’édition
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">Campagnes existantes</CardTitle>
            <CardDescription className="font-sans">Filtrage rapide et activation/désactivation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>
                Toutes
              </Button>
              <Button variant={statusFilter === "active" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("active")}>
                Actives
              </Button>
              <Button variant={statusFilter === "inactive" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("inactive")}>
                Inactives
              </Button>
            </div>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : filteredCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">Aucune campagne.</p>
            ) : (
              <ul className="space-y-3">
                {filteredCampaigns.map((c) => (
                  <li key={c.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium font-sans">{c.advertiser_name}</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {placementLabels[c.placement_key as PartnerAdPlacementKey] ?? c.placement_key} · priorité {c.priority}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {new Date(c.starts_at).toLocaleString("fr-MG")}
                          {c.ends_at ? ` → ${new Date(c.ends_at).toLocaleString("fr-MG")}` : " → sans fin"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit(c)}>
                          Modifier
                        </Button>
                        <Button
                          variant={c.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleActive.mutate({ id: c.id, next: !c.is_active })}
                        >
                          {c.is_active ? "Désactiver" : "Activer"}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AdminPartnerAdsPage;
