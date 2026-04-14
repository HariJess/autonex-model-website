import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-white/10" style={{ backgroundColor: "#061427", color: "#FAFAFA" }}>
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <img src={logo} alt="AutoNex" className="h-12 sm:h-14 w-auto" />
            <p className="text-sm opacity-70 font-sans">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Links 1 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-base md:text-lg">{t("footer.realEstate")}</h4>
            <div className="flex flex-col gap-2 text-sm font-sans opacity-70">
              <Link to="/recherche?transaction=vente" className="hover:opacity-100 transition-opacity">{t("nav.buy")}</Link>
              <Link to="/recherche?transaction=location" className="hover:opacity-100 transition-opacity">{t("nav.rent")}</Link>
              <Link to="/agences" className="hover:opacity-100 transition-opacity">{t("nav.agencies")}</Link>
              <Link to="/publier" className="hover:opacity-100 transition-opacity">{t("nav.publish")}</Link>
            </div>
          </div>

          {/* Links 2 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-base md:text-lg">{t("footer.information")}</h4>
            <div className="flex flex-col gap-2 text-sm font-sans opacity-70">
              <Link to="/conseils" className="hover:opacity-100 transition-opacity">{t("nav.advice")}</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 md:mt-12 pt-6 border-t border-muted-foreground/20 text-center text-sm font-sans opacity-50">
          {t("footer.copyright")}
        </div>

        <div className="mt-4 pt-4 border-t border-muted-foreground/10 text-center text-xs font-sans text-muted-foreground/70">
          <span>Conçu et développé par </span>
          <a
            href="https://www.linkedin.com/company/aplisarlu/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FAFAFA]/80 hover:text-[#FAFAFA] hover:underline underline-offset-2 transition-colors"
          >
            APLI
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
