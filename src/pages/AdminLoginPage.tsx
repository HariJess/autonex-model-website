import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validation";

function AdminLoginPage() {
  const { user, profile, loading, signIn, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const denied = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("denied") === "1";
  }, [location.search]);

  useEffect(() => {
    if (!loading && user && profile?.role === "admin") {
      navigate("/admin/overview", { replace: true });
    }
  }, [loading, user, profile?.role, navigate]);

  if (!loading && user && profile?.role === "admin") {
    return <Navigate to="/admin/overview" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Identifiants invalides.");
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Connexion réussie.");
  };

  return (
    <>
      <Helmet>
        <title>Back-office admin — Connexion — ImmoNex</title>
      </Helmet>
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md rounded-2xl">
          <CardHeader className="space-y-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="font-serif text-2xl">Back-office admin</CardTitle>
            <CardDescription className="font-sans">
              Accès réservé aux administrateurs ImmoNex.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(denied || (!loading && !!user && profile?.role !== "admin")) && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-sans text-destructive">
                Accès refusé : ce compte n’a pas les droits administrateur.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Mot de passe</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full font-sans" disabled={submitting || loading}>
                {submitting ? "Connexion..." : "Se connecter au back-office"}
              </Button>
            </form>
            {!loading && user && profile?.role !== "admin" && (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-3 font-sans"
                onClick={() => void signOut()}
              >
                Se déconnecter de ce compte
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default AdminLoginPage;
