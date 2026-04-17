import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { User, Menu, X, LogOut, ChevronDown, Globe2 } from "lucide-react";
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

const Header = () => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileRentOpen, setMobileRentOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const buyMode = AUTO_TRANSACTION_MODES.find((mode) => mode.id === "acheter") ?? AUTO_TRANSACTION_MODES[0];
  const rentMode = AUTO_TRANSACTION_MODES.find((mode) => mode.id === "louer") ?? AUTO_TRANSACTION_MODES[1];
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
  const isShortRentActive = isSearchPage && transaction === "location_vacances";
  const isLongRentActive = isSearchPage && transaction === "location";
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
    `text-sm font-semibold transition-colors ${active ? "text-white" : "text-[#F2F7FF] hover:text-white"}`;
  const navDropdownTriggerClass = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ${
      active ? "text-white bg-white/[0.08]" : "text-[#F2F7FF] hover:text-white hover:bg-white/[0.05]"
    }`;
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={navDropdownTriggerClass(isBuyActive || isRentActive)}>
                <span>{t("nav.explore", "Explorer")}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 border-white/20 bg-[#0D223D] text-[#F7FBFF]">
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
            {t("nav.estimation", "Estimation")}
          </Link>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-[#6F96C4]/45 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#F3F8FF] transition-all hover:border-[#9DC2EA]/65 hover:bg-white/[0.08] hover:text-white"
              >
                <Globe2 className="h-3.5 w-3.5" />
                <span>{language.toUpperCase()} · {currency}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-white/20 bg-[#0D223D] text-[#F7FBFF]">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-[#9FBCE0]">{t("common.language", "Language")}</DropdownMenuLabel>
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
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-[#9FBCE0]">{t("common.currency", "Currency")}</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => setCurrency("MGA")}>
                MGA
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => setCurrency("EUR")}>
                EUR
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => navigate("/publier")} className="gradient-primary border-0 text-sm font-semibold" style={{ color: "#FAFAFA" }}>
            {t("nav.publish")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" style={{ color: "#FAFAFA" }} aria-label={t("nav.accountMenu", "Account menu")}>
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-white/20 bg-[#0D223D] text-[#F7FBFF]">
              {user ? (
                <>
                  <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => navigate("/dashboard")}>
                    {t("nav.dashboard", "My account")}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav.logout", "Sign out")}
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onSelect={() => navigate("/login")}>
                  {t("nav.login", "Log in")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
              {t("nav.buy")}
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
                <span>{t("nav.rent")}</span>
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
                    {t("transaction.vacation")}
                  </Link>
                  <Link
                    to={longTermMode.href}
                    onClick={() => setMenuOpen(false)}
                    className="ml-2 mr-1 mt-1 text-sm px-3 py-2.5 min-h-11 rounded-lg flex items-center touch-manipulation bg-white/[0.03] active:bg-white/[0.1]"
                    style={{ color: "#FAFAFA" }}
                  >
                    {t("transaction.rent")}
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
              {t("nav.agencies")}
            </Link>
            <Link
              to="/estimation"
              onClick={() => setMenuOpen(false)}
              className={estimationMobileClass}
            >
              <span>{t("nav.estimation", "Estimation")}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#D9E8FA]">
                {t("nav.estimationTag", "Signature")}
              </span>
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
              <button
                type="button"
                onClick={() => switchLanguage("fr")}
                className="text-xs font-semibold px-3 py-2 min-h-10 rounded border border-muted-foreground/30 touch-manipulation"
                style={{ color: "#FAFAFA" }}
              >
                {t("common.languageFr", "FR")}
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("mg")}
                className="text-xs font-semibold px-3 py-2 min-h-10 rounded border border-muted-foreground/30 touch-manipulation"
                style={{ color: "#FAFAFA" }}
              >
                {t("common.languageMg", "MG")}
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("en")}
                className="text-xs font-semibold px-3 py-2 min-h-10 rounded border border-muted-foreground/30 touch-manipulation"
                style={{ color: "#FAFAFA" }}
              >
                {t("common.languageEn", "EN")}
              </button>
              <button
                type="button"
                onClick={() => setCurrency(currency === "MGA" ? "EUR" : "MGA")}
                className="text-xs font-semibold px-3 py-2 min-h-11 rounded border border-muted-foreground/30 touch-manipulation"
                style={{ color: "#FAFAFA" }}
              >
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
