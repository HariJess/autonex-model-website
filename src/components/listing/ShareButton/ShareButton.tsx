import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildShareParams, type ShareListingInput } from "./buildShareParams";
import { ShareModal } from "./ShareModal";
import { useShare } from "./useShare";

interface ShareButtonProps {
  listing: ShareListingInput;
  variant?: "default" | "icon";
  className?: string;
}

export function ShareButton({ listing, variant = "default", className }: ShareButtonProps) {
  const shareParams = buildShareParams(listing);
  const { isModalOpen, setIsModalOpen, handleShareClick, handleChannelClick } = useShare({
    listingId: listing.id,
    shareParams,
  });

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size={variant === "icon" ? "icon" : "default"}
        onClick={handleShareClick}
        aria-label="Partager cette annonce"
        className={cn(className)}
      >
        <Share2 className="h-4 w-4" />
        {variant !== "icon" && <span>Partager</span>}
      </Button>
      <ShareModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        shareParams={shareParams}
        onChannelClick={handleChannelClick}
      />
    </>
  );
}
