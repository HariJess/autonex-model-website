import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, type SignUpMetadata } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { agencyFormSchema, loginSchema, optionalMgPhoneSchema, signupCommonSchema } from "@/lib/validation";
import { AuthFormShell } from "@/pages/auth/components/AuthFormShell";
import { LoginForm } from "@/pages/auth/components/LoginForm";
import { SignupForm } from "@/pages/auth/components/SignupForm";
import { ForgotPasswordForm } from "@/pages/auth/components/ForgotPasswordForm";

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
  const location = useLocation();
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
      const from = (location.state as { from?: string } | null)?.from;
      navigate(typeof from === "string" && from.startsWith("/") ? from : "/dashboard");
    }
  };

  return (
    <AuthFormShell title={t("auth.login")} maxWidthClassName="max-w-md">
      <LoginForm
        loginKind={loginKind}
        email={email}
        password={password}
        loading={loading}
        labels={{
          login: t("auth.login"),
          loginKindParticulier: t("auth.loginKindParticulier", "Particulier"),
          loginKindAgence: t("auth.loginKindAgence", "Agence"),
          continueWithGoogle: t("auth.continueWithGoogle", "Continuer avec Google"),
          googleLoginParticulierOnly: t("auth.googleLoginParticulierOnly", "Réservé aux comptes particuliers. Les agences utilisent email et mot de passe."),
          orWithEmail: t("auth.orWithEmail", "ou"),
          agencyLoginEmailOnly: t("auth.agencyLoginEmailOnly", "Connexion agence : utilisez l’email et le mot de passe de votre compte professionnel."),
          email: t("auth.email"),
          password: t("auth.password"),
          forgotPassword: t("auth.forgotPassword"),
          noAccount: t("auth.noAccount"),
          signup: t("auth.signup"),
          loading: t("common.loading"),
        }}
        googleIcon={<GoogleLogo />}
        onSetLoginKind={setLoginKind}
        onGoogle={handleGoogle}
        onSubmit={handleLogin}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
      />
    </AuthFormShell>
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
    let whatsappE164: string | undefined;
    if (whatsapp.trim()) {
      const waParsed = optionalMgPhoneSchema.safeParse(whatsapp);
      if (!waParsed.success) {
        toast.error(waParsed.error.issues[0]?.message ?? t("common.error"));
        return;
      }
      whatsappE164 = waParsed.data;
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
        whatsapp_phone: whatsappE164 || undefined,
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
    <AuthFormShell title={t("auth.signup")} maxWidthClassName="max-w-lg">
      <SignupForm
        role={role}
        loading={loading}
        form={{
          firstName,
          lastName,
          email,
          phone,
          whatsapp,
          password,
          passwordConfirm,
          contactConsent,
          agencyName,
          agencyAddress,
          commercialContact,
          nif,
          stat,
          regCommerce,
          agencyLogoUrl,
        }}
        labels={{
          signupChooseTitle: t("auth.signupChooseTitle", "Créer un compte"),
          signupSubtitle: t("auth.signupSubtitle", "Particulier ou agence : un seul compte, des parcours adaptés."),
          signupParticulierCta: t("auth.signupParticulierCta", "Compte particulier"),
          signupParticulierDesc: t("auth.signupParticulierDesc", "Particulier ou vendeur indépendant"),
          signupProCta: t("auth.signupProCta", "Professionnel / agence"),
          signupProDesc: t("auth.signupProDesc", "Concessionnaire ou activité structurée"),
          continueWithGoogle: t("auth.continueWithGoogle", "Continuer avec Google"),
          googleSignupParticulierOnly: t("auth.googleSignupParticulierOnly", "Compte particulier uniquement — pas d’inscription agence via Google."),
          orWithEmail: t("auth.orWithEmail", "ou"),
          firstName: t("auth.firstName", "Prénom"),
          lastName: t("auth.lastName", "Nom"),
          agencyName: t("auth.agencyName", "Nom de l’agence"),
          commercialContact: t("auth.commercialContact", "Contact commercial"),
          agencyAddress: t("auth.agencyAddress", "Adresse du siège"),
          agencyLogoUrl: t("auth.agencyLogoUrl", "Logo (URL, optionnel)"),
          email: t("auth.email"),
          phone: t("auth.phone"),
          phoneAgencyHint: t("auth.phoneAgencyHint", "Numéro joignable pour les clients."),
          whatsapp: t("auth.whatsapp", "WhatsApp (optionnel)"),
          password: t("auth.password"),
          confirmPassword: t("auth.confirmPassword", "Confirmer le mot de passe"),
          contactConsent: t("auth.contactConsent"),
          signup: t("auth.signup"),
          loading: t("common.loading"),
          hasAccount: t("auth.hasAccount"),
          login: t("auth.login"),
        }}
        googleIcon={<GoogleLogo />}
        onSetRole={setRole}
        onGoogleSignup={handleGoogleSignup}
        onSubmit={handleSignup}
        onFieldChange={(field, value) => {
          switch (field) {
            case "firstName": setFirstName(String(value)); break;
            case "lastName": setLastName(String(value)); break;
            case "email": setEmail(String(value)); break;
            case "phone": setPhone(String(value)); break;
            case "whatsapp": setWhatsapp(String(value)); break;
            case "password": setPassword(String(value)); break;
            case "passwordConfirm": setPasswordConfirm(String(value)); break;
            case "contactConsent": setContactConsent(Boolean(value)); break;
            case "agencyName": setAgencyName(String(value)); break;
            case "agencyAddress": setAgencyAddress(String(value)); break;
            case "commercialContact": setCommercialContact(String(value)); break;
            case "nif": setNif(String(value)); break;
            case "stat": setStat(String(value)); break;
            case "regCommerce": setRegCommerce(String(value)); break;
            case "agencyLogoUrl": setAgencyLogoUrl(String(value)); break;
          }
        }}
        onSwitchToParticulier={() => {
          setAgencyName("");
          setAgencyAddress("");
          setCommercialContact("");
          setNif("");
          setStat("");
          setRegCommerce("");
          setAgencyLogoUrl("");
        }}
        onSwitchToAgence={() => {
          setFirstName("");
          setLastName("");
          setWhatsapp("");
          setContactConsent(false);
        }}
      />
    </AuthFormShell>
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
    <AuthFormShell title={t("auth.forgotPassword")} maxWidthClassName="max-w-md">
      <ForgotPasswordForm
        email={email}
        sent={sent}
        loading={loading}
        labels={{
          forgotPassword: t("auth.forgotPassword"),
          email: t("auth.email"),
          sendResetLink: t("auth.sendResetLink"),
          loading: t("common.loading"),
          resetEmailSent: t("auth.resetEmailSent"),
          checkInbox: t("auth.checkInbox"),
          backToLogin: t("auth.backToLogin"),
        }}
        onEmailChange={setEmail}
        onSubmit={handleReset}
      />
    </AuthFormShell>
  );
};

export { LoginPage, SignupPage, ForgotPasswordPage };
