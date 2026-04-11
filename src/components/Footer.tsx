import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Twitter, Youtube, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer style={{ backgroundColor: '#0A0A0A', color: '#FAFAFA' }}>
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <img src={logo} alt="ImmoNex" className="h-10" />
            <p className="text-sm opacity-70 font-sans">
              Le portail immobilier N°1 de Madagascar. Trouvez votre bien idéal parmi des milliers d'annonces.
            </p>
            <div className="flex gap-3">
              <Facebook className="h-5 w-5 opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />
              <Instagram className="h-5 w-5 opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />
              <Twitter className="h-5 w-5 opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />
              <Youtube className="h-5 w-5 opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />
            </div>
          </div>

          {/* Links 1 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Immobilier</h4>
            <div className="flex flex-col gap-2 text-sm font-sans opacity-70">
              <Link to="/recherche?transaction=vente" className="hover:opacity-100 transition-opacity">{t("nav.buy")}</Link>
              <Link to="/recherche?transaction=location" className="hover:opacity-100 transition-opacity">{t("nav.rent")}</Link>
              <Link to="/recherche?type=projet_neuf" className="hover:opacity-100 transition-opacity">{t("nav.newProjects")}</Link>
              <Link to="/agences" className="hover:opacity-100 transition-opacity">{t("nav.agencies")}</Link>
            </div>
          </div>

          {/* Links 2 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Informations</h4>
            <div className="flex flex-col gap-2 text-sm font-sans opacity-70">
              <Link to="/conseils" className="hover:opacity-100 transition-opacity">{t("nav.advice")}</Link>
              <Link to="#" className="hover:opacity-100 transition-opacity">{t("footer.about")}</Link>
              <Link to="#" className="hover:opacity-100 transition-opacity">{t("footer.legal")}</Link>
              <Link to="#" className="hover:opacity-100 transition-opacity">{t("footer.privacy")}</Link>
              <Link to="#" className="hover:opacity-100 transition-opacity">{t("footer.terms")}</Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Newsletter</h4>
            <p className="text-sm font-sans opacity-70">{t("footer.newsletter")}</p>
            <div className="flex gap-2">
              <Input placeholder="Email" className="bg-transparent border-muted-foreground/30 text-sm" style={{ color: '#FAFAFA' }} />
              <Button className="gradient-primary border-0 flex-shrink-0" style={{ color: '#FAFAFA' }}>
                <Mail className="h-4 w-4" />
              </Button>
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
