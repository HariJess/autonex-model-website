import { useTranslation } from "react-i18next";
import { PremiumStatePanel, PremiumStateSkeletonGrid } from "@/components/ui/premium-state";
import { WheelSpinner } from "@/components/ui/wheel-spinner";

export function SearchLoadingState() {
  const { t } = useTranslation();
  const loadingDesc = t(
    "search.loadingDesc",
    "We apply your filters and prepare the most recent matching listings.",
  );
  return (
    <div className="space-y-4 py-4">
      <PremiumStatePanel
        overline={t("search.loadingOverline", "AutoNex search")}
        title={t("search.loadingTitle", "Searching the marketplace")}
        description={loadingDesc}
        icon={<WheelSpinner size="md" aria-hidden />}
        className="py-8 md:py-9"
        role="status"
        ariaLive="polite"
      />
      <PremiumStateSkeletonGrid count={6} />
      <span className="sr-only">{loadingDesc}</span>
    </div>
  );
}
