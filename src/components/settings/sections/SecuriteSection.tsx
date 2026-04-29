import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Loader2, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Password rules are stricter than signup (min 8 only) on purpose: password
 * change is a conscious action, so we take the opportunity to raise the bar
 * on at least one uppercase + one lowercase + one digit. Signup-time rules
 * stay unchanged to avoid breaking the onboarding funnel.
 */
const passwordRules = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre");

const passwordFormSchema = z
  .object({
    new_password: passwordRules,
    confirm_password: z.string(),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Les mots de passe ne correspondent pas",
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

function formatFrenchDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

export function SecuriteSection() {
  const { user, session } = useAuth();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const mutation = useMutation<void, Error, PasswordFormValues>({
    mutationFn: async (values) => {
      const { error } = await supabase.auth.updateUser({ password: values.new_password });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Mot de passe modifié");
      form.reset({ new_password: "", confirm_password: "" });
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors du changement de mot de passe");
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  const lastSignInIso = session?.user?.last_sign_in_at ?? user?.last_sign_in_at ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-sans text-2xl font-bold" id="section-securite-heading">Sécurité</h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Changez votre mot de passe et consultez vos informations de session.
        </p>
      </header>

      {/* Subsection A — Change password */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="font-sans text-base font-semibold">Changer le mot de passe</h3>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Formulaire changement de mot de passe">
          <div className="space-y-1.5">
            <Label htmlFor="securite-new-password" className="font-sans">Nouveau mot de passe</Label>
            <Input
              id="securite-new-password"
              type="password"
              className="font-sans"
              autoComplete="new-password"
              disabled={mutation.isPending}
              {...form.register("new_password")}
            />
            {form.formState.errors.new_password ? (
              <p className="text-xs text-destructive font-sans">{form.formState.errors.new_password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground font-sans">
                Au moins 8 caractères, une majuscule, une minuscule et un chiffre.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="securite-confirm-password" className="font-sans">Confirmer le mot de passe</Label>
            <Input
              id="securite-confirm-password"
              type="password"
              className="font-sans"
              autoComplete="new-password"
              disabled={mutation.isPending}
              {...form.register("confirm_password")}
            />
            {form.formState.errors.confirm_password ? (
              <p className="text-xs text-destructive font-sans">{form.formState.errors.confirm_password.message}</p>
            ) : null}
          </div>

          <Button type="submit" disabled={mutation.isPending} className="font-sans">
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                Mise à jour…
              </>
            ) : (
              "Modifier le mot de passe"
            )}
          </Button>
        </form>
      </section>

      {/* Subsection B — Last sign-in */}
      <section className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="font-sans text-base font-semibold">Informations de sécurité</h3>
        </div>
        <dl className="grid grid-cols-1 gap-2">
          <div>
            <dt className="text-xs font-sans text-muted-foreground">Dernière connexion</dt>
            <dd className="text-sm font-sans font-medium" data-testid="last-sign-in">
              {formatFrenchDateTime(lastSignInIso)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
