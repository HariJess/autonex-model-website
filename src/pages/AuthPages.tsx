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

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
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
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="font-sans" required />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.password")}</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="font-sans" required />
            </div>
            <Link to="/forgot-password" className="text-sm text-primary font-sans hover:underline block">{t("auth.forgotPassword")}</Link>
            <Button type="submit" className="w-full gradient-primary border-0 font-sans" style={{ color: '#FAFAFA' }}>{t("auth.login")}</Button>
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
  const [role, setRole] = useState("particulier");

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
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
              <Input className="font-sans" required />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.email")}</Label>
              <Input type="email" className="font-sans" required />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.phone")}</Label>
              <Input className="font-sans" required />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("auth.password")}</Label>
              <Input type="password" className="font-sans" required />
            </div>
            <Button type="submit" className="w-full gradient-primary border-0 font-sans" style={{ color: '#FAFAFA' }}>{t("auth.signup")}</Button>
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

export { LoginPage, SignupPage };
