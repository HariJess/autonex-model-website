import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollPrev(container.scrollLeft > 5);
    const maxScroll = container.scrollWidth - container.clientWidth;
    setCanScrollNext(container.scrollLeft < maxScroll - 5);
  }, []);

  const scrollBy = useCallback((direction: "prev" | "next") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isMobile = window.innerWidth < 768;
    const scrollAmount = isMobile ? 480 : 600;
    container.scrollBy({
      left: direction === "prev" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    updateScrollButtons();
    container.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      container.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons]);

  return (
    <div className="relative">
      {/* Gradient fade gauche */}
      {canScrollPrev && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 md:w-24 z-10 bg-gradient-to-r from-background via-background/90 to-transparent"
        />
      )}

      {/* Gradient fade droit */}
      {canScrollNext && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 md:w-24 z-10 bg-gradient-to-l from-background via-background/90 to-transparent"
        />
      )}

      {/* Flèche gauche — toujours visible desktop sauf aux extrémités */}
      <button
        type="button"
        onClick={() => scrollBy("prev")}
        disabled={!canScrollPrev}
        aria-label={t("brands.scrollPrev", "Marques précédentes")}
        className={cn(
          "hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center h-10 w-10 rounded-full bg-white shadow-lg border border-border/70 transition-opacity duration-200 hover:bg-slate-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          "disabled:opacity-0 disabled:pointer-events-none",
        )}
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>

      {/* Flèche droite — toujours visible desktop sauf aux extrémités */}
      <button
        type="button"
        onClick={() => scrollBy("next")}
        disabled={!canScrollNext}
        aria-label={t("brands.scrollNext", "Marques suivantes")}
        className={cn(
          "hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center h-10 w-10 rounded-full bg-white shadow-lg border border-border/70 transition-opacity duration-200 hover:bg-slate-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          "disabled:opacity-0 disabled:pointer-events-none",
        )}
      >
        <ChevronRight className="h-5 w-5 text-foreground" />
      </button>

      {/* Indicateur scroll mobile (pulse) — visible uniquement au début sur mobile */}
      {canScrollNext && !canScrollPrev && (
        <div
          aria-hidden="true"
          className="md:hidden pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center h-8 w-8 rounded-full bg-white/95 shadow-md border border-border/50 motion-safe:animate-pulse"
        >
          <ChevronRight className="h-4 w-4 text-foreground/70" />
        </div>
      )}

      {/* Container scrollable horizontal natif */}
      <div
        ref={scrollContainerRef}
        role="region"
        aria-label={t("home.popularBrandsRibbon", "Marques populaires")}
        className="flex gap-6 md:gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide"
      >
        {brands.map((brand) => (
          <Link
            key={brand.id}
            to={brand.href}
            draggable={false}
            className="flex-[0_0_auto] snap-start rounded-lg px-4 py-3 flex flex-col items-center justify-center gap-3 text-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-[2px] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 w-[112px] md:w-[160px] min-h-[140px]"
            aria-label={`Voir les annonces ${brand.label}`}
          >
            <span
              aria-hidden="true"
              className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-white border border-border/40 shadow-sm shrink-0"
            >
              {brand.logoAsset ? (
                <img
                  src={brand.logoAsset}
                  alt={`Logo ${brand.label}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-8 md:h-10 w-auto max-w-[44px] md:max-w-[56px] object-contain pointer-events-none"
                />
              ) : (
                <span className="text-sm font-semibold tracking-wide text-foreground/85 pointer-events-none">
                  {brand.label.slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            <span className="font-sans text-sm md:text-base font-medium tracking-[0.01em] text-foreground/85 pointer-events-none">
              {brand.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
