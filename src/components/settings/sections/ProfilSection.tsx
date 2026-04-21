import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Mail, ShieldCheck, User, CalendarClock, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { optionalMgPhoneSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

const profilFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  phone: optionalMgPhoneSchema,
  whatsapp_phone: optionalMgPhoneSchema,
});

type ProfilFormValues = z.infer<typeof profilFormSchema>;

/** Full profile row needed by the form (Profile context type is a narrow subset). */
type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  role: string;
  created_at: string | null;
  deletion_requested_at: string | null;
  deletion_scheduled_for: string | null;
  is_anonymized: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  particulier: "Particulier",
  agence: "Agence",
  admin: "Administrateur",
};

function formatFrenchDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);
}

const profileQueryKey = (userId: string) => ["settings-profile", userId] as const;

export function ProfilSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<ProfileRow>({
    queryKey: profileQueryKey(user?.id ?? "anon"),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    queryFn: async () => {
      if (!user?.id) throw new Error("not_authenticated");
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id, full_name, phone, whatsapp_phone, role, created_at, deletion_requested_at, deletion_scheduled_for, is_anonymized")
        .eq("id", user.id)
        .single();
      if (err) throw new Error(err.message);
      return data as ProfileRow;
    },
  });

  const form = useForm<ProfilFormValues>({
    resolver: zodResolver(profilFormSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      whatsapp_phone: "",
    },
  });

  // Hydrate the form once the profile lands.
  useEffect(() => {
    if (!profile) return;
    form.reset({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      whatsapp_phone: profile.whatsapp_phone ?? "",
    });
  }, [profile, form]);

  const isDeletionPending = Boolean(profile?.deletion_requested_at) && !profile?.is_anonymized;

  const mutation = useMutation<void, Error, ProfilFormValues>({
    mutationFn: async (values) => {
      if (!user?.id) throw new Error("not_authenticated");
      const { error: err } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name.trim(),
          phone: values.phone.length > 0 ? values.phone : null,
          whatsapp_phone: values.whatsapp_phone.length > 0 ? values.whatsapp_phone : null,
        })
        .eq("id", user.id);
      if (err) throw new Error(err.message);
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      if (user?.id) void queryClient.invalidateQueries({ queryKey: profileQueryKey(user.id) });
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la mise à jour");
    },
  });

  if (!user) {
    return <p className="font-sans text-sm text-muted-foreground">Connexion requise.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur de chargement</AlertTitle>
        <AlertDescription>{error instanceof Error ? error.message : "Profil indisponible."}</AlertDescription>
      </Alert>
    );
  }

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));
  const formDisabled = isDeletionPending || mutation.isPending;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl font-bold" id="section-profil-heading">Profil</h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Modifiez votre identité et vos coordonnées publiques.
        </p>
      </header>

      {/* Read-only info card */}
      <div className="rounded-2xl border border-border bg-muted/20 p-4 md:p-5">
        <p className="font-serif text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Informations compte
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
            <div className="min-w-0">
              <dt className="text-xs font-sans text-muted-foreground">Email</dt>
              <dd className="text-sm font-sans font-medium truncate">{user.email ?? "—"}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
            <div>
              <dt className="text-xs font-sans text-muted-foreground">Type de compte</dt>
              <dd className="text-sm font-sans font-medium">{ROLE_LABELS[profile.role] ?? profile.role}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CalendarClock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
            <div>
              <dt className="text-xs font-sans text-muted-foreground">Membre depuis</dt>
              <dd className="text-sm font-sans font-medium">{formatFrenchDate(profile.created_at)}</dd>
            </div>
          </div>
        </dl>
      </div>

      {isDeletionPending ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Suppression en cours</AlertTitle>
          <AlertDescription>
            Modifications indisponibles, votre compte est en cours de suppression. Rendez-vous dans la section
            « Zone de danger » pour annuler.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Editable form */}
      <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Formulaire de profil">
        <div className="space-y-1.5">
          <Label htmlFor="profil-full-name" className="font-sans">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" aria-hidden /> Nom complet
            </span>
          </Label>
          <Input
            id="profil-full-name"
            className="font-sans"
            maxLength={100}
            disabled={formDisabled}
            {...form.register("full_name")}
          />
          {form.formState.errors.full_name ? (
            <p className="text-xs text-destructive font-sans">{form.formState.errors.full_name.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profil-phone" className="font-sans">Téléphone</Label>
            <Input
              id="profil-phone"
              className="font-sans"
              placeholder="+261..."
              maxLength={30}
              disabled={formDisabled}
              {...form.register("phone")}
            />
            {form.formState.errors.phone ? (
              <p className="text-xs text-destructive font-sans">{form.formState.errors.phone.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profil-whatsapp" className="font-sans">WhatsApp (optionnel)</Label>
            <Input
              id="profil-whatsapp"
              className="font-sans"
              placeholder="+261..."
              maxLength={30}
              disabled={formDisabled}
              {...form.register("whatsapp_phone")}
            />
            {form.formState.errors.whatsapp_phone ? (
              <p className="text-xs text-destructive font-sans">{form.formState.errors.whatsapp_phone.message}</p>
            ) : null}
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={formDisabled} className={cn("font-sans")}>
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                Enregistrement…
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
