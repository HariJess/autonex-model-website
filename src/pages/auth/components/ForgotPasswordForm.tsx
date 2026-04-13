import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ForgotPasswordFormProps = {
  email: string;
  sent: boolean;
  loading: boolean;
  labels: {
    forgotPassword: string;
    email: string;
    sendResetLink: string;
    loading: string;
    resetEmailSent: string;
    checkInbox: string;
    backToLogin: string;
  };
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function ForgotPasswordForm({
  email,
  sent,
  loading,
  labels,
  onEmailChange,
  onSubmit,
}: ForgotPasswordFormProps) {
  return (
    <>
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold">{labels.forgotPassword}</h1>
      </div>
      {sent ? (
        <p className="text-center font-sans text-muted-foreground">
          {labels.resetEmailSent} <strong>{email}</strong>. {labels.checkInbox}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-sans">{labels.email}</Label>
            <Input type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} className="font-sans" required />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 font-sans min-h-12 touch-manipulation" style={{ color: "#FAFAFA" }}>
            {loading ? labels.loading : labels.sendResetLink}
          </Button>
        </form>
      )}
      <p className="text-center text-sm font-sans text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          {labels.backToLogin}
        </Link>
      </p>
    </>
  );
}

