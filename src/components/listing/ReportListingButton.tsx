import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ReportListingModal } from "./ReportListingModal";

type ReportListingButtonProps = {
  listingId: string;
  /** Null when the listing was anonymized (Mission 5.0 SET NULL). */
  ownerId: string | null;
  listingStatus: string | null | undefined;
  className?: string;
};

export function ReportListingButton({
  listingId,
  ownerId,
  listingStatus,
  className,
}: ReportListingButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Hide for owner, non-active listings, or when the user isn't identifiable
  // yet. Admin moderators keep the button — they can self-test and report on
  // behalf of a flagged content observation.
  if (listingStatus !== "active") return null;
  if (user?.id && user.id === ownerId) return null;

  const requireAuth = () => {
    toast.info(
      t(
        "listing.report.authRequired",
        "Connectez-vous pour signaler une annonce.",
      ),
    );
    navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
  };

  const handleClick = () => {
    if (!user) {
      requireAuth();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={className ?? "text-xs font-sans text-muted-foreground hover:text-destructive"}
      >
        <Flag className="h-3.5 w-3.5 mr-1.5" aria-hidden />
        {t("listing.report.button", "Signaler")}
      </Button>
      {user ? (
        <ReportListingModal
          listingId={listingId}
          open={open}
          onOpenChange={setOpen}
          onRequireAuth={requireAuth}
        />
      ) : null}
    </>
  );
}
