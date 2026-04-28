import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { User, Menu, X, LogOut, ChevronDown, Globe2, Settings as SettingsIcon, Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import logo from "@/assets/logo.png";
import { AUTO_TRANSACTION_MODES } from "@/data/automotiveCatalog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const Header = () => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileRentOpen, setMobileRentOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const buyMode = AUTO_TRANSACTION_MODES.find((mode) => mode.id === "acheter") ?? AUTO_TRANSACTION_MODES[0];
  const shortTermMode =
    AUTO_TRANSACTION_MODES.find((mode) => mode.id === "location_courte") ?? AUTO_TRANSACTION_MODES[2];
  const longTermMode =
    AUTO_TRANSACTION_MODES.find((mode) => mode.id === "location_longue") ?? AUTO_TRANSACTION_MODES[3];
  const dealersMode =
    AUTO_TRANSACTION_MODES.find((mode) => mode.id === "concessionnaires") ?? AUTO_TRANSACTION_MODES[4];
  const rawLanguage = localStorage.getItem("autonex-lang");
  const language = rawLanguage === "fr" || rawLanguage === "mg" || rawLanguage === "en" ? rawLanguage : "fr";

  const desktopLinks = [
    { label: t("nav.agencies"), href: dealersMode.href },
    { label: t("nav.advice"), href: "/conseils" },
  ];

  const switchLanguage = (nextLang: "fr" | "mg" | "en") => {
    localStorage.setItem("autonex-lang", nextLang);
    window.location.reload();
  };

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const transaction = query.get("transaction");
  const isSearchPage = location.pathname === "/recherche";
  const isBuyActive = isSearchPage && transaction === "vente";
  const isRentActive = isSearchPage && (transaction === "location" || transaction === "location_vacances");
  const isDealerActive =
    location.pathname === "/agences" ||
    location.pathname.startsWith("/agence/") ||
    location.pathname.startsWith("/concessionnaires/");
  const isAdviceActive = location.pathname === "/conseils" || location.pathname.startsWith("/conseils/");
  const isEstimationActive = location.pathname === "/estimation";

  useEffect(() => {
    if (!menuOpen) setMobileRentOpen(false);
  }, [menuOpen]);

  const navLinkClass = (active: boolean) =>
    `text-sm font-semibold transition-colors ${active ? "text-white" : "text-navbar-foreground/90 hover:text-white"}`;
  const navDropdownTriggerClass = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ${
      active ? "text-white bg-white/[0.08]" : "text-navbar-foreground/90 hover:text-white hover:bg-white/[0.05]"
    }`;
  const estimationDesktopClass = isEstimationActive
    ? "inline-flex items-center rounded-full border border-navbar-accent/55 gradient-estimation-active px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(21,57,96,0.35)]"
    : "inline-flex items-center rounded-full border border-navbar-accent/45 bg-white/[0.04] px-3.5 py-1.5 text-sm font-semibold text-navbar-foreground transition-all hover:border-navbar-accent/65 hover:bg-white/[0.08] hover:text-white";
  const estimationMobileClass = isEstimationActive
    ? "text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center justify-between touch-manipulation border border-navbar-accent/55 gradient-estimation-active text-white"
    : "text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center justify-between touch-manipulation border border-navbar-accent/35 bg-white/[0.03] text-navbar-foreground active:bg-white/[0.1]";

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        {t("a11y.skipToContent", "Aller au contenu principal")}
      </a>
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navbar/95 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between h-[4rem] sm:h-[4.75rem]">
        <Link to="/" className="flex-shrink-0 min-h-11 flex items-center">
          <img src={logo} alt="AutoNex" className="h-11 sm:h-14 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={navDropdownTriggerClass(isBuyActive || isRentActive)}>
                <span>{t("nav.explore")}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 border-white/20 bg-dropdown text-navbar-foreground">
              <DropdownMenuItem
                className="cursor-pointer focus:bg-white/10 focus:text-white"
                onSelect={() => navigate(buyMode.href)}
              >
                {t("nav.buy")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer focus:bg-white/10 focus:text-white"
                onSelect={() => navigate(longTermMode.href)}
              >
                {t("transaction.rent")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer focus:bg-white/10 focus:text-white"
                onSelect={() => navigate(shortTermMode.href)}
              >
                {t("transaction.vacation")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
            {t("nav.estimation")}
          </Link>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-navbar-accent/45 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-navbar-foreground transition-all hover:border-navbar-accent/65 hover:bg-white/[0.08] hover:text-white"
              >
                <Globe2 className="h-3.5 w-3.5" />
                <span>{language.toUpperCase()} · {currency}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-white/20 bg-dropdown text-navbar-foreground">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-on-dark-muted">{t("common.language")}</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => switchLanguage("fr")}>
                Français
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => switchLanguage("mg")}>
                Malagasy
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => switchLanguage("en")}>
                English
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-on-dark-muted">{t("common.currency")}</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => setCurrency("MGA")}>
                MGA
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => setCurrency("EUR")}>
                EUR
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => navigate("/publier")} className="gradient-primary border-0 text-sm font-semibold text-navbar-foreground">
            {t("nav.publish")}
          </Button>
          {user && <NotificationBell />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-navbar-foreground" aria-label={t("nav.accountMenu")}>
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-white/20 bg-dropdown text-navbar-foreground">
              {user ? (
                <>
                  <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => navigate("/dashboard")}>
                    {t("nav.dashboard")}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => navigate("/favoris")}>
                    <Heart className="mr-2 h-4 w-4" />
                    {t("nav.favorites")}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => navigate("/settings")}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    {t("nav.settings", "Paramètres")}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => navigate("/login")}>
                  {t("nav.login")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl -mr-1 touch-manipulation border border-white/15 bg-white/[0.04] text-navbar-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          id="mobile-menu-button"
          aria-label={menuOpen ? t("common.closeMenu", "Fermer le menu") : t("common.openMenu", "Ouvrir le menu")}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="lg:hidden border-t border-white/10 bg-navbar">
          <div className="container mx-auto pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-2.5">
            <Link
              to={buyMode.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.02] active:bg-white/[0.08] text-navbar-foreground"
            >
              {t("nav.buy")}
            </Link>
            <div className="rounded-lg bg-white/[0.02]">
              <button
                type="button"
                className="w-full text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center justify-between touch-manipulation active:bg-white/[0.08] text-navbar-foreground"
                onClick={() => setMobileRentOpen((prev) => !prev)}
                aria-expanded={mobileRentOpen}
                aria-controls="mobile-rent-submenu"
              >
                <span>{t("nav.rent")}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileRentOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileRentOpen && (
                <div id="mobile-rent-submenu" className="pb-2">
                  <Link
                    to={shortTermMode.href}
                    onClick={() => setMenuOpen(false)}
                    className="ml-2 mr-1 mt-1 text-sm px-3 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.03] active:bg-white/[0.1] text-navbar-foreground"
                  >
                    {t("transaction.vacation")}
                  </Link>
                  <Link
                    to={longTermMode.href}
                    onClick={() => setMenuOpen(false)}
                    className="ml-2 mr-1 mt-1 text-sm px-3 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.03] active:bg-white/[0.1] text-navbar-foreground"
                  >
                    {t("transaction.rent")}
                  </Link>
                </div>
              )}
            </div>
            <Link
              to={dealersMode.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.02] active:bg-white/[0.08] text-navbar-foreground"
            >
              {t("nav.agencies")}
            </Link>
            <Link
              to="/estimation"
              onClick={() => setMenuOpen(false)}
              className={estimationMobileClass}
            >
              <span>{t("nav.estimation")}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-on-dark">
                {t("nav.estimationTag")}
              </span>
            </Link>
            <Link
              to="/conseils"
              onClick={() => setMenuOpen(false)}
              className="text-sm px-2 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.02] active:bg-white/[0.08] text-navbar-foreground"
            >
              {t("nav.advice")}
            </Link>
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => switchLanguage("fr")}
                className="text-xs font-semibold px-3 py-2 min-h-10 rounded border border-muted-foreground/30 touch-manipulation text-navbar-foreground"
              >
                {t("common.languageFr", "FR")}
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("mg")}
                className="text-xs font-semibold px-3 py-2 min-h-10 rounded border border-muted-foreground/30 touch-manipulation text-navbar-foreground"
              >
                {t("common.languageMg", "MG")}
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("en")}
                className="text-xs font-semibold px-3 py-2 min-h-10 rounded border border-muted-foreground/30 touch-manipulation text-navbar-foreground"
              >
                {t("common.languageEn", "EN")}
              </button>
              <button
                type="button"
                onClick={() => setCurrency(currency === "MGA" ? "EUR" : "MGA")}
                className="text-xs font-semibold px-3 py-2 min-h-11 rounded border border-muted-foreground/30 touch-manipulation text-navbar-foreground"
              >
                {currency}
              </button>
              <Button onClick={() => { navigate("/publier"); setMenuOpen(false); }} className="gradient-primary border-0 text-sm min-h-10 touch-manipulation text-navbar-foreground">
                {t("nav.publish")}
              </Button>
              {user ? (
                <>
                  <Button variant="ghost" size="sm" className="justify-start min-h-10 text-navbar-foreground" onClick={() => { navigate("/dashboard"); setMenuOpen(false); }}>
                    <User className="h-4 w-4 mr-1" /> {t("nav.dashboard")}
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start min-h-10 text-navbar-foreground" onClick={() => { navigate("/favoris"); setMenuOpen(false); }}>
                    <Heart className="h-4 w-4 mr-1" /> {t("nav.favorites")}
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start min-h-10 text-navbar-foreground" onClick={() => { signOut(); setMenuOpen(false); }}>
                    <LogOut className="h-4 w-4 mr-1" /> {t("nav.logout")}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="justify-start min-h-10 col-span-2 text-navbar-foreground" onClick={() => { navigate("/login"); setMenuOpen(false); }}>
                  <User className="h-4 w-4 mr-1" /> {t("nav.login")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
    {/* Skip-link target. tabIndex=-1 lets the browser focus this element on hash
        navigation without making it a Tab stop in normal flow. Pages render
        their main content directly after Header, so this lands the user past
        the navigation. */}
    <div id="main-content" tabIndex={-1} className="sr-only" aria-hidden="true" />
    </>
  );
};

export default Header;
