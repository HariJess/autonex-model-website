import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, type SignUpMetadata } from "@/contexts/AuthContext";
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
      toast.success(t("auth.loginSuccess"));
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
              {loading ? t("common.loading") : t("auth.login")}
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
  const [role, setRole] = useState<"particulier" | "agence">("particulier");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agencyAddress, setAgencyAddress] = useState("");
  const [commercialContact, setCommercialContact] = useState("");
  const [nif, setNif] = useState("");
  const [stat, setStat] = useState("");
  const [regCommerce, setRegCommerce] = useState("");
  const [agencyLogoUrl, setAgencyLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "agence") {
      const missing =
        !agencyName.trim() ||
        !phone.trim() ||
        !agencyAddress.trim() ||
        !commercialContact.trim() ||
        !nif.trim() ||
        !stat.trim() ||
        !regCommerce.trim();
      if (missing) {
        toast.error(
          t(
            "auth.agencyFieldsRequired",
            "Pour un compte agence, renseignez le nom, l’adresse, le contact, le téléphone, le NIF, le STAT et le RC."
          )
        );
        return;
      }
    }
    setLoading(true);
    let metadata: SignUpMetadata;
    if (role === "particulier") {
      metadata = {
        full_name: name.trim(),
        role: "particulier",
        phone: phone.trim(),
      };
    } else {
      metadata = {
        full_name: commercialContact.trim(),
        role: "agence",
        phone: phone.trim(),
        agency_name: agencyName.trim(),
        agency_address: agencyAddress.trim(),
        commercial_contact_name: commercialContact.trim(),
        nif: nif.trim(),
        stat: stat.trim(),
        reg_commerce: regCommerce.trim(),
        agency_logo_url: agencyLogoUrl.trim() || undefined,
      };
    }
    const { error } = await signUp(email, password, metadata);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.signupSuccess"));
      navigate("/login");
    }
  };

  return (
    <>
      <Helmet><title>{t("auth.signup")} — ImmoNex</title></Helmet>
      <Header />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-serif text-2xl font-bold">{t("auth.signup")}</h1>
            <p className="text-sm text-muted-foreground font-sans">
              {t("auth.signupSubtitle", "Particulier ou agence : un seul compte, des parcours adaptés.")}
            </p>
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.role")}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "particulier" | "agence")}>
                <SelectTrigger className="font-sans"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="particulier">{t("auth.individual")}</SelectItem>
                  <SelectItem value="agence">{t("auth.agency")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "particulier" ? (
              <div className="space-y-2">
                <Label className="font-sans">{t("auth.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="font-sans" required maxLength={100} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="font-sans">{t("auth.agencyName", "Nom de l’agence")}</Label>
                  <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className="font-sans" required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label className="font-sans">{t("auth.commercialContact", "Contact commercial")}</Label>
                  <Input
                    value={commercialContact}
                    onChange={(e) => setCommercialContact(e.target.value)}
                    className="font-sans"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-sans">{t("auth.agencyAddress", "Adresse du siège")}</Label>
                  <Textarea
                    value={agencyAddress}
                    onChange={(e) => setAgencyAddress(e.target.value)}
                    className="font-sans min-h-[72px]"
                    required
                    maxLength={500}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="font-sans">NIF</Label>
                    <Input value={nif} onChange={(e) => setNif(e.target.value)} className="font-sans" required maxLength={64} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-sans">STAT</Label>
                    <Input value={stat} onChange={(e) => setStat(e.target.value)} className="font-sans" required maxLength={64} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-sans">RC</Label>
                    <Input value={regCommerce} onChange={(e) => setRegCommerce(e.target.value)} className="font-sans" required maxLength={64} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-sans">{t("auth.agencyLogoUrl", "Logo (URL, optionnel)")}</Label>
                  <Input
                    type="url"
                    value={agencyLogoUrl}
                    onChange={(e) => setAgencyLogoUrl(e.target.value)}
                    className="font-sans"
                    placeholder="https://"
                    maxLength={500}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="font-sans">{t("auth.email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-sans" required maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.phone")}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="font-sans"
                maxLength={30}
                required={role === "agence"}
              />
              {role === "agence" && (
                <p className="text-xs text-muted-foreground font-sans">{t("auth.phoneAgencyHint", "Numéro joignable pour les clients.")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.password")}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="font-sans" required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
              {loading ? t("common.loading") : t("auth.signup")}
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
      toast.success(t("auth.resetSent"));
    }
  };

  return (
    <>
      <Helmet><title>{t("auth.forgotPassword")} — ImmoNex</title></Helmet>
      <Header />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold">{t("auth.forgotPassword")}</h1>
          </div>
          {sent ? (
            <p className="text-center font-sans text-muted-foreground">
              {t("auth.resetEmailSent")} <strong>{email}</strong>. {t("auth.checkInbox")}
            </p>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-sans">{t("auth.email")}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-sans" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
                {loading ? t("common.loading") : t("auth.sendResetLink")}
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

export { LoginPage, SignupPage, ForgotPasswordPage };
