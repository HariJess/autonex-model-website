import { Button } from "@/components/ui/button";
import { CarFront } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PremiumStatePanel } from "@/components/ui/premium-state";

type SearchEmptyStateProps = {
  title: string;
  description: string;
  resetLabel: string;
  onReset: () => void;
};

export function SearchEmptyState({ title, description, resetLabel, onReset }: SearchEmptyStateProps) {
  const { t } = useTranslation();
  return (
    <PremiumStatePanel
      overline={t("search.emptyOverline", "AutoNex search")}
      title={title}
      description={description}
      icon={<CarFront className="h-8 w-8 text-muted-foreground" aria-hidden />}
      action={
        <Button
          variant="outline"
          className="rounded-xl font-sans border-border/70 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
          onClick={onReset}
        >
          {resetLabel}
        </Button>
      }
    />
  );
}
