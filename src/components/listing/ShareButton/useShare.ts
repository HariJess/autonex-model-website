import { useCallback, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { trackShareEvent } from "./shareTracking";
import type { ShareChannel, ShareUrlParams } from "./shareChannels";

interface UseShareOptions {
  listingId: string;
  shareParams: ShareUrlParams;
}

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

function isMobileViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function isNativeShareSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function useShare({ listingId, shareParams }: UseShareOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleShareClick = useCallback(async () => {
    if (isMobileViewport() && isNativeShareSupported()) {
      try {
        await navigator.share({
          title: shareParams.title,
          text: shareParams.text,
          url: shareParams.url,
        });
        trackShareEvent({ channel: "native", listingId, success: true });
        return;
      } catch (err) {
        const error = err as Error;
        if (error.name === "AbortError") return;
        trackShareEvent({ channel: "native", listingId, success: false, error: error.message });
        setIsModalOpen(true);
        return;
      }
    }
    setIsModalOpen(true);
  }, [shareParams, listingId]);

  const handleChannelClick = useCallback(
    async (channel: Exclude<ShareChannel, "native">, url: string) => {
      if (channel === "copy") {
        try {
          if (typeof navigator === "undefined" || !navigator.clipboard) {
            throw new Error("Clipboard API unavailable");
          }
          await navigator.clipboard.writeText(shareParams.url);
          toast.success("Lien copié dans le presse-papiers !");
          trackShareEvent({ channel: "copy", listingId, success: true });
        } catch (err) {
          const error = err as Error;
          toast.error("Impossible de copier le lien");
          trackShareEvent({ channel: "copy", listingId, success: false, error: error.message });
        }
        return;
      }
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      trackShareEvent({ channel, listingId, success: true });
      setIsModalOpen(false);
    },
    [shareParams.url, listingId],
  );

  return {
    isModalOpen,
    setIsModalOpen,
    handleShareClick,
    handleChannelClick,
  };
}
