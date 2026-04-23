import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Brand = {
  id: string;
  label: string;
  href: string;
  logoAsset: string | null | undefined;
};

type Props = {
  brands: Brand[];
};

export default function BrandsRibbon({ brands }: Props) {
  const { t } = useTranslation();
  const autoplayRef = useRef(
    Autoplay({
      delay: 2800,
      stopOnInteraction: true,
      stopOnMouseEnter: false,
    })
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      dragFree: true,
      containScroll: "trimSnaps",
      skipSnaps: false,
    },
    [autoplayRef.current]
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    const markInteracted = () => setUserInteracted(true);
    emblaApi.on("pointerDown", markInteracted);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("pointerDown", markInteracted);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Gradient fade gauche */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 transition-opacity duration-200",
          userInteracted && canScrollPrev ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Gradient fade droit */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 transition-opacity duration-200",
          !userInteracted || canScrollNext ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Flèche gauche */}
      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Défiler vers la gauche"
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white border border-border shadow-md flex items-center justify-center text-foreground transition-opacity duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          userInteracted && isHovering ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Flèche droite */}
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Défiler vers la droite"
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white border border-border shadow-md flex items-center justify-center text-foreground transition-opacity duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          userInteracted && isHovering ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Viewport embla */}
      <div
        ref={emblaRef}
        className="overflow-hidden"
        role="region"
        aria-label={t("home.popularBrandsRibbon", "Marques populaires")}
      >
        <div className="flex gap-8 md:gap-10">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={brand.href}
              draggable={false}
              className="flex-[0_0_auto] rounded-2xl border border-border bg-card p-4 min-h-[140px] flex flex-col items-center justify-center gap-2 text-center motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 w-[128px] md:w-[160px]"
              aria-label={`Voir les annonces ${brand.label}`}
            >
              {brand.logoAsset ? (
                <img
                  src={brand.logoAsset}
                  alt={`Logo ${brand.label}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-12 md:h-14 w-auto max-w-[110px] md:max-w-[140px] object-contain opacity-90 hover:opacity-100 motion-safe:transition-opacity pointer-events-none"
                />
              ) : (
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background text-sm font-semibold tracking-wide text-foreground/85 pointer-events-none">
                  {brand.label.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="font-sans text-xs font-medium tracking-[0.01em] text-foreground/75 pointer-events-none">
                {brand.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
