import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      toast.error(updateError.message);
    } else {
      toast.success(t("auth.passwordUpdated"));
      navigate("/dashboard");
    }
  };

  return (
    <>
      <Helmet><title>{t("auth.resetPassword")} — ImmoNex</title></Helmet>
      <Header />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold">{t("auth.newPassword")}</h1>
          </div>

          {!ready ? (
            <div className="text-center space-y-4">
              <p className="font-sans text-muted-foreground">
                {t("auth.resetVerification")}
              </p>
              <p className="text-sm font-sans text-muted-foreground">
                {t("auth.resetExpired")}
              </p>
              <Link to="/forgot-password" className="text-primary font-sans text-sm hover:underline">
                {t("auth.requestNewLink")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-sans">{t("auth.newPassword")}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-sans"
                  required
                  minLength={6}
                  placeholder={t("auth.passwordMinLength")}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-sans">{t("auth.confirmPassword")}</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="font-sans"
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-destructive font-sans">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
                {loading ? t("auth.updating") : t("auth.updatePassword")}
              </Button>
            </form>
          )}

          <p className="text-center text-sm font-sans text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">{t("auth.backToLogin")}</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ResetPasswordPage;
