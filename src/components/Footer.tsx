import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer style={{ backgroundColor: '#0A0A0A', color: '#FAFAFA' }}>
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <img src={logo} alt="ImmoNex" className="h-10" />
            <p className="text-sm opacity-70 font-sans">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Links 1 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">{t("footer.realEstate")}</h4>
            <div className="flex flex-col gap-2 text-sm font-sans opacity-70">
              <Link to="/recherche?transaction=vente" className="hover:opacity-100 transition-opacity">{t("nav.buy")}</Link>
              <Link to="/recherche?transaction=location" className="hover:opacity-100 transition-opacity">{t("nav.rent")}</Link>
              <Link to="/agences" className="hover:opacity-100 transition-opacity">{t("nav.agencies")}</Link>
              <Link to="/publier" className="hover:opacity-100 transition-opacity">{t("nav.publish")}</Link>
            </div>
          </div>

          {/* Links 2 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">{t("footer.information")}</h4>
            <div className="flex flex-col gap-2 text-sm font-sans opacity-70">
              <Link to="/conseils" className="hover:opacity-100 transition-opacity">{t("nav.advice")}</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-muted-foreground/20 text-center text-sm font-sans opacity-50">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
