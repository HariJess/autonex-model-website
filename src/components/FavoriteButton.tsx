import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/useFavorites";

type Size = "sm" | "md" | "lg";
type Variant = "overlay" | "inline";

interface FavoriteButtonProps {
  listingId: string;
  size?: Size;
  variant?: Variant;
  className?: string;
}

const SIZE_MAP: Record<Size, { button: string; icon: string; overlayButton: string; overlayIcon: string }> = {
  sm: { button: "h-10 w-10", icon: "h-4 w-4", overlayButton: "h-9 w-9", overlayIcon: "h-5 w-5" },
  md: { button: "h-11 w-11", icon: "h-5 w-5", overlayButton: "h-10 w-10", overlayIcon: "h-5 w-5" },
  lg: { button: "h-12 w-12", icon: "h-6 w-6", overlayButton: "h-12 w-12", overlayIcon: "h-6 w-6" },
};

export function FavoriteButton({
  listingId,
  size = "md",
  variant = "overlay",
  className,
}: FavoriteButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: favoriteIds } = useFavoriteIds();
  const toggle = useToggleFavorite();

  const isFavorite = !!favoriteIds?.has(listingId);
  const isPending = toggle.isPending;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!user) {
        toast.info(t("favorites.toast.loginRequired"));
        const redirect = `${location.pathname}${location.search}`;
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      toggle.mutate(listingId, {
        onSuccess: (row) => {
          toast.success(
            row.fav_is_favorite
              ? t("favorites.toast.added")
              : t("favorites.toast.removed"),
          );
        },
        onError: () => {
          toast.error(t("favorites.toast.error"));
        },
      });
    },
    [user, toggle, listingId, navigate, location.pathname, location.search, t],
  );

  const sizes = SIZE_MAP[size];
  const isOverlay = variant === "overlay";

  return (
    <button
      type="button"
      data-variant={variant}
      aria-pressed={isFavorite}
      aria-label={
        isFavorite
          ? t("favorites.button.removeAria")
          : t("favorites.button.addAria")
      }
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "transition-all duration-200",
        "active:scale-95",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500/50",
        "touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100",
        isOverlay
          ? cn(
              "bg-white shadow-md hover:shadow-lg hover:scale-110",
              sizes.overlayButton,
            )
          : cn(
              "bg-white/95 backdrop-blur-sm border border-slate-200/60",
              "shadow-md hover:shadow-lg hover:scale-105",
              sizes.button,
            ),
        className,
      )}
    >
      <Heart
        className={cn(
          isOverlay ? sizes.overlayIcon : sizes.icon,
          "transition-colors",
          isOverlay && "stroke-[2]",
          isFavorite
            ? "fill-red-500 text-red-500"
            : "text-slate-700",
        )}
      />
    </button>
  );
}

export default FavoriteButton;
