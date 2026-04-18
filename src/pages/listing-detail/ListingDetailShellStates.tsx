import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { PremiumStatePanel } from "@/components/ui/premium-state";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

export function ListingDetailLoading() {
  const { t } = useTranslation();
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-10">
        <PremiumStatePanel
          overline={t("listing.stateLoadingOverline", "AutoNex listing")}
          title={t("listing.stateLoadingTitle", "Opening this listing")}
          description={t(
            "listing.stateLoadingDesc",
            "We are loading vehicle details and contact options.",
          )}
          icon={<Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />}
        />
      </div>
      <Footer />
    </>
  );
}

type ListingDetailFetchErrorProps = {
  onRetry?: () => void;
};

export function ListingDetailFetchError({ onRetry }: ListingDetailFetchErrorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-10">
        <PremiumStatePanel
          overline={t("listing.stateErrorOverline", "Listing")}
          title={t("listing.fetchErrorTitle", "Could not load this listing")}
          description={t(
            "listing.runtimeUnavailable",
            "This listing is temporarily unavailable. Try again in a moment or return to search.",
          )}
          icon={<AlertCircle className="h-6 w-6 text-destructive" aria-hidden />}
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              {onRetry ? (
                <Button
                  variant="default"
                  className="gradient-primary border-0 font-sans"
                  style={{ color: "#FAFAFA" }}
                  onClick={onRetry}
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
                  {t("states.retry")}
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => navigate(-1)} className="font-sans">
                {t("common.back", "Back")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/recherche")} className="font-sans">
                {t("listing.viewSearch", "Go to search")}
              </Button>
            </div>
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
          overline={t("listing.stateNotFoundOverline", "AutoNex catalogue")}
          title={t("listing.notFound", "Listing not found")}
          description={t(
            "listing.notFoundDesc",
            "This listing is no longer available. Head back to search to explore other vehicles.",
          )}
          icon={<AlertCircle className="h-6 w-6 text-muted-foreground" aria-hidden />}
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={() => navigate(-1)} className="font-sans">
                {t("common.back", "Back")}
              </Button>
              <Button
                onClick={() => navigate("/recherche")}
                className="gradient-primary border-0 font-sans"
                style={{ color: "#FAFAFA" }}
              >
                {t("listing.viewAll", "Browse listings")}
              </Button>
            </div>
          }
        />
      </div>
      <Footer />
    </>
  );
}
