import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { PremiumStatePanel } from "@/components/ui/premium-state";
import { Loader2, AlertCircle } from "lucide-react";

export function ListingDetailLoading() {
  const { t } = useTranslation();
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-10">
        <PremiumStatePanel
          overline={t("listing.stateLoadingOverline", "Annonce AutoNex")}
          title={t("listing.stateLoadingTitle", "Chargement de l’annonce")}
          description={t(
            "listing.stateLoadingDesc",
            "Nous préparons les informations du véhicule et les options de contact.",
          )}
          icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
        />
      </div>
      <Footer />
    </>
  );
}

export function ListingDetailFetchError() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-10">
        <PremiumStatePanel
          overline={t("listing.stateErrorOverline", "Statut annonce")}
          title={t("common.error")}
          description={t(
            "listing.runtimeUnavailable",
            "Cette annonce est momentanément indisponible. Revenez dans quelques instants ou retournez à la recherche.",
          )}
          icon={<AlertCircle className="h-6 w-6 text-destructive" />}
          action={
            <Button variant="outline" onClick={() => navigate(-1)} className="font-sans">
              {t("common.back", "Retour")}
            </Button>
          }
        />
      </div>
      <Footer />
    </>
  );
}

export function ListingDetailNotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-10">
        <PremiumStatePanel
          overline={t("listing.stateNotFoundOverline", "Catalogue AutoNex")}
          title={t("listing.notFound", "Annonce introuvable")}
          description={t(
            "listing.notFoundDesc",
            "Cette annonce n'est plus disponible. Retournez à la recherche pour consulter des alternatives.",
          )}
          icon={<AlertCircle className="h-6 w-6 text-muted-foreground" />}
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={() => navigate(-1)} className="font-sans">
                {t("common.back", "Retour")}
              </Button>
              <Button
                onClick={() => navigate("/recherche")}
                className="gradient-primary border-0 font-sans"
                style={{ color: "#FAFAFA" }}
              >
                {t("listing.viewAll", "Voir toutes les annonces")}
              </Button>
            </div>
          }
        />
      </div>
      <Footer />
    </>
  );
}
