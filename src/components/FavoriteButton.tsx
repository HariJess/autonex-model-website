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

const SIZE_MAP: Record<Size, { button: string; icon: string }> = {
  sm: { button: "h-9 w-9", icon: "h-4 w-4" },
  md: { button: "h-11 w-11", icon: "h-5 w-5" },
  lg: { button: "h-12 w-12", icon: "h-6 w-6" },
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

  const baseClasses =
    variant === "overlay"
      ? "inline-flex items-center justify-center rounded-full bg-card/90 backdrop-blur-sm shadow-sm border border-border/50 hover:bg-card transition-colors active:scale-95 touch-manipulation"
      : "inline-flex items-center justify-center rounded-full border border-border/70 bg-background hover:bg-muted/60 transition-colors active:scale-95 touch-manipulation";

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={
        isFavorite
          ? t("favorites.button.removeAria")
          : t("favorites.button.addAria")
      }
      onClick={handleClick}
      disabled={isPending}
      className={cn(baseClasses, sizes.button, className)}
    >
      <Heart
        className={cn(
          sizes.icon,
          "transition-colors",
          isFavorite
            ? "fill-destructive text-destructive"
            : "text-foreground/70",
        )}
      />
    </button>
  );
}

export default FavoriteButton;
