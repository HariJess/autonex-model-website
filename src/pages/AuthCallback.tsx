import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Après OAuth (Google), Supabase redirige ici. Session dans l’URL ; on s’assure qu’un profil particulier existe.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError || !sessionData.session?.user) {
        navigate("/login", { replace: true });
        return;
      }

      const user = sessionData.session.user;
      const { data: existing, error: selErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (selErr) {
        setError(selErr.message);
        return;
      }

      if (!existing) {
        const meta = user.user_metadata ?? {};
        const fullName =
          (typeof meta.full_name === "string" && meta.full_name.trim()) ||
          (typeof meta.name === "string" && meta.name.trim()) ||
          (user.email?.split("@")[0] ?? "Utilisateur");

        const { error: insErr } = await supabase.from("profiles").insert({
          id: user.id,
          full_name: fullName,
          role: "particulier",
          phone: null,
          agency_id: null,
        });

        if (cancelled) return;
        if (insErr) {
          if (insErr.code === "23505") {
            navigate("/dashboard", { replace: true });
            return;
          }
          console.error(insErr);
          setError(insErr.message);
          return;
        }
      }

      navigate("/dashboard", { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <>
      <Helmet>
        <title>Connexion — AutoNex</title>
      </Helmet>
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        {!error ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="font-sans text-sm text-muted-foreground">Finalisation de la connexion…</p>
          </>
        ) : (
          <p className="font-sans text-sm text-destructive text-center max-w-md">{error}</p>
        )}
      </div>
    </>
  );
};

export default AuthCallback;
