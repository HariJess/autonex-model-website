import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Connexion réussie !");
      navigate("/dashboard");
    }
  };

  return (
    <>
      <Helmet><title>{t("auth.login")} — ImmoNex</title></Helmet>
      <Header />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold">{t("auth.login")}</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-sans" required />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.password")}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="font-sans" required />
            </div>
            <Link to="/forgot-password" className="text-sm text-primary font-sans hover:underline block">{t("auth.forgotPassword")}</Link>
            <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
              {loading ? "..." : t("auth.login")}
            </Button>
          </form>
          <p className="text-center text-sm font-sans text-muted-foreground">
            {t("auth.noAccount")} <Link to="/signup" className="text-primary hover:underline">{t("auth.signup")}</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

const SignupPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [role, setRole] = useState("particulier");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, { full_name: name, role, phone });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Inscription réussie ! Vérifiez votre email pour confirmer votre compte.");
      navigate("/login");
    }
  };

  return (
    <>
      <Helmet><title>{t("auth.signup")} — ImmoNex</title></Helmet>
      <Header />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold">{t("auth.signup")}</h1>
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.role")}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="font-sans"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="particulier">{t("auth.individual")}</SelectItem>
                  <SelectItem value="agence">{t("auth.agency")}</SelectItem>
                  <SelectItem value="promoteur">{t("auth.developer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="font-sans" required />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-sans" required />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="font-sans" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.password")}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="font-sans" required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
              {loading ? "..." : t("auth.signup")}
            </Button>
          </form>
          <p className="text-center text-sm font-sans text-muted-foreground">
            {t("auth.hasAccount")} <Link to="/login" className="text-primary hover:underline">{t("auth.login")}</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Email de réinitialisation envoyé !");
    }
  };

  return (
    <>
      <Helmet><title>Mot de passe oublié — ImmoNex</title></Helmet>
      <Header />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold">{t("auth.forgotPassword")}</h1>
          </div>
          {sent ? (
            <p className="text-center font-sans text-muted-foreground">
              Un email de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception.
            </p>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-sans">{t("auth.email")}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-sans" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
                {loading ? "..." : "Envoyer le lien"}
              </Button>
            </form>
          )}
          <p className="text-center text-sm font-sans text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Retour à la connexion</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export { LoginPage, SignupPage, ForgotPasswordPage };
