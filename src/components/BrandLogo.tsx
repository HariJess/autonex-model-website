import { cn } from "@/lib/utils";
import { resolveBrandAsset } from "@/data/brandAssets";

type BrandLogoProps = {
  brand?: string | null;
  brandId?: string | null;
  className?: string;
  imgClassName?: string;
  labelClassName?: string;
  showFallbackLabel?: boolean;
  title?: string;
};

const DEFAULT_CONTAINER_CLASS =
  "inline-flex h-9 w-14 items-center justify-center rounded-lg border border-border/80 bg-muted/35 px-2";

const DEFAULT_IMAGE_CLASS = "h-full w-full object-contain";

const DEFAULT_LABEL_CLASS = "truncate text-[11px] font-medium text-muted-foreground";

export default function BrandLogo({
  brand,
  brandId,
  className,
  imgClassName,
  labelClassName,
  showFallbackLabel = true,
  title,
}: BrandLogoProps) {
  const asset = resolveBrandAsset(brandId ?? brand);
  const fallbackLabel = asset?.label ?? brand ?? brandId ?? "";
  const computedTitle = title ?? fallbackLabel;

  if (!asset?.logoPath) {
    if (!showFallbackLabel || !fallbackLabel) {
      return null;
    }
    return (
      <div className={cn(DEFAULT_CONTAINER_CLASS, className)} title={computedTitle}>
        <span className={cn(DEFAULT_LABEL_CLASS, labelClassName)}>{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <div className={cn(DEFAULT_CONTAINER_CLASS, className)} title={computedTitle}>
      <img
        src={asset.logoPath}
        alt={asset.label}
        loading="lazy"
        decoding="async"
        className={cn(DEFAULT_IMAGE_CLASS, imgClassName)}
      />
    </div>
  );
}
