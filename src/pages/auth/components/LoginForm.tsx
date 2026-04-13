import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthGoogleButton } from "@/pages/auth/components/AuthGoogleButton";
import type { ReactNode } from "react";

type LoginFormProps = {
  loginKind: "particulier" | "agence";
  email: string;
  password: string;
  loading: boolean;
  labels: {
    login: string;
    loginKindParticulier: string;
    loginKindAgence: string;
    continueWithGoogle: string;
    googleLoginParticulierOnly: string;
    orWithEmail: string;
    agencyLoginEmailOnly: string;
    email: string;
    password: string;
    forgotPassword: string;
    noAccount: string;
    signup: string;
    loading: string;
  };
  googleIcon: ReactNode;
  onSetLoginKind: (kind: "particulier" | "agence") => void;
  onGoogle: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
};

export function LoginForm({
  loginKind,
  email,
  password,
  loading,
  labels,
  googleIcon,
  onSetLoginKind,
  onGoogle,
  onSubmit,
  onEmailChange,
  onPasswordChange,
}: LoginFormProps) {
  return (
    <>
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold">{labels.login}</h1>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSetLoginKind("particulier")}
          className={`rounded-xl border px-3 py-2.5 min-h-11 text-sm font-sans transition-colors touch-manipulation ${
            loginKind === "particulier" ? "border-primary ring-1 ring-primary bg-primary/5 font-medium" : "border-border hover:border-primary/40"
          }`}
        >
          {labels.loginKindParticulier}
        </button>
        <button
          type="button"
          onClick={() => onSetLoginKind("agence")}
          className={`rounded-xl border px-3 py-2.5 min-h-11 text-sm font-sans transition-colors touch-manipulation ${
            loginKind === "agence" ? "border-primary ring-1 ring-primary bg-primary/5 font-medium" : "border-border hover:border-primary/40"
          }`}
        >
          {labels.loginKindAgence}
        </button>
      </div>
      {loginKind === "particulier" && (
        <AuthGoogleButton
          disabled={loading}
          label={labels.continueWithGoogle}
          hint={labels.googleLoginParticulierOnly}
          orLabel={labels.orWithEmail}
          onClick={onGoogle}
          icon={googleIcon}
        />
      )}
      {loginKind === "agence" && <p className="text-xs text-muted-foreground font-sans text-center">{labels.agencyLoginEmailOnly}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="font-sans">{labels.email}</Label>
          <Input type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} className="font-sans" required />
        </div>
        <div className="space-y-2">
          <Label className="font-sans">{labels.password}</Label>
          <Input type="password" value={password} onChange={(e) => onPasswordChange(e.target.value)} className="font-sans" required />
        </div>
        <Link to="/forgot-password" className="text-sm text-primary font-sans hover:underline block">
          {labels.forgotPassword}
        </Link>
        <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans min-h-12 touch-manipulation" style={{ color: "#FAFAFA" }}>
          {loading ? labels.loading : labels.login}
        </Button>
      </form>
      <p className="text-center text-sm font-sans text-muted-foreground">
        {labels.noAccount}{" "}
        <Link to="/signup" className="text-primary hover:underline">
          {labels.signup}
        </Link>
      </p>
    </>
  );
}

