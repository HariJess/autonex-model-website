import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBetaAccess } from "@/hooks/useBetaAccess";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const BetaLoginPage = () => {
  const navigate = useNavigate();
  const { unlock, isUnlocked, isLockEnabled } = useBetaAccess();
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the lock is disabled or the visitor is already unlocked, the
  // /beta-login page is orphan — bounce them home.
  useEffect(() => {
    if (!isLockEnabled || isUnlocked) {
      navigate("/", { replace: true });
    }
  }, [isLockEnabled, isUnlocked, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    await sleep(500); // soft anti-spam delay (cosmetic)
    const success = unlock(code);
    if (success) {
      toast.success("Accès accordé. Bienvenue sur la beta AutoNex.");
      // Full reload (not navigate) to avoid an infinite render loop
      // between BetaLockGate and this page: the cookie is set
      // synchronously, but the React state of useBetaAccess does not
      // propagate before react-router replays the route, so the gate
      // would still see isUnlocked=false on the immediate render.
      // replace() also keeps /beta-login out of the back button.
      window.location.replace("/");
    } else {
      setError("Code incorrect, réessayez.");
      setCode("");
    }
    setSubmitting(false);
  };

  return (
    <>
      <Helmet>
        <title>Accès réservé — AutoNex</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 text-foreground">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <img
              src="/icon-192.png"
              alt="AutoNex"
              className="h-14 w-14 rounded-2xl"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/favicon.ico";
              }}
            />
            <h1 className="font-serif text-3xl font-bold tracking-tight">
              Accès réservé
            </h1>
            <p className="font-sans text-sm text-muted-foreground max-w-sm">
              AutoNex est actuellement en phase beta privée. Entrez le code
              d'accès pour continuer.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="beta-code" className="font-sans">
                Code d'accès
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="beta-code"
                  type={showCode ? "text" : "password"}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Code beta"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={error !== null}
                  className="pl-9 pr-10 font-sans h-11"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowCode((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showCode ? "Masquer le code" : "Afficher le code"}
                  tabIndex={-1}
                >
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error ? (
                <p
                  role="alert"
                  className="text-sm font-sans text-destructive"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={submitting || code.trim().length === 0}
              className="w-full font-sans h-11"
            >
              {submitting ? "Vérification..." : "Accéder"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground font-sans">
            © 2026 AutoNex Madagascar
          </p>
        </div>
      </div>
    </>
  );
};

export default BetaLoginPage;
