import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AuthOAuthButtons } from "@/pages/auth/components/AuthOAuthButtons";
import type { ReactNode } from "react";

type SignupFormProps = {
  role: "particulier" | "agence";
  loading: boolean;
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsapp: string;
    password: string;
    passwordConfirm: string;
    contactConsent: boolean;
    agencyName: string;
    agencyAddress: string;
    commercialContact: string;
    nif: string;
    stat: string;
    regCommerce: string;
    agencyLogoUrl: string;
  };
  labels: {
    signupChooseTitle: string;
    signupSubtitle: string;
    signupParticulierCta: string;
    signupParticulierDesc: string;
    signupProCta: string;
    signupProDesc: string;
    google: string;
    facebook: string;
    oauthHint: string;
    orWithEmail: string;
    firstName: string;
    lastName: string;
    agencyName: string;
    commercialContact: string;
    agencyAddress: string;
    agencyLogoUrl: string;
    email: string;
    phone: string;
    phoneAgencyHint: string;
    whatsapp: string;
    password: string;
    confirmPassword: string;
    contactConsent: string;
    signup: string;
    loading: string;
    hasAccount: string;
    login: string;
  };
  googleIcon: ReactNode;
  facebookIcon: ReactNode;
  onSetRole: (role: "particulier" | "agence") => void;
  onGoogleSignup: () => void;
  onFacebookSignup: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFieldChange: (field: keyof SignupFormProps["form"], value: string | boolean) => void;
  onSwitchToParticulier: () => void;
  onSwitchToAgence: () => void;
};

export function SignupForm({
  role,
  loading,
  form,
  labels,
  googleIcon,
  facebookIcon,
  onSetRole,
  onGoogleSignup,
  onFacebookSignup,
  onSubmit,
  onFieldChange,
  onSwitchToParticulier,
  onSwitchToAgence,
}: SignupFormProps) {
  return (
    <>
      <div className="text-center space-y-1">
        <h1 className="font-sans text-2xl font-bold">{labels.signupChooseTitle}</h1>
        <p className="text-sm text-muted-foreground font-sans">{labels.signupSubtitle}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              onSetRole("particulier");
              onSwitchToParticulier();
            }}
            className={`rounded-xl border p-4 min-h-16 text-left transition-colors font-sans touch-manipulation ${
              role === "particulier" ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <p className="font-semibold text-sm">{labels.signupParticulierCta}</p>
            <p className="text-xs text-muted-foreground mt-1">{labels.signupParticulierDesc}</p>
          </button>
          <button
            type="button"
            onClick={() => {
              onSetRole("agence");
              onSwitchToAgence();
            }}
            className={`rounded-xl border p-4 min-h-16 text-left transition-colors font-sans touch-manipulation ${
              role === "agence" ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <p className="font-semibold text-sm">{labels.signupProCta}</p>
            <p className="text-xs text-muted-foreground mt-1">{labels.signupProDesc}</p>
          </button>
        </div>

        {role === "particulier" && (
          <AuthOAuthButtons
            disabled={loading}
            googleLabel={labels.google}
            facebookLabel={labels.facebook}
            hint={labels.oauthHint}
            orLabel={labels.orWithEmail}
            onGoogle={onGoogleSignup}
            onFacebook={onFacebookSignup}
            googleIcon={googleIcon}
            facebookIcon={facebookIcon}
          />
        )}

        {role === "particulier" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-sans">{labels.firstName} *</Label>
              <Input value={form.firstName} onChange={(e) => onFieldChange("firstName", e.target.value)} className="font-sans" required maxLength={80} autoComplete="given-name" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{labels.lastName} *</Label>
              <Input value={form.lastName} onChange={(e) => onFieldChange("lastName", e.target.value)} className="font-sans" required maxLength={80} autoComplete="family-name" />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="font-sans">{labels.agencyName}</Label>
              <Input value={form.agencyName} onChange={(e) => onFieldChange("agencyName", e.target.value)} className="font-sans" required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{labels.commercialContact}</Label>
              <Input value={form.commercialContact} onChange={(e) => onFieldChange("commercialContact", e.target.value)} className="font-sans" required maxLength={100} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{labels.agencyAddress}</Label>
              <Textarea value={form.agencyAddress} onChange={(e) => onFieldChange("agencyAddress", e.target.value)} className="font-sans min-h-[72px]" required maxLength={500} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="font-sans">NIF</Label>
                <Input value={form.nif} onChange={(e) => onFieldChange("nif", e.target.value)} className="font-sans" required maxLength={64} />
              </div>
              <div className="space-y-2">
                <Label className="font-sans">STAT</Label>
                <Input value={form.stat} onChange={(e) => onFieldChange("stat", e.target.value)} className="font-sans" required maxLength={64} />
              </div>
              <div className="space-y-2">
                <Label className="font-sans">RC</Label>
                <Input value={form.regCommerce} onChange={(e) => onFieldChange("regCommerce", e.target.value)} className="font-sans" required maxLength={64} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{labels.agencyLogoUrl}</Label>
              <Input
                type="url"
                value={form.agencyLogoUrl}
                onChange={(e) => onFieldChange("agencyLogoUrl", e.target.value)}
                className="font-sans"
                placeholder="https://"
                maxLength={500}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label className="font-sans">{labels.email}</Label>
          <Input type="email" value={form.email} onChange={(e) => onFieldChange("email", e.target.value)} className="font-sans" required maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.phone} *</Label>
          <Input value={form.phone} onChange={(e) => onFieldChange("phone", e.target.value)} className="font-sans" maxLength={30} required autoComplete="tel" />
          {role === "agence" && <p className="text-xs text-muted-foreground font-sans">{labels.phoneAgencyHint}</p>}
        </div>
        {role === "particulier" && (
          <div className="space-y-2">
            <Label className="font-sans">{labels.whatsapp}</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => onFieldChange("whatsapp", e.target.value)}
              className="font-sans"
              maxLength={30}
              placeholder="+261 … ou +indicatif pays"
              autoComplete="tel"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label className="font-sans">{labels.password}</Label>
          <Input type="password" value={form.password} onChange={(e) => onFieldChange("password", e.target.value)} className="font-sans" required minLength={8} autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.confirmPassword}</Label>
          <Input
            type="password"
            value={form.passwordConfirm}
            onChange={(e) => onFieldChange("passwordConfirm", e.target.value)}
            className="font-sans"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {role === "particulier" && (
          <label className="flex items-start gap-2 cursor-pointer font-sans text-sm">
            <Checkbox checked={form.contactConsent} onCheckedChange={(c) => onFieldChange("contactConsent", c === true)} className="mt-0.5" />
            <span>{labels.contactConsent}</span>
          </label>
        )}
        <Button type="submit" disabled={loading} variant="hero" className="w-full font-sans min-h-12 touch-manipulation">
          {loading ? labels.loading : labels.signup}
        </Button>
      </form>
      <p className="text-center text-sm font-sans text-muted-foreground">
        {labels.hasAccount}{" "}
        <Link to="/login" className="text-primary hover:underline">
          {labels.login}
        </Link>
      </p>
    </>
  );
}

