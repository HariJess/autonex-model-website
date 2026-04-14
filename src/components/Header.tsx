import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { User, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import logo from "@/assets/logo.png";
import { AUTO_TRANSACTION_MODES } from "@/data/automotiveCatalog";

const Header = () => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const toggleCurrency = () => {
    setCurrency(currency === "MGA" ? "EUR" : "MGA");
  };

  const navLinks = [
    { label: AUTO_TRANSACTION_MODES[0].label, href: AUTO_TRANSACTION_MODES[0].href },
    { label: AUTO_TRANSACTION_MODES[1].label, href: AUTO_TRANSACTION_MODES[1].href },
    { label: AUTO_TRANSACTION_MODES[2].label, href: AUTO_TRANSACTION_MODES[2].href },
    { label: AUTO_TRANSACTION_MODES[3].label, href: AUTO_TRANSACTION_MODES[3].href },
    { label: AUTO_TRANSACTION_MODES[4].label, href: AUTO_TRANSACTION_MODES[4].href },
    { label: t("nav.agencies"), href: "/agences" },
    { label: t("nav.advice"), href: "/conseils" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070D1A]/95 backdrop-blur-md">
      <div className="container mx-auto px-4 flex items-center justify-between h-[4.25rem] sm:h-[4.75rem]">
        <Link to="/" className="flex-shrink-0">
          <img src={logo} alt="AutoNex" className="h-12 sm:h-14 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href} className="text-sm font-medium transition-colors" style={{ color: "#FAFAFA" }}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
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

        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-md -mr-2 touch-manipulation"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ color: "#FAFAFA" }}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          id="mobile-menu-button"
          aria-label={menuOpen ? t("common.closeMenu", "Fermer le menu") : t("common.openMenu", "Ouvrir le menu")}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="lg:hidden border-t border-white/10 bg-[#070D1A]">
          <div className="container mx-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)} className="text-sm py-2.5 min-h-11 flex items-center touch-manipulation" style={{ color: "#FAFAFA" }}>
                {link.label}
              </Link>
            ))}
            <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/10">
              <button onClick={toggleCurrency} className="text-xs font-semibold px-3 py-2 min-h-10 rounded border border-muted-foreground/30 touch-manipulation" style={{ color: "#FAFAFA" }}>
                {currency}
              </button>
              <Button onClick={() => { navigate("/publier"); setMenuOpen(false); }} className="gradient-primary border-0 text-sm min-h-10 touch-manipulation" style={{ color: "#FAFAFA" }}>
                {t("nav.publish")}
              </Button>
              {user ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { navigate("/dashboard"); setMenuOpen(false); }} style={{ color: "#FAFAFA" }}>
                    <User className="h-4 w-4 mr-1" /> {t("nav.dashboard")}
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
