import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { YasBackButton } from "@/features/yas-app/components/YasBackButton";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 pt-3"><YasBackButton /></div>
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-6" />
        <h1 className="font-sans text-4xl font-bold mb-3">404</h1>
        <p className="text-lg text-muted-foreground font-sans mb-2">{t("notFound.title", "Page introuvable")}</p>
        <p className="text-sm text-muted-foreground font-sans mb-8">
          {t("notFound.bodyPrefix", "La page")} <code className="text-foreground">{location.pathname}</code> {t("notFound.bodySuffix", "n'existe pas.")}
        </p>
        <div className="flex gap-3">
          <Link to="/">
            <Button variant="hero" className="font-sans">
              {t("notFound.backToHome", "Retour à l'accueil")}
            </Button>
          </Link>
          <Link to="/recherche">
            <Button variant="outline" className="font-sans">{t("notFound.viewListings", "Voir les annonces")}</Button>
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default NotFound;
