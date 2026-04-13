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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, type SignUpMetadata } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { agencyFormSchema, loginSchema, optionalMgPhoneSchema, signupCommonSchema } from "@/lib/validation";

/** Compare téléphones / champs pour éviter qu’un numéro soit saisi comme « nom du contact ». */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function contactNameMatchesPhone(contact: string, phone: string): boolean {
  const c = digitsOnly(contact);
  const p = digitsOnly(phone);
  if (!c || !p) return false;
  if (c === p) return true;
  if (c.length >= 8 && p.length >= 8 && (c.endsWith(p) || p.endsWith(c))) return true;
  return false;
}

function looksLikePhoneNumberOnly(s: string): boolean {
  const t = s.trim();
  if (t.length < 6) return false;
  return /^[\d\s\-+().]+$/.test(t);
}

function GoogleLogo() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();
  const [loginKind, setLoginKind] = useState<"particulier" | "agence">("particulier");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    if (loginKind !== "particulier") return;
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      toast.error(error.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("common.error"));
      return;
    }
    setLoading(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
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
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-sm space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold">{t("auth.login")}</h1>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLoginKind("particulier")}
              className={`rounded-xl border px-3 py-2.5 min-h-11 text-sm font-sans transition-colors touch-manipulation ${
                loginKind === "particulier"
                  ? "border-primary ring-1 ring-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {t("auth.loginKindParticulier", "Particulier")}
            </button>
            <button
              type="button"
              onClick={() => setLoginKind("agence")}
              className={`rounded-xl border px-3 py-2.5 min-h-11 text-sm font-sans transition-colors touch-manipulation ${
                loginKind === "agence"
                  ? "border-primary ring-1 ring-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {t("auth.loginKindAgence", "Agence")}
            </button>
          </div>
          {loginKind === "particulier" && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="w-full font-sans gap-2 border-border bg-background hover:bg-muted min-h-11 touch-manipulation"
                onClick={handleGoogle}
              >
                <GoogleLogo />
                {t("auth.continueWithGoogle", "Continuer avec Google")}
              </Button>
              <p className="text-xs text-center text-muted-foreground font-sans">
                {t("auth.googleLoginParticulierOnly", "Réservé aux comptes particuliers. Les agences utilisent email et mot de passe.")}
              </p>
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground font-sans">{t("auth.orWithEmail", "ou")}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}
          {loginKind === "agence" && (
            <p className="text-xs text-muted-foreground font-sans text-center">
              {t("auth.agencyLoginEmailOnly", "Connexion agence : utilisez l’email et le mot de passe de votre compte professionnel.")}
            </p>
          )}
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
            <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans min-h-12 touch-manipulation" style={{ color: "#FAFAFA" }}>
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
  const { signUp, signInWithGoogle } = useAuth();
  const [role, setRole] = useState<"particulier" | "agence">("particulier");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [agencyAddress, setAgencyAddress] = useState("");
  const [commercialContact, setCommercialContact] = useState("");
  const [nif, setNif] = useState("");
  const [stat, setStat] = useState("");
  const [regCommerce, setRegCommerce] = useState("");
  const [agencyLogoUrl, setAgencyLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignup = async () => {
    if (role !== "particulier") return;
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      toast.error(error.message);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const commonParsed = signupCommonSchema.safeParse({ email, phone, password, passwordConfirm });
    if (!commonParsed.success) {
      toast.error(commonParsed.error.issues[0]?.message ?? t("common.error"));
      return;
    }
    if (commonParsed.data.password !== commonParsed.data.passwordConfirm) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }
    if (whatsapp.trim()) {
      const waParsed = optionalMgPhoneSchema.safeParse(whatsapp);
      if (!waParsed.success) {
        toast.error(waParsed.error.issues[0]?.message ?? t("common.error"));
        return;
      }
    }
    if (role === "particulier") {
      if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
        toast.error(t("auth.fieldsRequired", "Renseignez prénom, nom et téléphone."));
        return;
      }
      if (!contactConsent) {
        toast.error(t("auth.contactConsentRequired"));
        return;
      }
    }
    if (role === "agence") {
      const agencyParsed = agencyFormSchema.safeParse({
        agencyName,
        agencyAddress,
        commercialContact,
        nif,
        stat,
        regCommerce,
      });
      if (!agencyParsed.success) {
        toast.error(t("auth.agencyFieldsRequired"));
        return;
      }
      const contactName = commercialContact.trim();
      const phoneNorm = phone.trim();
      if (contactNameMatchesPhone(contactName, phoneNorm)) {
        toast.error(t("auth.contactNameNotPhone"));
        return;
      }
      if (looksLikePhoneNumberOnly(contactName)) {
        toast.error(t("auth.contactNameNotNumeric"));
        return;
      }
    }
    setLoading(true);
    let metadata: SignUpMetadata;
    if (role === "particulier") {
      const particulierFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      metadata = {
        full_name: particulierFullName,
        role: "particulier",
        phone: commonParsed.data.phone,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        whatsapp_phone: whatsapp.trim() || undefined,
        contact_consent: true,
      };
    } else {
      const contactName = commercialContact.trim();
      metadata = {
        full_name: contactName,
        role: "agence",
        phone: commonParsed.data.phone,
        agency_name: agencyName.trim(),
        agency_address: agencyAddress.trim(),
        commercial_contact_name: contactName,
        nif: nif.trim(),
        stat: stat.trim(),
        reg_commerce: regCommerce.trim(),
        agency_logo_url: agencyLogoUrl.trim() || undefined,
      };
    }
    const { error } = await signUp(commonParsed.data.email, commonParsed.data.password, metadata);
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
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-lg bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-serif text-2xl font-bold">{t("auth.signupChooseTitle", "Créer un compte")}</h1>
            <p className="text-sm text-muted-foreground font-sans">
              {t("auth.signupSubtitle", "Particulier ou agence : un seul compte, des parcours adaptés.")}
            </p>
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRole("particulier");
                  setAgencyName("");
                  setAgencyAddress("");
                  setCommercialContact("");
                  setNif("");
                  setStat("");
                  setRegCommerce("");
                  setAgencyLogoUrl("");
                }}
                className={`rounded-xl border p-4 min-h-16 text-left transition-colors font-sans touch-manipulation ${role === "particulier" ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <p className="font-semibold text-sm">{t("auth.signupParticulierCta", "Compte particulier")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("auth.signupParticulierDesc", "Propriétaire ou vendeur indépendant")}</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("agence");
                  setFirstName("");
                  setLastName("");
                  setWhatsapp("");
                  setContactConsent(false);
                }}
                className={`rounded-xl border p-4 min-h-16 text-left transition-colors font-sans touch-manipulation ${role === "agence" ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <p className="font-semibold text-sm">{t("auth.signupProCta", "Professionnel / agence")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("auth.signupProDesc", "Agence immobilière ou activité structurée")}</p>
              </button>
            </div>

            {role === "particulier" && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  className="w-full font-sans gap-2 border-border bg-background hover:bg-muted min-h-11 touch-manipulation"
                  onClick={handleGoogleSignup}
                >
                  <GoogleLogo />
                  {t("auth.continueWithGoogle", "Continuer avec Google")}
                </Button>
                <p className="text-xs text-center text-muted-foreground font-sans">
                  {t(
                    "auth.googleSignupParticulierOnly",
                    "Compte particulier uniquement — pas d’inscription agence via Google.",
                  )}
                </p>
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground font-sans">{t("auth.orWithEmail", "ou")}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </div>
            )}

            {role === "particulier" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="font-sans">{t("auth.firstName", "Prénom")} *</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="font-sans" required maxLength={80} autoComplete="given-name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-sans">{t("auth.lastName", "Nom")} *</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="font-sans" required maxLength={80} autoComplete="family-name" />
                  </div>
                </div>
              </>
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
                    autoComplete="name"
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
              <Label className="font-sans">{t("auth.phone")} *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="font-sans"
                maxLength={30}
                required
                autoComplete="tel"
              />
              {role === "agence" && (
                <p className="text-xs text-muted-foreground font-sans">{t("auth.phoneAgencyHint", "Numéro joignable pour les clients.")}</p>
              )}
            </div>
            {role === "particulier" && (
              <div className="space-y-2">
                <Label className="font-sans">{t("auth.whatsapp", "WhatsApp (optionnel)")}</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="font-sans"
                  maxLength={30}
                  placeholder="+261 …"
                  autoComplete="tel"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.password")}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="font-sans" required minLength={8} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.confirmPassword", "Confirmer le mot de passe")}</Label>
              <Input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="font-sans" required minLength={8} autoComplete="new-password" />
            </div>
            {role === "particulier" && (
              <label className="flex items-start gap-2 cursor-pointer font-sans text-sm">
                <Checkbox checked={contactConsent} onCheckedChange={(c) => setContactConsent(c === true)} className="mt-0.5" />
                <span>{t("auth.contactConsent")}</span>
              </label>
            )}
            <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans min-h-12 touch-manipulation" style={{ color: "#FAFAFA" }}>
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
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-sm space-y-6">
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
              <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans min-h-12 touch-manipulation" style={{ color: "#FAFAFA" }}>
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
