import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { User, Menu, X, Globe, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import logo from "@/assets/logo.png";

const Header = () => {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr");
  };

  const toggleCurrency = () => {
    setCurrency(currency === "MGA" ? "EUR" : "MGA");
  };

  const navLinks = [
    { label: t("nav.buy"), href: "/recherche?transaction=vente" },
    { label: t("nav.rent"), href: "/recherche?transaction=location" },
    { label: t("nav.agencies"), href: "/agences" },
    { label: t("nav.advice"), href: "/conseils" },
  ];

  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: "#0A0A0A" }}>
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex-shrink-0">
          <img src={logo} alt="ImmoNex" className="h-12" />
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href} className="text-sm font-medium transition-colors" style={{ color: "#FAFAFA" }}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <button onClick={toggleLang} className="flex items-center gap-1 text-sm" style={{ color: "#FAFAFA" }}>
            <Globe className="h-4 w-4" />
            {i18n.language === "fr" ? "EN" : "FR"}
          </button>
          <button onClick={toggleCurrency} className="text-xs font-semibold px-2 py-1 rounded border border-muted-foreground/30" style={{ color: "#FAFAFA" }}>
            {currency}
          </button>
          <Button onClick={() => navigate("/publier")} className="gradient-primary border-0 text-sm font-semibold" style={{ color: "#FAFAFA" }}>
            {t("nav.publish")}
          </Button>
          {user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} style={{ color: "#FAFAFA" }}>
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} style={{ color: "#FAFAFA" }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => navigate("/login")} style={{ color: "#FAFAFA" }}>
              <User className="h-5 w-5" />
            </Button>
          )}
        </div>

        <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ color: "#FAFAFA" }}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t" style={{ backgroundColor: "#0A0A0A", borderColor: "#333" }}>
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)} className="text-sm py-2" style={{ color: "#FAFAFA" }}>
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: "#333" }}>
              <button onClick={toggleLang} className="text-sm" style={{ color: "#FAFAFA" }}>
                <Globe className="h-4 w-4 inline mr-1" />
                {i18n.language === "fr" ? "EN" : "FR"}
              </button>
              <button onClick={toggleCurrency} className="text-xs font-semibold px-2 py-1 rounded border border-muted-foreground/30" style={{ color: "#FAFAFA" }}>
                {currency}
              </button>
              <Button onClick={() => { navigate("/publier"); setMenuOpen(false); }} className="gradient-primary border-0 text-sm" style={{ color: "#FAFAFA" }}>
                {t("nav.publish")}
              </Button>
              {user ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { navigate("/dashboard"); setMenuOpen(false); }} style={{ color: "#FAFAFA" }}>
                    <User className="h-4 w-4 mr-1" /> Dashboard
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { signOut(); setMenuOpen(false); }} style={{ color: "#FAFAFA" }}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => { navigate("/login"); setMenuOpen(false); }} style={{ color: "#FAFAFA" }}>
                  <User className="h-4 w-4 mr-1" /> {t("nav.login")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
