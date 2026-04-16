import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { User, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import logo from "@/assets/logo.png";
import { AUTO_TRANSACTION_MODES } from "@/data/automotiveCatalog";

const Header = () => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopRentOpen, setDesktopRentOpen] = useState(false);
  const [mobileRentOpen, setMobileRentOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const desktopCloseTimeoutRef = useRef<number | null>(null);

  const toggleCurrency = () => {
    setCurrency(currency === "MGA" ? "EUR" : "MGA");
  };

  const buyMode = AUTO_TRANSACTION_MODES.find((mode) => mode.id === "acheter") ?? AUTO_TRANSACTION_MODES[0];
  const rentMode = AUTO_TRANSACTION_MODES.find((mode) => mode.id === "louer") ?? AUTO_TRANSACTION_MODES[1];
  const shortTermMode =
    AUTO_TRANSACTION_MODES.find((mode) => mode.id === "location_courte") ?? AUTO_TRANSACTION_MODES[2];
  const longTermMode =
    AUTO_TRANSACTION_MODES.find((mode) => mode.id === "location_longue") ?? AUTO_TRANSACTION_MODES[3];
  const dealersMode =
    AUTO_TRANSACTION_MODES.find((mode) => mode.id === "concessionnaires") ?? AUTO_TRANSACTION_MODES[4];

  const desktopLinks = [
    { label: dealersMode.label, href: dealersMode.href },
    { label: t("nav.advice"), href: "/conseils" },
  ];

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const transaction = query.get("transaction");
  const rentalTerm = query.get("rental_term");
  const isSearchPage = location.pathname === "/recherche";
  const isBuyActive = isSearchPage && transaction === "vente";
  const isShortRentActive = isSearchPage && transaction === "location_vacances";
  const isLongRentActive = isSearchPage && transaction === "location" && rentalTerm === "longue";
  const isRentActive = isSearchPage && (transaction === "location" || transaction === "location_vacances");
  const isDealerActive =
    location.pathname === "/agences" ||
    location.pathname.startsWith("/agence/") ||
    location.pathname.startsWith("/concessionnaires/");
  const isAdviceActive = location.pathname === "/conseils" || location.pathname.startsWith("/conseils/");
  const isEstimationActive = location.pathname === "/estimation";

  const openDesktopRentMenu = () => {
    if (desktopCloseTimeoutRef.current != null) {
      window.clearTimeout(desktopCloseTimeoutRef.current);
      desktopCloseTimeoutRef.current = null;
    }
    setDesktopRentOpen(true);
  };

  const closeDesktopRentMenu = () => {
    if (desktopCloseTimeoutRef.current != null) {
      window.clearTimeout(desktopCloseTimeoutRef.current);
    }
    desktopCloseTimeoutRef.current = window.setTimeout(() => {
      setDesktopRentOpen(false);
      desktopCloseTimeoutRef.current = null;
    }, 140);
  };

  useEffect(() => {
    return () => {
      if (desktopCloseTimeoutRef.current != null) {
        window.clearTimeout(desktopCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) setMobileRentOpen(false);
  }, [menuOpen]);

  const navLinkClass = (active: boolean) =>
    `text-sm font-semibold transition-colors ${active ? "text-white" : "text-[#F2F7FF] hover:text-white"}`;
  const estimationDesktopClass = isEstimationActive
    ? "inline-flex items-center rounded-full border border-[#8FB8E8]/55 bg-gradient-to-r from-[#1A3F6A] to-[#24517F] px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(21,57,96,0.35)]"
    : "inline-flex items-center rounded-full border border-[#6F96C4]/45 bg-white/[0.04] px-3.5 py-1.5 text-sm font-semibold text-[#F3F8FF] transition-all hover:border-[#9DC2EA]/65 hover:bg-white/[0.08] hover:text-white";
  const estimationMobileClass = isEstimationActive
    ? "text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center justify-between touch-manipulation border border-[#8FB8E8]/55 bg-gradient-to-r from-[#1A3F6A] to-[#24517F] text-white"
    : "text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center justify-between touch-manipulation border border-[#6F96C4]/35 bg-white/[0.03] text-[#F3F8FF] active:bg-white/[0.1]";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061427]/95 backdrop-blur-md">
      <div className="container mx-auto px-4 flex items-center justify-between h-[4rem] sm:h-[4.75rem]">
        <Link to="/" className="flex-shrink-0 min-h-11 flex items-center">
          <img src={logo} alt="AutoNex" className="h-11 sm:h-14 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          <Link to={buyMode.href} className={navLinkClass(isBuyActive)}>
            {buyMode.label}
          </Link>

          <div
            className="relative z-[60]"
            onMouseEnter={openDesktopRentMenu}
            onMouseLeave={closeDesktopRentMenu}
          >
            <div className="flex items-center gap-1">
              <Link to={rentMode.href} className={navLinkClass(isRentActive)}>
                {rentMode.label}
              </Link>
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded-md p-1 transition-colors ${
                  isRentActive ? "text-white" : "text-[#F2F7FF] hover:text-white"
                }`}
                aria-label={t("nav.rentSubmenu", "Ouvrir le sous-menu Location longue durée")}
                aria-expanded={desktopRentOpen}
                aria-haspopup="menu"
                onClick={() => setDesktopRentOpen((prev) => !prev)}
                onFocus={openDesktopRentMenu}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${desktopRentOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {desktopRentOpen && (
              <div
                className="absolute left-1/2 top-full z-[120] w-[292px] -translate-x-1/2 pt-2"
                role="menu"
                onMouseEnter={openDesktopRentMenu}
                onMouseLeave={closeDesktopRentMenu}
              >
                <div className="mx-auto h-2 w-2 rotate-45 border border-[#B7C9E4]/50 border-b-0 border-r-0 bg-[#17365D] -mb-1" aria-hidden />
                <div className="rounded-xl border border-[#A7BEDC]/35 bg-[#17365D] p-1.5 shadow-[0_22px_58px_rgba(0,0,0,0.5)] ring-1 ring-black/25">
                  <Link
                    to={shortTermMode.href}
                    role="menuitem"
                    className={`block rounded-lg px-3 py-2.5 transition-all ${
                      isShortRentActive
                        ? "bg-white/24 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
                        : "text-[#F8FBFF] hover:bg-white/14 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                    }`}
                  >
                    <p className="text-sm font-semibold leading-tight">Location courte durée</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-[#D5E3F7]">
                      Séjours, vacances, besoins ponctuels
                    </p>
                  </Link>
                  <Link
                    to={longTermMode.href}
                    role="menuitem"
                    className={`mt-1 block rounded-lg px-3 py-2.5 transition-all ${
                      isLongRentActive
                        ? "bg-white/24 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
                        : "text-[#F8FBFF] hover:bg-white/14 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                    }`}
                  >
                    <p className="text-sm font-semibold leading-tight">Location longue durée</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-[#D5E3F7]">
                      Usage prolongé, besoins mensuels
                    </p>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {desktopLinks.map((link) => {
            const active =
              link.href === dealersMode.href
                ? isDealerActive
                : link.href === "/conseils"
                  ? isAdviceActive
                  : false;
            return (
              <Link key={link.href} to={link.href} className={navLinkClass(active)}>
                {link.label}
              </Link>
            );
          })}
          <Link to="/estimation" className={estimationDesktopClass}>
            Estimation
          </Link>
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
          className="lg:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl -mr-1 touch-manipulation border border-white/15 bg-white/[0.04]"
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
        <div id="mobile-nav" className="lg:hidden border-t border-white/10 bg-[#061427]">
          <div className="container mx-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-2.5">
            <Link
              to={buyMode.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.02] active:bg-white/[0.08]"
              style={{ color: "#FAFAFA" }}
            >
              {buyMode.label}
            </Link>
            <div className="rounded-lg bg-white/[0.02]">
              <button
                type="button"
                className="w-full text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center justify-between touch-manipulation active:bg-white/[0.08]"
                style={{ color: "#FAFAFA" }}
                onClick={() => setMobileRentOpen((prev) => !prev)}
                aria-expanded={mobileRentOpen}
                aria-controls="mobile-rent-submenu"
              >
                <span>{rentMode.label}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileRentOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileRentOpen && (
                <div id="mobile-rent-submenu" className="pb-2">
                  <Link
                    to={shortTermMode.href}
                    onClick={() => setMenuOpen(false)}
                    className="ml-2 mr-1 mt-1 text-sm px-3 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.03] active:bg-white/[0.1]"
                    style={{ color: "#FAFAFA" }}
                  >
                    Location courte durée
                  </Link>
                  <Link
                    to={longTermMode.href}
                    onClick={() => setMenuOpen(false)}
                    className="ml-2 mr-1 mt-1 text-sm px-3 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.03] active:bg-white/[0.1]"
                    style={{ color: "#FAFAFA" }}
                  >
                    Location longue durée
                  </Link>
                </div>
              )}
            </div>
            <Link
              to={dealersMode.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.02] active:bg-white/[0.08]"
              style={{ color: "#FAFAFA" }}
            >
              {dealersMode.label}
            </Link>
            <Link
              to="/estimation"
              onClick={() => setMenuOpen(false)}
              className={estimationMobileClass}
            >
              <span>Estimation</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#D9E8FA]">Signature</span>
            </Link>
            <Link
              to="/conseils"
              onClick={() => setMenuOpen(false)}
              className="text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.02] active:bg-white/[0.08]"
              style={{ color: "#FAFAFA" }}
            >
              {t("nav.advice")}
            </Link>
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10">
              <button onClick={toggleCurrency} className="text-xs font-semibold px-3 py-2 min-h-10 rounded border border-muted-foreground/30 touch-manipulation" style={{ color: "#FAFAFA" }}>
                {currency}
              </button>
              <Button onClick={() => { navigate("/publier"); setMenuOpen(false); }} className="gradient-primary border-0 text-sm min-h-10 touch-manipulation" style={{ color: "#FAFAFA" }}>
                {t("nav.publish")}
              </Button>
              {user ? (
                <>
                  <Button variant="ghost" size="sm" className="justify-start min-h-10" onClick={() => { navigate("/dashboard"); setMenuOpen(false); }} style={{ color: "#FAFAFA" }}>
                    <User className="h-4 w-4 mr-1" /> {t("nav.dashboard")}
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start min-h-10" onClick={() => { signOut(); setMenuOpen(false); }} style={{ color: "#FAFAFA" }}>
                    <LogOut className="h-4 w-4 mr-1" /> {t("nav.logout", "Déconnexion")}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="justify-start min-h-10 col-span-2" onClick={() => { navigate("/login"); setMenuOpen(false); }} style={{ color: "#FAFAFA" }}>
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
