import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PremiumStatePanel } from "@/components/ui/premium-state";

type SearchErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

export function SearchErrorState({ title, message, onRetry }: SearchErrorStateProps) {
  const { t } = useTranslation();
  return (
    <PremiumStatePanel
      overline={t("search.errorOverline", "Search")}
      title={title}
      description={message}
      icon={<AlertCircle className="h-6 w-6 text-destructive" aria-hidden />}
      role="alert"
      ariaLive="assertive"
      action={
        onRetry ? (
          <Button
            variant="outline"
            className="rounded-xl border-border/70 font-sans focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
            {t("states.retry")}
          </Button>
        ) : undefined
      }
    />
  );
}
